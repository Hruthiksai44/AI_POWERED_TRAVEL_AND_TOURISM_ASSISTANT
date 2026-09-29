"""
Security utilities for password hashing, JWT token management,
and password-reset token generation.
"""

import secrets
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.config import settings

# ---------------------------------------------------------------------------
# Password hashing (bcrypt directly - passlib has compatibility issues)
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return ``True`` when *plain_password* matches *hashed_password*."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------


def create_access_token(
    user_id: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    The payload contains:
    - **sub** – the user ID (as a string)
    - **role** – the user's role (e.g. ``"customer"`` / ``"admin"``)
    - **exp** – expiration timestamp
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT token.

    Returns the decoded payload dict on success, or ``None`` if the
    token is invalid, expired, or otherwise cannot be verified.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        # Ensure the essential claim is present
        if payload.get("sub") is None:
            return None
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Password-reset tokens
# ---------------------------------------------------------------------------


def generate_reset_token(nbytes: int = 32) -> str:
    """Generate a cryptographically-secure URL-safe reset token.

    Parameters
    ----------
    nbytes:
        Number of random bytes (default 32 → 43-char base-64 string).
    """
    return secrets.token_urlsafe(nbytes)
