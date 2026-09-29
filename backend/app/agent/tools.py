"""Agent tools for the Travel Assistant LangGraph agent.

Each tool is an async function that interacts with the database through services.
Tools are called by the LLM during conversation to perform real operations.

DB Session Flow
---------------
- ``set_agent_context(db, user_id)`` must be called once per request before
  invoking the agent or calling tools.
- **Complex path** (LangGraph): ``@tool`` functions read the DB session via
  ``get_agent_db()`` contextvar.
- **Simple path** (direct): callers invoke ``_impl`` functions directly,
  passing the ``db`` session as a parameter.
"""
import contextvars
import json
import logging
import uuid
from datetime import date, datetime
from typing import Optional
from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Agent context -- request-scoped DB session & user_id via contextvars
# ---------------------------------------------------------------------------

_db_context: contextvars.ContextVar[AsyncSession | None] = contextvars.ContextVar("db_session", default=None)
_user_context: contextvars.ContextVar[str | None] = contextvars.ContextVar("user_id", default=None)
_uuid_mapping_context: contextvars.ContextVar[dict | None] = contextvars.ContextVar("uuid_mapping", default=None)


def set_agent_context(db_session: AsyncSession, user_id: str, mapping: dict = None) -> None:
    """Set the request-scoped DB session, user_id, and UUID mapping for tool access.

    Must be called once in ``run_agent()`` before invoking the LangGraph
    agent or calling tool ``_impl`` functions.
    """
    _db_context.set(db_session)
    _user_context.set(user_id)
    _uuid_mapping_context.set(mapping if mapping is not None else {})


def get_agent_db():
    """Return the request-scoped DB session."""
    return _db_context.get()


def get_agent_user_id() -> str:
    """Return the authenticated user_id for the current request."""
    return _user_context.get()


# =========================================================================
# Tool implementations (_impl) -- callable directly for the simple path
# =========================================================================


async def _check_hotel_availability_impl(
    city_id: str,
    check_in_date: str,
    check_out_date: str,
    room_category: str = "",
    num_rooms: int = 1,
    *,
    db=None,
) -> str:
    from app.services.inventory_service import check_availability
    print("[Tool Debug] _check_hotel_availability_impl EXECUTED", flush=True)
    print(f"[DATE TRACE] check_hotel_availability received: check_in={check_in_date!r} check_out={check_out_date!r}", flush=True)

    db = db or get_agent_db()
    try:
        ci = date.fromisoformat(check_in_date)
        co = date.fromisoformat(check_out_date)
    except ValueError:
        return "Error: Invalid date format. Please use YYYY-MM-DD format."

    if ci >= co:
        return "Error: Check-out date must be after check-in date."

    try:
        results = await check_availability(
            db,
            hotel_id=None,
            city_id=uuid.UUID(city_id),
            check_in=ci,
            check_out=co,
            room_category=room_category or None,
            num_rooms=num_rooms,
        )
        if not results:
            return f"No rooms available for {check_in_date} to {check_out_date} with {num_rooms} room(s)."

        output = "Hotel Availability Results:\n\n"
        
        mapping = _uuid_mapping_context.get()
        if mapping is None:
            mapping = {}
            _uuid_mapping_context.set(mapping)
        
        # Save canonical dates for later defense
        mapping["_validated_check_in"] = check_in_date
        mapping["_validated_check_out"] = check_out_date

        # Reset booking progress on any new availability check
        for key in ["_selected_hotel", "_selected_room", "_num_rooms",
                     "_num_guests", "_special_requests", "_booking_executed_id"]:
            mapping.pop(key, None)
        mapping["_booking_phase"] = "AVAILABILITY_VALIDATED"
            
        # Determine reverse mapping from hotel_id -> existing index
        existing_hotel_to_idx = {}
        max_h_idx = 0
        for k, v in mapping.items():
            if k.isdigit():
                max_h_idx = max(max_h_idx, int(k))
                if isinstance(v, dict) and "hotel_id" in v:
                    existing_hotel_to_idx[v["hotel_id"]] = k

        hotel_map = {}  # Map real hotel_id to assigned index
        next_h_idx = max_h_idx + 1
        
        for r in results:
            hid_str = str(r["hotel_id"])
            rid_str = str(r["room_type_id"])
            
            if hid_str not in hotel_map:
                if hid_str in existing_hotel_to_idx:
                    assigned_h_idx = existing_hotel_to_idx[hid_str]
                else:
                    assigned_h_idx = str(next_h_idx)
                    next_h_idx += 1
                    mapping[assigned_h_idx] = {"hotel_id": hid_str, "rooms": {}}
                
                # Determine reverse mapping for rooms
                existing_room_to_idx = {}
                max_r_idx = 0
                for r_k, r_v in mapping[assigned_h_idx].get("rooms", {}).items():
                    if r_k.isdigit():
                        max_r_idx = max(max_r_idx, int(r_k))
                        existing_room_to_idx[r_v] = r_k
                
                hotel_map[hid_str] = {
                    "idx": assigned_h_idx,
                    "existing_rooms": existing_room_to_idx,
                    "next_r_idx": max_r_idx + 1
                }
                output += f"Hotel {assigned_h_idx}: {r['hotel_name']}\n"
                
            curr_h = hotel_map[hid_str]
            assigned_h_idx = curr_h["idx"]
            
            if rid_str in curr_h["existing_rooms"]:
                assigned_r_idx = curr_h["existing_rooms"][rid_str]
            else:
                assigned_r_idx = str(curr_h["next_r_idx"])
                curr_h["next_r_idx"] += 1
                mapping[assigned_h_idx]["rooms"][assigned_r_idx] = rid_str
                curr_h["existing_rooms"][rid_str] = assigned_r_idx
            
            output += f"  Room {assigned_r_idx}: {r['room_type_name']} ({r['category'].upper()})\n"
            output += f"    Available: {r['available_rooms']} rooms\n"
            output += f"    Price: ₹{r['price_per_night']}/night\n"
            output += f"    Total ({r['num_nights']} nights, {num_rooms} rooms): ₹{r['total_price']}\n\n"
            
        return output
    except Exception as e:
        return f"Error checking availability: {str(e)}"


async def _get_city_hotels_impl(city_id: str, *, db=None) -> str:
    from app.services.hotel_service import get_hotels_by_city
    print("[Tool Debug] _get_city_hotels_impl EXECUTED", flush=True)

    db = db or get_agent_db()
    try:
        hotels = await get_hotels_by_city(db, uuid.UUID(city_id))
        if not hotels:
            return "No hotels found in this city."

        output = "Hotels available:\n\n"
        mapping = _uuid_mapping_context.get()
        if mapping is None:
            mapping = {}
            _uuid_mapping_context.set(mapping)
            
        # Determine reverse mapping from hotel_id -> existing index
        existing_hotel_to_idx = {}
        max_h_idx = 0
        for k, v in mapping.items():
            if k.isdigit():
                max_h_idx = max(max_h_idx, int(k))
                if isinstance(v, dict) and "hotel_id" in v:
                    existing_hotel_to_idx[v["hotel_id"]] = k

        hotel_map = {}
        next_h_idx = max_h_idx + 1
        
        for h in hotels:
            hid_str = str(h.id)
            if hid_str not in hotel_map:
                if hid_str in existing_hotel_to_idx:
                    assigned_h_idx = existing_hotel_to_idx[hid_str]
                else:
                    assigned_h_idx = str(next_h_idx)
                    next_h_idx += 1
                    mapping[assigned_h_idx] = {"hotel_id": hid_str, "rooms": {}}
                    
                # Determine reverse mapping for rooms
                existing_room_to_idx = {}
                max_r_idx = 0
                for r_k, r_v in mapping[assigned_h_idx].get("rooms", {}).items():
                    if r_k.isdigit():
                        max_r_idx = max(max_r_idx, int(r_k))
                        existing_room_to_idx[r_v] = r_k
                        
                hotel_map[hid_str] = {
                    "idx": assigned_h_idx,
                    "existing_rooms": existing_room_to_idx,
                    "next_r_idx": max_r_idx + 1
                }
                
                output += f"Hotel {assigned_h_idx}: 🏨 {h.name}\n"
                output += f"  Rating: {'⭐' * int(h.rating)} ({h.rating})\n"
                output += f"  Address: {h.address}\n"
                
            curr_h = hotel_map[hid_str]
            assigned_h_idx = curr_h["idx"]
            
            if h.room_types:
                output += "  Room Types:\n"
                for rt in h.room_types:
                    if rt.is_active:
                        rid_str = str(rt.id)
                        
                        if rid_str in curr_h["existing_rooms"]:
                            assigned_r_idx = curr_h["existing_rooms"][rid_str]
                        else:
                            assigned_r_idx = str(curr_h["next_r_idx"])
                            curr_h["next_r_idx"] += 1
                            mapping[assigned_h_idx]["rooms"][assigned_r_idx] = rid_str
                            curr_h["existing_rooms"][rid_str] = assigned_r_idx
                            
                        output += (
                            f"    - Room {assigned_r_idx}: {rt.name} "
                            f"({rt.category.value.upper()}): ₹{rt.price_per_night}/night\n"
                        )
            output += "\n"

        # ================= DEBUG =================
        print("\n========== HOTEL TOOL OUTPUT ==========", flush=True)
        print(str(output).encode('ascii', 'replace').decode('ascii'), flush=True)
        print("=======================================\n", flush=True)
        # =========================================

        return output

    except Exception as e:
        return f"Error fetching hotels: {str(e)}"


async def _get_hotel_details_impl(hotel_id: str, *, db=None) -> str:
    from app.services.hotel_service import get_hotel_by_id

    db = db or get_agent_db()
    try:
        hotel = await get_hotel_by_id(db, uuid.UUID(hotel_id))
        if not hotel:
            return "Hotel not found."

        output = f"🏨 {hotel.name}\n"
        output += f"Rating: {'⭐' * int(hotel.rating)} ({hotel.rating})\n"
        output += f"Address: {hotel.address}\n"
        output += f"Description: {hotel.description}\n"
        output += f"Check-in: {hotel.check_in_time} | Check-out: {hotel.check_out_time}\n"
        if hotel.amenities:
            output += f"Amenities: {hotel.amenities}\n"
        if hotel.contact_phone:
            output += f"Phone: {hotel.contact_phone}\n"
        output += "\nRoom Types:\n"
        for rt in hotel.room_types:
            if rt.is_active:
                output += f"  📋 {rt.name} ({rt.category.value.upper()})\n"
                output += f"     Price: ₹{rt.price_per_night}/night\n"
                output += f"     Max Occupancy: {rt.max_occupancy}\n"
                output += f"     Total Rooms: {rt.total_rooms}\n"
                output += f"     Room Type ID: {rt.id}\n"
                if rt.description:
                    output += f"     Description: {rt.description}\n"
                output += "\n"
        return output
    except Exception as e:
        return f"Error fetching hotel details: {str(e)}"


async def _get_city_attractions_impl(city_id: str, *, db=None) -> str:
    from app.services.city_service import get_city_by_id

    db = db or get_agent_db()
    try:
        city = await get_city_by_id(db, uuid.UUID(city_id))
        if not city:
            return "City not found."
        if not city.attractions:
            return f"No attractions listed for {city.name} yet."

        output = f"Tourist Attractions in {city.name}:\n\n"
        for a in city.attractions:
            output += f"🏛️ {a.name}\n"
            output += f"  {a.description}\n"
            if a.category:
                output += f"  Category: {a.category}\n"
            if a.entry_fee:
                output += f"  Entry Fee: {a.entry_fee}\n"
            if a.timings:
                output += f"  Timings: {a.timings}\n"
            if a.rating:
                output += f"  Rating: {a.rating}/5\n"
            output += "\n"
        return output
    except Exception as e:
        return f"Error fetching attractions: {str(e)}"


async def _get_city_foods_impl(city_id: str, *, db=None) -> str:
    from app.services.city_service import get_city_by_id

    db = db or get_agent_db()
    try:
        city = await get_city_by_id(db, uuid.UUID(city_id))
        if not city:
            return "City not found."
        if not city.foods:
            return f"No foods listed for {city.name} yet."

        output = f"Famous Foods in {city.name}:\n\n"
        for f in city.foods:
            output += f"🍽️ {f.name}"
            if f.is_vegetarian:
                output += " 🟢 (Vegetarian)"
            output += f"\n  {f.description}\n"
            if f.category:
                output += f"  Category: {f.category}\n"
            if f.price_range:
                output += f"  Price Range: {f.price_range}\n"
            output += "\n"
        return output
    except Exception as e:
        return f"Error fetching foods: {str(e)}"


async def _get_city_itineraries_impl(city_id: str, *, db=None) -> str:
    from app.services.itinerary_service import get_itineraries_by_city

    db = db or get_agent_db()
    try:
        itineraries = await get_itineraries_by_city(db, uuid.UUID(city_id))
        if not itineraries:
            return "No itinerary packages available for this city."

        output = "Available Itinerary Packages:\n\n"
        for it in itineraries:
            output += f"📋 {it.name} ({it.duration_days} Day{'s' if it.duration_days > 1 else ''})\n"
            output += f"  Price: ₹{it.price}\n"
            output += f"  {it.description}\n"
            output += f"  Itinerary ID: {it.id}\n"
            if it.days:
                for day in it.days:
                    output += f"\n  Day {day.day_number}: {day.title}\n"
                    for act in day.activities:
                        time_str = f" ({act.time})" if act.time else ""
                        output += f"    • {act.title}{time_str}\n"
            output += "\n"
        return output
    except Exception as e:
        return f"Error fetching itineraries: {str(e)}"


async def _create_booking_impl(
    hotel_id: str,
    room_type_id: str,
    city_id: str,
    check_in_date: str,
    check_out_date: str,
    num_rooms: int = 1,
    num_guests: int = 1,
    special_requests: str = "",
    itinerary_id: str = "",
    *,
    user_id: str = None,
    db=None,
) -> str:
    from app.services.reservation_service import create_reservation
    from app.schemas.reservation import ReservationCreate

    db = db or get_agent_db()
    user_id = user_id or get_agent_user_id()

    print("[Tool Debug] _create_booking_impl EXECUTED", flush=True)
    print("[Booking Debug] _create_booking_impl called", flush=True)
    print(f"[DATE TRACE] create_booking received: check_in={check_in_date!r} check_out={check_out_date!r}", flush=True)
    print(f"[Booking Debug]   user_id       = {user_id!r}", flush=True)
    print(f"[Booking Debug]   hotel_id      = {hotel_id!r}", flush=True)
    print(f"[Booking Debug]   room_type_id  = {room_type_id!r}", flush=True)
    print(f"[Booking Debug]   db session    = {db!r}", flush=True)

    mapping = _uuid_mapping_context.get() or {}
    
    val_check_in = mapping.get("_validated_check_in")
    val_check_out = mapping.get("_validated_check_out")
    
    if val_check_in and val_check_in != check_in_date:
        return f"Booking rejected: requested check-in date {check_in_date} does not match the validated availability date {val_check_in}."
    if val_check_out and val_check_out != check_out_date:
        return f"Booking rejected: requested check-out date {check_out_date} does not match the validated availability date {val_check_out}."
    
    h_idx = str(hotel_id).strip()
    r_idx = str(room_type_id).strip()
    
    hotel_data = mapping.get(h_idx, {})
    real_hotel_id = hotel_data.get("hotel_id", hotel_id)
    real_room_type_id = hotel_data.get("rooms", {}).get(r_idx, room_type_id)

    if not user_id:
        return "Error creating booking: user identity is missing."

    try:
        valid_hotel_id = uuid.UUID(str(real_hotel_id))
        valid_room_type_id = uuid.UUID(str(real_room_type_id))
        valid_city_id = uuid.UUID(city_id)
        valid_itinerary_id = uuid.UUID(itinerary_id) if itinerary_id else None
    except ValueError:
        return "Error creating booking: Invalid hotel or room identifier received. Please select a hotel from the provided options instead of generating IDs."

    if num_rooms <= 0:
        return "Error creating booking: number of rooms must be greater than 0."
    
    if num_guests <= 0:
        return "Error creating booking: number of guests must be greater than 0."

    try:
        cid = date.fromisoformat(check_in_date)
        cod = date.fromisoformat(check_out_date)
        if cid >= cod:
            return "Error creating booking: check-out date must be after check-in date."
    except ValueError:
        return "Error creating booking: check-in and check-out dates must be in YYYY-MM-DD format."

    # Verify hotel, room type and city
    try:
        from app.services.hotel_service import get_hotel_by_id
        hotel = await get_hotel_by_id(db, valid_hotel_id)
    except Exception:
        return "Error creating booking: the selected hotel does not exist."
    if hotel.city_id != valid_city_id:
        return "Error creating booking: the selected hotel does not belong to the selected city."
    
    valid_room = any(rt.id == valid_room_type_id for rt in hotel.room_types)
    if not valid_room:
        return "Error creating booking: the selected room type does not belong to the selected hotel."

    try:
        data = ReservationCreate(
            hotel_id=valid_hotel_id,
            room_type_id=valid_room_type_id,
            city_id=valid_city_id,
            check_in_date=date.fromisoformat(check_in_date),
            check_out_date=date.fromisoformat(check_out_date),
            num_rooms=num_rooms,
            num_guests=num_guests,
            special_requests=special_requests or None,
            itinerary_id=valid_itinerary_id,
        )
        print(f"[DATE TRACE] Final ReservationCreate dict = {data.model_dump()!r}", flush=True)
        print(f"[Booking Debug]   ReservationCreate built: {data!r}", flush=True)

        reservation = await create_reservation(db, uuid.UUID(user_id), data.model_dump())
        print(f"[Booking Debug]   create_reservation returned booking_id={reservation.booking_id!r}", flush=True)

        return (
            f"✅ Booking Confirmed!\n\n"
            f"Booking ID: {reservation.booking_id}\n"
            f"Hotel: {reservation.hotel.name if reservation.hotel else hotel_id}\n"
            f"Room Type: {reservation.room_type.name if reservation.room_type else room_type_id}\n"
            f"Check-in: {reservation.check_in_date}\n"
            f"Check-out: {reservation.check_out_date}\n"
            f"Rooms: {reservation.num_rooms}\n"
            f"Guests: {reservation.num_guests}\n"
            f"Total Price: ₹{reservation.total_price}\n"
            f"Status: {reservation.status.value.upper()}\n"
        )
    except Exception as e:
        import traceback
        print(f"[Booking Debug] EXCEPTION in _create_booking_impl: {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        return f"Error creating booking: {str(e)}"


async def _cancel_booking_impl(booking_id: str, *, user_id: str = None, db=None) -> str:
    from app.services.reservation_service import cancel_reservation

    db = db or get_agent_db()
    user_id = user_id or get_agent_user_id()

    try:
        reservation = await cancel_reservation(db, booking_id, uuid.UUID(user_id))
        return (
            f"✅ Booking Cancelled!\n\n"
            f"Booking ID: {reservation.booking_id}\n"
            f"Status: CANCELLED\n"
            f"Room inventory has been released.\n"
        )
    except Exception as e:
        return f"Error cancelling booking: {str(e)}"


async def _modify_booking_impl(
    booking_id: str,
    check_in_date: str = "",
    check_out_date: str = "",
    num_rooms: int = 0,
    room_type_id: str = "",
    *,
    user_id: str = None,
    db=None,
) -> str:
    from app.services.reservation_service import modify_reservation
    from app.schemas.reservation import ReservationUpdate

    db = db or get_agent_db()
    user_id = user_id or get_agent_user_id()

    update_data = ReservationUpdate(
        check_in_date=date.fromisoformat(check_in_date) if check_in_date else None,
        check_out_date=date.fromisoformat(check_out_date) if check_out_date else None,
        num_rooms=num_rooms if num_rooms > 0 else None,
        room_type_id=uuid.UUID(room_type_id) if room_type_id else None,
    )

    try:
        reservation = await modify_reservation(db, booking_id, uuid.UUID(user_id), update_data)
        return (
            f"✅ Booking Modified!\n\n"
            f"Booking ID: {reservation.booking_id}\n"
            f"Check-in: {reservation.check_in_date}\n"
            f"Check-out: {reservation.check_out_date}\n"
            f"Rooms: {reservation.num_rooms}\n"
            f"New Total: ₹{reservation.total_price}\n"
            f"Status: MODIFIED\n"
        )
    except Exception as e:
        return f"Error modifying booking: {str(e)}"


async def _get_user_bookings_impl(*, user_id: str = None, db=None) -> str:
    from app.services.reservation_service import get_user_reservations

    db = db or get_agent_db()
    user_id = user_id or get_agent_user_id()

    try:
        reservations = await get_user_reservations(db, uuid.UUID(user_id))
        if not reservations:
            return "No bookings found."

        output = "Your Bookings:\n\n"
        for r in reservations:
            status_emoji = {"confirmed": "✅", "cancelled": "❌", "modified": "🔄", "pending": "⏳", "completed": "✔️"}
            emoji = status_emoji.get(r.status.value, "📋")
            output += f"{emoji} Booking {r.booking_id}\n"
            output += f"  Hotel: {r.hotel.name if r.hotel else 'N/A'}\n"
            output += f"  City: {r.city.name if r.city else 'N/A'}\n"
            output += f"  Room: {r.room_type.name if r.room_type else 'N/A'}\n"
            output += f"  Dates: {r.check_in_date} to {r.check_out_date}\n"
            output += f"  Rooms: {r.num_rooms} | Price: ₹{r.total_price}\n"
            output += f"  Status: {r.status.value.upper()}\n\n"
        return output
    except Exception as e:
        return f"Error fetching bookings: {str(e)}"


async def _get_booking_details_impl(booking_id: str, *, db=None) -> str:
    from app.services.reservation_service import get_reservation_by_booking_id

    db = db or get_agent_db()
    try:
        r = await get_reservation_by_booking_id(db, booking_id)
        if not r:
            return f"Booking {booking_id} not found."

        output = f"📋 Booking Details: {r.booking_id}\n\n"
        output += f"Hotel: {r.hotel.name if r.hotel else 'N/A'}\n"
        output += f"City: {r.city.name if r.city else 'N/A'}\n"
        output += f"Room Type: {r.room_type.name if r.room_type else 'N/A'}\n"
        output += f"Check-in: {r.check_in_date}\n"
        output += f"Check-out: {r.check_out_date}\n"
        output += f"Rooms: {r.num_rooms}\n"
        output += f"Guests: {r.num_guests}\n"
        output += f"Total Price: ₹{r.total_price}\n"
        output += f"Status: {r.status.value.upper()}\n"
        output += f"Booked On: {r.created_at.strftime('%Y-%m-%d %H:%M')}\n"
        if r.special_requests:
            output += f"Special Requests: {r.special_requests}\n"
        if r.itinerary_bookings:
            output += "Itineraries:\n"
            for ib in r.itinerary_bookings:
                if ib.itinerary:
                    output += f"  - {ib.itinerary.name}\n"
        return output
    except Exception as e:
        return f"Error fetching booking details: {str(e)}"


async def _search_knowledge_base_impl(query: str, *, db=None) -> str:
    try:
        import time
        import threading
        import asyncio
        start_rag = time.time()
        thread_name = threading.current_thread().name
        print(f"RAG starting invocation. Main loop thread is: {thread_name}", flush=True)

        from app.rag.retriever import RAGRetriever
        retriever = RAGRetriever()
        context = await asyncio.to_thread(retriever.retrieve, query)
        
        elapsed = time.time() - start_rag
        print(f"RAG completed in {elapsed:.3f}s", flush=True)

        if context:
            return f"Knowledge Base Results:\n\n{context}"
        return "No relevant information found in the knowledge base."
    except Exception as e:
        return f"Knowledge base search unavailable: {str(e)}"


async def _search_cities_impl(query: str, *, db=None) -> str:
    from app.services.city_service import search_cities as _search, get_all_cities

    db = db or get_agent_db()
    try:
        results = await _search(db, query)
        if not results:
            results = await get_all_cities(db)
        if not results:
            return "No cities found. The database may not have any cities yet."

        output = "Available cities:\n\n"
        for c in results:
            output += f"🏙️ {c.name}, {c.state}\n"
            output += f"   City ID: {c.id}\n"
            output += f"   Description: {c.description[:100] if c.description else 'N/A'}...\n\n"
        return output
    except Exception as e:
        return f"Error searching cities: {str(e)}"


# =========================================================================
# LangGraph @tool wrappers -- thin delegates to _impl functions
# =========================================================================


@tool
async def check_hotel_availability(
    city_id: str,
    check_in_date: str,
    check_out_date: str,
    room_category: str = "",
    num_rooms: int = 1,
) -> str:
    """Check available hotel rooms for given dates in a city. Returns available rooms with pricing.

    Args:
        city_id: UUID of the city
        check_in_date: Check-in date in YYYY-MM-DD format
        check_out_date: Check-out date in YYYY-MM-DD format
        room_category: Optional room category filter: 'ac', 'non_ac', or 'deluxe'
        num_rooms: Number of rooms needed (default 1)
    """
    print(f"[Tool Debug] check_hotel_availability called", flush=True)
    return await _check_hotel_availability_impl(
        city_id, check_in_date, check_out_date, room_category, num_rooms,
    )


@tool
async def get_city_hotels(city_id: str) -> str:
    """List all hotels in a specific city with basic details.

    Args:
        city_id: UUID of the city
    """
    return await _get_city_hotels_impl(city_id)


@tool
async def get_hotel_details(hotel_id: str) -> str:
    """Get detailed information about a specific hotel including room types and pricing.

    Args:
        hotel_id: UUID of the hotel
    """
    return await _get_hotel_details_impl(hotel_id)


@tool
async def get_city_attractions(city_id: str) -> str:
    """List tourist attractions in a specific city.

    Args:
        city_id: UUID of the city
    """
    return await _get_city_attractions_impl(city_id)


@tool
async def get_city_foods(city_id: str) -> str:
    """List famous foods and cuisines in a specific city.

    Args:
        city_id: UUID of the city
    """
    return await _get_city_foods_impl(city_id)


@tool
async def get_city_itineraries(city_id: str) -> str:
    """List available itinerary/tour packages for a city.

    Args:
        city_id: UUID of the city
    """
    return await _get_city_itineraries_impl(city_id)


@tool
async def create_booking(
    hotel_id: str,
    room_type_id: str,
    city_id: str,
    check_in_date: str,
    check_out_date: str,
    num_rooms: str = "1",
    num_guests: str = "1",
    special_requests: str = "",
    itinerary_id: str = "",
) -> str:
    """Create a hotel reservation for the user. ONLY call this after the user explicitly confirms.

    Args:
        hotel_id: UUID of the hotel
        room_type_id: UUID of the room type
        city_id: UUID of the city
        check_in_date: Check-in date YYYY-MM-DD
        check_out_date: Check-out date YYYY-MM-DD
        num_rooms: Number of rooms (passed as string, e.g. '1')
        num_guests: Number of guests (passed as string, e.g. '2')
        special_requests: Any special requests
        itinerary_id: Optional itinerary UUID to add to the booking
    """

    # user_id is read from agent context -- NOT from LLM params (security)
    print("[Tool Debug] create_booking called", flush=True)

    try:
        rooms = int(num_rooms)
        guests = int(num_guests)
    except (ValueError, TypeError):
        return (
            "Error creating booking: Invalid number of rooms or guests. "
            "Please provide numeric values."
        )

    return await _create_booking_impl(
        hotel_id,
        room_type_id,
        city_id,
        check_in_date,
        check_out_date,
        rooms,
        guests,
        special_requests,
        itinerary_id,
    )


@tool
async def cancel_booking(booking_id: str) -> str:
    """Cancel an existing hotel reservation.

    Args:
        booking_id: The booking ID (e.g., BK20260617XY3Z)
    """
    # user_id is read from agent context -- NOT from LLM params (security)
    return await _cancel_booking_impl(booking_id)


@tool
async def modify_booking(
    booking_id: str,
    check_in_date: str = "",
    check_out_date: str = "",
    num_rooms: int = 0,
    room_type_id: str = "",
) -> str:
    """Modify an existing hotel reservation with new details.

    Args:
        booking_id: The booking ID
        check_in_date: New check-in date (YYYY-MM-DD) or empty to keep current
        check_out_date: New check-out date (YYYY-MM-DD) or empty to keep current
        num_rooms: New number of rooms or 0 to keep current
        room_type_id: New room type UUID or empty to keep current
    """
    # user_id is read from agent context -- NOT from LLM params (security)
    return await _modify_booking_impl(
        booking_id, check_in_date, check_out_date, num_rooms, room_type_id,
    )


@tool
async def get_user_bookings() -> str:
    """Get all reservations for the current user."""
    # user_id is read from agent context -- NOT from LLM params (security)
    return await _get_user_bookings_impl()


@tool
async def get_booking_details(booking_id: str) -> str:
    """Get detailed information about a specific booking.

    Args:
        booking_id: The booking ID (e.g., BK20260617XY3Z)
    """
    return await _get_booking_details_impl(booking_id)


@tool
async def search_knowledge_base(query: str) -> str:
    """Search the tourism knowledge base for information about destinations, travel tips, etc.

    Args:
        query: Search query string
    """
    return await _search_knowledge_base_impl(query)


@tool
async def search_cities(query: str) -> str:
    """Search for cities by name. Returns matching cities with their IDs so you can use other tools.

    Args:
        query: City name or partial name to search for (e.g. 'Hyderabad', 'Jaipur')
    """
    return await _search_cities_impl(query)


@tool
async def set_booking_details(
    hotel_number: str,
    room_number: str,
    num_rooms: int = 1,
    num_guests: int = 1,
    special_requests: str = "",
) -> str:
    """Record the user's booking selection. This does NOT create a reservation.
    Call this after the user has chosen a hotel, room, and provided guest details.
    The backend will present a summary and handle the actual booking after user confirmation.

    Args:
        hotel_number: The hotel number from the listing (e.g. '1', '2'). Must match a listed hotel.
        room_number: The room number from the listing (e.g. '1', '2'). Must match a room under the hotel.
        num_rooms: Number of rooms requested (must be a positive integer)
        num_guests: Number of guests (must be a positive integer)
        special_requests: Any special requests from the user
    """
    mapping = _uuid_mapping_context.get() or {}

    # Validate hotel_number exists in canonical mapping
    h_idx = str(hotel_number).strip()
    if h_idx not in mapping or not isinstance(mapping.get(h_idx), dict):
        available = sorted(
            [k for k in mapping if k.isdigit() and isinstance(mapping.get(k), dict)],
            key=int,
        )
        return (
            f"Error: Hotel number {h_idx} is not valid. "
            f"Available hotels: {', '.join(available) if available else 'none -- please search for hotels first'}."
        )

    hotel_data = mapping[h_idx]
    if "hotel_id" not in hotel_data:
        return f"Error: Hotel number {h_idx} has no associated hotel data."

    # Validate room_number exists under that hotel
    r_idx = str(room_number).strip()
    rooms = hotel_data.get("rooms", {})
    if r_idx not in rooms:
        available_rooms = sorted(rooms.keys(), key=int) if rooms else []
        return (
            f"Error: Room number {r_idx} is not valid for Hotel {h_idx}. "
            f"Available rooms: {', '.join(available_rooms) if available_rooms else 'none'}."
        )

    # Validate counts
    try:
        num_rooms_int = int(num_rooms)
    except (ValueError, TypeError):
        return "Error: Number of rooms must be a positive integer."
    if num_rooms_int <= 0:
        return "Error: Number of rooms must be a positive integer."

    try:
        num_guests_int = int(num_guests)
    except (ValueError, TypeError):
        return "Error: Number of guests must be a positive integer."
    if num_guests_int <= 0:
        return "Error: Number of guests must be a positive integer."

    # Check availability was validated
    val_check_in = mapping.get("_validated_check_in")
    val_check_out = mapping.get("_validated_check_out")
    if not val_check_in or not val_check_out:
        return "Error: Please check hotel availability first before recording booking details."

    # Record selections in canonical state
    mapping["_selected_hotel"] = h_idx
    mapping["_selected_room"] = r_idx
    mapping["_num_rooms"] = num_rooms_int
    mapping["_num_guests"] = num_guests_int
    mapping["_special_requests"] = special_requests or ""
    mapping["_booking_phase"] = "AWAITING_CONFIRMATION"

    print(
        f"[Booking State] set_booking_details: hotel={h_idx} room={r_idx} "
        f"rooms={num_rooms_int} guests={num_guests_int} phase=AWAITING_CONFIRMATION",
        flush=True,
    )

    summary = (
        f"Booking details recorded:\n"
        f"  Hotel: #{h_idx}\n"
        f"  Room: #{r_idx}\n"
        f"  Check-in: {val_check_in}\n"
        f"  Check-out: {val_check_out}\n"
        f"  Rooms: {num_rooms_int}\n"
        f"  Guests: {num_guests_int}\n"
    )
    if special_requests:
        summary += f"  Special Requests: {special_requests}\n"

    summary += (
        "\nAll booking details are complete and validated. "
        "Present the full booking summary to the user using the hotel and room names "
        "from the availability results, and ask: 'Shall I confirm this booking?'"
    )
    return summary


# ---------------------------------------------------------------------------
# Export all tools (for LangGraph binding)
# ---------------------------------------------------------------------------

ALL_TOOLS = [
    search_cities,
    check_hotel_availability,
    get_city_hotels,
    get_hotel_details,
    get_city_attractions,
    get_city_foods,
    get_city_itineraries,
    set_booking_details,
    cancel_booking,
    modify_booking,
    get_user_bookings,
    get_booking_details,
    search_knowledge_base,
]
