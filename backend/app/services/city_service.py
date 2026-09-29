"""
City service – CRUD operations for cities, attractions, and food items.

Relationships (attractions, foods) are eagerly loaded via ``selectin``
on the model, so single-city fetches return complete data.
"""

import uuid
import logging

from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.city import City, Attraction, Food

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# City CRUD
# ---------------------------------------------------------------------------


async def get_all_cities(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
) -> list[City]:
    """Return a paginated list of active cities."""
    result = await db.execute(
        select(City)
        .where(City.is_active == True)  # noqa: E712
        .order_by(City.name)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_city_by_id(db: AsyncSession, city_id: uuid.UUID) -> City:
    """Return a single city with its attractions and foods eagerly loaded.

    Raises ``HTTPException(404)`` if not found.
    """
    result = await db.execute(
        select(City)
        .options(selectinload(City.attractions), selectinload(City.foods))
        .where(City.id == city_id)
    )
    city = result.scalars().first()
    if city is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="City not found",
        )
    return city


async def create_city(db: AsyncSession, city_data: dict) -> City:
    """Create a new city record."""
    city = City(**city_data)
    db.add(city)
    await db.commit()
    await db.refresh(city)
    logger.info("Created city %s (%s)", city.id, city.name)
    return city


async def update_city(
    db: AsyncSession,
    city_id: uuid.UUID,
    city_data: dict,
) -> City:
    """Update mutable fields on an existing city.

    Raises ``HTTPException(404)`` when the city does not exist.
    """
    city = await get_city_by_id(db, city_id)
    for field, value in city_data.items():
        if hasattr(city, field):
            setattr(city, field, value)
    await db.commit()
    await db.refresh(city)
    logger.info("Updated city %s", city.id)
    return city


async def delete_city(db: AsyncSession, city_id: uuid.UUID) -> bool:
    """Soft-delete a city by setting ``is_active = False``.

    Returns ``True`` on success.
    """
    city = await get_city_by_id(db, city_id)
    city.is_active = False
    await db.commit()
    logger.info("Soft-deleted city %s", city.id)
    return True


async def search_cities(db: AsyncSession, query: str) -> list[City]:
    """Search cities by name, state, or country (case-insensitive)."""
    pattern = f"%{query}%"
    result = await db.execute(
        select(City)
        .where(
            City.is_active == True,  # noqa: E712
            or_(
                City.name.ilike(pattern),
                City.state.ilike(pattern),
                City.country.ilike(pattern),
            ),
        )
        .order_by(City.name)
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Attraction CRUD
# ---------------------------------------------------------------------------


async def add_attraction(
    db: AsyncSession,
    city_id: uuid.UUID,
    attraction_data: dict,
) -> Attraction:
    """Create a new attraction under *city_id*.

    Validates the parent city exists before creation.
    """
    await get_city_by_id(db, city_id)  # ensure city exists
    attraction = Attraction(city_id=city_id, **attraction_data)
    db.add(attraction)
    await db.commit()
    await db.refresh(attraction)
    logger.info("Added attraction %s to city %s", attraction.id, city_id)
    return attraction


async def update_attraction(
    db: AsyncSession,
    attraction_id: uuid.UUID,
    data: dict,
) -> Attraction:
    """Update an existing attraction.

    Raises ``HTTPException(404)`` if the attraction does not exist.
    """
    result = await db.execute(
        select(Attraction).where(Attraction.id == attraction_id)
    )
    attraction = result.scalars().first()
    if attraction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found",
        )
    for field, value in data.items():
        if hasattr(attraction, field):
            setattr(attraction, field, value)
    await db.commit()
    await db.refresh(attraction)
    logger.info("Updated attraction %s", attraction.id)
    return attraction


async def delete_attraction(db: AsyncSession, attraction_id: uuid.UUID) -> bool:
    """Hard-delete an attraction.  Returns ``True`` on success."""
    result = await db.execute(
        select(Attraction).where(Attraction.id == attraction_id)
    )
    attraction = result.scalars().first()
    if attraction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attraction not found",
        )
    await db.delete(attraction)
    await db.commit()
    logger.info("Deleted attraction %s", attraction_id)
    return True


# ---------------------------------------------------------------------------
# Food CRUD
# ---------------------------------------------------------------------------


async def add_food(
    db: AsyncSession,
    city_id: uuid.UUID,
    food_data: dict,
) -> Food:
    """Create a new food item under *city_id*."""
    await get_city_by_id(db, city_id)  # ensure city exists
    food = Food(city_id=city_id, **food_data)
    db.add(food)
    await db.commit()
    await db.refresh(food)
    logger.info("Added food %s to city %s", food.id, city_id)
    return food


async def update_food(
    db: AsyncSession,
    food_id: uuid.UUID,
    data: dict,
) -> Food:
    """Update an existing food item."""
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalars().first()
    if food is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food not found",
        )
    for field, value in data.items():
        if hasattr(food, field):
            setattr(food, field, value)
    await db.commit()
    await db.refresh(food)
    logger.info("Updated food %s", food.id)
    return food


async def delete_food(db: AsyncSession, food_id: uuid.UUID) -> bool:
    """Hard-delete a food item.  Returns ``True`` on success."""
    result = await db.execute(select(Food).where(Food.id == food_id))
    food = result.scalars().first()
    if food is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food not found",
        )
    await db.delete(food)
    await db.commit()
    logger.info("Deleted food %s", food_id)
    return True
