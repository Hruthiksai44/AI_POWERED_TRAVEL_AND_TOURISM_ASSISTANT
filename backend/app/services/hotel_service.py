"""
Hotel service – CRUD operations for hotels and room types.

Room types are eagerly loaded via ``selectinload`` on single-hotel queries.
"""

import uuid
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.hotel import Hotel, RoomType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Hotel CRUD
# ---------------------------------------------------------------------------


async def get_all_hotels(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
) -> list[Hotel]:
    """Return a paginated list of active hotels."""
    result = await db.execute(
        select(Hotel)
        .where(Hotel.is_active == True)  # noqa: E712
        .order_by(Hotel.name)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_hotels_by_city(
    db: AsyncSession,
    city_id: uuid.UUID,
) -> list[Hotel]:
    """Return all active hotels in a given city."""
    result = await db.execute(
        select(Hotel)
        .where(Hotel.city_id == city_id, Hotel.is_active == True)  # noqa: E712
        .order_by(Hotel.name)
    )
    return list(result.scalars().all())


async def get_hotel_by_id(db: AsyncSession, hotel_id: uuid.UUID) -> Hotel:
    """Return a single hotel with room_types eagerly loaded.

    Raises ``HTTPException(404)`` if not found.
    """
    result = await db.execute(
        select(Hotel)
        .options(selectinload(Hotel.room_types))
        .where(Hotel.id == hotel_id)
    )
    hotel = result.scalars().first()
    if hotel is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hotel not found",
        )
    return hotel


async def create_hotel(db: AsyncSession, hotel_data: dict) -> Hotel:
    """Create a new hotel record."""
    hotel = Hotel(**hotel_data)
    db.add(hotel)
    await db.commit()
    await db.refresh(hotel)
    logger.info("Created hotel %s (%s)", hotel.id, hotel.name)
    return hotel


async def update_hotel(
    db: AsyncSession,
    hotel_id: uuid.UUID,
    hotel_data: dict,
) -> Hotel:
    """Update mutable fields on an existing hotel."""
    hotel = await get_hotel_by_id(db, hotel_id)
    for field, value in hotel_data.items():
        if hasattr(hotel, field):
            setattr(hotel, field, value)
    await db.commit()
    await db.refresh(hotel)
    logger.info("Updated hotel %s", hotel.id)
    return hotel


async def delete_hotel(db: AsyncSession, hotel_id: uuid.UUID) -> bool:
    """Soft-delete a hotel by setting ``is_active = False``."""
    hotel = await get_hotel_by_id(db, hotel_id)
    hotel.is_active = False
    await db.commit()
    logger.info("Soft-deleted hotel %s", hotel.id)
    return True


# ---------------------------------------------------------------------------
# RoomType CRUD
# ---------------------------------------------------------------------------


async def add_room_type(
    db: AsyncSession,
    hotel_id: uuid.UUID,
    room_type_data: dict,
) -> RoomType:
    """Create a new room type under *hotel_id*."""
    await get_hotel_by_id(db, hotel_id)  # ensure hotel exists
    room_type = RoomType(hotel_id=hotel_id, **room_type_data)
    db.add(room_type)
    await db.commit()
    await db.refresh(room_type)
    logger.info("Added room type %s to hotel %s", room_type.id, hotel_id)
    return room_type


async def update_room_type(
    db: AsyncSession,
    room_type_id: uuid.UUID,
    data: dict,
) -> RoomType:
    """Update an existing room type."""
    result = await db.execute(
        select(RoomType).where(RoomType.id == room_type_id)
    )
    room_type = result.scalars().first()
    if room_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found",
        )
    for field, value in data.items():
        if hasattr(room_type, field):
            setattr(room_type, field, value)
    await db.commit()
    await db.refresh(room_type)
    logger.info("Updated room type %s", room_type.id)
    return room_type


async def delete_room_type(
    db: AsyncSession,
    room_type_id: uuid.UUID,
) -> bool:
    """Hard-delete a room type.  Returns ``True`` on success."""
    result = await db.execute(
        select(RoomType).where(RoomType.id == room_type_id)
    )
    room_type = result.scalars().first()
    if room_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found",
        )
    await db.delete(room_type)
    await db.commit()
    logger.info("Deleted room type %s", room_type_id)
    return True
