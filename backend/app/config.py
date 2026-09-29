from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/travel_assistant"
    
    # JWT
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = "../data/chromadb"
    
    # Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    
    # Whisper STT
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"
    
    # Piper TTS
    PIPER_MODELS_DIR: str = "../piper_models"
    
    # Upload
    UPLOAD_DIR: str = "../uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Twilio Voice
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_API_KEY: str = ""
    TWILIO_API_SECRET: str = ""
    TWILIO_TWIML_APP_SID: str = ""
    TWILIO_WEBHOOK_BASE_URL: str = ""
    
    @property
    def sync_database_url(self) -> str:
        return self.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

# Ensure directories exist
BASE_DIR = Path(__file__).resolve().parent.parent
for dir_path in [
    Path(settings.CHROMA_PERSIST_DIR),
    Path(settings.UPLOAD_DIR),
    Path(settings.PIPER_MODELS_DIR),
]:
    abs_path = dir_path if dir_path.is_absolute() else BASE_DIR / dir_path
    abs_path.mkdir(parents=True, exist_ok=True)
