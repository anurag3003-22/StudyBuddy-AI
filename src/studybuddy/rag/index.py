"""Hybrid retrieval: BM25 keyword search fused with optional embeddings.

Runs fully offline (BM25 only) which keeps the demo deterministic; when an
embedding model is configured the scores are blended.
"""

from __future__ import annotations

import math
from collections import Counter

from ..config import get_settings
from .text import tokenize


class BM25:
    """Small, dependency-free BM25 implementation."""

    def __init__(self, documents: list[str], k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.docs = [tokenize(doc) for doc in documents]
        self.freqs = [Counter(doc) for doc in self.docs]
        self.lengths = [len(doc) for doc in self.docs]
        self.avg_len = (sum(self.lengths) / len(self.lengths)) if self.lengths else 0.0
        self.df: Counter[str] = Counter()
        for doc in self.docs:
            self.df.update(set(doc))
        self.n = len(self.docs)

    def idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5))

    def scores(self, query: str) -> list[float]:
        terms = tokenize(query)
        if not terms or not self.docs:
            return [0.0] * self.n
        results: list[float] = []
        for freq, length in zip(self.freqs, self.lengths):
            score = 0.0
            norm = self.k1 * (1 - self.b + self.b * (length / (self.avg_len or 1)))
            for term in terms:
                tf = freq.get(term, 0)
                if tf:
                    score += self.idf(term) * (tf * (self.k1 + 1)) / (tf + norm)
            results.append(score)
        return results


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if not na or not nb:
        return 0.0
    return dot / (na * nb)


class Embedder:
    """OpenAI-compatible embeddings with a graceful offline no-op."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None

    @property
    def enabled(self) -> bool:
        return self.settings.embedding_enabled

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI

            kwargs: dict = {"api_key": self.settings.llm_api_key}
            if self.settings.embedding_base_url or self.settings.llm_base_url:
                kwargs["base_url"] = self.settings.embedding_base_url or self.settings.llm_base_url
            self._client = OpenAI(**kwargs)
        return self._client

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self.enabled or not texts:
            return []
        try:
            response = self._get_client().embeddings.create(
                model=self.settings.embedding_model,
                input=texts,
            )
            return [item.embedding for item in response.data]
        except Exception:  # pragma: no cover - network/credential issues
            return []


class HybridIndex:
    """In-memory index over chunks; rebuilt whenever documents change."""

    def __init__(self, chunks: list[dict]) -> None:
        self.chunks = chunks
        self.bm25 = BM25([self._searchable(chunk) for chunk in chunks])
        self.vectors: list[list[float]] = [chunk.get("vector") or [] for chunk in chunks]

    @staticmethod
    def _searchable(chunk: dict) -> str:
        heading = chunk.get("heading") or ""
        return f"{heading} {chunk.get('text', '')}"

    def search(
        self,
        query: str,
        limit: int = 5,
        subject: str | None = None,
        doc_ids: list[str] | None = None,
        min_score: float = 0.0,
    ) -> list[dict]:
        if not self.chunks:
            return []
        keyword_scores = self.bm25.scores(query)
        peak = max(keyword_scores) or 1.0
        query_vector: list[float] = []
        if self.vectors and any(self.vectors):
            query_vector = Embedder().embed([query])
            query_vector = query_vector[0] if query_vector else []

        ranked: list[tuple[float, int]] = []
        for position, chunk in enumerate(self.chunks):
            if subject and chunk.get("subject", "").lower() != subject.lower():
                continue
            if doc_ids and chunk.get("doc_id") not in doc_ids:
                continue
            lexical = keyword_scores[position] / peak
            semantic = 0.0
            if query_vector and self.vectors[position]:
                semantic = max(0.0, cosine(query_vector, self.vectors[position]))
            score = 0.7 * lexical + 0.3 * semantic if query_vector else lexical
            if score > min_score:
                ranked.append((score, position))

        ranked.sort(key=lambda item: item[0], reverse=True)
        hits: list[dict] = []
        for score, position in ranked[:limit]:
            chunk = dict(self.chunks[position])
            chunk.pop("vector", None)
            chunk["score"] = round(score, 4)
            hits.append(chunk)
        return hits
