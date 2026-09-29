import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime


class ConversationCreate(BaseModel):
    city_id: Optional[uuid.UUID] = None
    language: str = "en"


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    city_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    status: str
    language: str
    summary: Optional[str] = None
    created_at: datetime
    messages: list[MessageResponse] = []


class ConversationListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: Optional[str] = None
    status: str
    language: str
    created_at: datetime
    message_count: int = 0
    city_name: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None
    city_id: Optional[uuid.UUID] = None
    language: str = "en"


class ChatResponse(BaseModel):
    response: str
    conversation_id: uuid.UUID
    tool_calls: Optional[list] = None
    booking_progress: Optional[dict] = None


class CallLogCreate(BaseModel):
    conversation_id: uuid.UUID
    duration_seconds: int = 0
    summary: Optional[str] = None
    verdict: str = "unsuccessful"
    booking_made: bool = False
    booking_id: Optional[str] = None
    language: str = "en"


class CallLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    conversation_id: uuid.UUID
    user_id: uuid.UUID
    duration_seconds: int
    summary: Optional[str] = None
    verdict: str
    booking_made: bool
    booking_id: Optional[str] = None
    language: str
    created_at: datetime
