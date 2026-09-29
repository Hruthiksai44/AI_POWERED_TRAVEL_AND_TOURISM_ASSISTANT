import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Float, Integer, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum


class RoomCategory(str, enum.Enum):
    AC = "ac"
    NON_AC = "non_ac"
    DELUXE = "deluxe"


class Hotel(Base):
    __tablename__ = "hotels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    amenities: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of amenities list
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    check_in_time: Mapped[str] = mapped_column(String(10), default="14:00")
    check_out_time: Mapped[str] = mapped_column(String(10), default="11:00")
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    city = relationship("City", back_populates="hotels")
    room_types = relationship("RoomType", back_populates="hotel", cascade="all, delete-orphan", lazy="selectin")
    reservations = relationship("Reservation", back_populates="hotel", lazy="selectin")

    def __repr__(self):
        return f"<Hotel(id={self.id}, name={self.name})>"


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    hotel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[RoomCategory] = mapped_column(SAEnum(RoomCategory), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_per_night: Mapped[float] = mapped_column(Float, nullable=False)
    max_occupancy: Mapped[int] = mapped_column(Integer, default=2)
    total_rooms: Mapped[int] = mapped_column(Integer, nullable=False)
    amenities: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    hotel = relationship("Hotel", back_populates="room_types")
    inventory = relationship("Inventory", back_populates="room_type", cascade="all, delete-orphan", lazy="selectin")

    def __repr__(self):
        return f"<RoomType(id={self.id}, category={self.category}, hotel_id={self.hotel_id})>"
