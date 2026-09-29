from typing import TypedDict, Annotated, Sequence, Optional
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    """State schema for the LangGraph travel assistant agent."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    user_id: str
    conversation_id: Optional[str]
    city_id: Optional[str]
    city_name: Optional[str]
    language: str
    booking_progress: Optional[dict]
    tool_results: Optional[list]
    final_response: Optional[str]
