"""
Itinerary service – CRUD operations for multi-day itineraries and their
day/activity sub-structures.
"""

import uuid
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.itinerary import Itinerary, ItineraryDay, ItineraryActivity

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_itineraries_by_city(
    db: AsyncSession,
    city_id: uuid.UUID,
) -> list[Itinerary]:
    """Return all active itineraries for a given city."""
    result = await db.execute(
        select(Itinerary)
        .where(
            Itinerary.city_id == city_id,
            Itinerary.is_active == True,  # noqa: E712
        )
        .order_by(Itinerary.duration_days, Itinerary.name)
    )
    return list(result.scalars().all())


async def get_itinerary_by_id(
    db: AsyncSession,
    itinerary_id: uuid.UUID,
) -> Itinerary:
    """Return a single itinerary with days and activities eagerly loaded.

    Raises ``HTTPException(404)`` if not found.
    """
    result = await db.execute(
        select(Itinerary)
        .options(
            selectinload(Itinerary.days).selectinload(ItineraryDay.activities),
        )
        .where(Itinerary.id == itinerary_id)
    )
    itinerary = result.scalars().first()
    if itinerary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found",
        )
    return itinerary


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_itinerary(
    db: AsyncSession,
    itinerary_data: dict,
) -> Itinerary:
    """Create an itinerary, optionally with nested days/activities.

    ``itinerary_data`` may contain a ``days`` key whose value is a list
    of day dicts, each optionally containing an ``activities`` list.

    Example::

        {
            "city_id": "...",
            "name": "...",
            "description": "...",
            "duration_days": 2,
            "price": 5000,
            "days": [
                {
                    "day_number": 1,
                    "title": "Arrival",
                    "activities": [
                        {"order": 1, "title": "Check-in", "time": "14:00"}
                    ]
                }
            ]
        }
    """
    days_data = itinerary_data.pop("days", None)

    itinerary = Itinerary(**itinerary_data)
    db.add(itinerary)
    await db.flush()  # get itinerary.id

    if days_data:
        for day_dict in days_data:
            activities_data = day_dict.pop("activities", None)
            day = ItineraryDay(itinerary_id=itinerary.id, **day_dict)
            db.add(day)
            await db.flush()

            if activities_data:
                for act_dict in activities_data:
                    activity = ItineraryActivity(day_id=day.id, **act_dict)
                    db.add(activity)

    await db.commit()
    await db.refresh(itinerary)
    logger.info("Created itinerary %s (%s)", itinerary.id, itinerary.name)

    # Re-fetch with relationships loaded
    return await get_itinerary_by_id(db, itinerary.id)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def update_itinerary(
    db: AsyncSession,
    itinerary_id: uuid.UUID,
    data: dict,
) -> Itinerary:
    """Update top-level fields on an existing itinerary.

    Nested day/activity updates should be handled through dedicated
    endpoints or by re-creating the itinerary.
    """
    itinerary = await get_itinerary_by_id(db, itinerary_id)

    allowed_fields = {
        "name", "description", "duration_days", "price",
        "image_url", "highlights", "is_active",
    }
    for field, value in data.items():
        if field in allowed_fields:
            setattr(itinerary, field, value)

    await db.commit()
    await db.refresh(itinerary)
    logger.info("Updated itinerary %s", itinerary.id)
    return itinerary


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def delete_itinerary(
    db: AsyncSession,
    itinerary_id: uuid.UUID,
) -> bool:
    """Soft-delete an itinerary by setting ``is_active = False``."""
    itinerary = await get_itinerary_by_id(db, itinerary_id)
    itinerary.is_active = False
    await db.commit()
    logger.info("Soft-deleted itinerary %s", itinerary_id)
    return True
