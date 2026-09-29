"""RAG retriever for querying the knowledge base."""
from app.rag.vectorstore import VectorStore


class RAGRetriever:
    def __init__(self):
        self.vectorstore = VectorStore.get_instance()

    def retrieve(self, query: str, collection_name: str = "travel_knowledge", n_results: int = 5) -> str:
        results = self.vectorstore.query(collection_name, query, n_results)
        if not results:
            return ""
        context_parts = []
        for i, result in enumerate(results, 1):
            if result['distance'] < 0.8:
                context_parts.append(f"[Source {i}]: {result['content']}")
        return "\n\n".join(context_parts) if context_parts else ""

    def retrieve_with_metadata(self, query: str, collection_name: str = "travel_knowledge", n_results: int = 5) -> list[dict]:
        return self.vectorstore.query(collection_name, query, n_results)
