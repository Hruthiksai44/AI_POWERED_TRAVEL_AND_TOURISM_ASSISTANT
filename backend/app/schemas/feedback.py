import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class FeedbackCreate(BaseModel):
    rating: int
    comment: Optional[str] = None
    category: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    comment: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None
