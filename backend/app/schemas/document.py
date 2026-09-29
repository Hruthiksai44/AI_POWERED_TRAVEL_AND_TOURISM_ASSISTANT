import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    collection_name: str
    created_at: datetime
    processed_at: Optional[datetime] = None


class AnalyticsDashboard(BaseModel):
    total_calls: int = 0
    successful_calls: int = 0
    unsuccessful_calls: int = 0
    success_ratio: float = 0.0
    total_reservations: int = 0
    total_revenue: float = 0.0
    active_users: int = 0
    popular_cities: list[dict] = []
    popular_hotels: list[dict] = []
    popular_itineraries: list[dict] = []
