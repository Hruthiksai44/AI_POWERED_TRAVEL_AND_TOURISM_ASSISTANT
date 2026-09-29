from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_admin_user
from app.services.analytics_service import (
    get_dashboard_stats, get_daily_call_stats, get_monthly_call_stats,
    get_booking_trends, get_conversion_rates, get_revenue_by_city,
    get_popular_itineraries
)
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def dashboard(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_dashboard_stats(db)
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load dashboard statistics")


@router.get("/calls/daily")
async def daily_calls(days: int = 30, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_daily_call_stats(db, days)
    except Exception as e:
        logger.error(f"Daily call stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load daily call statistics")


@router.get("/calls/monthly")
async def monthly_calls(months: int = 12, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_monthly_call_stats(db, months)
    except Exception as e:
        logger.error(f"Monthly call stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load monthly call statistics")


@router.get("/bookings/trends")
async def booking_trends(days: int = 30, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_booking_trends(db, days)
    except Exception as e:
        logger.error(f"Booking trends error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load booking trends")


@router.get("/conversion-rates")
async def conversion_rates(days: int = 30, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_conversion_rates(db, days)
    except Exception as e:
        logger.error(f"Conversion rates error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load conversion rates")


@router.get("/revenue/by-city")
async def revenue_by_city(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_revenue_by_city(db)
    except Exception as e:
        logger.error(f"Revenue by city error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load revenue data")


@router.get("/itineraries/popular")
async def popular_itineraries(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        return await get_popular_itineraries(db)
    except Exception as e:
        logger.error(f"Popular itineraries error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load popular itineraries")
