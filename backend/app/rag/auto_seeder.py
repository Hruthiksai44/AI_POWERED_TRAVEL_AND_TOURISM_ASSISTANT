"""Auto-seed database from uploaded knowledge base documents.

Uses Groq LLM to extract structured travel data (cities, hotels, attractions,
foods, itineraries) from document text, then upserts into the database and
auto-creates inventory for hotel room types.
"""
import json
import logging
from datetime import date, timedelta
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.city import City, Attraction, Food
from app.models.hotel import Hotel, RoomType, RoomCategory
from app.models.itinerary import Itinerary, ItineraryDay, ItineraryActivity
from app.models.inventory import Inventory

logger = logging.getLogger(__name__)

# ── LLM Extraction Prompt ──────────────────────────────────────────────────

EXTRACTION_PROMPT = """You are a travel data extraction expert. Analyze the following document text and extract ALL travel-related entities you can find. Return a JSON object with the structure below. Extract as much data as possible — infer reasonable defaults for missing fields.

RULES:
- Extract EVERY city, hotel, attraction, food, and itinerary mentioned.
- For hotels, infer room types if not explicit (e.g., "AC Room", "Deluxe Room", "Non-AC Room").
- Room category MUST be one of: "ac", "non_ac", "deluxe"
- For prices, use Indian Rupees (INR). Infer reasonable prices if not stated.
- For ratings, use a 1-5 scale. Infer from context if not stated.
- For total_rooms, default to 10 if not stated.
- is_vegetarian should be true/false for food items.
- Return ONLY valid JSON, no markdown or extra text.

JSON STRUCTURE:
{
  "cities": [
    {
      "name": "City Name",
      "state": "State Name",
      "country": "India",
      "description": "Brief description of the city",
      "best_time_to_visit": "October to March",
      "languages": "Telugu, Hindi",
      "population": "10 million",
      "attractions": [
        {
          "name": "Attraction Name",
          "description": "Description",
          "category": "Historical/Religious/Nature/Cultural/Entertainment",
          "entry_fee": "50",
          "timings": "9 AM - 5 PM",
          "rating": 4.5
        }
      ],
      "foods": [
        {
          "name": "Food Name",
          "description": "Description",
          "category": "Main Course/Street Food/Dessert/Snack/Beverage",
          "is_vegetarian": false,
          "price_range": "100-300"
        }
      ],
      "hotels": [
        {
          "name": "Hotel Name",
          "description": "Description",
          "address": "Full address",
          "rating": 4.5,
          "amenities": ["WiFi", "Pool", "Restaurant"],
          "contact_phone": "phone if available",
          "contact_email": "email if available",
          "room_types": [
            {
              "category": "ac",
              "name": "Standard AC Room",
              "description": "Room description",
              "price_per_night": 3000,
              "max_occupancy": 2,
              "total_rooms": 15,
              "amenities": ["TV", "AC", "WiFi"]
            }
          ]
        }
      ],
      "itineraries": [
        {
          "name": "2 Day City Tour",
          "description": "Tour description",
          "duration_days": 2,
          "price": 5000,
          "highlights": ["Highlight 1", "Highlight 2"],
          "days": [
            {
              "day_number": 1,
              "title": "Day Title",
              "description": "Day overview",
              "activities": [
                {
                  "time": "09:00",
                  "title": "Activity Title",
                  "description": "Activity details",
                  "location": "Location name",
                  "duration_minutes": 120
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

DOCUMENT TEXT:
"""


async def _call_groq_extract(text: str) -> dict:
    """Send document text to Groq LLM and get structured JSON extraction."""
    # Truncate to avoid token limits (~ 6000 words ≈ 8000 tokens)
    max_chars = 25000
    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[Document truncated...]"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You extract structured travel data from documents. Always respond with valid JSON only."},
                    {"role": "user", "content": EXTRACTION_PROMPT + text},
                ],
                "temperature": 0.1,
                "max_tokens": 4096,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


# ── Database Upsert Helpers ────────────────────────────────────────────────

async def _get_or_create_city(db: AsyncSession, city_data: dict) -> City:
    """Find city by name or create it."""
    name = city_data["name"].strip()
    result = await db.execute(select(City).where(City.name.ilike(name)))
    city = result.scalars().first()

    if city:
        # Update existing city with new data
        logger.info(f"Updating existing city: {name}")
        if city_data.get("description"):
            city.description = city_data["description"]
        if city_data.get("state"):
            city.state = city_data["state"]
        if city_data.get("best_time_to_visit"):
            city.best_time_to_visit = city_data["best_time_to_visit"]
        if city_data.get("languages"):
            city.languages = city_data["languages"]
        if city_data.get("population"):
            city.population = city_data["population"]
    else:
        logger.info(f"Creating new city: {name}")
        city = City(
            name=name,
            state=city_data.get("state", "Unknown"),
            country=city_data.get("country", "India"),
            description=city_data.get("description", f"A beautiful city in India"),
            best_time_to_visit=city_data.get("best_time_to_visit"),
            languages=city_data.get("languages"),
            population=city_data.get("population"),
        )
        db.add(city)
        await db.flush()  # Get the ID

    return city


async def _upsert_attractions(db: AsyncSession, city: City, attractions: list[dict]):
    """Add attractions that don't already exist for this city."""
    existing = await db.execute(
        select(Attraction.name).where(Attraction.city_id == city.id)
    )
    existing_names = {n.lower() for n in existing.scalars().all()}

    added = 0
    for attr_data in attractions:
        name = attr_data.get("name", "").strip()
        if not name or name.lower() in existing_names:
            continue
        attraction = Attraction(
            city_id=city.id,
            name=name,
            description=attr_data.get("description", name),
            category=attr_data.get("category"),
            entry_fee=str(attr_data.get("entry_fee", "")) if attr_data.get("entry_fee") else None,
            timings=attr_data.get("timings"),
            rating=float(attr_data["rating"]) if attr_data.get("rating") else None,
        )
        db.add(attraction)
        existing_names.add(name.lower())
        added += 1
    logger.info(f"Added {added} attractions to {city.name}")


async def _upsert_foods(db: AsyncSession, city: City, foods: list[dict]):
    """Add foods that don't already exist for this city."""
    existing = await db.execute(
        select(Food.name).where(Food.city_id == city.id)
    )
    existing_names = {n.lower() for n in existing.scalars().all()}

    added = 0
    for food_data in foods:
        name = food_data.get("name", "").strip()
        if not name or name.lower() in existing_names:
            continue
        food = Food(
            city_id=city.id,
            name=name,
            description=food_data.get("description", name),
            category=food_data.get("category"),
            is_vegetarian=bool(food_data.get("is_vegetarian", False)),
            price_range=food_data.get("price_range"),
        )
        db.add(food)
        existing_names.add(name.lower())
        added += 1
    logger.info(f"Added {added} foods to {city.name}")


async def _upsert_hotels(db: AsyncSession, city: City, hotels: list[dict]):
    """Add/update hotels and their room types, then create inventory."""
    for hotel_data in hotels:
        name = hotel_data.get("name", "").strip()
        if not name:
            continue

        # Check if hotel exists
        result = await db.execute(
            select(Hotel).where(Hotel.name.ilike(name), Hotel.city_id == city.id)
        )
        hotel = result.scalars().first()

        amenities_str = json.dumps(hotel_data.get("amenities", [])) if hotel_data.get("amenities") else None

        if hotel:
            logger.info(f"Updating existing hotel: {name}")
            if hotel_data.get("description"):
                hotel.description = hotel_data["description"]
            if hotel_data.get("rating"):
                hotel.rating = float(hotel_data["rating"])
            if amenities_str:
                hotel.amenities = amenities_str
        else:
            logger.info(f"Creating new hotel: {name} in {city.name}")
            hotel = Hotel(
                city_id=city.id,
                name=name,
                description=hotel_data.get("description", f"Hotel in {city.name}"),
                address=hotel_data.get("address", f"{city.name}, {city.state}"),
                rating=float(hotel_data.get("rating", 3.5)),
                amenities=amenities_str,
                contact_phone=hotel_data.get("contact_phone"),
                contact_email=hotel_data.get("contact_email"),
            )
            db.add(hotel)
            await db.flush()

        # Upsert room types
        await _upsert_room_types(db, hotel, hotel_data.get("room_types", []))


def _parse_room_category(cat_str: str) -> RoomCategory:
    """Parse a room category string into the enum."""
    cat_str = cat_str.lower().strip().replace(" ", "_")
    mapping = {
        "ac": RoomCategory.AC,
        "non_ac": RoomCategory.NON_AC,
        "nonac": RoomCategory.NON_AC,
        "non-ac": RoomCategory.NON_AC,
        "deluxe": RoomCategory.DELUXE,
        "suite": RoomCategory.DELUXE,
        "luxury": RoomCategory.DELUXE,
        "premium": RoomCategory.DELUXE,
        "standard": RoomCategory.AC,
    }
    return mapping.get(cat_str, RoomCategory.AC)


async def _upsert_room_types(db: AsyncSession, hotel: Hotel, room_types: list[dict]):
    """Add room types that don't already exist, then create inventory."""
    existing = await db.execute(
        select(RoomType.name).where(RoomType.hotel_id == hotel.id)
    )
    existing_names = {n.lower() for n in existing.scalars().all()}

    for rt_data in room_types:
        name = rt_data.get("name", "Standard Room").strip()
        if name.lower() in existing_names:
            continue

        category = _parse_room_category(rt_data.get("category", "ac"))
        total_rooms = int(rt_data.get("total_rooms", 10))
        amenities_str = json.dumps(rt_data.get("amenities", [])) if rt_data.get("amenities") else None

        room_type = RoomType(
            hotel_id=hotel.id,
            category=category,
            name=name,
            description=rt_data.get("description"),
            price_per_night=float(rt_data.get("price_per_night", 2000)),
            max_occupancy=int(rt_data.get("max_occupancy", 2)),
            total_rooms=total_rooms,
            amenities=amenities_str,
        )
        db.add(room_type)
        await db.flush()

        # Auto-create inventory for next 30 days
        await _create_inventory(db, room_type, total_rooms, days_ahead=30)
        existing_names.add(name.lower())
        logger.info(f"Added room type '{name}' ({category.value}) to {hotel.name}")


async def _create_inventory(db: AsyncSession, room_type: RoomType, total_rooms: int, days_ahead: int = 30):
    """Create inventory records for the next N days."""
    today = date.today()
    for i in range(days_ahead):
        inv_date = today + timedelta(days=i)
        # Check if inventory already exists
        result = await db.execute(
            select(Inventory).where(
                Inventory.room_type_id == room_type.id,
                Inventory.date == inv_date,
            )
        )
        if result.scalars().first() is None:
            inv = Inventory(
                room_type_id=room_type.id,
                date=inv_date,
                total_rooms=total_rooms,
                booked_rooms=0,
            )
            db.add(inv)
    logger.info(f"Created {days_ahead}-day inventory for room type {room_type.name}")


async def _upsert_itineraries(db: AsyncSession, city: City, itineraries: list[dict]):
    """Add itineraries that don't already exist for this city."""
    existing = await db.execute(
        select(Itinerary.name).where(Itinerary.city_id == city.id)
    )
    existing_names = {n.lower() for n in existing.scalars().all()}

    for itin_data in itineraries:
        name = itin_data.get("name", "").strip()
        if not name or name.lower() in existing_names:
            continue

        highlights = json.dumps(itin_data.get("highlights", [])) if itin_data.get("highlights") else None

        itinerary = Itinerary(
            city_id=city.id,
            name=name,
            description=itin_data.get("description", name),
            duration_days=int(itin_data.get("duration_days", 1)),
            price=float(itin_data.get("price", 2000)),
            highlights=highlights,
        )
        db.add(itinerary)
        await db.flush()

        # Add days and activities
        for day_data in itin_data.get("days", []):
            day = ItineraryDay(
                itinerary_id=itinerary.id,
                day_number=int(day_data.get("day_number", 1)),
                title=day_data.get("title", f"Day {day_data.get('day_number', 1)}"),
                description=day_data.get("description", ""),
            )
            db.add(day)
            await db.flush()

            for idx, act_data in enumerate(day_data.get("activities", [])):
                dur_mins = act_data.get("duration_minutes", 60)
                activity = ItineraryActivity(
                    day_id=day.id,
                    order=idx + 1,
                    time=act_data.get("time", "09:00"),
                    title=act_data.get("title", "Activity"),
                    description=act_data.get("description", ""),
                    location=act_data.get("location"),
                    duration=f"{dur_mins} mins" if dur_mins else "1 hour",
                )
                db.add(activity)

        existing_names.add(name.lower())
        logger.info(f"Added itinerary '{name}' to {city.name}")


# ── Main Entry Point ───────────────────────────────────────────────────────

async def extract_and_seed(text: str, db: AsyncSession) -> dict:
    """Extract travel entities from document text and seed the database.
    
    Returns a summary of what was created/updated.
    """
    if not text or len(text.strip()) < 50:
        logger.warning("Document text too short for extraction")
        return {"status": "skipped", "reason": "Text too short"}

    if not settings.GROQ_API_KEY:
        logger.error("GROQ_API_KEY not configured — cannot extract entities")
        return {"status": "error", "reason": "GROQ_API_KEY not set"}

    logger.info(f"Starting entity extraction from {len(text)} chars of text...")

    try:
        # 1. Extract structured data via LLM
        extracted = await _call_groq_extract(text)
        cities_data = extracted.get("cities", [])

        if not cities_data:
            logger.info("No cities found in document")
            return {"status": "completed", "cities": 0, "hotels": 0, "attractions": 0, "foods": 0, "itineraries": 0}

        # 2. Upsert entities
        stats = {"cities": 0, "hotels": 0, "attractions": 0, "foods": 0, "itineraries": 0}

        for city_data in cities_data:
            city = await _get_or_create_city(db, city_data)
            stats["cities"] += 1

            attractions = city_data.get("attractions", [])
            if attractions:
                await _upsert_attractions(db, city, attractions)
                stats["attractions"] += len(attractions)

            foods = city_data.get("foods", [])
            if foods:
                await _upsert_foods(db, city, foods)
                stats["foods"] += len(foods)

            hotels = city_data.get("hotels", [])
            if hotels:
                await _upsert_hotels(db, city, hotels)
                stats["hotels"] += len(hotels)

            itineraries = city_data.get("itineraries", [])
            if itineraries:
                await _upsert_itineraries(db, city, itineraries)
                stats["itineraries"] += len(itineraries)

        await db.commit()
        logger.info(f"Auto-seed complete: {stats}")
        return {"status": "completed", **stats}

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}")
        return {"status": "error", "reason": f"JSON parse error: {str(e)}"}
    except httpx.HTTPStatusError as e:
        logger.error(f"Groq API error during extraction: {e}")
        return {"status": "error", "reason": f"Groq API error: {e.response.status_code}"}
    except Exception as e:
        logger.error(f"Auto-seed error: {e}", exc_info=True)
        await db.rollback()
        return {"status": "error", "reason": str(e)}
