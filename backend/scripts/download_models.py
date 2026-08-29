"""Pre-download sentence-transformers models for offline use.

Usage:
    python backend/scripts/download_models.py

Environment variables (optional):
    NEXUSRAG_EMBEDDING_MODEL  — default: BAAI/bge-m3
    NEXUSRAG_RERANKER_MODEL   — default: BAAI/bge-reranker-v2-m3
"""
import os
import sys


def download_models():
    embedding_model = os.environ.get("NEXUSRAG_EMBEDDING_MODEL", "BAAI/bge-m3")
    reranker_model = os.environ.get("NEXUSRAG_RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")

    from sentence_transformers import SentenceTransformer, CrossEncoder

    print(f"[1/2] Downloading embedding model: {embedding_model}")
    SentenceTransformer(embedding_model)
    print(f"      Done.")

    print(f"[2/2] Downloading reranker model: {reranker_model}")
    CrossEncoder(reranker_model)
    print(f"      Done.")

    print("\nAll models downloaded successfully.")


if __name__ == "__main__":
    download_models()
