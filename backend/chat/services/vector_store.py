import logging
import os
from typing import List

from django.conf import settings
from django.db import connection, transaction
from openai import OpenAI
from pgvector.psycopg2 import register_vector

logger = logging.getLogger(__name__)

TABLE_NAME = "chat_persona_document"
EMBEDDING_MODEL = os.getenv("OPEN_ROUTER_EMBEDDING_MODEL", "openai/text-embedding-3-small")
EMBEDDING_DIMENSIONS = 1536
EMBEDDING_BATCH_SIZE = max(1, int(os.getenv("EMBEDDING_BATCH_SIZE", "64")))


def _get_embedding_client():
    api_key = settings.OPEN_ROUTER_API_KEY or os.getenv("OPEN_ROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPEN_ROUTER_API_KEY is required to generate embeddings")
    return OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")


def _embed(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    logger.info("Requesting embeddings: model=%s input_count=%d", EMBEDDING_MODEL, len(texts))
    try:
        client = _get_embedding_client()
        embeddings = []
        for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            batch = texts[start:start + EMBEDDING_BATCH_SIZE]
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch,
            )
            batch_embeddings = [item.embedding for item in sorted(response.data, key=lambda item: item.index)]
            if len(batch_embeddings) != len(batch):
                raise RuntimeError("Embedding API returned an unexpected number of vectors")
            if any(len(embedding) != EMBEDDING_DIMENSIONS for embedding in batch_embeddings):
                raise RuntimeError(
                    f"Embedding model must return {EMBEDDING_DIMENSIONS}-dimension vectors; "
                    "verify the model and database vector column dimensions"
                )
            embeddings.extend(batch_embeddings)
        logger.info("Embedding request succeeded: returned_count=%d", len(embeddings))
        return embeddings
    except Exception:
        logger.exception("Embedding API request failed: model=%s input_count=%d", EMBEDDING_MODEL, len(texts))
        raise


def _ensure_vector_table():
    if connection.vendor != "postgresql":
        raise RuntimeError("Persona vector search requires PostgreSQL with the pgvector extension")
    # Django opens its underlying driver connection lazily. Ensure it exists
    # before registering pgvector's psycopg2 adapters on it.
    logger.info("Connecting to PostgreSQL for pgvector operation")
    connection.ensure_connection()
    register_vector(connection.connection)
    logger.info("PostgreSQL connection ready and pgvector adapters registered")


def add_persona_documents(persona_id: str, chunks: List[str]) -> int:
    """Create embeddings and store persona chunks in PostgreSQL using pgvector."""
    if not chunks:
        logger.warning("Skipping document indexing for persona %s: no chunks provided", persona_id)
        return 0
    logger.info("Starting document indexing: persona=%s chunk_count=%d", persona_id, len(chunks))
    _ensure_vector_table()
    embeddings = _embed(chunks)
    logger.info("Persisting %d embeddings for persona %s", len(embeddings), persona_id)
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(f"DELETE FROM {TABLE_NAME} WHERE persona_id = %s", [persona_id])
            cursor.executemany(
                f"INSERT INTO {TABLE_NAME} (persona_id, chunk_index, content, embedding) VALUES (%s, %s, %s, %s)",
                [(persona_id, i, chunk, embedding) for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))],
            )
    logger.info("Stored %d vector chunks for persona %s", len(chunks), persona_id)
    return len(chunks)


def query_persona_context(persona_id: str, query: str, top_k: int = 4) -> List[str]:
    """Retrieve the closest document chunks for a persona using cosine distance."""
    if not query:
        return []
    try:
        logger.info("Starting vector search: persona=%s top_k=%d", persona_id, top_k)
        _ensure_vector_table()
        query_embedding = _embed([query])[0]
        logger.info("Query embedding ready; searching PostgreSQL for persona %s", persona_id)
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT content FROM {TABLE_NAME} WHERE persona_id = %s ORDER BY embedding <=> %s::vector LIMIT %s",
                [persona_id, query_embedding, top_k],
            )
            results = [row[0] for row in cursor.fetchall()]
        logger.info("Vector search completed: persona=%s result_count=%d", persona_id, len(results))
        return results
    except Exception:
        logger.exception("Error querying PostgreSQL vector store for persona %s", persona_id)
        return []


def delete_persona_documents(persona_id: str):
    """Delete all stored vector embeddings for a persona."""
    try:
        _ensure_vector_table()
        with connection.cursor() as cursor:
            cursor.execute(f"DELETE FROM {TABLE_NAME} WHERE persona_id = %s", [persona_id])
        logger.info("Deleted vector embeddings for persona: %s", persona_id)
    except Exception:
        logger.exception("Error deleting embeddings for persona %s", persona_id)

