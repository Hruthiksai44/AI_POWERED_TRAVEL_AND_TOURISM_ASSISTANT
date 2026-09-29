import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AttractionCreate(BaseModel):
    name: str
    description: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    entry_fee: Optional[str] = None
    timings: Optional[str] = None
    rating: Optional[float] = None


class AttractionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    description: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    entry_fee: Optional[str] = None
    timings: Optional[str] = None
    rating: Optional[float] = None


class FoodCreate(BaseModel):
    name: str
    description: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_vegetarian: bool = False
    price_range: Optional[str] = None


class FoodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    description: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_vegetarian: bool
    price_range: Optional[str] = None


class CityCreate(BaseModel):
    name: str
    state: str
    country: str = "India"
    description: str
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    population: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    languages: Optional[str] = None


class CityUpdate(BaseModel):
    name: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    population: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    languages: Optional[str] = None


class CityListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    state: str
    country: str
    description: str
    image_url: Optional[str] = None


class CityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    state: str
    country: str
    description: str
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    population: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    languages: Optional[str] = None
    is_active: bool
    created_at: datetime
    attractions: list[AttractionResponse] = []
    foods: list[FoodResponse] = []


class CityDetailResponse(CityResponse):
    hotel_count: int = 0
    itinerary_count: int = 0
