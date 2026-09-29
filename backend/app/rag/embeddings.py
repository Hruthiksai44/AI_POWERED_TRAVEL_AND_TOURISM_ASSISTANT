"""BGE-small embedding service using sentence-transformers."""
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        if EmbeddingService._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
                EmbeddingService._model = SentenceTransformer(settings.EMBEDDING_MODEL)
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load embedding model: {e}. Embeddings will be unavailable.")
                EmbeddingService._model = None

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if self._model is None:
            return [[0.0] * 384 for _ in texts]
        embeddings = self._model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> list[float]:
        if self._model is None:
            return [0.0] * 384
        embedding = self._model.encode([query], normalize_embeddings=True)
        return embedding[0].tolist()
