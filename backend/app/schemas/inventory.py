import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class InventoryCreate(BaseModel):
    room_type_id: uuid.UUID
    date: date
    total_rooms: int


class BulkInventoryCreate(BaseModel):
    room_type_id: uuid.UUID
    start_date: date
    end_date: date
    total_rooms: int


class InventoryUpdate(BaseModel):
    total_rooms: Optional[int] = None
    booked_rooms: Optional[int] = None


class InventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    room_type_id: uuid.UUID
    date: date
    total_rooms: int
    booked_rooms: int
    available_rooms: int = 0

    @classmethod
    def from_inventory(cls, inv):
        return cls(
            id=inv.id,
            room_type_id=inv.room_type_id,
            date=inv.date,
            total_rooms=inv.total_rooms,
            booked_rooms=inv.booked_rooms,
            available_rooms=inv.total_rooms - inv.booked_rooms
        )


class AvailabilityQuery(BaseModel):
    city_id: Optional[uuid.UUID] = None
    hotel_id: Optional[uuid.UUID] = None
    check_in: date
    check_out: date
    room_category: Optional[str] = None
    num_rooms: int = 1


class AvailabilityResponse(BaseModel):
    hotel_id: uuid.UUID
    hotel_name: str
    room_type_id: uuid.UUID
    room_type_name: str
    category: str
    available_rooms: int
    price_per_night: float
    total_price: float
    num_nights: int
