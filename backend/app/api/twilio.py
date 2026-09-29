"""Twilio Voice webhook endpoints.

Provides the webhook layer for Twilio Voice integration, allowing
phone callers to interact with the AI Travel Assistant via voice.

Endpoints
---------
POST /incoming   – answer an incoming call with a greeting and <Gather>
POST /gather     – receive transcribed speech and echo it back (stub)
POST /status     – receive call completion status from Twilio

Security
--------
All endpoints validate the ``X-Twilio-Signature`` header using Twilio's
``RequestValidator`` to ensure requests originate from Twilio.
"""

import logging
import asyncio
from twilio.rest import Client
import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import Response
# pyrefly: ignore [missing-import]
from twilio.request_validator import RequestValidator
from twilio.twiml.voice_response import Gather, VoiceResponse
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant

from sqlalchemy import select, or_

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User
from app.api.deps import get_current_active_user

logger = logging.getLogger(__name__)


def prepare_text_for_speech(text: str) -> str:
    import re
    # 1. Convert star ratings
    text = re.sub(r'⭐+\s*\(([\d.]+)\)', r'rated \1 out of 5', text)
    text = re.sub(r'⭐+', '', text)
    
    # 2. Currency
    text = re.sub(r'₹\s*([\d,.]+)', r'\1 rupees', text)
    
    # 3. Tables to sentences
    lines = text.split('\n')
    out_lines = []
    in_table = False
    
    for line in lines:
        if '|' in line:
            # Check if it's a separator line
            if re.match(r'^[\s|:-]+$', line):
                continue
                
            cells = [c.strip() for c in line.split('|') if c.strip()]
            if not in_table:
                # first row is header
                in_table = True
                continue
                
            if len(cells) >= 4:
                # Attempt standard hotel table: #, Hotel, Rating, Address/Price
                num = cells[0]
                hotel = re.sub(r'[^\w\s]', '', cells[1]).strip()
                rating = cells[2]
                address = cells[3]
                
                # if there is a 5th column, might be price
                extra = f', for {cells[4]}' if len(cells) > 4 else ''
                
                out_lines.append(f'Hotel {num} is {hotel}, {rating}, on {address}{extra}.')
            else:
                out_lines.append(', '.join(cells))
        else:
            in_table = False
            out_lines.append(line)
            
    res = ' '.join(out_lines)
    
    # 4. Remove HTML tags
    res = re.sub(r'<[^>]+>', ' ', res)
    
    # 5. Remove Markdown syntax characters (but keep punctuation)
    res = re.sub(r'[*_`#~|]', '', res)
    
    # 6. Remove remaining emojis by ignoring non-ascii (we already replaced rupees)
    res = res.encode('ascii', 'ignore').decode('ascii')
    
    # 7. Collapse spaces
    res = re.sub(r'\s+', ' ', res).strip()
    return res


# ---------------------------------------------------------------------------
# Active call session tracking (in-memory, keyed by CallSid)
# ---------------------------------------------------------------------------

_active_calls: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# URL helper -- every Twilio-facing URL MUST go through this
# ---------------------------------------------------------------------------

def _twilio_url(path: str) -> str:
    """Build an absolute HTTPS URL for a Twilio-facing callback.

    Uses ``TWILIO_WEBHOOK_BASE_URL`` as the authority.  Never produces
    a relative URL, never produces localhost, never duplicates slashes.
    """
    base = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
    if not base:
        raise RuntimeError("TWILIO_WEBHOOK_BASE_URL is not configured")
    path = path if path.startswith("/") else f"/{path}"
    return f"{base}{path}"


# ---------------------------------------------------------------------------
# Twilio signature validation dependency
# ---------------------------------------------------------------------------


async def _validate_twilio_signature(request: Request) -> None:
    """Verify that the incoming request was genuinely sent by Twilio.

    Checks the ``X-Twilio-Signature`` header when present.  If the header
    is absent (as happens with Twilio trial-account outbound-call chains
    and Twilio-internal redirects), the request is accepted when it
    originates from an active call session tracked in ``_active_calls``.

    This keeps security tight:
    * Incoming / TwiML-App webhooks always carry the header -> validated.
    * Outbound-call chain requests (gather/wait/agent_response) that
      follow a server-signed ``/outbound_answered`` are accepted only if
      the CallSid is already tracked.
    """
    if not settings.TWILIO_AUTH_TOKEN:
        logger.error("TWILIO_AUTH_TOKEN not configured -- rejecting request")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Twilio not configured",
        )

    signature = request.headers.get("X-Twilio-Signature", "")

    if signature:
        # Standard Twilio signature validation
        base_url = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
        url = f"{base_url}{request.url.path}"
        raw_query = request.scope.get("query_string", b"").decode()
        if raw_query:
            url += f"?{raw_query}"

        form_data = await request.form()
        params: dict[str, str] = {key: str(form_data[key]) for key in form_data}

        validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
        if not validator.validate(url, params, signature):
            logger.error(
                "Invalid Twilio signature for %s. URL: %s",
                request.url.path, url,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Twilio signature",
            )
        logger.debug("Twilio signature validated for %s", request.url.path)
        return

    # No X-Twilio-Signature header -- fall back to session-based auth.
    # Accept only if the CallSid belongs to an active tracked session
    # (i.e. the call was already authenticated via /outbound_answered HMAC
    # or via /incoming Twilio signature).
    form_data = await request.form()
    call_sid = str(form_data.get("CallSid", ""))
    if call_sid and call_sid in _active_calls:
        logger.debug(
            "No X-Twilio-Signature on %s but CallSid %s is in active sessions -- accepted",
            request.url.path, call_sid,
        )
        return

    logger.warning(
        "Missing X-Twilio-Signature header on %s and CallSid not in active sessions",
        request.url.path,
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Missing Twilio signature",
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/twilio/voice", tags=["Twilio Voice"])
token_router = APIRouter(prefix="/twilio", tags=["Twilio Voice"])


# ---------------------------------------------------------------------------
# GET /token — Twilio Voice SDK access token
# ---------------------------------------------------------------------------


@token_router.get("/token")
async def get_voice_token(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Generate a Twilio Voice SDK access token for the authenticated user.

    The token contains a ``VoiceGrant`` scoped to the configured TwiML App.
    When the browser client calls ``device.connect()``, Twilio routes the
    call to the TwiML App's Voice URL — which is the existing
    ``POST /api/twilio/voice/incoming`` webhook.

    Identity is set to the user's UUID so Twilio can route calls and
    the webhook can identify the caller.
    """
    if not all([
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_API_KEY,
        settings.TWILIO_API_SECRET,
        settings.TWILIO_TWIML_APP_SID,
    ]):
        logger.error("Twilio Voice SDK credentials not fully configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Twilio Voice SDK not configured",
        )

    identity = str(current_user.id)

    token = AccessToken(
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_API_KEY,
        settings.TWILIO_API_SECRET,
        identity=identity,
        ttl=3600,
    )

    voice_grant = VoiceGrant(
        outgoing_application_sid=settings.TWILIO_TWIML_APP_SID,
        incoming_allow=True,
    )
    token.add_grant(voice_grant)

    logger.info(
        "[Twilio Token] Generated voice token for user=%s",
        identity,
    )

    return {
        "token": token.to_jwt(),
        "identity": identity,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _init_call_session(call_sid: str, phone: str, user_id: str, is_sdk_call: bool) -> None:
    _active_calls[call_sid] = {
        "phone": phone,
        "user_id": user_id,
        "conversation_id": None,
        "city_id": None,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "turns": 0,
        "is_sdk_call": is_sdk_call,
    }

def _create_initial_greeting_twiml() -> VoiceResponse:
    twiml = VoiceResponse()
    gather = Gather(
        input="speech",
        action=_twilio_url("/api/twilio/voice/gather"),
        method="POST",
        speech_timeout="auto",
        language="en-IN",
    )
    gather.say(
        "Welcome to the AI Travel Assistant. How can I help you today?",
        voice="Polly.Aditi",
    )
    twiml.append(gather)
    # Fallback if no speech is detected after the gather times out
    twiml.say(
        "We didn't hear anything. Goodbye.",
        voice="Polly.Aditi",
    )
    twiml.hangup()
    return twiml


# ---------------------------------------------------------------------------
# POST /outbound_answered — answer an outbound call
# ---------------------------------------------------------------------------

@router.post("/outbound_answered")
async def outbound_answered(
    request: Request,
    CallSid: str = Form(...),
    To: Optional[str] = Form(None),
    user_id: str = None,
    ts: str = None,
    sig: str = None,
) -> Response:
    """Webhook for when a user answers an admin-initiated outbound call.

    Twilio trial accounts do NOT send X-Twilio-Signature on outbound-call
    webhooks.  We therefore verify a server-generated HMAC-SHA256 token
    (keyed on TWILIO_AUTH_TOKEN) that was appended to the webhook URL by
    ``admin.call_user``.
    """
    import hmac as _hmac
    import hashlib as _hashlib

    # --- Validate the HMAC token ---
    if not user_id or not ts or not sig:
        logger.error(
            "[Twilio Outbound Answered] Missing auth params: "
            "user_id=%s ts=%s sig=%s", user_id, ts, sig,
        )
        twiml = VoiceResponse()
        twiml.say("Authentication error. Goodbye.", voice="Polly.Aditi")
        twiml.hangup()
        return Response(content=str(twiml), media_type="text/xml")

    expected = _hmac.new(
        settings.TWILIO_AUTH_TOKEN.encode(),
        f"{user_id}:{ts}".encode(),
        _hashlib.sha256,
    ).hexdigest()

    if not _hmac.compare_digest(sig, expected):
        logger.error("[Twilio Outbound Answered] Invalid HMAC signature")
        twiml = VoiceResponse()
        twiml.say("Authentication error. Goodbye.", voice="Polly.Aditi")
        twiml.hangup()
        return Response(content=str(twiml), media_type="text/xml")

    import time as _time
    if abs(_time.time() - int(ts)) > 300:
        logger.error("[Twilio Outbound Answered] Token expired (ts=%s)", ts)
        twiml = VoiceResponse()
        twiml.say("This call link has expired. Goodbye.", voice="Polly.Aditi")
        twiml.hangup()
        return Response(content=str(twiml), media_type="text/xml")

    logger.info(
        "[Twilio Outbound Answered] CallSid=%s | To=%s | user_id=%s (HMAC OK)",
        CallSid, To, user_id,
    )

    _init_call_session(
        call_sid=CallSid,
        phone=To or "",
        user_id=user_id,
        is_sdk_call=False,
    )

    twiml = _create_initial_greeting_twiml()
    return Response(content=str(twiml), media_type="text/xml")


# ---------------------------------------------------------------------------
# POST /incoming — answer an incoming call
# ---------------------------------------------------------------------------


@router.post("/incoming")
async def incoming_call(
    request: Request,
    _: None = Depends(_validate_twilio_signature),
    CallSid: str = Form(...),
    From: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    CallStatus: str = Form("ringing"),
    Caller: Optional[str] = Form(None),
    Direction: Optional[str] = Form(None),
) -> Response:
    """Answer an incoming Twilio voice call.

    Supports both traditional PSTN calls (From=+phone, To=+phone) and
    Twilio Voice SDK browser calls (From=client:<identity>, To may be absent).
    """
    # ---- DEBUG: dump the complete request for diagnostics ----
    form_data = await request.form()
    logger.info("[Twilio Incoming DEBUG] content_type=%s", request.headers.get("content-type"))
    logger.info("[Twilio Incoming DEBUG] headers=%s", dict(request.headers))
    logger.info("[Twilio Incoming DEBUG] form_payload=%s", {k: v for k, v in form_data.items()})
    print("=== TWILIO INCOMING: FULL FORM PAYLOAD ===")
    print({k: v for k, v in form_data.items()})
    print("=== TWILIO INCOMING: HEADERS ===")
    print(dict(request.headers))
    print(f"=== TWILIO INCOMING: content_type={request.headers.get('content-type')} ===")
    # ---- END DEBUG ----

    # Normalise From: prefer the explicit From field, fall back to Caller
    effective_from = From or Caller or ""

    logger.info(
        "[Twilio Incoming] CallSid=%s | From=%s | To=%s | Caller=%s | "
        "Direction=%s | Status=%s | effective_from=%s",
        CallSid, From, To, Caller, Direction, CallStatus, effective_from,
    )

    # ------------------------------------------------------------------
    # Detect whether this is a Voice SDK call or a traditional PSTN call
    # ------------------------------------------------------------------
    is_sdk_call = effective_from.startswith("client:")

    # Look up the registered user
    user_id: str | None = None
    try:
        async with AsyncSessionLocal() as db:
            if is_sdk_call:
                # Voice SDK: identity was set to user UUID in get_voice_token()
                client_identity = effective_from.removeprefix("client:")
                logger.info(
                    "[Twilio Incoming] SDK call detected, identity=%s",
                    client_identity,
                )
                result = await db.execute(
                    select(User).where(User.id == client_identity)
                )
                user = result.scalars().first()
            else:
                # PSTN: Twilio sends E.164 format (e.g. +919876543210).
                # Match against stored phone with common format variations.
                phone_digits = effective_from.lstrip("+")
                phone_local = (
                    phone_digits[-10:]
                    if len(phone_digits) > 10
                    else phone_digits
                )
                result = await db.execute(
                    select(User).where(
                        or_(
                            User.phone == effective_from,
                            User.phone == phone_digits,
                            User.phone == phone_local,
                        )
                    )
                )
                user = result.scalars().first()

            if user:
                user_id = str(user.id)
                logger.info(
                    "[Twilio Incoming] User found: id=%s, name=%s, from=%s",
                    user.id, user.name, effective_from,
                )
    except Exception as e:
        logger.error("[Twilio Incoming] User lookup failed: %s", e, exc_info=True)

    if not user_id:
        logger.warning(
            "[Twilio Incoming] No registered user for from=%s (sdk=%s)",
            effective_from, is_sdk_call,
        )
        twiml = VoiceResponse()
        twiml.say(
            "We could not find an account associated with this call. "
            "Please register on our website first. Goodbye.",
            voice="Polly.Aditi",
        )
        twiml.hangup()
        return Response(content=str(twiml), media_type="text/xml")

    # Track the active call session with resolved user
    _init_call_session(
        call_sid=CallSid,
        phone=effective_from,
        user_id=user_id,
        is_sdk_call=is_sdk_call,
    )
    twiml = _create_initial_greeting_twiml()
    return Response(content=str(twiml), media_type="text/xml")


# ---------------------------------------------------------------------------
# POST /gather -- receive transcribed speech, schedule background processing
# ---------------------------------------------------------------------------
#
# Architecture: background task + /wait poll — NO Calls.update().
#
# Twilio PSTN webhooks have a hard 15-second response timeout.  The agent
# can take 1–65+ seconds depending on the turn (hotel search, availability
# check, booking summary all require multiple DB + LLM round-trips).
#
# Solution:
#   POST /gather  → schedule asyncio.create_task(run_agent)
#               → return <Say>checking...</Say><Redirect>/wait</Redirect>  (<1 s)
#   POST /wait   → polls session["processing"] every 5 s via <Pause><Redirect>
#               → when False: <Redirect>/agent_response</Redirect>
#   POST /agent_response → <Say>AI response</Say><Gather>
#
# This is identical to the previous architecture except Calls.update() has
# been completely removed.  The /wait poll works without it — the only cost
# is up to 5 extra seconds of silence before the response is spoken.
# ---------------------------------------------------------------------------



def _extract_response_text(result: dict, fallback: str = "") -> str:
    """Pull the plain-text response out of a run_agent result dict."""
    raw = result.get("response", fallback) if isinstance(result, dict) else fallback
    if not raw:
        raw = fallback or "I processed your request. Is there anything else I can help with?"

    # Handle list-of-blocks format (some LLM backends return this)
    if isinstance(raw, str) and raw.strip().startswith("["):
        try:
            import ast
            parsed = ast.literal_eval(raw.strip())
            if isinstance(parsed, list):
                raw = parsed
        except Exception:
            pass

    if isinstance(raw, list):
        extracted = []
        for block in raw:
            if isinstance(block, dict) and "text" in block:
                extracted.append(block["text"])
            elif isinstance(block, str):
                extracted.append(block)
        if extracted:
            raw = " ".join(extracted)

    return str(raw)


def _gather_twiml(say_text: str) -> VoiceResponse:
    """Return a VoiceResponse that speaks *say_text* then re-gathers.

    Standard conversational loop: <Gather> containing <Say> so Twilio listens
    for the next utterance immediately after speaking.  The fallback
    <Say><Hangup> below the Gather fires only if the caller is completely
    silent for the Gather timeout (5 s after speech ends).
    """
    twiml = VoiceResponse()
    gather = Gather(
        input="speech",
        action=_twilio_url("/api/twilio/voice/gather"),
        method="POST",
        speech_timeout="auto",
        language="en-IN",
    )
    gather.say(say_text, voice="Polly.Aditi")
    twiml.append(gather)
    twiml.say("Thank you for calling the AI Travel Assistant. Goodbye.", voice="Polly.Aditi")
    twiml.hangup()
    return twiml



async def _run_agent_background(
    CallSid: str,
    SpeechResult: str,
    user_id: str,
    conversation_id: str,
    city_id: str,
) -> None:
    """Background coroutine: run the AI agent and store result in session.

    Never raises — all errors are caught and stored as latest_error so the
    call can continue via /agent_response.
    """
    from app.agent.graph import run_agent

    session = _active_calls.get(CallSid, {})
    session["processing"] = True
    _active_calls[CallSid] = session

    t0 = time.perf_counter()
    logger.info("[Twilio BG] CallSid=%s | run_agent starting", CallSid)
    print(f"[DATE TRACE] Twilio SpeechResult = {SpeechResult!r}", flush=True)

    try:
        async with AsyncSessionLocal() as db:
            result = await run_agent(
                message=SpeechResult,
                user_id=user_id,
                conversation_id=conversation_id,
                city_id=city_id,
                language="en-US",
                db=db,
            )

        elapsed = time.perf_counter() - t0
        logger.info("[Twilio BG] CallSid=%s | run_agent completed in %.3fs", CallSid, elapsed)

        # Update session state
        if isinstance(result, dict):
            if result.get("conversation_id") and not session.get("conversation_id"):
                session["conversation_id"] = result["conversation_id"]
            if result.get("city_id") and result.get("city_id") != session.get("city_id"):
                session["city_id"] = result["city_id"]

        response_text = _extract_response_text(result)
        session["latest_response"] = response_text

    except Exception as e:
        elapsed = time.perf_counter() - t0
        logger.error(
            "[Twilio BG] CallSid=%s | exception after %.3fs: %s",
            CallSid, elapsed, str(e), exc_info=True,
        )
        error_msg = str(e).lower()
        if "429" in error_msg or "rate limit" in error_msg or "too many requests" in error_msg:
            session["latest_error"] = (
                "I'm currently experiencing high traffic. Please give me a moment and try again."
            )
        else:
            session["latest_error"] = (
                "I'm sorry, I encountered a temporary problem. Please try again."
            )

    finally:
        session["processing"] = False
        _active_calls[CallSid] = session


@router.post("/gather")
async def gather_speech(
    request: Request,
    _: None = Depends(_validate_twilio_signature),
    CallSid: str = Form(...),
    From: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Confidence: Optional[str] = Form(None),
) -> Response:
    """Receive speech, schedule background agent, redirect to /wait immediately.

    Returns in <1 second so Twilio's 15-second webhook timeout is never hit.
    The /wait polling loop keeps the call alive while run_agent executes
    (which can take 1–65+ seconds for complex turns).
    No Calls.update() is used anywhere in this flow.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    session = _active_calls.get(CallSid, {})
    conversation_id = session.get("conversation_id")
    city_id = session.get("city_id")

    logger.info(
        "[Twilio Gather] CallSid=%s | SpeechResult='%s' | Confidence=%s | ts=%s",
        CallSid, SpeechResult, Confidence, timestamp,
    )
    print(f"[Twilio Gather] CallSid={CallSid} SpeechResult={SpeechResult!r}", flush=True)

    # ------------------------------------------------------------------
    # 1. No speech — re-prompt immediately
    # ------------------------------------------------------------------
    if not SpeechResult or not SpeechResult.strip():
        logger.info("[Twilio Gather] CallSid=%s | no speech — re-prompting", CallSid)
        return Response(
            content=str(_gather_twiml("I didn't catch that. Could you please repeat?")),
            media_type="text/xml",
        )

    # ------------------------------------------------------------------
    # 2. Session guard
    # ------------------------------------------------------------------
    user_id = session.get("user_id")
    if not user_id:
        logger.error("[Twilio Gather] No user_id in session for CallSid=%s", CallSid)
        twiml = VoiceResponse()
        twiml.say("I'm sorry, your session has expired. Please call again.", voice="Polly.Aditi")
        twiml.hangup()
        return Response(content=str(twiml), media_type="text/xml")

    # ------------------------------------------------------------------
    # 3. Concurrency guard — drop duplicate speech events
    # ------------------------------------------------------------------
    if session.get("processing"):
        logger.warning("[Twilio Gather] CallSid=%s | already processing, returning wait", CallSid)
        twiml = VoiceResponse()
        twiml.pause(length=2)
        twiml.redirect(_twilio_url("/api/twilio/voice/wait"))
        return Response(content=str(twiml), media_type="text/xml")

    # ------------------------------------------------------------------
    # 4. Schedule background agent — return immediately to Twilio (<1 s)
    #    so we never hit Twilio's 15-second webhook response timeout.
    # ------------------------------------------------------------------
    session["turns"] = session.get("turns", 0) + 1
    session.pop("latest_response", None)
    session.pop("latest_error", None)
    session["processing"] = True
    _active_calls[CallSid] = session

    asyncio.create_task(
        _run_agent_background(
            CallSid=CallSid,
            SpeechResult=SpeechResult,
            user_id=user_id,
            conversation_id=conversation_id,
            city_id=city_id,
        )
    )

    logger.info(
        "[Twilio Gather] CallSid=%s | background task scheduled, redirecting to /wait", CallSid
    )
    twiml = VoiceResponse()
    twiml.say("Let me check that for you.", voice="Polly.Aditi")
    twiml.redirect(_twilio_url("/api/twilio/voice/wait"))
    return Response(content=str(twiml), media_type="text/xml")


# ---------------------------------------------------------------------------
# POST /status — call completion status callback
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# POST /wait - waiting loop while AI is processing
# ---------------------------------------------------------------------------

@router.post("/wait")
async def wait_loop(
    request: Request,
    _: None = Depends(_validate_twilio_signature),
    CallSid: str = Form(...),
) -> Response:
    import time
    t_wait_start = time.perf_counter()
    logger.info("[Twilio Wait] /wait request started for CallSid=%s", CallSid)
    
    session = _active_calls.get(CallSid)
    twiml = VoiceResponse()
    
    if not session:
        twiml.say("Your session has expired. Goodbye.", voice="Polly.Aditi")
        twiml.hangup()
        resp = Response(content=str(twiml), media_type="text/xml")
        logger.info("[Twilio Wait] /wait response generated in %.2f ms (no session)", (time.perf_counter() - t_wait_start) * 1000)
        return resp
    
    if session.get("processing"):
        logger.info("[Twilio Wait] CallSid=%s | processing=True, looping wait", CallSid)
        # Still processing, pause a bit and loop
        twiml.pause(length=5)
        twiml.redirect(_twilio_url("/api/twilio/voice/wait"))
    else:
        logger.info("[Twilio Wait] CallSid=%s | processing=False, redirecting to agent_response", CallSid)
        # Processing finished. Redirect to agent_response to serve the result.
        twiml.redirect(_twilio_url("/api/twilio/voice/agent_response"))
        
    resp = Response(content=str(twiml), media_type="text/xml")
    t_wait_end = time.perf_counter()
    logger.info("[Twilio Wait] /wait response generated in %.2f ms", (t_wait_end - t_wait_start) * 1000)
    return resp

@router.post("/agent_response")
async def agent_response(
    request: Request,
    _: None = Depends(_validate_twilio_signature),
    CallSid: str = Form(...),
) -> Response:
    logger.info("[Twilio Agent Response] CallSid=%s", CallSid)
    
    session = _active_calls.get(CallSid)
    if not session:
        logger.error("[Twilio Agent Response] Session not found for CallSid=%s", CallSid)
        twiml = VoiceResponse()
        twiml.say("Your session has expired. Goodbye.", voice="Polly.Aditi")
        twiml.hangup()
        return Response(content=str(twiml), media_type="text/xml")

    response_text = session.get("latest_response")
    error_text = session.get("latest_error")

    if error_text:
        # BUG-FIX: previously returned bare <Say> with no <Gather> — call would
        # hang up silently after TTS.  Now re-gathers so the conversation continues.
        logger.warning("[Twilio Agent Response] Delivering error for CallSid=%s: %s", CallSid, error_text)
        session.pop("latest_error", None)
        _active_calls[CallSid] = session
        return Response(content=str(_gather_twiml(error_text)), media_type="text/xml")

    elif response_text:
        logger.info("[Twilio Agent Response] Response delivered for CallSid=%s", CallSid)
        session.pop("latest_response", None)
        _active_calls[CallSid] = session
        spoken_text = prepare_text_for_speech(response_text)
        return Response(content=str(_gather_twiml(spoken_text)), media_type="text/xml")

    else:
        logger.warning(
            "[Twilio Agent Response] Neither response nor error for CallSid=%s — re-prompting",
            CallSid,
        )
        return Response(
            content=str(_gather_twiml("I am still thinking. Please give me a moment.")),
            media_type="text/xml",
        )


@router.post("/status")
async def call_status(
    request: Request,
    _: None = Depends(_validate_twilio_signature),
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    CallDuration: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
) -> Response:
    """Receive call completion status from Twilio.

    Logs call metadata for debugging and monitoring.  A future phase
    will persist this as a ``CallLog`` entry in PostgreSQL.
    """
    duration = int(CallDuration) if CallDuration and CallDuration.isdigit() else 0

    # Retrieve and clean up the in-memory session
    session = _active_calls.pop(CallSid, {})
    turns = session.get("turns", 0)
    started_at = session.get("started_at", "unknown")
    phone = session.get("phone", From or "unknown")

    logger.info(
        "[Twilio Status] CallSid=%s | Status=%s | Duration=%ds | "
        "From=%s | To=%s | Turns=%d | StartedAt=%s",
        CallSid, CallStatus, duration, phone, To, turns, started_at,
    )

    # Return empty TwiML (Twilio expects a 200 response)
    return Response(content="<Response/>", media_type="text/xml")
