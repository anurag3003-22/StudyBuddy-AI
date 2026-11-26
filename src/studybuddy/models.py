"""Shared Pydantic models: the contract between the AI agent and the UI.

These mirror the shapes the Spring Boot backend is expected to persist, so the
frontend can switch between the agent service and the Java API without
changing components.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Documents / retrieval
# --------------------------------------------------------------------------- #
class Page(BaseModel):
    number: int
    text: str


class Chunk(BaseModel):
    id: str
    doc_id: str
    doc_title: str
    page: int
    index: int
    heading: str = ""
    text: str


class Document(BaseModel):
    id: str
    title: str
    filename: str
    subject: str
    pages: int
    chunks: int
    size_bytes: int = 0
    uploaded_at: datetime = Field(default_factory=utcnow)


class DocumentSummary(BaseModel):
    id: str
    title: str
    filename: str
    subject: str
    pages: int
    chunks: int
    uploaded_at: datetime


class Citation(BaseModel):
    doc_id: str
    doc_title: str
    page: int
    heading: str = ""
    snippet: str
    score: float = 0.0


class RetrievalHit(BaseModel):
    chunk_id: str
    doc_id: str
    doc_title: str
    page: int
    heading: str
    text: str
    score: float


# --------------------------------------------------------------------------- #
# Study plan
# --------------------------------------------------------------------------- #
class PlanTask(BaseModel):
    id: str
    day: int
    date: date
    title: str
    topic: str
    kind: Literal["learn", "drill", "review", "quiz", "rest"] = "learn"
    minutes: int = 45
    done: bool = False
    citation: Citation | None = None


class StudyPlan(BaseModel):
    id: str
    subject: str
    exam_date: date
    days: int
    focus_topics: list[str] = Field(default_factory=list)
    minutes_per_day: int = 90
    rationale: str = ""
    tasks: list[PlanTask] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utcnow)


# --------------------------------------------------------------------------- #
# Quiz
# --------------------------------------------------------------------------- #
class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    answer_index: int
    explanation: str = ""
    topic: str = ""
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    citation: Citation | None = None


class Quiz(BaseModel):
    id: str
    subject: str
    topic: str
    difficulty: str = "medium"
    questions: list[QuizQuestion] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utcnow)


class GradeResult(BaseModel):
    quiz_id: str
    score: int
    total: int
    percent: float
    weak_topics: list[str] = Field(default_factory=list)
    per_question: list[dict[str, Any]] = Field(default_factory=list)
    feedback: str = ""
    created_at: datetime = Field(default_factory=utcnow)


# --------------------------------------------------------------------------- #
# Agent I/O
# --------------------------------------------------------------------------- #
class TraceEvent(BaseModel):
    node: str
    label: str
    detail: str = ""
    ms: int = 0


class ChatRequest(BaseModel):
    message: str
    subject: str | None = None
    thread_id: str = "demo-student"
    student_id: str = "demo-student"


class ChatResponse(BaseModel):
    intent: str
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    trace: list[TraceEvent] = Field(default_factory=list)
    plan: StudyPlan | None = None
    quiz: Quiz | None = None
    grading: GradeResult | None = None
    grounded: bool = True
    suggested_actions: list[str] = Field(default_factory=list)


class PlanRequest(BaseModel):
    subject: str = "DBMS"
    exam_date: date | None = None
    days: int = 7
    weak_topics: list[str] = Field(default_factory=list)
    minutes_per_day: int = 90
    student_id: str = "demo-student"


class QuizRequest(BaseModel):
    subject: str = "DBMS"
    topic: str = ""
    count: int = 5
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    student_id: str = "demo-student"


class GradeRequest(BaseModel):
    quiz_id: str
    answers: list[int | None]
    student_id: str = "demo-student"


class AttemptRecord(BaseModel):
    quiz_id: str
    student_id: str = "demo-student"
    subject: str = ""
    topic: str = ""
    score: int
    total: int
    percent: float
    weak_topics: list[str] = Field(default_factory=list)
    per_question: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utcnow)


class ProgressSummary(BaseModel):
    student_id: str = "demo-student"
    streak: int = 0
    xp: int = 0
    documents: int = 0
    chunks: int = 0
    quizzes_taken: int = 0
    average_score: float = 0.0
    weak_topics: list[dict[str, Any]] = Field(default_factory=list)
    mastered_topics: list[str] = Field(default_factory=list)
    recent_attempts: list[dict[str, Any]] = Field(default_factory=list)
    daily_minutes: list[dict[str, Any]] = Field(default_factory=list)
