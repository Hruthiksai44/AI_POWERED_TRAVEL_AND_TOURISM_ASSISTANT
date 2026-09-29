"""ChromaDB vector store wrapper."""
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    _instance = None
    _client = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        try:
            import chromadb
            persist_dir = Path(settings.CHROMA_PERSIST_DIR)
            if not persist_dir.is_absolute():
                persist_dir = Path(__file__).resolve().parent.parent.parent / persist_dir
            persist_dir.mkdir(parents=True, exist_ok=True)

            self._client = chromadb.PersistentClient(path=str(persist_dir))
            self._embedding_service = None
            logger.info(f"ChromaDB initialized at {persist_dir}")
        except Exception as e:
            logger.warning(f"ChromaDB initialization failed: {e}")
            self._client = None

    def _get_embedder(self):
        if self._embedding_service is None:
            from app.rag.embeddings import EmbeddingService
            self._embedding_service = EmbeddingService.get_instance()
        return self._embedding_service

    def get_or_create_collection(self, name: str = "travel_knowledge"):
        if self._client is None:
            return None
        return self._client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_documents(self, collection_name: str, documents: list[str], metadatas: list[dict], ids: list[str]):
        collection = self.get_or_create_collection(collection_name)
        if collection is None:
            return 0
        embeddings = self._get_embedder().embed_texts(documents)
        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        return len(documents)

    def query(self, collection_name: str, query_text: str, n_results: int = 5) -> list[dict]:
        collection = self.get_or_create_collection(collection_name)
        if collection is None:
            return []
        try:
            query_embedding = self._get_embedder().embed_query(query_text)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            formatted = []
            if results and results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    formatted.append({
                        'content': doc,
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else 0
                    })
            return formatted
        except Exception as e:
            logger.error(f"ChromaDB query error: {e}")
            return []

    def delete_by_document_id(self, collection_name: str, document_id: str):
        collection = self.get_or_create_collection(collection_name)
        if collection is None:
            return
        try:
            results = collection.get(where={"document_id": document_id})
            if results and results['ids']:
                collection.delete(ids=results['ids'])
        except Exception as e:
            logger.error(f"Error deleting from ChromaDB: {e}")
