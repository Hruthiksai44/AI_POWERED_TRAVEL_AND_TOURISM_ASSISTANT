"""
Authentication service – user registration, login, password reset, and
profile management.

All functions are async and operate on an injected ``AsyncSession``.
"""

import uuid
import logging
import secrets
from twilio.rest import Client
from app.config import settings
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.utils.security import hash_password, verify_password, generate_reset_token

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants

# ---------------------------------------------------------------------------
# OTP Verification
# ---------------------------------------------------------------------------

async def verify_otp(db: AsyncSession, email: str, otp: str) -> bool:
    email = email.strip().lower()
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_phone_verified:
        raise HTTPException(status_code=400, detail="Phone number is already verified")
        
    if not user.hashed_otp or not user.otp_expiry:
        raise HTTPException(status_code=400, detail="No OTP requested")
        
    if user.otp_attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP.")
        
    if user.otp_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
        
    if not verify_password(otp, user.hashed_otp):
        user.otp_attempts += 1
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    # Success!
    user.is_phone_verified = True
    user.hashed_otp = None
    user.otp_expiry = None
    user.otp_attempts = 0
    user.otp_last_sent = None
    await db.commit()
    return True

async def resend_otp(db: AsyncSession, email: str) -> bool:
    email = email.strip().lower()
    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.is_phone_verified:
        raise HTTPException(status_code=400, detail="Phone number is already verified")
        
    now = datetime.now(timezone.utc)
    if user.otp_last_sent and now < user.otp_last_sent + timedelta(seconds=OTP_COOLDOWN_SECONDS):
        raise HTTPException(status_code=429, detail="Please wait before requesting a new OTP")
        
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.hashed_otp = hash_password(otp)
    user.otp_expiry = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    user.otp_attempts = 0
    user.otp_last_sent = now
    
    await db.commit()
    
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"Your Travel Assistant verification code is {otp}. It expires in {OTP_EXPIRY_MINUTES} minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=user.phone
        )
    except Exception as e:
        logger.error("Failed to resend OTP SMS to %s: %s", user.phone, str(e))
        raise HTTPException(status_code=500, detail="Failed to send SMS")
        
    return True

# ---------------------------------------------------------------------------

RESET_TOKEN_EXPIRY_HOURS = 1

OTP_EXPIRY_MINUTES = 15
OTP_MAX_ATTEMPTS = 5
OTP_COOLDOWN_SECONDS = 60



# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


from sqlalchemy import func

async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Return the user with the given *email*, or ``None``."""
    result = await db.execute(select(User).where(func.lower(User.email) == email.strip().lower()))
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    """Return the user with *user_id*.

    Raises ``HTTPException(404)`` if not found.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


async def register_user(db: AsyncSession, user_data) -> User:
    """Create a new user after validating email uniqueness.

    ``user_data`` can be a Pydantic model or a dict containing
    *name*, *email*, *phone*, *gender*, *age*, *password*,
    and optionally *role*.

    Returns the created ``User`` instance.
    """
    # Convert Pydantic model to dict if needed
    if hasattr(user_data, 'model_dump'):
        data = user_data.model_dump()
    elif hasattr(user_data, 'dict'):
        data = user_data.dict()
    else:
        data = dict(user_data)

    data["email"] = data["email"].strip().lower()
    existing = await get_user_by_email(db, data["email"])
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    hashed = hash_password(data.pop("password"))

    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    hashed_otp = hash_password(otp)
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    otp_last_sent = datetime.now(timezone.utc)

    user = User(
        **data,
        hashed_password=hashed,
        is_phone_verified=False,
        hashed_otp=hashed_otp,
        otp_expiry=otp_expiry,
        otp_attempts=0,
        otp_last_sent=otp_last_sent
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("Registered new user %s (%s)", user.id, user.email)
    
    # Send SMS
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"Your Travel Assistant verification code is {otp}. It expires in {OTP_EXPIRY_MINUTES} minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=user.phone
        )
    except Exception as e:
        logger.error("Failed to send OTP SMS to %s: %s", user.phone, str(e))
        # We don't fail the registration if SMS fails; user can resend.
        
    return user


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    """Verify credentials and return the ``User`` or ``None``.

    Returns ``None`` when the email is unknown **or** the password does not
    match – this avoids leaking whether the account exists.
    """
    email = email.strip().lower()
    user = await get_user_by_email(db, email)
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    if not user.is_phone_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Phone number not verified",
        )
    return user


# ---------------------------------------------------------------------------
# Profile management
# ---------------------------------------------------------------------------


async def update_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    update_data,
) -> User:
    """Update mutable fields on an existing user."""
    user = await get_user_by_id(db, user_id)

    # Convert Pydantic model to dict if needed
    if hasattr(update_data, 'model_dump'):
        data = update_data.model_dump(exclude_unset=True)
    elif hasattr(update_data, 'dict'):
        data = update_data.dict(exclude_unset=True)
    else:
        data = dict(update_data)

    # Handle password change explicitly
    if "password" in data:
        data["hashed_password"] = hash_password(data.pop("password"))

    allowed_fields = {
        "name", "phone", "gender", "age", "is_active", "role",
        "hashed_password",
    }
    for field, value in data.items():
        if field in allowed_fields and hasattr(user, field):
            setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    logger.info("Updated user %s", user.id)
    return user


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


async def initiate_password_reset(db: AsyncSession, email: str) -> str:
    """Generate a reset token for the account identified by *email*.

    The token is stored on the ``User`` row together with an expiry
    timestamp.  Returns the raw token so the caller can deliver it (e.g.
    via email).

    Raises ``HTTPException(404)`` when the email is not registered.
    """
    email = email.strip().lower()
    user = await get_user_by_email(db, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email",
        )

    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(
        hours=RESET_TOKEN_EXPIRY_HOURS
    )

    await db.commit()
    await db.refresh(user)
    logger.info("Password reset initiated for user %s", user.id)
    return token


async def reset_password(
    db: AsyncSession,
    token: str,
    new_password: str,
) -> bool:
    """Consume a reset *token* and set *new_password*.

    Returns ``True`` on success.  Raises ``HTTPException`` on invalid or
    expired token.
    """
    result = await db.execute(select(User).where(User.reset_token == token))
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    if (
        user.reset_token_expiry is None
        or user.reset_token_expiry < datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired",
        )

    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expiry = None

    await db.commit()
    await db.refresh(user)
    logger.info("Password reset completed for user %s", user.id)
    return True
