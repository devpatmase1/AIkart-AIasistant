"""
Reranker Service
================
Cross-encoder reranker for improving retrieval precision.

Default model: BAAI/bge-reranker-v2-m3 (multilingual, 100+ languages).
Configurable via NEXUSRAG_RERANKER_MODEL in settings.

Usage:
    reranker = get_reranker_service()
    ranked = reranker.rerank("user question", ["chunk1", "chunk2", ...], top_k=5)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, Sequence

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RerankResult:
    """A single reranked item with its original index and relevance score."""
    index: int          # Original position in the input list
    score: float        # Cross-encoder relevance score (higher = more relevant)
    text: str           # The chunk text


class RerankerService:
    """
    Cross-encoder reranker service.
    Scores (query, document) pairs jointly through a transformer,
    producing far more accurate relevance scores than bi-encoder cosine similarity.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.NEXUSRAG_RERANKER_MODEL
        self._model = None

    @property
    def model(self):
        """Lazy load the cross-encoder model."""
        if self._model is None:
            from sentence_transformers import CrossEncoder
            logger.info(f"Loading reranker model: {self.model_name}")
            try:
                self._model = CrossEncoder(self.model_name)
                logger.info(f"Reranker model loaded: {self.model_name}")
            except Exception as e:
                logger.warning(f"Failed to load reranker model '{self.model_name}': {e}")
                self._model = False  # Sentinel for failed load
        return self._model if self._model is not False else None

    def rerank(
        self,
        query: str,
        documents: Sequence[str],
        top_k: Optional[int] = None,
        min_score: Optional[float] = None,
    ) -> list[RerankResult]:
        """
        Rerank documents by relevance to the query.

        Args:
            query: The user's search query
            documents: List of document texts to rerank
            top_k: Maximum number of results to return (None = all)
            min_score: Minimum relevance score threshold (None = no filtering)

        Returns:
            List of RerankResult sorted by score (descending),
            filtered by top_k and min_score.
        """
        if not documents:
            return []

        try:
            model = self.model
            if model is None:
                raise RuntimeError("Reranker model is unavailable")

            # Build (query, document) pairs for the cross-encoder
            pairs = [(query, doc) for doc in documents]

            # Score all pairs in a single batch
            scores = model.predict(pairs, batch_size=32).tolist()

            # Build results with original indices
            results = [
                RerankResult(index=i, score=float(s), text=doc)
                for i, (s, doc) in enumerate(zip(scores, documents))
            ]

            # Sort by score descending (most relevant first)
            results.sort(key=lambda r: r.score, reverse=True)

            # Apply min_score filter
            if min_score is not None:
                filtered = [r for r in results if r.score >= min_score]
                if filtered:
                    results = filtered

            # Apply top_k limit
            if top_k is not None:
                results = results[:top_k]

            return results
        except Exception as e:
            logger.warning(f"Reranker failed ({e}), falling back to original vector search order")
            results = [
                RerankResult(index=i, score=1.0 - (i * 0.01), text=doc)
                for i, doc in enumerate(documents)
            ]
            if top_k is not None:
                results = results[:top_k]
            return results


# Singleton instance
_default_service: Optional[RerankerService] = None


def get_reranker_service() -> RerankerService:
    """Get or create the default reranker service."""
    global _default_service
    if _default_service is None:
        _default_service = RerankerService()
    return _default_service
