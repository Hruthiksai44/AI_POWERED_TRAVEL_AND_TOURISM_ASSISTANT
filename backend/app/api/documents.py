from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_admin_user
from app.schemas.document import DocumentResponse
from app.services.document_service import (
    save_document, process_document, get_all_documents,
    get_document, delete_document
)
from app.models.user import User
from app.config import settings
import uuid

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload(
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported")
    
    doc = await save_document(db, file, settings.UPLOAD_DIR)
    return doc


@router.post("/{document_id}/process", response_model=DocumentResponse)
async def process(
    document_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await process_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/", response_model=list[DocumentResponse])
async def list_docs(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_all_documents(db)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_doc(
    document_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}")
async def remove_doc(
    document_id: uuid.UUID,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    success = await delete_document(db, document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}
