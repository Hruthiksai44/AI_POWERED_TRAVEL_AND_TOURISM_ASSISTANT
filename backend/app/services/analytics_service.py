"""
Analytics service – admin dashboard statistics and trend data.

All aggregations use SQLAlchemy ``func`` calls that map to PostgreSQL
functions (``count``, ``sum``, ``date_trunc``, ``coalesce``, etc.).
"""

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, func, case, cast, Date, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation, CallLog, CallVerdict
from app.models.reservation import Reservation, ReservationStatus
from app.models.reservation import ReservationItinerary
from app.models.user import User
from app.models.city import City
from app.models.hotel import Hotel
from app.models.itinerary import Itinerary

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dashboard summary
# ---------------------------------------------------------------------------


async def get_dashboard_stats(db: AsyncSession) -> dict:
    """Aggregate high-level metrics for the admin dashboard.

    Returns a dict with:
    - ``total_calls``, ``successful_calls``, ``unsuccessful_calls``, ``success_ratio``
    - ``total_reservations``, ``total_revenue``
    - ``active_users``
    - ``popular_cities`` (top 5 by reservation count)
    - ``popular_hotels`` (top 5 by reservation count)
    """
    # --- Call statistics ---------------------------------------------------
    call_result = await db.execute(
        select(
            func.count(CallLog.id).label("total"),
            func.count(
                case(
                    (CallLog.verdict == CallVerdict.SUCCESSFUL, CallLog.id),
                    else_=None,
                )
            ).label("successful"),
            func.count(
                case(
                    (CallLog.verdict == CallVerdict.UNSUCCESSFUL, CallLog.id),
                    else_=None,
                )
            ).label("unsuccessful"),
        )
    )
    call_row = call_result.one()
    total_calls = call_row.total or 0
    successful_calls = call_row.successful or 0
    unsuccessful_calls = call_row.unsuccessful or 0
    success_ratio = (
        round(successful_calls / total_calls, 4) if total_calls > 0 else 0.0
    )

    # --- Reservation statistics --------------------------------------------
    res_result = await db.execute(
        select(
            func.count(Reservation.id).label("total"),
            func.coalesce(func.sum(Reservation.total_price), 0).label("revenue"),
        ).where(Reservation.status != ReservationStatus.CANCELLED)
    )
    res_row = res_result.one()
    total_reservations = res_row.total or 0
    total_revenue = float(res_row.revenue)

    # --- Active users ------------------------------------------------------
    user_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)  # noqa: E712
    )
    active_users = user_result.scalar() or 0

    # --- Popular cities (top 5) --------------------------------------------
    city_result = await db.execute(
        select(
            City.name,
            func.count(Reservation.id).label("cnt"),
        )
        .join(Reservation, Reservation.city_id == City.id)
        .where(Reservation.status != ReservationStatus.CANCELLED)
        .group_by(City.name)
        .order_by(func.count(Reservation.id).desc())
        .limit(5)
    )
    popular_cities = [
        {"city": row.name, "bookings": row.cnt}
        for row in city_result.all()
    ]

    # --- Popular hotels (top 5) --------------------------------------------
    hotel_result = await db.execute(
        select(
            Hotel.name,
            func.count(Reservation.id).label("cnt"),
        )
        .join(Reservation, Reservation.hotel_id == Hotel.id)
        .where(Reservation.status != ReservationStatus.CANCELLED)
        .group_by(Hotel.name)
        .order_by(func.count(Reservation.id).desc())
        .limit(5)
    )
    popular_hotels = [
        {"hotel": row.name, "bookings": row.cnt}
        for row in hotel_result.all()
    ]

    return {
        "total_calls": total_calls,
        "successful_calls": successful_calls,
        "unsuccessful_calls": unsuccessful_calls,
        "success_ratio": success_ratio,
        "total_reservations": total_reservations,
        "total_revenue": total_revenue,
        "active_users": active_users,
        "popular_cities": popular_cities,
        "popular_hotels": popular_hotels,
    }


# ---------------------------------------------------------------------------
# Call trends
# ---------------------------------------------------------------------------


async def get_daily_call_stats(
    db: AsyncSession,
    days: int = 30,
) -> list[dict]:
    """Return daily call counts for the last *days* days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(CallLog.created_at, Date).label("day"),
            func.count(CallLog.id).label("count"),
        )
        .where(CallLog.created_at >= since)
        .group_by(cast(CallLog.created_at, Date))
        .order_by(cast(CallLog.created_at, Date))
    )
    return [{"date": str(row.day), "count": row.count} for row in result.all()]


async def get_monthly_call_stats(
    db: AsyncSession,
    months: int = 12,
) -> list[dict]:
    """Return monthly call counts for the last *months* months."""
    since = datetime.now(timezone.utc) - timedelta(days=months * 30)
    month_trunc = func.date_trunc("month", CallLog.created_at)
    result = await db.execute(
        select(
            month_trunc.label("month"),
            func.count(CallLog.id).label("count"),
        )
        .where(CallLog.created_at >= since)
        .group_by(month_trunc)
        .order_by(month_trunc)
    )
    return [
        {"month": str(row.month.date()), "count": row.count}
        for row in result.all()
    ]


# ---------------------------------------------------------------------------
# Booking trends
# ---------------------------------------------------------------------------


async def get_booking_trends(
    db: AsyncSession,
    days: int = 30,
) -> list[dict]:
    """Return daily booking and cancellation counts."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(Reservation.created_at, Date).label("day"),
            func.count(Reservation.id).label("bookings"),
            func.count(
                case(
                    (Reservation.status == ReservationStatus.CANCELLED, Reservation.id),
                    else_=None,
                )
            ).label("cancellations"),
        )
        .where(Reservation.created_at >= since)
        .group_by(cast(Reservation.created_at, Date))
        .order_by(cast(Reservation.created_at, Date))
    )
    return [
        {
            "date": str(row.day),
            "bookings": row.bookings,
            "cancellations": row.cancellations,
        }
        for row in result.all()
    ]


# ---------------------------------------------------------------------------
# Conversion rates
# ---------------------------------------------------------------------------


async def get_conversion_rates(
    db: AsyncSession,
    days: int = 30,
) -> list[dict]:
    """Return daily conversation-to-booking conversion rates.

    A "conversion" is a conversation that resulted in at least one
    reservation (linked via ``Reservation.conversation_id``).
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total conversations per day
    conv_subq = (
        select(
            cast(Conversation.created_at, Date).label("day"),
            func.count(Conversation.id).label("total_conversations"),
        )
        .where(Conversation.created_at >= since)
        .group_by(cast(Conversation.created_at, Date))
        .subquery()
    )

    # Bookings per day (tied to a conversation)
    book_subq = (
        select(
            cast(Reservation.created_at, Date).label("day"),
            func.count(Reservation.id).label("bookings"),
        )
        .where(
            Reservation.created_at >= since,
            Reservation.conversation_id.isnot(None),
            Reservation.status != ReservationStatus.CANCELLED,
        )
        .group_by(cast(Reservation.created_at, Date))
        .subquery()
    )

    result = await db.execute(
        select(
            conv_subq.c.day,
            conv_subq.c.total_conversations,
            func.coalesce(book_subq.c.bookings, 0).label("bookings"),
        )
        .outerjoin(book_subq, conv_subq.c.day == book_subq.c.day)
        .order_by(conv_subq.c.day)
    )
    rows = result.all()

    return [
        {
            "date": str(row.day),
            "total_conversations": row.total_conversations,
            "bookings": row.bookings,
            "rate": (
                round(row.bookings / row.total_conversations, 4)
                if row.total_conversations > 0
                else 0.0
            ),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Revenue by city
# ---------------------------------------------------------------------------


async def get_revenue_by_city(db: AsyncSession) -> list[dict]:
    """Return total revenue grouped by city."""
    result = await db.execute(
        select(
            City.name.label("city_name"),
            func.coalesce(func.sum(Reservation.total_price), 0).label("revenue"),
        )
        .join(Reservation, Reservation.city_id == City.id)
        .where(Reservation.status != ReservationStatus.CANCELLED)
        .group_by(City.name)
        .order_by(func.sum(Reservation.total_price).desc())
    )
    return [
        {"city_name": row.city_name, "revenue": float(row.revenue)}
        for row in result.all()
    ]


# ---------------------------------------------------------------------------
# Popular itineraries
# ---------------------------------------------------------------------------


async def get_popular_itineraries(db: AsyncSession) -> list[dict]:
    """Return itineraries ranked by booking count."""
    result = await db.execute(
        select(
            Itinerary.name.label("itinerary_name"),
            func.count(ReservationItinerary.id).label("booking_count"),
        )
        .join(
            ReservationItinerary,
            ReservationItinerary.itinerary_id == Itinerary.id,
        )
        .group_by(Itinerary.name)
        .order_by(func.count(ReservationItinerary.id).desc())
    )
    return [
        {
            "itinerary_name": row.itinerary_name,
            "booking_count": row.booking_count,
        }
        for row in result.all()
    ]
