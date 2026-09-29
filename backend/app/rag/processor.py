"""Document processing pipeline: extract, chunk, embed, and store in ChromaDB."""
import logging
from pathlib import Path
from app.rag.vectorstore import VectorStore
from app.utils.file_processing import extract_text

logger = logging.getLogger(__name__)


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    if not text:
        return []
    chunks = []
    separators = ["\n\n", "\n", ". ", " "]
    
    def _split(text, sep_idx=0):
        if len(text) <= chunk_size:
            return [text] if text.strip() else []
        if sep_idx >= len(separators):
            # Force split
            result = []
            for i in range(0, len(text), chunk_size - chunk_overlap):
                chunk = text[i:i + chunk_size]
                if chunk.strip():
                    result.append(chunk)
            return result
        
        sep = separators[sep_idx]
        parts = text.split(sep)
        current = ""
        result = []
        for part in parts:
            if len(current) + len(part) + len(sep) <= chunk_size:
                current = current + sep + part if current else part
            else:
                if current.strip():
                    result.append(current.strip())
                current = part
        if current.strip():
            result.append(current.strip())
        return result

    chunks = _split(text)
    return [c for c in chunks if len(c.strip()) > 50]


def process_and_store_document(
    file_path: str,
    file_type: str,
    document_id: str,
    collection_name: str = "travel_knowledge"
) -> dict:
    """Process a document: extract text, chunk, embed, store in ChromaDB."""
    try:
        text = extract_text(file_path, file_type)
        if not text.strip():
            return {"status": "failed", "error": "No text content extracted", "chunk_count": 0}

        chunks = chunk_text(text)
        if not chunks:
            return {"status": "failed", "error": "No chunks generated", "chunk_count": 0}

        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "chunk_index": i,
                "source_file": Path(file_path).name,
                "file_type": file_type
            }
            for i in range(len(chunks))
        ]

        vectorstore = VectorStore.get_instance()
        vectorstore.add_documents(
            collection_name=collection_name,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )

        logger.info(f"Processed document {document_id}: {len(chunks)} chunks stored")
        return {"status": "completed", "chunk_count": len(chunks), "error": None}

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        return {"status": "failed", "error": str(e), "chunk_count": 0}
