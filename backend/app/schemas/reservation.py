import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ReservationCreate(BaseModel):
    hotel_id: uuid.UUID
    room_type_id: uuid.UUID
    city_id: uuid.UUID
    check_in_date: date
    check_out_date: date
    num_rooms: int = 1
    num_guests: int = 1
    special_requests: Optional[str] = None
    itinerary_id: Optional[uuid.UUID] = None


class ReservationUpdate(BaseModel):
    check_in_date: Optional[date] = None
    check_out_date: Optional[date] = None
    num_rooms: Optional[int] = None
    num_guests: Optional[int] = None
    room_type_id: Optional[uuid.UUID] = None


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    booking_id: str
    user_id: uuid.UUID
    hotel_id: uuid.UUID
    room_type_id: uuid.UUID
    city_id: uuid.UUID
    check_in_date: date
    check_out_date: date
    num_rooms: int
    num_guests: int
    total_price: float
    status: str
    special_requests: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    cancelled_at: Optional[datetime] = None
    hotel_name: Optional[str] = None
    room_type_name: Optional[str] = None
    city_name: Optional[str] = None
    itinerary_names: list[str] = []


class ReservationListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    booking_id: str
    hotel_name: str
    city_name: str
    room_type_name: str
    check_in_date: date
    check_out_date: date
    num_rooms: int
    status: str
    total_price: float
    created_at: datetime
