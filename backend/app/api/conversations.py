from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_active_user, get_admin_user
from app.schemas.conversation import ConversationResponse, ConversationListResponse, CallLogCreate, CallLogResponse
from app.services.conversation_service import (
    get_conversation, get_user_conversations, get_all_conversations
)
from app.models.user import User
from app.models.conversation import CallLog, Conversation
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/my", response_model=list[ConversationListResponse])
async def my_conversations(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages), selectinload(Conversation.city))
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    )
    convos = result.scalars().all()
    
    response_list = []
    for c in convos:
        response_list.append(ConversationListResponse(
            id=c.id,
            title=c.title,
            status=c.status.value if hasattr(c.status, 'value') else str(c.status),
            language=c.language,
            created_at=c.created_at,
            message_count=len(c.messages) if c.messages else 0,
            city_name=c.city.name if c.city else None,
        ))
    return response_list


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_convo(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    convo = await get_conversation(db, conversation_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo


@router.get("/", response_model=list[ConversationListResponse])
async def list_all(
    skip: int = 0, limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages), selectinload(Conversation.city), selectinload(Conversation.user))
        .order_by(Conversation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    convos = result.scalars().all()
    
    response_list = []
    for c in convos:
        response_list.append(ConversationListResponse(
            id=c.id,
            title=c.title,
            status=c.status.value if hasattr(c.status, 'value') else str(c.status),
            language=c.language,
            created_at=c.created_at,
            message_count=len(c.messages) if c.messages else 0,
            city_name=c.city.name if c.city else None,
        ))
    return response_list


@router.get("/call-logs/all", response_model=list[CallLogResponse])
async def get_call_logs(
    skip: int = 0, limit: int = 50,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CallLog).order_by(CallLog.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()
