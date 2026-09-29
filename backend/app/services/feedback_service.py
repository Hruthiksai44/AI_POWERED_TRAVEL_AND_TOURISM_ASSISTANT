"""
Feedback service – user satisfaction ratings and comments.
"""

import uuid
import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


async def create_feedback(
    db: AsyncSession,
    user_id: uuid.UUID,
    feedback_data: dict,
) -> Feedback:
    """Create a new feedback entry for *user_id*.

    ``feedback_data`` must include ``rating`` (1–5) and may include
    ``comment`` and ``category``.
    """
    rating = feedback_data.get("rating")
    if rating is None or not (1 <= rating <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5",
        )

    feedback = Feedback(user_id=user_id, **feedback_data)
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    logger.info("Created feedback %s from user %s", feedback.id, user_id)
    return feedback


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_user_feedbacks(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Feedback]:
    """Return all feedback entries submitted by *user_id*."""
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == user_id)
        .order_by(Feedback.created_at.desc())
    )
    return list(result.scalars().all())


async def get_all_feedbacks(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
) -> list[Feedback]:
    """Return a paginated list of all feedback entries (admin)."""
    result = await db.execute(
        select(Feedback)
        .order_by(Feedback.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())
