"""
Reservation service – booking lifecycle management.

Booking ID format: ``BK`` + ``YYYYMMDD`` + 4 random uppercase alphanumeric
characters, e.g. ``BK20260617XY3Z``.

**Business rule**: if ``itinerary_id`` is supplied the reservation *must*
include a hotel booking – itinerary-only reservations are invalid.
"""

import uuid
import random
import string
import logging
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.reservation import Reservation, ReservationItinerary, ReservationStatus
from app.models.hotel import RoomType
from app.services import inventory_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Booking ID generation
# ---------------------------------------------------------------------------


def generate_booking_id() -> str:
    """Generate a human-friendly booking ID.

    Format: ``BK`` + ``YYYYMMDD`` + 4 random uppercase alphanumeric chars.
    Example: ``BK20260617XY3Z``
    """
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_part = "".join(
        random.choices(string.ascii_uppercase + string.digits, k=4)
    )
    return f"BK{date_part}{random_part}"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _calculate_num_nights(check_in: date, check_out: date) -> int:
    """Return the number of nights between *check_in* and *check_out*."""
    nights = (check_out - check_in).days
    if nights <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="check_out must be after check_in",
        )
    return nights


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_reservation(
    db: AsyncSession,
    user_id: uuid.UUID,
    reservation_data: dict,
) -> Reservation:
    """Create a new reservation.

    ``reservation_data`` must include:
    - ``hotel_id``, ``room_type_id``, ``city_id``
    - ``check_in_date``, ``check_out_date``
    - ``num_rooms``, ``num_guests``

    Optional:
    - ``itinerary_id``      (attaches an itinerary)
    - ``special_requests``
    - ``conversation_id``

    The function:
    1.  Validates the room type and fetches ``price_per_night``.
    2.  Calculates ``total_price = price_per_night × num_rooms × num_nights``.
    3.  Reserves inventory via ``inventory_service.reserve_rooms``.
    4.  Persists the ``Reservation`` (and ``ReservationItinerary`` if needed).
    """
    # --- Enforce business rule: itinerary requires hotel reservation -------
    print("[Booking Debug] create_reservation called", flush=True)
    print(f"[Booking Debug]   user_id                  = {user_id!r}", flush=True)
    print(f"[Booking Debug]   type(reservation_data)   = {type(reservation_data).__name__!r}", flush=True)
    print(f"[Booking Debug]   repr(reservation_data)   = {reservation_data!r}", flush=True)

    itinerary_id = reservation_data.pop("itinerary_id", None)
    print(f"[Booking Debug]   after .pop(), itinerary_id = {itinerary_id!r}", flush=True)

    hotel_id = reservation_data.get("hotel_id")
    if itinerary_id and not hotel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Itinerary booking requires a hotel reservation",
        )

    # --- Fetch room type & price -------------------------------------------
    room_type_id: uuid.UUID = reservation_data["room_type_id"]
    rt_result = await db.execute(
        select(RoomType).where(RoomType.id == room_type_id)
    )
    room_type = rt_result.scalars().first()
    if room_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found",
        )

    check_in: date = reservation_data["check_in_date"]
    check_out: date = reservation_data["check_out_date"]
    num_rooms: int = reservation_data.get("num_rooms", 1)

    num_nights = _calculate_num_nights(check_in, check_out)
    total_price = room_type.price_per_night * num_rooms * num_nights

    # --- Reserve inventory --------------------------------------------------
    await inventory_service.reserve_rooms(
        db, room_type_id, check_in, check_out, num_rooms
    )

    # --- Create reservation -------------------------------------------------
    booking_id = generate_booking_id()
    reservation = Reservation(
        booking_id=booking_id,
        user_id=user_id,
        hotel_id=reservation_data["hotel_id"],
        room_type_id=room_type_id,
        city_id=reservation_data["city_id"],
        check_in_date=check_in,
        check_out_date=check_out,
        num_rooms=num_rooms,
        num_guests=reservation_data.get("num_guests", 1),
        total_price=total_price,
        status=ReservationStatus.CONFIRMED,
        special_requests=reservation_data.get("special_requests"),
        conversation_id=reservation_data.get("conversation_id"),
    )
    db.add(reservation)
    await db.flush()  # get reservation.id before linking itinerary
    print(f"[Booking Debug]   db.flush() OK — reservation.id={reservation.id!r}", flush=True)

    # --- Attach itinerary if provided ---------------------------------------
    if itinerary_id:
        ri = ReservationItinerary(
            reservation_id=reservation.id,
            itinerary_id=itinerary_id,
        )
        db.add(ri)

    await db.commit()
    print(f"[Booking Debug]   db.commit() OK — booking_id={booking_id!r}", flush=True)
    await db.refresh(reservation)
    logger.info(
        "Created reservation %s (booking_id=%s) for user %s",
        reservation.id, booking_id, user_id,
    )
    return reservation


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_user_reservations(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Reservation]:
    """Return all reservations for *user_id*, newest first."""
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.hotel),
            selectinload(Reservation.room_type),
            selectinload(Reservation.city),
            selectinload(Reservation.itinerary_bookings),
        )
        .where(Reservation.user_id == user_id)
        .order_by(Reservation.created_at.desc())
    )
    return list(result.scalars().all())


async def get_reservation_by_booking_id(
    db: AsyncSession,
    booking_id: str,
) -> Reservation:
    """Return a reservation by its human-readable *booking_id*.

    All major relationships are eagerly loaded.
    """
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.user),
            selectinload(Reservation.hotel),
            selectinload(Reservation.room_type),
            selectinload(Reservation.city),
            selectinload(Reservation.itinerary_bookings),
        )
        .where(Reservation.booking_id == booking_id)
    )
    reservation = result.scalars().first()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


async def get_reservation_by_id(
    db: AsyncSession,
    reservation_id: uuid.UUID,
) -> Reservation:
    """Return a reservation by primary key."""
    result = await db.execute(
        select(Reservation)
        .options(
            selectinload(Reservation.hotel),
            selectinload(Reservation.room_type),
            selectinload(Reservation.city),
            selectinload(Reservation.itinerary_bookings),
        )
        .where(Reservation.id == reservation_id)
    )
    reservation = result.scalars().first()
    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


async def get_all_reservations(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status_filter: str | None = None,
    search: str | None = None,
) -> list[Reservation]:
    """Return reservations with optional filters (admin endpoint).

    *status_filter* matches the ``ReservationStatus`` enum value.
    *search* matches against ``booking_id``.
    """
    query = (
        select(Reservation)
        .options(
            selectinload(Reservation.user),
            selectinload(Reservation.hotel),
            selectinload(Reservation.room_type),
            selectinload(Reservation.city),
        )
    )
    if status_filter:
        query = query.where(Reservation.status == status_filter)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Reservation.booking_id.ilike(pattern),
            )
        )
    query = query.order_by(Reservation.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------


async def cancel_reservation(
    db: AsyncSession,
    booking_id: str,
    user_id: uuid.UUID,
) -> Reservation:
    """Cancel a reservation and release its inventory.

    Only the owning user (or admin via a separate endpoint) may cancel.
    """
    reservation = await get_reservation_by_booking_id(db, booking_id)

    if reservation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to cancel this reservation",
        )

    if reservation.status == ReservationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is already cancelled",
        )

    # Release inventory
    await inventory_service.release_rooms(
        db,
        reservation.room_type_id,
        reservation.check_in_date,
        reservation.check_out_date,
        reservation.num_rooms,
    )

    reservation.status = ReservationStatus.CANCELLED
    reservation.cancelled_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(reservation)
    logger.info("Cancelled reservation %s", booking_id)
    return reservation


# ---------------------------------------------------------------------------
# Modify
# ---------------------------------------------------------------------------


async def modify_reservation(
    db: AsyncSession,
    booking_id: str,
    user_id: uuid.UUID,
    update_data: dict,
) -> Reservation:
    """Modify dates, room count, or room type of an existing reservation.

    Workflow:
    1. Release old inventory.
    2. Apply field updates.
    3. Recalculate price.
    4. Reserve new inventory (rolls back on failure).
    5. Mark status as MODIFIED.
    """
    reservation = await get_reservation_by_booking_id(db, booking_id)

    if reservation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to modify this reservation",
        )

    if reservation.status == ReservationStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a cancelled reservation",
        )

    # --- 1. Release old inventory ------------------------------------------
    await inventory_service.release_rooms(
        db,
        reservation.room_type_id,
        reservation.check_in_date,
        reservation.check_out_date,
        reservation.num_rooms,
    )

    # --- 2. Apply updates ---------------------------------------------------
    new_room_type_id = update_data.get("room_type_id", reservation.room_type_id)
    new_check_in = update_data.get("check_in_date", reservation.check_in_date)
    new_check_out = update_data.get("check_out_date", reservation.check_out_date)
    new_num_rooms = update_data.get("num_rooms", reservation.num_rooms)
    new_num_guests = update_data.get("num_guests", reservation.num_guests)
    new_special_requests = update_data.get(
        "special_requests", reservation.special_requests
    )

    # --- 3. Recalculate price -----------------------------------------------
    rt_result = await db.execute(
        select(RoomType).where(RoomType.id == new_room_type_id)
    )
    room_type = rt_result.scalars().first()
    if room_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room type not found",
        )

    num_nights = _calculate_num_nights(new_check_in, new_check_out)
    new_total_price = room_type.price_per_night * new_num_rooms * num_nights

    # --- 4. Reserve new inventory -------------------------------------------
    await inventory_service.reserve_rooms(
        db, new_room_type_id, new_check_in, new_check_out, new_num_rooms
    )

    # --- 5. Persist changes -------------------------------------------------
    reservation.room_type_id = new_room_type_id
    reservation.check_in_date = new_check_in
    reservation.check_out_date = new_check_out
    reservation.num_rooms = new_num_rooms
    reservation.num_guests = new_num_guests
    reservation.special_requests = new_special_requests
    reservation.total_price = new_total_price
    reservation.status = ReservationStatus.MODIFIED

    await db.commit()
    await db.refresh(reservation)
    logger.info("Modified reservation %s", booking_id)
    return reservation
