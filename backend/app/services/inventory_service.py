"""
Inventory service – date-aware room inventory management.

**Critical design rule**: each ``Inventory`` row represents a single
``room_type`` on a single ``date``.  Availability checks span the full
date range ``[check_in, check_out)`` and return the *minimum* available
rooms across all dates.
"""

import uuid
import logging
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import Inventory
from app.models.hotel import Hotel, RoomType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _date_range(start: date, end: date) -> list[date]:
    """Return a list of dates from *start* (inclusive) to *end* (exclusive)."""
    days: list[date] = []
    current = start
    while current < end:
        days.append(current)
        current += timedelta(days=1)
    return days


# ---------------------------------------------------------------------------
# Core operations
# ---------------------------------------------------------------------------


async def get_or_create_inventory(
    db: AsyncSession,
    room_type_id: uuid.UUID,
    inv_date: date,
    total_rooms: int,
) -> Inventory:
    """Fetch inventory for *room_type_id* / *inv_date*, creating it if absent.

    Uses the provided *total_rooms* only when creating a new row.
    """
    result = await db.execute(
        select(Inventory).where(
            Inventory.room_type_id == room_type_id,
            Inventory.date == inv_date,
        )
    )
    inventory = result.scalars().first()
    if inventory is not None:
        return inventory

    inventory = Inventory(
        room_type_id=room_type_id,
        date=inv_date,
        total_rooms=total_rooms,
        booked_rooms=0,
    )
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)
    return inventory


async def check_availability(
    db: AsyncSession,
    hotel_id: uuid.UUID | None,
    city_id: uuid.UUID | None = None,
    check_in: date = None,
    check_out: date = None,
    room_category: str | None = None,
    num_rooms: int = 1,
) -> list[dict]:
    """Check room availability for a hotel or all hotels in a city.

    Returns a list of dicts, one per matching ``RoomType``, each containing:
    - hotel_id, hotel_name, room_type_id, room_type_name, category
    - available_rooms, price_per_night, total_price, num_nights

    If *room_category* is provided, only room types of that category are
    checked.
    """
    # Determine which room types to check
    if hotel_id:
        rt_query = select(RoomType).where(
            RoomType.hotel_id == hotel_id,
            RoomType.is_active == True,  # noqa: E712
        )
    elif city_id:
        # Get all hotels in the city, then their room types
        hotel_result = await db.execute(
            select(Hotel).where(Hotel.city_id == city_id, Hotel.is_active == True)
        )
        hotels = list(hotel_result.scalars().all())
        if not hotels:
            return []
        hotel_ids = [h.id for h in hotels]
        rt_query = select(RoomType).where(
            RoomType.hotel_id.in_(hotel_ids),
            RoomType.is_active == True,  # noqa: E712
        )
    else:
        return []
    if room_category is not None:
        rt_query = rt_query.where(RoomType.category == room_category)

    rt_result = await db.execute(rt_query)
    room_types = list(rt_result.scalars().all())

    if not room_types:
        return []

    dates = _date_range(check_in, check_out)
    if not dates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out must be after check_in",
        )

    availability_results: list[dict] = []

    for rt in room_types:
        # Fetch existing inventory rows for this room type + date range
        inv_result = await db.execute(
            select(Inventory).where(
                Inventory.room_type_id == rt.id,
                Inventory.date.in_(dates),
            )
        )
        inv_rows = {inv.date: inv for inv in inv_result.scalars().all()}

        daily: list[tuple[date, int]] = []
        min_available: int = rt.total_rooms  # default when no row exists

        for d in dates:
            if d in inv_rows:
                avail = inv_rows[d].available_rooms
            else:
                # No inventory row yet → full capacity available
                avail = rt.total_rooms
            daily.append((d, avail))
            min_available = min(min_available, avail)

        if min_available >= num_rooms:
            # Get the hotel name
            hotel_result = await db.execute(select(Hotel).where(Hotel.id == rt.hotel_id))
            hotel = hotel_result.scalars().first()
            hotel_name = hotel.name if hotel else "Unknown"
            num_nights = len(dates)

            availability_results.append(
                {
                    "hotel_id": str(rt.hotel_id),
                    "hotel_name": hotel_name,
                    "room_type_id": str(rt.id),
                    "room_type_name": rt.name,
                    "category": rt.category.value if hasattr(rt.category, 'value') else str(rt.category),
                    "available_rooms": min_available,
                    "price_per_night": float(rt.price_per_night),
                    "total_price": float(rt.price_per_night) * num_rooms * num_nights,
                    "num_nights": num_nights,
                }
            )

    return availability_results


async def reserve_rooms(
    db: AsyncSession,
    room_type_id: uuid.UUID,
    check_in: date,
    check_out: date,
    num_rooms: int,
) -> bool:
    """Increment ``booked_rooms`` for every night in ``[check_in, check_out)``.

    **Atomicity**: all dates are updated within the current session.  If
    any single date has insufficient availability the entire operation is
    rolled back and ``HTTPException(409)`` is raised.

    Returns ``True`` on success.
    """
    # Fetch the room type to know total_rooms
    rt_result = await db.execute(
        select(RoomType).where(RoomType.id == room_type_id)
    )
    room_type = rt_result.scalars().first()
    if room_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found",
        )

    dates = _date_range(check_in, check_out)
    if not dates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out must be after check_in",
        )

    # Ensure inventory rows exist and collect them
    inventory_rows: list[Inventory] = []
    for d in dates:
        inv = await get_or_create_inventory(
            db, room_type_id, d, room_type.total_rooms
        )
        inventory_rows.append(inv)

    # Validate availability across ALL dates first
    for inv in inventory_rows:
        if inv.available_rooms < num_rooms:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient availability on {inv.date}: "
                    f"only {inv.available_rooms} rooms available, "
                    f"{num_rooms} requested"
                ),
            )

    # Apply reservation
    for inv in inventory_rows:
        inv.booked_rooms += num_rooms

    await db.commit()
    logger.info(
        "Reserved %d room(s) for room_type %s from %s to %s",
        num_rooms, room_type_id, check_in, check_out,
    )
    return True


async def release_rooms(
    db: AsyncSession,
    room_type_id: uuid.UUID,
    check_in: date,
    check_out: date,
    num_rooms: int,
) -> bool:
    """Decrement ``booked_rooms`` for every night in ``[check_in, check_out)``.

    Used when a reservation is cancelled or modified.  ``booked_rooms``
    will never go below zero.

    Returns ``True`` on success.
    """
    dates = _date_range(check_in, check_out)

    inv_result = await db.execute(
        select(Inventory).where(
            Inventory.room_type_id == room_type_id,
            Inventory.date.in_(dates),
        )
    )
    for inv in inv_result.scalars().all():
        inv.booked_rooms = max(0, inv.booked_rooms - num_rooms)

    await db.commit()
    logger.info(
        "Released %d room(s) for room_type %s from %s to %s",
        num_rooms, room_type_id, check_in, check_out,
    )
    return True


# ---------------------------------------------------------------------------
# Query & bulk helpers
# ---------------------------------------------------------------------------


async def get_inventory_for_room_type(
    db: AsyncSession,
    room_type_id: uuid.UUID,
    start_date: date,
    end_date: date,
) -> list[Inventory]:
    """Return inventory rows for *room_type_id* within ``[start_date, end_date]``."""
    result = await db.execute(
        select(Inventory)
        .where(
            Inventory.room_type_id == room_type_id,
            Inventory.date >= start_date,
            Inventory.date <= end_date,
        )
        .order_by(Inventory.date)
    )
    return list(result.scalars().all())


async def bulk_create_inventory(
    db: AsyncSession,
    room_type_id: uuid.UUID,
    start_date: date,
    end_date: date,
    total_rooms: int,
) -> int:
    """Create inventory rows for every date in ``[start_date, end_date]``.

    Existing rows are skipped (no duplicates thanks to the unique
    constraint).  Returns the count of *newly created* rows.
    """
    # Fetch the room type to validate
    rt_result = await db.execute(
        select(RoomType).where(RoomType.id == room_type_id)
    )
    if rt_result.scalars().first() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found",
        )

    dates = _date_range(start_date, end_date + timedelta(days=1))  # inclusive end

    # Fetch already-existing dates to avoid duplicates
    existing_result = await db.execute(
        select(Inventory.date).where(
            Inventory.room_type_id == room_type_id,
            Inventory.date.in_(dates),
        )
    )
    existing_dates = {row for row in existing_result.scalars().all()}

    created = 0
    for d in dates:
        if d not in existing_dates:
            db.add(
                Inventory(
                    room_type_id=room_type_id,
                    date=d,
                    total_rooms=total_rooms,
                    booked_rooms=0,
                )
            )
            created += 1

    if created:
        await db.commit()

    logger.info(
        "Bulk-created %d inventory rows for room_type %s (%s – %s)",
        created, room_type_id, start_date, end_date,
    )
    return created


async def update_inventory(
    db: AsyncSession,
    inventory_id: uuid.UUID,
    data: dict,
) -> Inventory:
    """Update a single inventory row (e.g. change ``total_rooms``)."""
    result = await db.execute(
        select(Inventory).where(Inventory.id == inventory_id)
    )
    inventory = result.scalars().first()
    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )
    for field, value in data.items():
        if hasattr(inventory, field) and field not in {"id", "room_type_id"}:
            setattr(inventory, field, value)
    await db.commit()
    await db.refresh(inventory)
    logger.info("Updated inventory %s", inventory.id)
    return inventory
