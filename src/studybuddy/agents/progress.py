"""Progress agent: turns attempt history into a coaching summary."""

from __future__ import annotations

import time
from typing import Any

from ..llm import llm_text
from ..rag.store import get_store


def progress_node(state: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    student_id = state.get("student_id") or "demo-student"
    progress = get_store().progress(student_id)

    weak = progress["weak_topics"]
    mastered = progress["mastered_topics"]
    lines = [
        f"**Streak:** {progress['streak']} day(s) · **XP:** {progress['xp']} · "
        f"**Average:** {progress['average_score']}% across {progress['quizzes_taken']} quiz(zes)."
    ]
    if weak:
        lines.append("**Needs work:** " + ", ".join(f"{item['topic']} ({int(item['accuracy'] * 100)}%)" for item in weak[:4]))
    if mastered:
        lines.append("**Mastered:** " + ", ".join(mastered[:5]))
    if not weak and not mastered:
        lines.append("Take a quiz and I'll start tracking mastery per topic.")

    summary = llm_text(
        "You are a study coach. Summarise this student's progress in 2 short sentences with one next action.",
        f"Progress data: {progress}",
        temperature=0.4,
    )
    answer = "\n\n".join(lines)
    if summary:
        answer += f"\n\n{summary}"

    return {
        "answer": answer,
        "progress": progress,
        "citations": [],
        "grounded": True,
        "suggested_actions": ["Generate a quiz on my weakest topic", "Rebuild my study plan", "Show today's tasks"],
        "trace": [
            *(state.get("trace") or []),
            {
                "node": "progress",
                "label": "Progress agent",
                "detail": f"streak {progress['streak']} · avg {progress['average_score']}%",
                "ms": int((time.perf_counter() - started) * 1000),
            },
        ],
    }
