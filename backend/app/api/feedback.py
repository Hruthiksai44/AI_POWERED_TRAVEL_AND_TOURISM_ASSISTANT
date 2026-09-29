from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user, get_admin_user
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback_service import create_feedback, get_user_feedbacks, get_all_feedbacks
from app.models.user import User

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("/", response_model=FeedbackResponse, status_code=201)
async def submit(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    fb = await create_feedback(db, current_user.id, data)
    return FeedbackResponse(
        id=fb.id, user_id=fb.user_id, rating=fb.rating,
        comment=fb.comment, category=fb.category, created_at=fb.created_at,
        user_name=current_user.name,
    )


@router.get("/my", response_model=list[FeedbackResponse])
async def my_feedback(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    feedbacks = await get_user_feedbacks(db, current_user.id)
    return [
        FeedbackResponse(
            id=f.id, user_id=f.user_id, rating=f.rating,
            comment=f.comment, category=f.category, created_at=f.created_at,
            user_name=current_user.name,
        ) for f in feedbacks
    ]


@router.get("/", response_model=list[FeedbackResponse])
async def all_feedback(
    skip: int = 0, limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    feedbacks = await get_all_feedbacks(db, skip, limit)
    return [
        FeedbackResponse(
            id=f.id, user_id=f.user_id, rating=f.rating,
            comment=f.comment, category=f.category, created_at=f.created_at,
            user_name=f.user.name if f.user else None,
        ) for f in feedbacks
    ]
