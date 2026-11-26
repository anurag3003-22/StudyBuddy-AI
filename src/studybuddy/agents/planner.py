"""Study-plan generator agent.

Deterministic scheduler first (so it always works), LLM only for the rationale.
"""

from __future__ import annotations

import time
import uuid
from datetime import date, timedelta
from typing import Any

from ..llm import llm_text
from ..models import Citation, PlanTask, StudyPlan
from ..rag.text import strip_heading
from ..rag.store import get_store
from .prompts import PLAN_SYSTEM
from .topics import extract_topics


def build_plan(
    subject: str,
    days: int,
    weak_topics: list[str],
    minutes_per_day: int,
    exam_date: date | None = None,
) -> StudyPlan:
    store = get_store()
    chunks = store.chunks_for(subject) or store.chunks_for(None)
    discovered = extract_topics(chunks, limit=12, by_page=True)

    topics: list[str] = []
    for topic in list(weak_topics) + discovered:
        cleaned = topic.strip()
        if cleaned and cleaned.lower() not in {t.lower() for t in topics}:
            topics.append(cleaned)
    topics = _merge_related(topics)
    if not topics:
        topics = [subject or "Core syllabus"]

    weak_keys = {w.lower() for w in weak_topics}
    # Weak topics lead the rotation so they get the earliest, freshest sessions.
    topics.sort(key=lambda topic: 0 if topic.lower() in weak_keys else 1)

    days = max(1, min(int(days or 7), 30))
    minutes_per_day = max(30, min(int(minutes_per_day or 90), 480))
    start = date.today()
    if exam_date and exam_date > start:
        days = max(1, min((exam_date - start).days, 30))
    exam_date = exam_date or (start + timedelta(days=days))

    tasks: list[PlanTask] = []
    task_counter = 0

    def add_task(day_index: int, title: str, topic: str, kind: str, minutes: int) -> None:
        nonlocal task_counter
        task_counter += 1
        citation = _citation_for(store, topic, subject)
        tasks.append(
            PlanTask(
                id=f"t{task_counter}",
                day=day_index,
                date=start + timedelta(days=day_index - 1),
                title=title,
                topic=topic,
                kind=kind,  # type: ignore[arg-type]
                minutes=minutes,
                citation=citation,
            )
        )

    rotation = [topics[index % len(topics)] for index in range(max(days - 1, 1))]

    for day_index in range(1, days + 1):
        if day_index == days:
            add_task(day_index, "Full mock quiz — timed, mixed topics", "Mixed revision", "quiz", minutes_per_day)
            focus = weak_topics[0] if weak_topics else topics[0]
            add_task(day_index, f"Review weak spots: {focus}", focus, "review", max(20, minutes_per_day // 3))
            continue

        topic = rotation[(day_index - 1) % len(rotation)]
        learn_minutes = int(minutes_per_day * 0.6)
        drill_minutes = max(15, minutes_per_day - learn_minutes)

        add_task(day_index, f"Learn: {topic} — definitions & worked examples", topic, "learn", learn_minutes)
        if day_index % 3 == 0 and day_index > 2:
            earlier = rotation[(day_index - 3) % len(rotation)]
            add_task(day_index, f"Spaced review: {earlier} (active recall)", earlier, "review", drill_minutes)
        else:
            add_task(day_index, f"Drill: {topic} — practice questions", topic, "drill", drill_minutes)

    focus_text = ", ".join(weak_topics[:3]) if weak_topics else "all core topics"
    rationale = (
        f"{days}-day plan with the exam on {exam_date.isoformat()}. Weak areas ({focus_text}) are scheduled in the "
        f"first rotation so they get two spaced passes, with active-recall reviews every third day and a "
        f"timed mock on the final day."
    )
    if weak_topics:
        rationale += f" Daily load is {minutes_per_day} minutes with the heaviest blocks on {weak_topics[0]}."
    else:
        rationale += f" Daily load is {minutes_per_day} minutes, front-loading conceptual topics before drilling."

    llm_rationale = llm_text(
        PLAN_SYSTEM,
        f"Subject: {subject}\nExam date: {exam_date}\nDays: {days}\nWeak topics: {weak_topics}\n"
        f"Minutes/day: {minutes_per_day}\nTask titles: {[t.title for t in tasks][:14]}",
        temperature=0.3,
    )
    if llm_rationale:
        rationale = llm_rationale

    return StudyPlan(
        id=uuid.uuid4().hex[:12],
        subject=subject,
        exam_date=exam_date,
        days=days,
        focus_topics=weak_topics or topics[:3],
        minutes_per_day=minutes_per_day,
        rationale=rationale,
        tasks=tasks,
    )


def _merge_related(topics: list[str]) -> list[str]:
    """Drop topics that are contained in an earlier, more specific topic."""
    merged: list[str] = []
    for topic in topics:
        key = topic.lower().strip()
        if any(key in existing.lower() or existing.lower() in key for existing in merged):
            continue
        merged.append(topic)
    return merged


def _citation_for(store, topic: str, subject: str) -> Citation | None:
    hits = store.search(topic, limit=1, subject=subject) or store.search(topic, limit=1)
    if not hits:
        return None
    hit = hits[0]
    body = strip_heading(hit.get("text", ""), hit.get("heading") or "")
    snippet = " ".join(body.split())[:200]
    return Citation(
        doc_id=hit["doc_id"],
        doc_title=hit["doc_title"],
        page=hit["page"],
        heading=hit.get("heading") or "",
        snippet=snippet,
        score=float(hit.get("score", 0.0)),
    )


def plan_node(state: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    params = state.get("params") or {}
    subject = state.get("subject") or params.get("subject") or "DBMS"
    weak = params.get("weak_topics") or []
    days = int(params.get("days") or 7)
    minutes = int(params.get("minutes_per_day") or 90)
    exam_date = params.get("exam_date")

    plan = build_plan(subject, days, weak, minutes, exam_date)
    get_store().save_plan(plan)

    summary = (
        f"I built a **{plan.days}-day plan for {plan.subject}** ({plan.minutes_per_day} min/day) "
        f"with the exam on {plan.exam_date.isoformat()}.\n\n{plan.rationale}"
    )
    if plan.tasks:
        summary += f"\n\n**Day 1:** {plan.tasks[0].title}"
    return {
        "plan": plan.model_dump(mode="json"),
        "answer": summary,
        "citations": [],
        "grounded": True,
        "suggested_actions": ["Start today's session", "Generate a quiz on my weak topic", "Adjust exam date"],
        "trace": _trace(state, "plan", "Planner agent", f"{plan.days} days · {len(plan.tasks)} tasks", started),
    }


def _trace(state: dict[str, Any], node: str, label: str, detail: str, started: float) -> list[dict[str, Any]]:
    events = list(state.get("trace") or [])
    events.append({"node": node, "label": label, "detail": detail, "ms": int((time.perf_counter() - started) * 1000)})
    return events
