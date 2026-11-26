"""Doubt-solving agent: retrieval-grounded answers with page citations."""

from __future__ import annotations

import re
import time
from typing import Any

from ..llm import llm_text
from ..models import Citation
from ..rag.text import key_phrases, split_sentences, strip_heading, tokenize
from .prompts import DOUBT_SYSTEM

def to_citation(hit: dict[str, Any]) -> Citation:
    body = strip_heading(hit.get("text", ""), hit.get("heading") or "")
    return Citation(
        doc_id=hit["doc_id"],
        doc_title=hit["doc_title"],
        page=hit["page"],
        heading=hit.get("heading") or "",
        snippet=_trim(body, 260),
        score=float(hit.get("score", 0.0)),
    )


def _trim(text: str, limit: int) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    return clean if len(clean) <= limit else clean[: limit - 1].rstrip() + "…"


def _score_sentence(sentence: str, terms: set[str], heading: str) -> float:
    tokens = tokenize(sentence)
    if not tokens:
        return 0.0
    overlap = sum(1 for token in tokens if token in terms)
    heading_bonus = 0.35 if heading and any(term in tokenize(heading) for term in terms) else 0.0
    definition_bonus = 0.3 if re.search(r"\b(is|are|refers to|means|defined as)\b", sentence) else 0.0
    return overlap / (len(tokens) ** 0.5) + heading_bonus + definition_bonus


def best_sentences(query: str, hits: list[dict[str, Any]], limit: int = 4) -> list[tuple[str, dict[str, Any]]]:
    terms = set(tokenize(query))
    scored: list[tuple[float, str, dict[str, Any]]] = []
    seen: set[str] = set()
    for hit in hits:
        body = strip_heading(hit.get("text", ""), hit.get("heading") or "")
        for sentence in split_sentences(body):
            cleaned = sentence.strip()
            if len(cleaned) < 25:
                continue
            fingerprint = cleaned.lower()[:90]
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            score = _score_sentence(cleaned, terms, hit.get("heading") or "")
            if score > 0:
                scored.append((score, cleaned, hit))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [(sentence, hit) for _, sentence, hit in scored[:limit]]


def compose_offline_answer(query: str, hits: list[dict[str, Any]]) -> tuple[str, bool]:
    """Extractive answer built from the student's own sentences."""
    if not hits or hits[0].get("score", 0) < 0.12:
        return (
            "I couldn't find this in your uploaded notes, so I won't guess. "
            "Upload the relevant chapter (or rephrase with a term that appears in your notes) and ask again.",
            False,
        )

    picked = best_sentences(query, hits, limit=4)
    if not picked:
        top = hits[0]
        return (f"Your notes mention this under “{top.get('heading') or top['doc_title']}”:\n\n{_trim(top['text'], 400)}", True)

    lead_sentence, lead_hit = picked[0]
    bullets = picked[1:]
    parts = [f"**Short answer**\n\n{lead_sentence} *({lead_hit['doc_title']}, p. {lead_hit['page']})*"]
    if bullets:
        lines = [f"- {sentence} *({hit['doc_title']}, p. {hit['page']})*" for sentence, hit in bullets]
        parts.append("**From your notes**\n\n" + "\n".join(lines))
    terms = key_phrases(lead_sentence + " " + " ".join(sentence for sentence, _ in picked), limit=4)
    if terms:
        parts.append(f"**Exam tip** — be ready to define and contrast: {', '.join(terms)}.")
    return "\n\n".join(parts), True


def doubt_node(state: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    query: str = state.get("query") or ""
    hits: list[dict[str, Any]] = state.get("retrieved") or []
    citations = [to_citation(hit) for hit in hits[:4]]

    answer: str | None = None
    if hits:
        numbered = "\n\n".join(
            f"[{index}] {hit['doc_title']} p.{hit['page']}"
            + (f" — {hit['heading']}" if hit.get("heading") else "")
            + f"\n{_trim(hit['text'], 900)}"
            for index, hit in enumerate(hits[:5], start=1)
        )
        history = _history(state)
        prompt = f"CONTEXT\n{numbered}\n\nSTUDENT QUESTION: {query}"
        if history:
            prompt = f"EARLIER IN THIS CONVERSATION:\n{history}\n\n{prompt}"
        answer = llm_text(DOUBT_SYSTEM, prompt)

    grounded = True
    if answer and answer.startswith("NOT_IN_NOTES"):
        grounded = False
        answer = (
            "That isn't covered in the notes you've uploaded, so I won't invent an answer. "
            "Upload the chapter that covers it and I'll answer with exact page references."
        )
    elif not answer:
        answer, grounded = compose_offline_answer(query, hits)

    if not grounded:
        citations = []

    return {
        "answer": answer,
        "citations": [c.model_dump(mode="json") for c in citations],
        "grounded": grounded,
        "suggested_actions": (
            ["Generate a quiz on this topic", "Add this topic to my study plan"]
            if grounded
            else ["Upload the missing chapter", "Search a different topic"]
        ),
        "trace": _trace(state, "doubt", "Doubt agent", f"Grounded answer from {len(hits)} passages", started),
    }


def _history(state: dict[str, Any]) -> str:
    messages = state.get("messages") or []
    turns: list[str] = []
    for message in messages[:-1][-4:]:
        role = getattr(message, "type", "user")
        content = getattr(message, "content", "")
        if isinstance(content, str) and content.strip():
            turns.append(f"{'Student' if role == 'human' else 'StudyBuddy'}: {content[:400]}")
    return "\n".join(turns)


def _trace(state: dict[str, Any], node: str, label: str, detail: str, started: float) -> list[dict[str, Any]]:
    events = list(state.get("trace") or [])
    events.append(
        {
            "node": node,
            "label": label,
            "detail": detail,
            "ms": int((time.perf_counter() - started) * 1000),
        }
    )
    return events
