"""Pydantic v2 schemas for analytics and admin dashboard endpoints."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """Top-level KPIs shown on the admin dashboard."""
    total_calls: int = 0
    successful_calls: int = 0
    unsuccessful_calls: int = 0
    success_ratio: float = Field(0.0, ge=0.0, le=1.0)
    total_reservations: int = 0
    total_revenue: float = 0.0
    active_users: int = 0


class PopularCity(BaseModel):
    """City ranked by booking count."""
    city_name: str
    booking_count: int


class PopularHotel(BaseModel):
    """Hotel ranked by booking count."""
    hotel_name: str
    city_name: str
    booking_count: int


class DailyCallStats(BaseModel):
    """Number of calls on a given date."""
    date: date
    count: int


class MonthlyCallStats(BaseModel):
    """Number of calls in a calendar month."""
    month: str  # e.g. "2026-06"
    count: int


class BookingTrend(BaseModel):
    """Daily booking and cancellation counts."""
    date: date
    bookings: int
    cancellations: int


class ConversionRate(BaseModel):
    """Daily conversation-to-booking conversion rate."""
    date: date
    total_conversations: int
    bookings_made: int
    rate: float = Field(0.0, ge=0.0, le=1.0)
