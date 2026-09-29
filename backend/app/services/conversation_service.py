"""
Conversation service – chat session lifecycle management.

Each ``Conversation`` tracks a user's interaction with the AI assistant
and can optionally be scoped to a ``City``.  Messages are persisted with
role, content, and optional tool call/result metadata.
"""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import (
    Conversation,
    ConversationStatus,
    Message,
    MessageRole,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
    city_id: uuid.UUID | None = None,
    language: str = "en",
) -> Conversation:
    """Start a new conversation for *user_id*."""
    conversation = Conversation(
        user_id=user_id,
        city_id=city_id,
        language=language,
        status=ConversationStatus.ACTIVE,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    logger.info("Created conversation %s for user %s", conversation.id, user_id)
    return conversation


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
) -> Conversation:
    """Return a conversation with its messages eagerly loaded.

    Raises ``HTTPException(404)`` if not found.
    """
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conversation = result.scalars().first()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


async def get_user_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Conversation]:
    """Return all conversations for *user_id*, newest first."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


async def get_all_conversations(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> list[Conversation]:
    """Return a paginated list of all conversations (admin)."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.user))
        .order_by(Conversation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


async def add_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str | MessageRole,
    content: str,
    tool_calls: str | None = None,
    tool_results: str | None = None,
) -> Message:
    """Append a message to *conversation_id*.

    *role* may be a ``MessageRole`` enum member or the equivalent string
    (``"user"``, ``"assistant"``, ``"system"``, ``"tool"``).

    *tool_calls* and *tool_results* should be JSON strings when present.
    """
    # Ensure conversation exists
    await get_conversation(db, conversation_id)

    # Normalise role
    if isinstance(role, str):
        role = MessageRole(role)

    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        tool_calls=tool_calls,
        tool_results=tool_results,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    logger.debug(
        "Added %s message to conversation %s",
        role.value, conversation_id,
    )
    return message


# ---------------------------------------------------------------------------
# End conversation
# ---------------------------------------------------------------------------


async def end_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    summary: str | None = None,
) -> Conversation:
    """Mark a conversation as completed.

    Optionally stores an AI-generated *summary* of the session.
    """
    conversation = await get_conversation(db, conversation_id)
    conversation.status = ConversationStatus.COMPLETED
    conversation.ended_at = datetime.now(timezone.utc)
    if summary:
        conversation.summary = summary

    await db.commit()
    await db.refresh(conversation)
    logger.info("Ended conversation %s", conversation_id)
    return conversation
