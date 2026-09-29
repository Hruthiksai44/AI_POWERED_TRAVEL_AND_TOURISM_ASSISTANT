"""Intent classification and routing for the Travel Assistant agent.

Classifies user messages into one or more intents using keyword matching,
maps intents to scoped tool sets, and selects the appropriate LLM model.

This module has ZERO side effects -- it only classifies and maps.
"""

import enum
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_INTENTS = 2


# ---------------------------------------------------------------------------
# Intent enum
# ---------------------------------------------------------------------------


class Intent(str, enum.Enum):
    ATTRACTIONS = "ATTRACTIONS"
    HOTELS = "HOTELS"
    FOOD = "FOOD"
    ITINERARIES = "ITINERARIES"
    BOOKINGS = "BOOKINGS"
    TRANSPORT = "TRANSPORT"
    GENERAL_INFORMATION = "GENERAL_INFORMATION"


# ---------------------------------------------------------------------------
# Keyword patterns -- order matters for priority resolution
# ---------------------------------------------------------------------------

# Each entry: (Intent, list of keyword patterns)
# Patterns are checked with word-boundary-aware matching.
# Checked in this order; first match wins for priority tie-breaking.
INTENT_PATTERNS: list[tuple[Intent, list[str]]] = [
    (Intent.BOOKINGS, [
        r"\bbook\b", r"\breserv", r"\bcancel", r"\bmodify\b",
        r"\bbooking\b", r"\breservation\b", r"\bmy bookings\b",
        r"\bconfirm\b", r"\bcheck.?out\b", r"\bcheck.?in\b",
    ]),
    (Intent.HOTELS, [
        r"\bhotel\b", r"\bhotels\b", r"\broom\b", r"\brooms\b",
        r"\bstay\b", r"\baccommodat", r"\blodge\b", r"\bresort\b",
        r"\bavailab",  # "availability"
    ]),
    (Intent.ATTRACTIONS, [
        r"\bplaces?\b", r"\bvisit\b", r"\battraction", r"\bsightsee",
        r"\bmonument", r"\btemple\b", r"\bmuseum\b", r"\blandmark",
        r"\btourist\b", r"\bfort\b", r"\bpalace\b", r"\bpark\b",
        r"\bwhat to see\b", r"\bbest to see\b",
    ]),
    (Intent.FOOD, [
        r"\bfood\b", r"\bfoods\b", r"\beat\b", r"\brestaurant",
        r"\bcuisine\b", r"\bdish\b", r"\bdishes\b", r"\bbiryani\b",
        r"\bsnack\b", r"\bsweet\b", r"\bdessert\b", r"\bvegetarian\b",
        r"\bstreet food\b",
    ]),
    (Intent.ITINERARIES, [
        r"\bitinerar", r"\btour\b", r"\bpackage\b", r"\bday trip\b",
        r"\bschedule\b", r"\bday plan\b",
    ]),
    (Intent.TRANSPORT, [
        r"\btransport", r"\bbus\b", r"\btrain\b", r"\bflight\b",
        r"\btaxi\b", r"\bmetro\b", r"\bauto\b", r"\bcab\b",
        r"\bairport\b", r"\bstation\b", r"\breach\b", r"\bget to\b",
        r"\bhow to go\b", r"\btravel to\b",
    ]),
]

# Booking continuation signals -- short affirmations that should keep
# the conversation in BOOKINGS intent when the prior turn was BOOKINGS.
_CONTINUATION_PATTERNS = [
    r"^yes\b", r"^yeah\b", r"^yep\b", r"^sure\b", r"^ok\b",
    r"^confirm\b", r"^go ahead\b", r"^proceed\b", r"^do it\b",
    r"^\d+$",  # just a number (selecting an option)
]

# Explicit booking confirmation patterns -- used by run_agent to detect
# the user confirming a pending booking when phase == AWAITING_CONFIRMATION.
_BOOKING_CONFIRMATION_PATTERNS = [
    r"\byes\b", r"\byeah\b", r"\byep\b", r"\bsure\b",
    r"\bconfirm\b", r"\bgo ahead\b", r"\bproceed\b", r"\bdo it\b",
    r"\bbook it\b", r"\bplease book\b", r"\byes.*confirm\b",
    r"\bconfirm.*book", r"\byes.*book",
]

_BOOKING_DECLINE_PATTERNS = [
    r"^no\b", r"^nah\b", r"^nope\b",
    r"\bnot yet\b", r"\bdon'?t\s+(book|confirm|proceed)\b",
    r"\bcancel\b", r"\bno thanks\b", r"\bnevermind\b", r"\bnever mind\b",
]


def is_booking_confirmation(message: str):
    """Detect explicit booking confirmation from user message.

    Returns:
        True:  explicit affirmative confirmation
        False: explicit decline / rejection
        None:  ambiguous or unrelated message
    """
    msg = message.lower().strip()

    # Check decline first (higher priority)
    for pattern in _BOOKING_DECLINE_PATTERNS:
        if re.search(pattern, msg):
            return False

    # Check confirmation
    for pattern in _BOOKING_CONFIRMATION_PATTERNS:
        if re.search(pattern, msg):
            return True

    return None


# ---------------------------------------------------------------------------
# Intent -> tool mapping
# ---------------------------------------------------------------------------

def _get_intent_tool_map() -> dict[Intent, list]:
    """Lazy import to avoid circular dependency with tools module."""
    from app.agent.tools import (
        search_cities,
        get_city_attractions,
        get_city_foods,
        get_city_hotels,
        get_hotel_details,
        check_hotel_availability,
        get_city_itineraries,
        set_booking_details,
        cancel_booking,
        modify_booking,
        get_user_bookings,
        get_booking_details,
        search_knowledge_base,
    )

    return {
        Intent.ATTRACTIONS: [get_city_attractions],
        Intent.HOTELS: [get_city_hotels, get_hotel_details, check_hotel_availability],
        Intent.FOOD: [get_city_foods],
        Intent.ITINERARIES: [get_city_itineraries],
        Intent.BOOKINGS: [
            set_booking_details, cancel_booking, modify_booking,
            get_user_bookings, get_booking_details,
            check_hotel_availability, get_city_hotels,
        ],
        Intent.TRANSPORT: [],  # no tools -- LLM answers from RAG/knowledge
        Intent.GENERAL_INFORMATION: [search_cities, search_knowledge_base],
    }


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------


def classify_intent(
    message: str,
    last_assistant_message: Optional[str] = None,
    last_intent: Optional[str] = None,
) -> list[Intent]:
    """Classify a user message into 1-2 intents.

    Parameters
    ----------
    message:
        The current user message.
    last_assistant_message:
        The last assistant response (for booking continuation detection).
    last_intent:
        The intent string from the previous turn (e.g. "BOOKINGS").

    Returns
    -------
    list[Intent]
        Ordered list of 1-2 detected intents.  If no keywords match,
        returns ``[Intent.GENERAL_INFORMATION]``.
    """
    msg_lower = message.lower().strip()

    # --- Booking continuation check ---
    # If last turn was BOOKINGS and the current message looks like a
    # short affirmation / selection, stay in BOOKINGS.
    if last_intent == Intent.BOOKINGS.value:
        for pattern in _CONTINUATION_PATTERNS:
            if re.search(pattern, msg_lower):
                logger.debug("Intent: BOOKINGS (continuation)")
                return [Intent.BOOKINGS]

    # --- Keyword matching ---
    matched: list[Intent] = []
    for intent, patterns in INTENT_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, msg_lower):
                if intent not in matched:
                    matched.append(intent)
                break  # one match per intent is enough

    if not matched:
        return [Intent.GENERAL_INFORMATION]

    # Deduplicate and limit
    return matched[:MAX_INTENTS + 1]  # return up to 3 so caller can detect >MAX


# ---------------------------------------------------------------------------
# Tool resolution
# ---------------------------------------------------------------------------


def get_tools_for_intents(intents: list[Intent]) -> list:
    """Return a merged, deduplicated list of tools for the given intents."""
    tool_map = _get_intent_tool_map()
    seen = set()
    tools = []
    for intent in intents:
        for tool in tool_map.get(intent, []):
            tool_name = getattr(tool, "name", id(tool))
            if tool_name not in seen:
                seen.add(tool_name)
                tools.append(tool)
    return tools


# ---------------------------------------------------------------------------
# Model selection
# ---------------------------------------------------------------------------

_FAST_MODEL = "llama-3.1-8b-instant"


def get_model_for_intents(intents: list[Intent]) -> str:
    """Return the LLM model name appropriate for the given intents.

    BOOKINGS uses the configurable model (typically 70B) for better
    reasoning.  All other intents use the fast 8B model.
    """
    if Intent.BOOKINGS in intents:
        from app.config import settings
        return settings.GROQ_MODEL
    return _FAST_MODEL


# ---------------------------------------------------------------------------
# RAG gating
# ---------------------------------------------------------------------------


def needs_rag(intents: list[Intent]) -> bool:
    """Return True if RAG retrieval should be performed for these intents."""
    return Intent.GENERAL_INFORMATION in intents or Intent.TRANSPORT in intents
