from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user, get_admin_user
from app.schemas.hotel import HotelCreate, HotelUpdate, HotelResponse, HotelListResponse, RoomTypeCreate, RoomTypeResponse
from app.services.hotel_service import (
    get_all_hotels, get_hotels_by_city, get_hotel_by_id,
    create_hotel, update_hotel, delete_hotel,
    add_room_type, update_room_type, delete_room_type
)
from app.models.user import User
import uuid

router = APIRouter(prefix="/hotels", tags=["Hotels"])


@router.get("/", response_model=list[HotelListResponse])
async def list_hotels(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    return await get_all_hotels(db, skip, limit)


@router.get("/city/{city_id}", response_model=list[HotelResponse])
async def hotels_by_city(city_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await get_hotels_by_city(db, city_id)


@router.get("/{hotel_id}", response_model=HotelResponse)
async def get_hotel(hotel_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    hotel = await get_hotel_by_id(db, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel


@router.post("/", response_model=HotelResponse, status_code=201)
async def create(data: HotelCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return await create_hotel(db, data)


@router.put("/{hotel_id}", response_model=HotelResponse)
async def update(hotel_id: uuid.UUID, data: HotelUpdate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    hotel = await update_hotel(db, hotel_id, data)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return hotel


@router.delete("/{hotel_id}")
async def delete(hotel_id: uuid.UUID, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    success = await delete_hotel(db, hotel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return {"message": "Hotel deleted"}


# Room Types
@router.post("/{hotel_id}/room-types", response_model=RoomTypeResponse, status_code=201)
async def create_room_type(hotel_id: uuid.UUID, data: RoomTypeCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return await add_room_type(db, hotel_id, data)


@router.put("/room-types/{room_type_id}", response_model=RoomTypeResponse)
async def edit_room_type(room_type_id: uuid.UUID, data: RoomTypeCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await update_room_type(db, room_type_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Room type not found")
    return result


@router.delete("/room-types/{room_type_id}")
async def remove_room_type(room_type_id: uuid.UUID, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    success = await delete_room_type(db, room_type_id)
    if not success:
        raise HTTPException(status_code=404, detail="Room type not found")
    return {"message": "Room type deleted"}
