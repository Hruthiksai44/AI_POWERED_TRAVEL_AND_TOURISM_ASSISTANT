from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.schemas.conversation import ChatRequest, ChatResponse
from app.models.user import User
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Main AI chat endpoint. Processes text messages through the LangGraph agent."""
    try:
        from app.agent.graph import run_agent
        result = await run_agent(
            message=request.message,
            user_id=str(current_user.id),
            conversation_id=str(request.conversation_id) if request.conversation_id else None,
            city_id=str(request.city_id) if request.city_id else None,
            language=request.language,
            db=db,
        )
        return ChatResponse(
            response=result.get("response", "I apologize, I couldn't process your request."),
            conversation_id=uuid.UUID(result["conversation_id"]),
            tool_calls=result.get("tool_calls"),
            booking_progress=result.get("booking_progress"),
        )
    except ImportError as e:
        logger.warning(f"Agent module not available: {e}. Using fallback.")
        return await _fallback_chat(request, current_user, db)
    except Exception as e:
        logger.exception("Agent execution failed")
        raise


async def _fallback_chat(request: ChatRequest, user: User, db: AsyncSession) -> ChatResponse:
    """Fallback when agent is not available - uses direct Groq API call."""
    from app.config import settings
    from app.services.conversation_service import create_conversation, add_message, get_conversation
    import httpx

    # Create or get conversation
    if request.conversation_id:
        conv = await get_conversation(db, request.conversation_id)
        conv_id = request.conversation_id
    else:
        conv = await create_conversation(db, user.id, request.city_id, request.language)
        conv_id = conv.id

    # Save user message
    await add_message(db, conv_id, "user", request.message)

    # Call Groq API directly
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a helpful AI travel assistant for Indian tourism. "
                                "Help users explore cities, find hotels, plan itineraries, and make bookings. "
                                "Be friendly, informative, and helpful. "
                                f"The user's name is {user.name}. "
                                f"Respond in the language: {request.language}. "
                            ),
                        },
                        {"role": "user", "content": request.message},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1024,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            ai_response = data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.exception(f"Groq API fallback error: {e}")
        ai_response = (
            "Sorry, an internal error occurred while processing your request. "
            "Please try again."
        )

    # Save assistant response
    await add_message(db, conv_id, "assistant", ai_response)
    await db.commit()

    return ChatResponse(
        response=ai_response,
        conversation_id=conv_id,
    )


@router.post("/voice")
async def voice_chat(
    audio: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    city_id: Optional[str] = Form(None),
    language: str = Form("en"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Voice input: transcribes audio via Groq Whisper -> chat agent -> returns text response."""
    audio_data = await audio.read()
    _upload_debug = (
        f"[Voice Debug] Backend upload info: "
        f"filename='{audio.filename}', "
        f"content_type='{audio.content_type}', "
        f"file_size={len(audio_data)} bytes, "
        f"conversation_id='{conversation_id}', "
        f"city_id='{city_id}', "
        f"language='{language}'"
    )
    logger.info(_upload_debug)
    print(_upload_debug, flush=True)  # [Voice Debug] force stdout — bypasses logging config

    if len(audio_data) < 100:
        raise HTTPException(status_code=400, detail="Audio recording too short. Please hold the mic button longer.")

    # Transcribe using Groq Whisper API (fast, cloud-based)
    user_text = ""
    try:
        from app.speech.stt import STTService
        stt = STTService.get_instance()
        transcription = await stt.transcribe_async(audio_data, language)
        user_text = transcription.get("text", "").strip()
        logger.info(f"[Voice Debug] Whisper transcription result: '{user_text}'")
        print(f"[Voice Debug] Whisper transcription result (assistant.py): '{user_text}'", flush=True)  # [Voice Debug] force stdout
    except Exception as e:
        logger.error(f"STT error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Speech recognition failed. Please try text input.")

    if not user_text:
        raise HTTPException(
            status_code=400,
            detail="Could not understand the audio. Please speak clearly and try again."
        )

    # Process through chat agent
    try:
        chat_request = ChatRequest(
            message=user_text,
            conversation_id=uuid.UUID(conversation_id) if conversation_id else None,
            city_id=uuid.UUID(city_id) if city_id else None,
            language=language,
        )
        chat_response = await chat(chat_request, current_user, db)
    except Exception as e:
        logger.error(f"Chat error after voice: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not process your request. Please try again.")

    return {
        "transcription": user_text,
        "response": chat_response.response,
        "conversation_id": str(chat_response.conversation_id),
        "has_audio": False,
        "tool_calls": chat_response.tool_calls,
        "booking_progress": chat_response.booking_progress,
    }


@router.post("/tts")
async def text_to_speech(
    text: str,
    language: str = "en",
    current_user: User = Depends(get_current_active_user),
):
    """Convert text to speech audio."""
    try:
        from app.speech.tts import TTSService
        tts = TTSService.get_instance()
        audio_data = tts.synthesize(text, language)
        return Response(content=audio_data, media_type="audio/wav")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="TTS service unavailable")


@router.get("/voice-audio/{conversation_id}")
async def get_voice_response(
    conversation_id: str,
    text: str,
    language: str = "en",
    current_user: User = Depends(get_current_active_user),
):
    """Get audio for a text response."""
    try:
        from app.speech.tts import TTSService
        tts = TTSService.get_instance()
        audio_data = tts.synthesize(text, language)
        return Response(content=audio_data, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail="TTS unavailable")
