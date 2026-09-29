from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_admin_user
from app.schemas.inventory import (
    AvailabilityQuery, AvailabilityResponse, BulkInventoryCreate,
    InventoryResponse, InventoryUpdate
)
from app.services.inventory_service import (
    check_availability, bulk_create_inventory,
    get_inventory_for_room_type, update_inventory
)
from app.models.user import User
import uuid

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.post("/check-availability", response_model=list[AvailabilityResponse])
async def check_avail(query: AvailabilityQuery, db: AsyncSession = Depends(get_db)):
    results = await check_availability(
        db, query.hotel_id, query.city_id,
        query.check_in, query.check_out,
        query.room_category, query.num_rooms
    )
    return results


@router.post("/bulk-create")
async def bulk_create(
    data: BulkInventoryCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    count = await bulk_create_inventory(
        db, data.room_type_id, data.start_date, data.end_date, data.total_rooms
    )
    return {"message": f"Created inventory for {count} dates"}


@router.get("/room-type/{room_type_id}")
async def get_room_inventory(
    room_type_id: uuid.UUID,
    start_date: str = None,
    end_date: str = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    try:
        sd = date.fromisoformat(start_date) if start_date else date.today()
        ed = date.fromisoformat(end_date) if end_date else sd + timedelta(days=30)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    inventory = await get_inventory_for_room_type(db, room_type_id, sd, ed)
    return [
        {
            "id": str(inv.id),
            "room_type_id": str(inv.room_type_id),
            "date": inv.date.isoformat(),
            "total_rooms": inv.total_rooms,
            "booked_rooms": inv.booked_rooms,
            "available_rooms": inv.total_rooms - inv.booked_rooms,
        }
        for inv in inventory
    ]


@router.put("/{inventory_id}")
async def update_inv(
    inventory_id: uuid.UUID,
    data: InventoryUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await update_inventory(db, inventory_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    return {
        "id": str(result.id),
        "total_rooms": result.total_rooms,
        "booked_rooms": result.booked_rooms,
        "available_rooms": result.total_rooms - result.booked_rooms,
    }
