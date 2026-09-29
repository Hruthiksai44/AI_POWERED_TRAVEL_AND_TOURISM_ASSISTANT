from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db, get_admin_user
from app.models.user import User
from app.models.conversation import CallLog
import logging
from twilio.rest import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/settings")
async def get_settings(admin: User = Depends(get_admin_user)):
    from app.config import settings
    return {
        "groq_model": settings.GROQ_MODEL,
        "whisper_model": settings.WHISPER_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "max_upload_size": settings.MAX_UPLOAD_SIZE,
        "debug": settings.DEBUG,
        "supported_languages": ["en", "hi", "te"],
        "language_names": {"en": "English", "hi": "Hindi", "te": "Telugu"},
    }


@router.put("/settings")
async def update_settings(
    settings_data: dict,
    admin: User = Depends(get_admin_user),
):
    # In production, persist to DB or config file
    return {"message": "Settings updated", "settings": settings_data}


@router.get("/call-logs")
async def get_call_logs(
    skip: int = 0, limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CallLog).order_by(CallLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "conversation_id": str(l.conversation_id),
            "user_id": str(l.user_id),
            "duration_seconds": l.duration_seconds,
            "summary": l.summary,
            "verdict": l.verdict.value if hasattr(l.verdict, 'value') else str(l.verdict),
            "booking_made": l.booking_made,
            "booking_id": l.booking_id,
            "language": l.language,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.get("/users")
async def admin_list_users(
    skip: int = 0, limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role.value if hasattr(u.role, 'value') else str(u.role),
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/users/{user_id}/call")
async def call_user(
    user_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from app.config import settings
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if not user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a phone number"
        )
        
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_PHONE_NUMBER:
        logger.error("Twilio credentials not configured for outbound calling")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Twilio not fully configured"
        )
        
    base_url = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
    if not base_url:
        logger.error("TWILIO_WEBHOOK_BASE_URL not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Twilio webhook base URL not configured"
        )
        
    webhook_url = f"{base_url}/api/twilio/voice/outbound_answered?user_id={user.id}"

    # --- Sign the webhook URL with an HMAC token ---
    # Twilio trial accounts do NOT send X-Twilio-Signature on outbound
    # call webhooks.  We secure the endpoint with a server-generated
    # HMAC-SHA256 token instead (keyed on TWILIO_AUTH_TOKEN).
    import hmac, hashlib, time as _time
    ts = str(int(_time.time()))
    mac = hmac.new(
        settings.TWILIO_AUTH_TOKEN.encode(),
        f"{user.id}:{ts}".encode(),
        hashlib.sha256,
    ).hexdigest()
    webhook_url += f"&ts={ts}&sig={mac}"

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        call = client.calls.create(
            to=user.phone,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=webhook_url
        )
        logger.info(f"Initiated outbound call to {user.phone} for user {user.id}, CallSid: {call.sid}")
        return {"status": "success", "call_sid": call.sid}
    except Exception as e:
        logger.error(f"Failed to initiate Twilio call: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Twilio API error: {str(e)}"
        )
