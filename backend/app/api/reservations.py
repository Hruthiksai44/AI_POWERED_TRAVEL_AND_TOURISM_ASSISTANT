from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user, get_admin_user
from app.schemas.reservation import ReservationCreate, ReservationResponse, ReservationListResponse, ReservationUpdate
from app.services.reservation_service import (
    create_reservation, get_user_reservations, get_reservation_by_booking_id,
    cancel_reservation, modify_reservation, get_all_reservations
)
from app.models.user import User
import uuid

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.get("/my", response_model=list[ReservationListResponse])
async def my_reservations(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    reservations = await get_user_reservations(db, current_user.id)
    result = []
    for r in reservations:
        result.append(ReservationListResponse(
            booking_id=r.booking_id,
            hotel_name=r.hotel.name if r.hotel else "N/A",
            city_name=r.city.name if r.city else "N/A",
            room_type_name=r.room_type.name if r.room_type else "N/A",
            check_in_date=r.check_in_date,
            check_out_date=r.check_out_date,
            num_rooms=r.num_rooms,
            status=r.status.value if hasattr(r.status, 'value') else str(r.status),
            total_price=r.total_price,
            created_at=r.created_at,
        ))
    return result


@router.get("/{booking_id}", response_model=ReservationResponse)
async def get_reservation(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    reservation = await get_reservation_by_booking_id(db, booking_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    # Check ownership or admin
    if str(reservation.user_id) != str(current_user.id) and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReservationResponse(
        id=reservation.id,
        booking_id=reservation.booking_id,
        user_id=reservation.user_id,
        hotel_id=reservation.hotel_id,
        room_type_id=reservation.room_type_id,
        city_id=reservation.city_id,
        check_in_date=reservation.check_in_date,
        check_out_date=reservation.check_out_date,
        num_rooms=reservation.num_rooms,
        num_guests=reservation.num_guests,
        total_price=reservation.total_price,
        status=reservation.status.value if hasattr(reservation.status, 'value') else str(reservation.status),
        special_requests=reservation.special_requests,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
        cancelled_at=reservation.cancelled_at,
        hotel_name=reservation.hotel.name if reservation.hotel else None,
        room_type_name=reservation.room_type.name if reservation.room_type else None,
        city_name=reservation.city.name if reservation.city else None,
        itinerary_names=[ib.itinerary.name for ib in reservation.itinerary_bookings if ib.itinerary] if reservation.itinerary_bookings else [],
    )


@router.post("/", response_model=ReservationResponse, status_code=201)
async def create(
    data: ReservationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    reservation = await create_reservation(db, current_user.id, data)
    return ReservationResponse(
        id=reservation.id,
        booking_id=reservation.booking_id,
        user_id=reservation.user_id,
        hotel_id=reservation.hotel_id,
        room_type_id=reservation.room_type_id,
        city_id=reservation.city_id,
        check_in_date=reservation.check_in_date,
        check_out_date=reservation.check_out_date,
        num_rooms=reservation.num_rooms,
        num_guests=reservation.num_guests,
        total_price=reservation.total_price,
        status=reservation.status.value if hasattr(reservation.status, 'value') else str(reservation.status),
        special_requests=reservation.special_requests,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
        hotel_name=reservation.hotel.name if reservation.hotel else None,
        room_type_name=reservation.room_type.name if reservation.room_type else None,
        city_name=reservation.city.name if reservation.city else None,
        itinerary_names=[],
    )


@router.get("/", response_model=list[ReservationListResponse])
async def list_all(
    skip: int = 0,
    limit: int = 50,
    status_filter: str = None,
    search: str = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    reservations = await get_all_reservations(db, skip, limit, status_filter, search)
    result = []
    for r in reservations:
        result.append(ReservationListResponse(
            booking_id=r.booking_id,
            hotel_name=r.hotel.name if r.hotel else "N/A",
            city_name=r.city.name if r.city else "N/A",
            room_type_name=r.room_type.name if r.room_type else "N/A",
            check_in_date=r.check_in_date,
            check_out_date=r.check_out_date,
            num_rooms=r.num_rooms,
            status=r.status.value if hasattr(r.status, 'value') else str(r.status),
            total_price=r.total_price,
            created_at=r.created_at,
        ))
    return result
