"""FastAPI surface for the StudyBuddy AI agent.

This is the agent service, not the Java backend: it exposes the LangGraph
agents over HTTP so either the React app (hackathon demo) or the Spring Boot
service (production) can call it.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from .agents.graph import agent_status, graph_mermaid, run_agent, stream_agent
from .config import ROOT, get_settings
from .demo import seed_demo_notes
from .models import (
    ChatRequest,
    ChatResponse,
    DocumentSummary,
    GradeRequest,
    GradeResult,
    PlanRequest,
    ProgressSummary,
    Quiz,
    QuizRequest,
    StudyPlan,
)
from .rag.ingest import build_chunks, extract_pages
from .rag.store import get_store
from .rag.text import title_from_filename

MAX_UPLOAD_BYTES = 25 * 1024 * 1024

app = FastAPI(
    title="StudyBuddy AI Agent",
    description="LangGraph multi-agent service: RAG doubt solver, planner, quiz and progress agents.",
    version="1.0.0",
)

settings = get_settings()
origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    store = get_store()
    if not store.list_documents():
        try:
            seed_demo_notes()
        except Exception:  # pragma: no cover - demo seed must never block boot
            pass


# --------------------------------------------------------------------------- #
# Health / meta
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "agent": agent_status()}


@app.get("/api/agent/status")
def status() -> dict[str, Any]:
    return agent_status()


@app.get("/api/agent/graph")
def graph() -> dict[str, str]:
    return {"mermaid": graph_mermaid()}


# --------------------------------------------------------------------------- #
# Documents
# --------------------------------------------------------------------------- #
@app.get("/api/documents", response_model=list[DocumentSummary])
def list_documents(subject: str | None = None) -> list[DocumentSummary]:
    store = get_store()
    return [
        DocumentSummary(
            id=doc.id,
            title=doc.title,
            filename=doc.filename,
            subject=doc.subject,
            pages=doc.pages,
            chunks=doc.chunks,
            uploaded_at=doc.uploaded_at,
        )
        for doc in store.list_documents(subject)
    ]


@app.post("/api/documents", response_model=DocumentSummary)
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form("General"),
    title: str = Form(""),
) -> DocumentSummary:
    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 25 MB)")

    filename = file.filename or "notes.pdf"
    try:
        pages = extract_pages(filename, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    store = get_store()
    doc_title = title.strip() or title_from_filename(filename)
    doc_id = uuid.uuid4().hex[:12]
    chunks = build_chunks(doc_id, doc_title, subject, pages)
    document = store.add_document(
        title=doc_title,
        filename=filename,
        subject=subject.strip() or "General",
        pages=len(pages),
        chunks=chunks,
        size_bytes=len(payload),
        doc_id=doc_id,
    )

    return DocumentSummary(
        id=document.id,
        title=document.title,
        filename=document.filename,
        subject=document.subject,
        pages=document.pages,
        chunks=document.chunks,
        uploaded_at=document.uploaded_at,
    )


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str) -> dict[str, bool]:
    if not get_store().delete_document(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True}


@app.post("/api/documents/seed-demo")
def seed_demo(force: bool = False) -> dict[str, Any]:
    return seed_demo_notes(force=force)


@app.get("/api/topics")
def topics(subject: str | None = None) -> dict[str, list[str]]:
    from .agents.topics import extract_topics

    return {"topics": extract_topics(get_store().chunks_for(subject), limit=20)}


# --------------------------------------------------------------------------- #
# Chat
# --------------------------------------------------------------------------- #
@app.post("/api/agent/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    return run_agent(request)


@app.post("/api/agent/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    async def events():
        try:
            async for kind, payload in stream_agent(request):
                data = payload.model_dump(mode="json") if kind == "final" else payload
                yield f"event: {kind}\ndata: {json.dumps(data, default=str)}\n\n"
        except Exception as error:  # pragma: no cover
            yield f"event: error\ndata: {json.dumps({'detail': str(error)})}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --------------------------------------------------------------------------- #
# Plans
# --------------------------------------------------------------------------- #
@app.post("/api/agent/plan", response_model=StudyPlan)
def create_plan(request: PlanRequest) -> StudyPlan:
    from .agents.planner import build_plan

    plan = build_plan(
        subject=request.subject,
        days=request.days,
        weak_topics=request.weak_topics,
        minutes_per_day=request.minutes_per_day,
        exam_date=request.exam_date,
    )
    return get_store().save_plan(plan)


@app.get("/api/plans", response_model=list[StudyPlan])
def list_plans() -> list[StudyPlan]:
    store = get_store()
    return [StudyPlan.model_validate(item) for item in store.data["plans"]]


@app.get("/api/plans/latest", response_model=StudyPlan | None)
def latest_plan(subject: str | None = None) -> StudyPlan | None:
    return get_store().latest_plan(subject)


@app.patch("/api/plans/{plan_id}/tasks/{task_id}", response_model=StudyPlan)
def toggle_task(plan_id: str, task_id: str, done: bool | None = None) -> StudyPlan:
    plan = get_store().toggle_task(plan_id, task_id, done)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan or task not found")
    return plan


# --------------------------------------------------------------------------- #
# Quiz
# --------------------------------------------------------------------------- #
@app.post("/api/agent/quiz", response_model=Quiz)
def create_quiz(request: QuizRequest) -> Quiz:
    from .agents.quiz import generate_quiz

    return generate_quiz(
        subject=request.subject,
        topic=request.topic,
        count=request.count,
        difficulty=request.difficulty,
        student_id=request.student_id,
    )


@app.get("/api/quizzes/{quiz_id}", response_model=Quiz)
def get_quiz(quiz_id: str) -> Quiz:
    quiz = get_store().get_quiz(quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@app.post("/api/agent/grade", response_model=GradeResult)
def grade(request: GradeRequest) -> GradeResult:
    from .agents.quiz import grade_quiz

    try:
        return grade_quiz(request.quiz_id, request.answers, request.student_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


# --------------------------------------------------------------------------- #
# Progress / demo
# --------------------------------------------------------------------------- #
@app.get("/api/progress", response_model=ProgressSummary)
def progress(student_id: str = "demo-student") -> ProgressSummary:
    return ProgressSummary.model_validate(get_store().progress(student_id))


@app.post("/api/demo/reset")
def reset_demo() -> dict[str, Any]:
    store = get_store()
    store.reset()
    result = seed_demo_notes(force=True)
    return {"reset": True, **result}


# --------------------------------------------------------------------------- #
# Optional: serve the built frontend from the same origin
# --------------------------------------------------------------------------- #
_DIST = ROOT / "frontend" / "dist"
if _DIST.exists():
    app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="frontend")
