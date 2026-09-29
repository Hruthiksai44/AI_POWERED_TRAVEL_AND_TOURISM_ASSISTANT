"""
Document service – RAG knowledge-base document lifecycle.

Workflow:
1.  ``save_document``   – persist the uploaded file to disk and create a
    ``Document`` row with status **PENDING**.
2.  ``process_document`` – extract text, chunk, embed, and store in
    ChromaDB.  Status transitions: PENDING → PROCESSING → COMPLETED /
    FAILED.
3.  ``delete_document``  – remove the DB record, disk file, and ChromaDB
    collection entries.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus, DocumentType
from app.utils.file_processing import extract_text

# Stub import – the actual module will be created alongside the RAG pipeline.
# It is expected to expose:
#   async def process_and_store_document(document_id, text, collection_name) -> int
# returning the number of chunks stored.
from app.rag.processor import process_and_store_document  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_file_type(filename: str) -> DocumentType:
    """Map a filename extension to ``DocumentType``."""
    ext = Path(filename).suffix.lower().lstrip(".")
    try:
        return DocumentType(ext)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: .{ext}",
        )


# ---------------------------------------------------------------------------
# Save (upload)
# ---------------------------------------------------------------------------


async def save_document(
    db: AsyncSession,
    file: UploadFile,
    upload_dir: str = "../uploads",
) -> Document:
    """Save an uploaded *file* to disk and create a ``Document`` record."""
    original_filename = file.filename or "unknown"
    file_type = _resolve_file_type(original_filename)

    # Resolve upload_dir to absolute path relative to backend root
    upload_path = Path(upload_dir)
    if not upload_path.is_absolute():
        upload_path = Path(__file__).resolve().parent.parent.parent / upload_dir
    
    # Generate a unique on-disk filename to avoid collisions
    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    upload_path.mkdir(parents=True, exist_ok=True)
    file_path = str(upload_path / unique_name)

    # Stream file to disk
    content = await file.read()
    file_size = len(content)
    with open(file_path, "wb") as f:
        f.write(content)

    document = Document(
        filename=unique_name,
        original_filename=original_filename,
        file_type=file_type,
        file_size=file_size,
        file_path=file_path,
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    logger.info(
        "Saved document %s (%s, %d bytes)", document.id, original_filename, file_size
    )
    return document


# ---------------------------------------------------------------------------
# Process (extract + chunk + embed)
# ---------------------------------------------------------------------------


async def process_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> Document:
    """Extract text, chunk, embed, and store in ChromaDB.

    Updates the document status to PROCESSING, then COMPLETED or FAILED.
    """
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalars().first()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # --- Transition to PROCESSING ------------------------------------------
    document.status = DocumentStatus.PROCESSING
    await db.commit()

    try:
        # 1. Extract text from the document
        extracted_text = extract_text(document.file_path, document.file_type.value)

        # 2. Process for RAG (chunk + embed + store in ChromaDB)
        result_data = process_and_store_document(
            file_path=document.file_path,
            file_type=document.file_type.value,
            document_id=str(document.id),
            collection_name=document.collection_name,
        )

        if result_data["status"] == "completed":
            document.status = DocumentStatus.COMPLETED
            document.chunk_count = result_data["chunk_count"]
            document.processed_at = datetime.now(timezone.utc)
            document.error_message = None
        else:
            document.status = DocumentStatus.FAILED
            document.error_message = result_data.get("error", "Unknown error")[:500]

        await db.commit()
        await db.refresh(document)
        logger.info(
            "Processed document %s → %d chunks", document.id, document.chunk_count or 0
        )

        # 3. Auto-extract entities and seed the database
        if document.status == DocumentStatus.COMPLETED and extracted_text:
            try:
                from app.rag.auto_seeder import extract_and_seed
                seed_result = await extract_and_seed(extracted_text, db)
                logger.info(
                    "Auto-seed result for document %s: %s", document.id, seed_result
                )
            except Exception as seed_exc:
                logger.warning(
                    "Auto-seed failed for document %s: %s (non-fatal)",
                    document.id, seed_exc
                )

    except Exception as exc:
        document.status = DocumentStatus.FAILED
        document.error_message = str(exc)[:500]
        await db.commit()
        await db.refresh(document)
        logger.exception("Failed to process document %s", document.id)

    return document


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get_all_documents(db: AsyncSession) -> list[Document]:
    """Return all documents, newest first."""
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


async def get_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> Document:
    """Return a single document by ID.

    Raises ``HTTPException(404)`` if not found.
    """
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalars().first()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


async def delete_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> bool:
    """Delete a document from DB, disk, and ChromaDB.

    Returns ``True`` on success.
    """
    document = await get_document(db, document_id)

    # Remove file from disk
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except OSError:
        logger.warning(
            "Could not remove file from disk: %s", document.file_path
        )

    # Remove from ChromaDB (best-effort)
    try:
        import chromadb

        client = chromadb.PersistentClient()
        collection = client.get_or_create_collection(document.collection_name)
        # Delete all chunks whose metadata references this document
        collection.delete(where={"document_id": str(document.id)})
    except Exception:
        logger.warning(
            "Could not remove ChromaDB entries for document %s", document.id
        )

    await db.delete(document)
    await db.commit()
    logger.info("Deleted document %s", document_id)
    return True
