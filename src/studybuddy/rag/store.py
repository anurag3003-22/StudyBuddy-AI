"""JSON-backed state store.

Deliberately simple: the Java backend owns the real database. This store keeps
the agent demo self-contained and persists across restarts.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from ..config import STATE_FILE
from ..models import (
    AttemptRecord,
    Document,
    StudyPlan,
    Quiz,
    utcnow,
)
from .index import HybridIndex


class Store:
    def __init__(self, path: Path = STATE_FILE) -> None:
        self.path = path
        self._lock = threading.RLock()
        self._index: HybridIndex | None = None
        self._index_version = -1
        self._version = 0
        self.data: dict[str, Any] = {
            "documents": [],
            "chunks": [],
            "plans": [],
            "quizzes": [],
            "attempts": [],
        }
        self._load()

    # ------------------------------------------------------------------ io
    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                self.data.update(payload)
        except (json.JSONDecodeError, OSError):
            pass

    def save(self) -> None:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, indent=2, default=str), encoding="utf-8")
            tmp.replace(self.path)

    # ------------------------------------------------------------ documents
    def add_document(
        self,
        title: str,
        filename: str,
        subject: str,
        pages: int,
        chunks: list[dict],
        size_bytes: int = 0,
        doc_id: str | None = None,
    ) -> Document:
        with self._lock:
            document = Document(
                id=doc_id or uuid.uuid4().hex[:12],
                title=title,
                filename=filename,
                subject=subject,
                pages=pages,
                chunks=len(chunks),
                size_bytes=size_bytes,
            )
            self.data["documents"].append(document.model_dump(mode="json"))
            self.data["chunks"].extend(chunks)
            self._version += 1
            self.save()
            return document

    def list_documents(self, subject: str | None = None) -> list[Document]:
        docs = [Document.model_validate(item) for item in self.data["documents"]]
        if subject:
            docs = [doc for doc in docs if doc.subject.lower() == subject.lower()]
        return sorted(docs, key=lambda doc: doc.uploaded_at, reverse=True)

    def get_document(self, doc_id: str) -> Document | None:
        for item in self.data["documents"]:
            if item["id"] == doc_id:
                return Document.model_validate(item)
        return None

    def delete_document(self, doc_id: str) -> bool:
        with self._lock:
            before = len(self.data["documents"])
            self.data["documents"] = [d for d in self.data["documents"] if d["id"] != doc_id]
            self.data["chunks"] = [c for c in self.data["chunks"] if c["doc_id"] != doc_id]
            self._version += 1
            self.save()
            return len(self.data["documents"]) < before

    def subjects(self) -> list[str]:
        seen: dict[str, None] = {}
        for item in self.data["documents"]:
            seen.setdefault(item.get("subject") or "General", None)
        for item in self.data["plans"]:
            seen.setdefault(item.get("subject") or "General", None)
        return sorted(seen)

    def chunks_for(self, subject: str | None = None) -> list[dict]:
        chunks = self.data["chunks"]
        if subject:
            chunks = [c for c in chunks if (c.get("subject") or "").lower() == subject.lower()]
        return chunks

    # --------------------------------------------------------------- search
    @property
    def index(self) -> HybridIndex:
        with self._lock:
            if self._index is None or self._index_version != self._version:
                self._index = HybridIndex(list(self.data["chunks"]))
                self._index_version = self._version
            return self._index

    def search(
        self,
        query: str,
        limit: int = 5,
        subject: str | None = None,
        doc_ids: list[str] | None = None,
    ) -> list[dict]:
        return self.index.search(query, limit=limit, subject=subject, doc_ids=doc_ids)

    # ----------------------------------------------------------------- plans
    def save_plan(self, plan: StudyPlan) -> StudyPlan:
        with self._lock:
            self.data["plans"] = [p for p in self.data["plans"] if p["id"] != plan.id]
            self.data["plans"].append(plan.model_dump(mode="json"))
            self.save()
            return plan

    def get_plan(self, plan_id: str) -> StudyPlan | None:
        for item in self.data["plans"]:
            if item["id"] == plan_id:
                return StudyPlan.model_validate(item)
        return None

    def latest_plan(self, subject: str | None = None) -> StudyPlan | None:
        plans = [StudyPlan.model_validate(p) for p in self.data["plans"]]
        if subject:
            plans = [p for p in plans if p.subject.lower() == subject.lower()]
        return max(plans, key=lambda p: p.created_at, default=None)

    def toggle_task(self, plan_id: str, task_id: str, done: bool | None = None) -> StudyPlan | None:
        with self._lock:
            plan = self.get_plan(plan_id)
            if not plan:
                return None
            for task in plan.tasks:
                if task.id == task_id:
                    task.done = (not task.done) if done is None else done
            self.save_plan(plan)
            return plan

    # ---------------------------------------------------------------- quizzes
    def save_quiz(self, quiz: Quiz) -> Quiz:
        with self._lock:
            self.data["quizzes"] = [q for q in self.data["quizzes"] if q["id"] != quiz.id]
            self.data["quizzes"].append(quiz.model_dump(mode="json"))
            self.save()
            return quiz

    def get_quiz(self, quiz_id: str) -> Quiz | None:
        for item in self.data["quizzes"]:
            if item["id"] == quiz_id:
                return Quiz.model_validate(item)
        return None

    # --------------------------------------------------------------- attempts
    def add_attempt(self, attempt: AttemptRecord) -> AttemptRecord:
        with self._lock:
            self.data["attempts"].append(attempt.model_dump(mode="json"))
            self.save()
            return attempt

    def attempts(self, student_id: str | None = None) -> list[dict]:
        items = self.data["attempts"]
        if student_id:
            items = [a for a in items if a.get("student_id") == student_id]
        return sorted(items, key=lambda a: a.get("created_at", ""), reverse=True)

    # -------------------------------------------------------------- progress
    def reset(self) -> None:
        with self._lock:
            self.data = {"documents": [], "chunks": [], "plans": [], "quizzes": [], "attempts": []}
            self._version += 1
            self.save()

    def progress(self, student_id: str = "demo-student") -> dict[str, Any]:
        attempts = self.attempts(student_id)
        documents = self.list_documents()
        topic_stats: dict[str, dict[str, int]] = {}
        for attempt in attempts:
            for item in attempt.get("per_question", []):
                topic = item.get("topic") or "General"
                bucket = topic_stats.setdefault(topic, {"correct": 0, "total": 0})
                bucket["total"] += 1
                bucket["correct"] += 1 if item.get("correct") else 0

        weak = [
            {"topic": topic, "accuracy": round(stat["correct"] / stat["total"], 2), "attempts": stat["total"]}
            for topic, stat in topic_stats.items()
            if stat["total"] and stat["correct"] / stat["total"] < 0.75
        ]
        weak.sort(key=lambda item: item["accuracy"])
        mastered = [t for t, s in topic_stats.items() if s["total"] >= 2 and s["correct"] / s["total"] >= 0.85]

        dates = sorted({str(a.get("created_at", ""))[:10] for a in attempts if a.get("created_at")})
        streak = _streak_from_dates(dates)
        total_correct = sum(a.get("score", 0) for a in attempts)
        total_questions = sum(a.get("total", 0) for a in attempts)
        average = round(100 * total_correct / total_questions, 1) if total_questions else 0.0
        xp = total_correct * 10 + len(attempts) * 15 + len(documents) * 25

        daily: dict[str, int] = {}
        for attempt in attempts:
            day = str(attempt.get("created_at", ""))[:10]
            if day:
                daily[day] = daily.get(day, 0) + 10
        for plan in self.data["plans"]:
            for task in plan.get("tasks", []):
                if task.get("done"):
                    day = str(task.get("date", ""))[:10]
                    daily[day] = daily.get(day, 0) + task.get("minutes", 45)

        today = date.today()
        daily_minutes = [
            {"date": (today - timedelta(days=offset)).isoformat(), "minutes": daily.get((today - timedelta(days=offset)).isoformat(), 0)}
            for offset in range(6, -1, -1)
        ]

        return {
            "student_id": student_id,
            "streak": streak,
            "xp": xp,
            "documents": len(documents),
            "chunks": len(self.data["chunks"]),
            "quizzes_taken": len(attempts),
            "average_score": average,
            "weak_topics": weak[:6],
            "mastered_topics": mastered[:8],
            "recent_attempts": attempts[:5],
            "daily_minutes": daily_minutes,
        }


def _streak_from_dates(dates: list[str]) -> int:
    if not dates:
        return 0
    parsed = sorted({datetime.fromisoformat(d).date() for d in dates if d}, reverse=True)
    today = date.today()
    if not parsed or (today - parsed[0]).days > 1:
        return 0
    streak = 1
    cursor = parsed[0]
    for day in parsed[1:]:
        if (cursor - day).days == 1:
            streak += 1
            cursor = day
        elif (cursor - day).days > 1:
            break
    return streak


_STORE: Store | None = None


def get_store() -> Store:
    global _STORE
    if _STORE is None:
        _STORE = Store()
    return _STORE
