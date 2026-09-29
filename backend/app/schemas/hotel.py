import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RoomTypeCreate(BaseModel):
    category: str  # ac, non_ac, deluxe
    name: str
    description: Optional[str] = None
    price_per_night: float
    max_occupancy: int = 2
    total_rooms: int
    amenities: Optional[str] = None
    image_url: Optional[str] = None


class RoomTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    hotel_id: uuid.UUID
    category: str
    name: str
    description: Optional[str] = None
    price_per_night: float
    max_occupancy: int
    total_rooms: int
    amenities: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True


class HotelCreate(BaseModel):
    city_id: uuid.UUID
    name: str
    description: str
    address: str
    image_url: Optional[str] = None
    rating: float = 0.0
    amenities: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"


class HotelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    amenities: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None


class HotelListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    address: str
    image_url: Optional[str] = None
    rating: float
    is_active: bool = True


class HotelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    description: str
    address: str
    image_url: Optional[str] = None
    rating: float
    amenities: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    check_in_time: str
    check_out_time: str
    is_active: bool
    created_at: datetime
    room_types: list[RoomTypeResponse] = []
