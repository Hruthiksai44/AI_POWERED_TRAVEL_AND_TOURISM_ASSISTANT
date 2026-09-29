import uuid
import re
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    gender: str
    age: int
    password: str

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        if not v:
            return v
        cleaned = re.sub(r"[^\d+]", "", v)
        if not cleaned.startswith("+"):
            if len(cleaned) == 10:
                cleaned = f"+91{cleaned}"
            else:
                cleaned = f"+{cleaned}"
        return cleaned

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("age")
    @classmethod
    def age_valid(cls, v):
        if v < 1 or v > 150:
            raise ValueError("Age must be between 1 and 150")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    email: str
    phone: str
    gender: str
    age: int
    role: str
    is_active: bool
    is_phone_verified: bool
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        cleaned = re.sub(r"[^\d+]", "", v)
        if not cleaned.startswith("+"):
            if len(cleaned) == 10:
                cleaned = f"+91{cleaned}"
            else:
                cleaned = f"+{cleaned}"
        return cleaned


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    role: str


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class UserVerifyOTP(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_length(cls, v):
        if len(v) != 6 or not v.isdigit():
            raise ValueError("OTP must be exactly 6 digits")
        return v

class UserResendOTP(BaseModel):
    email: EmailStr
