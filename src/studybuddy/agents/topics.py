"""Topic discovery from the indexed notes."""

from __future__ import annotations

import re

GENERIC = {
    "introduction", "contents", "table of contents", "references", "summary",
    "exercises", "exercise", "questions", "answers", "overview", "conclusion",
    "unit", "chapter", "notes", "index", "appendix", "objectives", "outline",
    "page", "study material", "prepared by", "lecture",
}


def _clean(topic: str) -> str:
    topic = re.sub(r"^(?:unit|chapter|module|topic|section|lesson)\s*[\divx]+[:.\-]\s*", "", topic, flags=re.I)
    return re.sub(r"\s+", " ", topic).strip(" .:-—–")


def _usable(topic: str) -> bool:
    lowered = topic.lower().strip()
    if not lowered or lowered in GENERIC:
        return False
    if len(topic) > 48 or len(topic.split()) > 6:
        return False
    if re.fullmatch(r"[\d\W]+", topic):
        return False
    if lowered.startswith(("unit ", "chapter ", "module ", "page ")) and len(lowered.split()) <= 2:
        return False
    return True


def extract_topics(chunks: list[dict], limit: int = 12, by_page: bool = False) -> list[str]:
    """Rank headings by how much content sits under them.

    ``by_page=True`` keeps syllabus order (used by the planner) instead of
    ranking by weight (used for "what's in my notes" chips).
    """
    weights: dict[str, int] = {}
    display: dict[str, str] = {}
    first_page: dict[str, int] = {}
    for chunk in chunks:
        heading = _clean(chunk.get("heading") or "")
        if not _usable(heading):
            continue
        key = heading.lower()
        weights[key] = weights.get(key, 0) + max(1, len(chunk.get("text", "")) // 400)
        display.setdefault(key, heading)
        page = int(chunk.get("page") or 0)
        first_page[key] = min(first_page.get(key, page or 10**6), page or 10**6)
    if by_page:
        ordered = sorted(weights, key=lambda key: (first_page[key], -weights[key]))
    else:
        ordered = [key for key, _ in sorted(weights.items(), key=lambda item: (-item[1], item[0]))]
    return [display[key] for key in ordered[:limit]]
