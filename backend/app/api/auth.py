from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, PasswordReset, PasswordResetConfirm, UserVerifyOTP, UserResendOTP
from app.services.auth_service import register_user, authenticate_user, initiate_password_reset, reset_password, verify_otp, resend_otp
from app.utils.security import create_access_token
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await register_user(db, user_data)
    return user


@router.post("/verify-phone-otp")
async def verify_phone(data: UserVerifyOTP, db: AsyncSession = Depends(get_db)):
    success = await verify_otp(db, data.email, data.otp)
    return {"message": "Phone number verified successfully"}


@router.post("/resend-phone-otp")
async def resend_phone_otp(data: UserResendOTP, db: AsyncSession = Depends(get_db)):
    await resend_otp(db, data.email)
    return {"message": "OTP resent successfully"}


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(str(user.id), user.role.value)
    return Token(access_token=access_token)


@router.post("/forgot-password")
async def forgot_password(data: PasswordReset, db: AsyncSession = Depends(get_db)):
    token = await initiate_password_reset(db, data.email)
    # In production, send email with reset link
    return {"message": "If the email exists, a reset link has been sent", "reset_token": token}


@router.post("/reset-password")
async def reset_pwd(data: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    success = await reset_password(db, data.token, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return {"message": "Password reset successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user
