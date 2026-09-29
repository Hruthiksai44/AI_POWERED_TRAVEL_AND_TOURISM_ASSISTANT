import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ItineraryActivityCreate(BaseModel):
    order: int
    time: Optional[str] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None


class ItineraryActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    order: int
    time: Optional[str] = None
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None


class ItineraryDayCreate(BaseModel):
    day_number: int
    title: str
    description: Optional[str] = None
    activities: list[ItineraryActivityCreate] = []


class ItineraryDayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    day_number: int
    title: str
    description: Optional[str] = None
    activities: list[ItineraryActivityResponse] = []


class ItineraryCreate(BaseModel):
    city_id: uuid.UUID
    name: str
    description: str
    duration_days: int
    price: float
    image_url: Optional[str] = None
    highlights: Optional[str] = None
    days: list[ItineraryDayCreate] = []


class ItineraryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    highlights: Optional[str] = None


class ItineraryListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    description: str
    duration_days: int
    price: float
    image_url: Optional[str] = None


class ItineraryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    description: str
    duration_days: int
    price: float
    image_url: Optional[str] = None
    highlights: Optional[str] = None
    is_active: bool
    created_at: datetime
    days: list[ItineraryDayResponse] = []
