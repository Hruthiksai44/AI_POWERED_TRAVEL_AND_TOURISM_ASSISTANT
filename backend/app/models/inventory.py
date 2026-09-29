import uuid
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Inventory(Base):
    """Date-aware room inventory. Each row represents available rooms for a specific
    room_type on a specific date. This allows per-date availability tracking."""
    __tablename__ = "inventory"
    __table_args__ = (
        UniqueConstraint("room_type_id", "date", name="uq_inventory_room_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    room_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("room_types.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    total_rooms: Mapped[int] = mapped_column(Integer, nullable=False)
    booked_rooms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    room_type = relationship("RoomType", back_populates="inventory")

    @property
    def available_rooms(self) -> int:
        return self.total_rooms - self.booked_rooms

    def __repr__(self):
        return f"<Inventory(room_type_id={self.room_type_id}, date={self.date}, available={self.available_rooms})>"
