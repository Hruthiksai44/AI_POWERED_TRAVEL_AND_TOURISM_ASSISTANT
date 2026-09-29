from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user, get_admin_user
from app.schemas.city import (
    CityCreate, CityUpdate, CityResponse, CityListResponse, CityDetailResponse,
    AttractionCreate, AttractionResponse, FoodCreate, FoodResponse
)
from app.services.city_service import (
    get_all_cities, get_city_by_id, create_city, update_city, delete_city,
    add_attraction, update_attraction, delete_attraction,
    add_food, update_food, delete_food, search_cities
)
from app.models.user import User
import uuid

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get("/", response_model=list[CityListResponse])
async def list_cities(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    cities = await get_all_cities(db, skip, limit)
    return cities


@router.get("/search", response_model=list[CityListResponse])
async def search(q: str, db: AsyncSession = Depends(get_db)):
    cities = await search_cities(db, q)
    return cities


@router.get("/{city_id}", response_model=CityResponse)
async def get_city(city_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    city = await get_city_by_id(db, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city


@router.post("/", response_model=CityResponse, status_code=status.HTTP_201_CREATED)
async def create(data: CityCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return await create_city(db, data)


@router.put("/{city_id}", response_model=CityResponse)
async def update(city_id: uuid.UUID, data: CityUpdate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    city = await update_city(db, city_id, data)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city


@router.delete("/{city_id}")
async def delete(city_id: uuid.UUID, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    success = await delete_city(db, city_id)
    if not success:
        raise HTTPException(status_code=404, detail="City not found")
    return {"message": "City deleted"}


# Attractions
@router.post("/{city_id}/attractions", response_model=AttractionResponse, status_code=201)
async def create_attraction(city_id: uuid.UUID, data: AttractionCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return await add_attraction(db, city_id, data)


@router.put("/attractions/{attraction_id}", response_model=AttractionResponse)
async def edit_attraction(attraction_id: uuid.UUID, data: AttractionCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await update_attraction(db, attraction_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return result


@router.delete("/attractions/{attraction_id}")
async def remove_attraction(attraction_id: uuid.UUID, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    success = await delete_attraction(db, attraction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return {"message": "Attraction deleted"}


# Foods
@router.post("/{city_id}/foods", response_model=FoodResponse, status_code=201)
async def create_food(city_id: uuid.UUID, data: FoodCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return await add_food(db, city_id, data)


@router.put("/foods/{food_id}", response_model=FoodResponse)
async def edit_food(food_id: uuid.UUID, data: FoodCreate, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await update_food(db, food_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Food not found")
    return result


@router.delete("/foods/{food_id}")
async def remove_food(food_id: uuid.UUID, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    success = await delete_food(db, food_id)
    if not success:
        raise HTTPException(status_code=404, detail="Food not found")
    return {"message": "Food deleted"}
