from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_admin_user
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate, ItineraryResponse, ItineraryListResponse
from app.services.itinerary_service import (
    get_itineraries_by_city, get_itinerary_by_id,
    create_itinerary, update_itinerary, delete_itinerary
)
from app.models.user import User
import uuid

router = APIRouter(prefix="/itineraries", tags=["Itineraries"])


@router.get("/city/{city_id}", response_model=list[ItineraryListResponse])
async def by_city(city_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await get_itineraries_by_city(db, city_id)


@router.get("/{itinerary_id}", response_model=ItineraryResponse)
async def get_one(itinerary_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    it = await get_itinerary_by_id(db, itinerary_id)
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return it


@router.post("/", response_model=ItineraryResponse, status_code=201)
async def create(data: ItineraryCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return await create_itinerary(db, data)


@router.put("/{itinerary_id}", response_model=ItineraryResponse)
async def update(itinerary_id: uuid.UUID, data: ItineraryUpdate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    it = await update_itinerary(db, itinerary_id, data)
    if not it:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return it


@router.delete("/{itinerary_id}")
async def delete(itinerary_id: uuid.UUID, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    success = await delete_itinerary(db, itinerary_id)
    if not success:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    return {"message": "Itinerary deleted"}
