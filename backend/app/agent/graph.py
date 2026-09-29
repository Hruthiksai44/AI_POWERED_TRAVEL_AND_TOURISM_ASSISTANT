"""LangGraph-based AI Travel Assistant Agent.

This module builds the StateGraph that powers the conversational AI assistant.
It integrates with Groq (Llama 3.3 70B), uses tools for real database operations,
and maintains conversation history in PostgreSQL.
"""
from asyncio import timeouts
import asyncio
import json
import logging
import re
import uuid
from typing import Optional
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from app.agent.state import AgentState
from app.agent.tools import ALL_TOOLS
from app.agent.prompts import build_system_prompt, SIMPLE_FORMAT_PROMPT
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# LLM Setup
# --------------------------------------------------------------------------
import httpx

def _log_groq_429(response: httpx.Response):
    if response.status_code == 429:
        logger.warning(
            "Groq 429 Rate Limit: retry-after=%s | rem_req=%s | rem_tok=%s | res_req=%s | res_tok=%s",
            response.headers.get("retry-after", "N/A"),
            response.headers.get("x-ratelimit-remaining-requests", "N/A"),
            response.headers.get("x-ratelimit-remaining-tokens", "N/A"),
            response.headers.get("x-ratelimit-reset-requests", "N/A"),
            response.headers.get("x-ratelimit-reset-tokens", "N/A"),
        )

_groq_http_client = httpx.Client(event_hooks={"response": [_log_groq_429]})

# Plain LLM (no tools) used by run_simple and fallback path (fast 8B model)
llm_plain = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.3,
    max_tokens=800,
    max_retries=2,
    http_client=_groq_http_client,
)

# Booking LLM used exclusively by LangGraph for complex tool orchestration
llm_booking = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.3,
    max_tokens=1500,
    max_retries=2,
    http_client=_groq_http_client,
)

# Bind tools to the booking LLM
llm_with_tools = llm_booking.bind_tools(ALL_TOOLS)

# Create the tool node
tool_node = ToolNode(ALL_TOOLS)

# --------------------------------------------------------------------------
# RAG Retriever -- singleton to avoid reloading the embedding model each call
# --------------------------------------------------------------------------
_rag_retriever = None

def _get_rag_retriever():
    global _rag_retriever
    if _rag_retriever is None:
        try:
            from app.rag.retriever import RAGRetriever
            _rag_retriever = RAGRetriever()
        except Exception as e:
            logger.warning(f"RAGRetriever init failed: {e}")
    return _rag_retriever


def should_continue(state: AgentState) -> str:
    """Determine if the agent should continue to tools or end."""
    messages = state["messages"]
    last_message = messages[-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


async def agent_node(state: AgentState) -> dict:
    """The main agent node that calls the LLM."""
    messages = state["messages"]

    try:
        from pprint import pformat

        logger.info("=" * 80)
        logger.info("LLM INVOCATION START")
        logger.info("=" * 80)

        logger.info("Message count: %d", len(messages))

        for i, msg in enumerate(messages):
            logger.info("----- MESSAGE %d -----", i)
            logger.info("TYPE: %s", type(msg).__name__)

            try:
                logger.info("CONTENT:\n%s", pformat(msg.content))
                logger.info("TOOL CALLS: %s", getattr(msg, "tool_calls", None))
            except Exception:
                logger.info("RAW:\n%s", pformat(msg))

        logger.info("=" * 80)
        logger.info("LLM OBJECT ID: %s", id(llm_with_tools))
        logger.info("LLM TYPE: %s", type(llm_with_tools))
        logger.info("LLM KWARGS:\n%s", pformat(getattr(llm_with_tools, "kwargs", {})))
        logger.info("=" * 80)

        import time
        import threading
        
        start_llm = time.time()
        thread_name = threading.current_thread().name
        logger.info(f"LLM starting invocation. Dispatched to thread? Main loop thread is: {thread_name}")
        
        response = await asyncio.to_thread(llm_with_tools.invoke, messages)
        
        elapsed = time.time() - start_llm
        logger.info(f"LLM completed in {elapsed:.3f}s")
        
        logger.info("=" * 80)
        logger.info("RESPONSE TOOL CALLS")
        logger.info("=" * 80)
        logger.info("%s", getattr(response, "tool_calls", None))
        
        if hasattr(response, "tool_calls") and response.tool_calls:
            for tc in response.tool_calls:
                args = tc.get("args", {})
                print(f"[DATE TRACE] LLM tool_call={tc['name']} raw_args={args!r}", flush=True)
                if "check_in_date" in args or "check_out_date" in args:
                    print(f"[DATE TRACE] check_in_date={args.get('check_in_date')!r} | check_out_date={args.get('check_out_date')!r}", flush=True)

        logger.info("=" * 80)
        logger.info("LLM INVOCATION SUCCESS")
        logger.info("=" * 80)
        logger.info("Response Type: %s", type(response).__name__)

        try:
            logger.info("Response Content:\n%s", pformat(response.content))
        except Exception:
            logger.info("Full Response:\n%s", pformat(response))

        return {"messages": [response]}

    except Exception as e:
        import traceback

        error_type = type(e).__name__
        error_str = str(e)

        logger.error("=" * 80)
        logger.error(f"LLM INVOCATION FAILED: {repr(e)}", exc_info=True)
        logger.error("=" * 80)
        logger.error("Exception Type: %s", error_type)
        logger.error("Exception Message: %s", error_str)
        logger.error("Complete Traceback:\n%s", traceback.format_exc())

        print(
            f"=== [AgentNode EXCEPTION] Type: {error_type} | Message: {error_str} ===",
            flush=True,
        )

        # Groq rejects tool schemas on some prompts -- fall back to plain LLM
        if any(
            kw in error_str.lower()
            for kw in [
                "400",
                "failed_generation",
                "tool_call",
                "json_validate_failed",
            ]
        ):
            try:
                logger.info("=" * 80)
                logger.info("ATTEMPTING FALLBACK TO llm_plain")
                logger.info("=" * 80)

                # Strip tool messages so plain LLM doesn't see schema errors
                # We also need to strip the tool_calls attribute from any AIMessages
                plain_messages = []
                for m in messages:
                    if isinstance(m, ToolMessage):
                        continue
                    if isinstance(m, AIMessage):
                        plain_messages.append(AIMessage(content=m.content))
                    else:
                        plain_messages.append(m)

                logger.info("Fallback Message Count: %d", len(plain_messages))

                start_llm = time.time()
                response = await asyncio.to_thread(llm_plain.invoke, plain_messages)
                elapsed = time.time() - start_llm
                logger.info(f"Fallback SUCCESS in {elapsed:.3f}s")

                return {"messages": [response]}

            except Exception as e2:
                logger.error("LLM fallback also failed: %s", str(e2), exc_info=True)
                logger.error(traceback.format_exc())

        error_msg = AIMessage(
            content=(
                "I'm having a moment of trouble--please try rephrasing your question "
                "or ask again in a moment!"
            )
        )

        return {"messages": [error_msg]}

# Build the graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

# Compile
graph = workflow.compile()


# --------------------------------------------------------------------------
# Deterministic booking execution -- completely bypasses LangGraph/LLM
# --------------------------------------------------------------------------

async def _execute_deterministic_booking(
    db: AsyncSession,
    user_id: str,
    mapping: dict,
    city_id: str,
) -> dict:
    """Execute booking using canonical state.  Zero LLM involvement.

    Returns dict: {success, booking_id, details, error}
    """
    from app.agent.tools import _create_booking_impl

    selected_hotel = mapping.get("_selected_hotel")
    selected_room = mapping.get("_selected_room")
    num_rooms = mapping.get("_num_rooms", 1)
    num_guests = mapping.get("_num_guests", 1)
    check_in = mapping.get("_validated_check_in")
    check_out = mapping.get("_validated_check_out")
    special_requests = mapping.get("_special_requests", "")

    # --- Validate completeness ---
    missing = []
    if not selected_hotel:
        missing.append("hotel selection")
    if not selected_room:
        missing.append("room selection")
    if not check_in:
        missing.append("check-in date")
    if not check_out:
        missing.append("check-out date")
    if not city_id:
        missing.append("city")
    if missing:
        return {"success": False, "booking_id": None, "details": None,
                "error": f"Cannot complete booking. Missing: {', '.join(missing)}"}

    # --- Validate hotel/room exist in canonical mapping ---
    hotel_data = mapping.get(selected_hotel, {})
    if not isinstance(hotel_data, dict) or "hotel_id" not in hotel_data:
        return {"success": False, "booking_id": None, "details": None,
                "error": f"Hotel {selected_hotel} is not a valid selection."}
    room_uuid = hotel_data.get("rooms", {}).get(selected_room)
    if not room_uuid:
        return {"success": False, "booking_id": None, "details": None,
                "error": f"Room {selected_room} is not valid for Hotel {selected_hotel}."}

    # --- Validate dates ---
    from datetime import date as _date
    try:
        ci = _date.fromisoformat(check_in)
        co = _date.fromisoformat(check_out)
        if ci >= co:
            return {"success": False, "booking_id": None, "details": None,
                    "error": "Check-out date must be after check-in date."}
    except ValueError:
        return {"success": False, "booking_id": None, "details": None,
                "error": "Invalid date format."}

    # --- Log canonical state ---
    print(f"[Deterministic Booking] Executing: hotel={selected_hotel} room={selected_room} "
          f"dates={check_in}->{check_out} rooms={num_rooms} guests={num_guests}", flush=True)
    print(f"[Deterministic Booking] Real hotel_uuid={hotel_data['hotel_id']} "
          f"real_room_uuid={room_uuid}", flush=True)

    # --- Call existing reservation implementation ---
    result_text = await _create_booking_impl(
        hotel_id=selected_hotel,
        room_type_id=selected_room,
        city_id=city_id,
        check_in_date=check_in,
        check_out_date=check_out,
        num_rooms=num_rooms,
        num_guests=num_guests,
        special_requests=special_requests,
        user_id=user_id,
        db=db,
    )

    if "Error creating booking" in result_text:
        return {"success": False, "booking_id": None, "details": None,
                "error": result_text}

    # Extract booking ID
    booking_id = None
    for line in result_text.split("\n"):
        if "Booking ID:" in line:
            booking_id = line.split("Booking ID:")[1].strip()
            break

    print(f"[Deterministic Booking] SUCCESS booking_id={booking_id}", flush=True)
    return {"success": True, "booking_id": booking_id,
            "details": result_text, "error": None}


async def run_simple(
    message: str,
    intents: list,
    state: dict,
    db: AsyncSession
) -> dict:
    """Direct execution path for simple intents."""
    import time
    start_time = time.time()
    print("[Timing Debug] run_simple entered", flush=True)
    from app.agent.intent import Intent
    from app.agent.tools import (
        _get_city_attractions_impl,
        _get_city_hotels_impl,
        _get_city_foods_impl,
        _get_city_itineraries_impl,
        _search_knowledge_base_impl,
        _search_cities_impl
    )
    from langchain_core.messages import HumanMessage
    
    city_id = state.get("city_id")
    messages = list(state.get("messages", []))
    
    tool_results = []
    seen_intents = set()
    
    print("[Timing Debug] before DB calls", flush=True)
    try:
        for intent in intents:
            if intent in seen_intents:
                continue
            seen_intents.add(intent)
            
            if intent == Intent.ATTRACTIONS and city_id:
                tool_results.append(await _get_city_attractions_impl(city_id, db=db))
            elif intent == Intent.HOTELS and city_id:
                tool_results.append(await _get_city_hotels_impl(city_id, db=db))
            elif intent == Intent.FOOD and city_id:
                tool_results.append(await _get_city_foods_impl(city_id, db=db))
            elif intent == Intent.ITINERARIES and city_id:
                tool_results.append(await _get_city_itineraries_impl(city_id, db=db))
            elif intent == Intent.GENERAL_INFORMATION:
                tool_results.append(await _search_knowledge_base_impl(message, db=db))
                if not city_id:
                    tool_results.append(await _search_cities_impl(message, db=db))
                    
        # Remove empty results and deduplicate
        unique_results = []
        for r in tool_results:
            if r and r not in unique_results:
                unique_results.append(r)
                
        combined_results = "\n\n".join(unique_results)
        print("[Timing Debug] after DB calls", flush=True)
        
        if combined_results:
            context_msg = HumanMessage(
                content=f"""
            DATABASE RESULTS

            {combined_results}

            IMPORTANT:
            - Answer ONLY using the database results above.
            - Do NOT use your own knowledge.
            - Do NOT invent hotels.
            - Do NOT invent room types.
            - Do NOT invent booking IDs.
            - Do NOT invent payment links.
            - Do NOT invent cancellation policies.
            - If the database does not contain the requested information, clearly say it is unavailable.
            """
                )

            messages.insert(-1, context_msg)
            
        print(f"[Model Debug] run_simple model={llm_plain.model_name}", flush=True)
        print("[Timing Debug] before LLM call", flush=True)
        llm_start = time.time()
        print("\n========== MESSAGES SENT TO LLM ==========", flush=True)

        for i, msg in enumerate(messages):
            print(f"\n----- MESSAGE {i} ({msg.__class__.__name__}) -----", flush=True)
            print(str(msg.content).encode('ascii', 'replace').decode('ascii'), flush=True)

        print("==========================================\n", flush=True)
        try:
            start_llm = time.time()
            response = await asyncio.to_thread(llm_plain.invoke, messages)
            elapsed = time.time() - start_llm
            logger.info(f"[run_simple] LLM completed in {elapsed:.3f}s")
            print("\n========== RAW LLM RESPONSE ==========", flush=True)
            print(str(response.content).encode('ascii', 'replace').decode('ascii'), flush=True)
            print("======================================\n", flush=True)
            print(f"[Timing Debug] LLM call succeeded in {time.time() - llm_start:.2f}s", flush=True)
        except Exception as llm_err:
            print(f"[Timing Debug] LLM call failed after {time.time() - llm_start:.2f}s: {type(llm_err).__name__}: {llm_err}", flush=True)
            if "429" in str(llm_err) or "rate_limit" in str(llm_err).lower():
                print("[Timing Debug] HTTP 429 Too Many Requests detected during LLM call!", flush=True)
            raise
            
        print("[Timing Debug] after LLM call", flush=True)
        print(f"[Timing Debug] total_duration={time.time() - start_time:.2f}s", flush=True)
        
        return {"messages": messages + [response]}
        
    except Exception as e:
        logger.error(f"run_simple failed: {e}", exc_info=True)
        print(f"[Timing Debug] run_simple aborted after {time.time() - start_time:.2f}s with error: {e}", flush=True)
        raise  # Will be caught by run_agent to fall back to complex path


async def run_agent(
    message: str,
    user_id: str,
    conversation_id: Optional[str],
    city_id: Optional[str],
    language: str,
    db: AsyncSession,
) -> dict:
    print(f"[DATE TRACE] run_agent raw input message = {message!r}", flush=True)
    """Main entry point for the AI assistant.
    
    1. Creates or retrieves conversation
    2. Loads history (last 6 messages for speed)
    3. Builds context (RAG + city)
    4. Runs the LangGraph agent
    5. Saves messages
    6. Returns response
    """
    from app.services.conversation_service import (
        create_conversation, get_conversation, add_message
    )
    from app.services.city_service import get_city_by_id

    # 1. Get or create conversation
    conv = None
    if conversation_id:
        try:
            conv = await get_conversation(db, uuid.UUID(conversation_id))
        except Exception:
            pass

    if not conv:
        city_uuid = uuid.UUID(city_id) if city_id else None
        conv = await create_conversation(db, uuid.UUID(user_id), city_uuid, language)
        conversation_id = str(conv.id)
    else:
        conversation_id = str(conv.id)

    # 2. Get city context
    city_context = "No specific city selected"
    city_name = ""
    effective_city_id = city_id or (str(conv.city_id) if conv.city_id else None)

    # 2.1 Auto-resolve city from the user's message when no city is set,
    #     or detect a city *change* when the user mentions a different one.
    #     Channel-agnostic: web chat, Voice SDK, PSTN, future channels.
    #
    #     Strategy: fetch all active city names (small list), check which
    #     one appears in the message, then call search_cities() with ONLY
    #     the matched city name (not the full sentence).
    #     This avoids the ILIKE '%full sentence%' problem.
    try:
        from app.services.city_service import (
            search_cities as _search_cities,
            get_all_cities as _get_all_cities,
        )

        # Load the city list (small, cached within the DB session)
        all_cities = await _get_all_cities(db)
        msg_lower = message.lower()

        # Find the first city whose name appears in the message
        # Sort by name length descending so "New Delhi" matches before "Delhi"
        matched_city_name: str | None = None
        for city in sorted(all_cities, key=lambda c: len(c.name), reverse=True):
            if re.search(r'\b' + re.escape(city.name.lower()) + r'\b', msg_lower):
                matched_city_name = city.name
                break

        if matched_city_name:
            city_matches = await _search_cities(db, matched_city_name)
            if city_matches:
                resolved_city = city_matches[0]
                resolved_city_id = str(resolved_city.id)

                if resolved_city_id != effective_city_id:
                    # Either first-time resolution or user switched city
                    previous_city_id = effective_city_id
                    effective_city_id = resolved_city_id
                    conv.city_id = resolved_city.id
                    await db.commit()
                    logger.info(
                        "[CityResolve] Resolved city='%s' (id=%s) from "
                        "message='%s' | previous=%s",
                        resolved_city.name, resolved_city_id,
                        message, previous_city_id,
                    )
                    print(
                        f"[CityResolve] Resolved city: {resolved_city.name} | "
                        f"previous_city_id={previous_city_id} | "
                        f"updated_city_id={effective_city_id} | "
                        f"conversation_id={conversation_id}",
                        flush=True,
                    )
        elif not effective_city_id:
            print(
                f"[CityResolve] No city match for message='{message}'",
                flush=True,
            )
    except Exception as e:
        logger.warning("[CityResolve] City search failed: %s", e)

    if effective_city_id:
        try:
            city = await get_city_by_id(db, uuid.UUID(effective_city_id))
            if city:
                city_context = f"{city.name}, {city.state}, {city.country} - {city.description or 'A wonderful Indian city'}"
                city_name = city.name
        except Exception:
            pass

    # 2.5 Classify intent early for RAG gating
    from app.agent.intent import classify_intent, Intent, MAX_INTENTS, needs_rag
    from app.agent.tools import set_agent_context
    
    intents = classify_intent(message)
    print(f"[Intent Debug] message={message}", flush=True)
    print(f"[Intent Debug] intents={intents}", flush=True)
    needs_rag_val = needs_rag(intents)
    print(f"[Routing Debug] needs_rag={needs_rag_val}", flush=True)

    # 3. Get RAG context conditionally (only for GENERAL_INFORMATION or TRANSPORT)
    rag_context = ""
    if needs_rag_val:
        try:
            retriever = _get_rag_retriever()
            if retriever:
                rag_context = retriever.retrieve(message, n_results=3)
        except Exception as e:
            logger.warning(f"RAG initialization or retrieval failed: {e}")

    # 4. Build messages
    system_prompt = build_system_prompt(
        intents=intents,
        user_id=user_id,
        city_context=city_context,
        city_id=effective_city_id or "Not selected",
        language=language,
        rag_context=rag_context,
    )

    messages = [SystemMessage(content=system_prompt)]

    # Load conversation history (last 6 exchanges = 12 messages for speed)
    mapping = {}
    last_intent = None
    if conv.messages:
        # Reverse-scan entire history for the most recent booking session state
        for msg in reversed(conv.messages):
            if hasattr(msg, "role") and msg.role.value == "assistant" and msg.tool_results:
                try:
                    parsed = json.loads(msg.tool_results)
                    if isinstance(parsed, dict):
                        if "hotel_mapping" in parsed:
                            mapping = parsed.get("hotel_mapping", {})
                        if "last_intent" in parsed:
                            last_intent = parsed.get("last_intent")
                        # Both fields live in the same payload; stop at the first hit
                        if "hotel_mapping" in parsed or "last_intent" in parsed:
                            break
                except:
                    pass
                    
        history = conv.messages[-12:]
        for msg in history:
            role = msg.role.value if hasattr(msg.role, 'value') else str(msg.role)
            if role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif role == "assistant":
                messages.append(AIMessage(content=msg.content))

    # Override intent classification when an active booking session exists.
    # classify_intent() only examines the current message, so short replies
    # like "2 guests" or "tomorrow" would fall through to GENERAL_INFORMATION
    # and route to run_simple(), silently resetting the booking flow.
    print(f"[Booking State] last_intent={last_intent}", flush=True)
    if last_intent == Intent.BOOKINGS.value:
        intents = [Intent.BOOKINGS]
        print(f"[Booking State] detected_intents={intents} (session override)", flush=True)
    else:
        print(f"[Booking State] detected_intents={intents}", flush=True)
    print(f"[Booking State] execution_path={'LANGGRAPH' if Intent.BOOKINGS in intents else 'RUN_SIMPLE'}", flush=True)

    # Add current message
    messages.append(HumanMessage(content=message))

    # 5. Save user message to DB
    await add_message(db, uuid.UUID(conversation_id), "user", message)

    response_text = ""
    tool_calls_log = []
    deterministic_booking = False

    # -- Deterministic booking confirmation interception --------------
    booking_phase = mapping.get("_booking_phase") if mapping else None
    print(f"[Booking State] phase={booking_phase} before routing", flush=True)

    if booking_phase == "BOOKING_EXECUTED" and mapping.get("_booking_executed_id"):
        bid = mapping["_booking_executed_id"]
        response_text = (
            f"Your booking {bid} has already been confirmed. "
            f"Is there anything else I can help you with?"
        )
        deterministic_booking = True
        if Intent.BOOKINGS not in intents:
            intents = [Intent.BOOKINGS]

    elif booking_phase == "AWAITING_CONFIRMATION":
        from app.agent.intent import is_booking_confirmation
        confirmation = is_booking_confirmation(message)
        print(f"[Deterministic Booking] confirmation={confirmation} for message={message!r}", flush=True)

        if confirmation is True:
            # Idempotency guard
            if mapping.get("_booking_executed_id"):
                bid = mapping["_booking_executed_id"]
                response_text = f"Your booking {bid} has already been confirmed."
            else:
                set_agent_context(db, user_id, mapping)
                print(f"[Deterministic Booking] selected_hotel={mapping.get('_selected_hotel')}", flush=True)
                print(f"[Deterministic Booking] selected_room={mapping.get('_selected_room')}", flush=True)
                print(f"[Deterministic Booking] dates={mapping.get('_validated_check_in')}->{mapping.get('_validated_check_out')}", flush=True)
                print(f"[Deterministic Booking] rooms={mapping.get('_num_rooms')} guests={mapping.get('_num_guests')}", flush=True)

                result = await _execute_deterministic_booking(
                    db, user_id, mapping, effective_city_id,
                )

                if result["success"]:
                    mapping["_booking_executed_id"] = result["booking_id"]
                    mapping["_booking_phase"] = "BOOKING_EXECUTED"
                    response_text = result["details"]
                    print(f"[Deterministic Booking] SUCCESS booking_id={result['booking_id']}", flush=True)
                else:
                    response_text = (
                        f"I apologize, the booking could not be completed. "
                        f"{result['error']}\n"
                        f"Your booking details are preserved -- please try again."
                    )
                    print(f"[Deterministic Booking] FAILED: {result['error']}", flush=True)

            deterministic_booking = True
            if Intent.BOOKINGS not in intents:
                intents = [Intent.BOOKINGS]

        elif confirmation is False:
            print(f"[Deterministic Booking] Booking declined: {message!r}", flush=True)
            mapping["_booking_phase"] = "COLLECTING_DETAILS"
            for key in ["_selected_hotel", "_selected_room", "_num_rooms",
                        "_num_guests", "_special_requests"]:
                mapping.pop(key, None)
            # Fall through to normal execution

    # -- Normal execution path ---------------------------------------
    if not deterministic_booking:
        # 6. Route and Execute
        initial_state = {
            "messages": messages,
            "user_id": user_id,
            "conversation_id": conversation_id,
            "city_id": effective_city_id,
            "city_name": city_name,
            "language": language,
            "booking_progress": None,
            "tool_results": None,
            "final_response": None,
        }

        if len(intents) > MAX_INTENTS:
            response_text = "I detected multiple different requests. Could you please narrow it down to one or two things so I can assist you better?"
            await add_message(db, uuid.UUID(conversation_id), "assistant", response_text)
            await db.commit()
            return {
                "response": response_text,
                "conversation_id": conversation_id,
                "tool_calls": None,
                "booking_progress": None,
            }

        async def _execute_graph(recursion_limit: int = 6):
            import time

            print("\n========== ENTERING LANGGRAPH ==========", flush=True)

            set_agent_context(db, user_id, mapping)

            start = time.time()

            try:
                result = await graph.ainvoke(
                    initial_state,
                    config={"recursion_limit": recursion_limit},
                )

                print(
                    f"[Timing Debug] graph finished in {time.time()-start:.2f}s",
                    flush=True,
                )

                return result

            except Exception as e:
                print(
                    f"[Timing Debug] graph FAILED after {time.time()-start:.2f}s",
                    flush=True,
                )

                import traceback
                traceback.print_exc()

                raise

        print(
            f"[Routing Debug] path={'LANGGRAPH' if Intent.BOOKINGS in intents else 'RUN_SIMPLE'}",
            flush=True
        )
        try:
            if Intent.BOOKINGS in intents:
                result = await _execute_graph()
            else:
                try:
                    result = await run_simple(message, intents, initial_state, db)
                except Exception as e:
                    print(f"[RUN_SIMPLE ERROR] {e}", flush=True)
                    raise

            final_messages = result["messages"]

            # Extract the last AI message
            for msg in reversed(final_messages):
                if isinstance(msg, AIMessage) and msg.content:
                    response_text = str(msg.content)
                    break

            # Log tool calls
            for msg in final_messages:
                if isinstance(msg, AIMessage) and hasattr(msg, 'tool_calls') and msg.tool_calls:
                    for tc in msg.tool_calls:
                        tool_calls_log.append({
                            "tool": tc["name"],
                            "args": tc.get("args", {}),
                        })

            if not response_text:
                response_text = "I processed your request. How else can I assist you?"

        except Exception as e:
            logger.error(f"Execution error: {e}", exc_info=True)
            # Last-resort: call LLM directly without any tools
            try:
                import time
                start_llm = time.time()
                response = await asyncio.to_thread(llm_plain.invoke, messages)
                elapsed = time.time() - start_llm
                logger.info(f"[Last-resort Fallback] LLM completed in {elapsed:.3f}s")
                response_text = str(response.content) if response.content else ""
            except Exception as e2:
                logger.error(f"Direct LLM fallback failed: {e2}")
            if not response_text:
                response_text = (
                    "I'm sorry, I encountered a temporary issue. "
                    "Please try again or rephrase your question."
                )

    # 7. Save assistant response to DB
    tool_calls_json = None

    if (
        Intent.BOOKINGS in intents
        and 'final_response_msg' in locals()
        and hasattr(final_response_msg, "tool_calls")
        and final_response_msg.tool_calls
    ):
        tool_calls_json = json.dumps(final_response_msg.tool_calls)


    from app.agent.tools import _uuid_mapping_context
    ctx_mapping = _uuid_mapping_context.get()

    # Save mapping if it was generated during a booking or hotel browsing session
    is_mapping_intent = Intent.BOOKINGS in intents or Intent.HOTELS in intents
    final_mapping = ctx_mapping if (ctx_mapping and is_mapping_intent) else mapping

    # Determine the intent to persist for the next turn.
    terminal_phrases = (
        "booking confirmed",
        "booking failed",
        "error creating booking",
        "booking cancelled",
        "booking modified",
        "no longer want",
    )

    is_terminal = any(
        phrase in response_text.lower()
        for phrase in terminal_phrases
    )

    persist_intent = (
        Intent.BOOKINGS.value
        if (Intent.BOOKINGS in intents and not is_terminal)
        else None
    )

    tool_results_payload: dict = {}

    if final_mapping:
        tool_results_payload["hotel_mapping"] = final_mapping

    if persist_intent:
        tool_results_payload["last_intent"] = persist_intent

    tool_results_json = (
        json.dumps(tool_results_payload)
        if tool_results_payload
        else None
    )

    await add_message(
        db,
        uuid.UUID(conversation_id),
        "assistant",
        response_text,
        tool_calls=tool_calls_json,
        tool_results=tool_results_json,
    )

    await db.commit()

    return {
        "response": response_text,
        "conversation_id": conversation_id,
        "city_id": effective_city_id,
        "tool_calls": tool_calls_log if tool_calls_log else None,
        "booking_progress": None,
    }