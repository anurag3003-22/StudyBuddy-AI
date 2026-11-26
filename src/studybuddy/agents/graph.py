"""LangGraph supervisor: routes a student message to the right specialist agent.

Graph
-----
START -> supervisor -> retrieve -> {doubt | planner | quiz} -> finalize -> END
                     -> progress --------------------------^
                     -> general ---------------------------^
"""

from __future__ import annotations

import re
import time
from datetime import date, timedelta
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from ..config import get_settings
from ..models import ChatRequest, ChatResponse, Citation, TraceEvent
from ..rag.store import get_store
from .doubt import doubt_node
from .planner import plan_node
from .progress import progress_node
from .quiz import quiz_node
from .state import AgentState
from .topics import extract_topics

SUBJECT_HINTS = ("dbms", "os", "dsa", "cn", "oop", "java", "python", "math", "coa", "se", "ml", "ai")

CAPABILITIES = """I'm StudyBuddy — grounded in **your** notes, never the open web.

- **Doubt solving** → ask any syllabus question, get an answer with page citations
- **Study plan** → "make me a 7-day plan, exam in 7 days, weak in normalization"
- **Quiz** → "quiz me on BCNF, 5 questions"
- **Progress** → "how am I doing?"

Upload your notes in the Library first so I have something to cite."""


def _trace(state: dict[str, Any], node: str, label: str, detail: str, started: float) -> list[dict[str, Any]]:
    events = list(state.get("trace") or [])
    events.append({"node": node, "label": label, "detail": detail, "ms": int((time.perf_counter() - started) * 1000)})
    return events


def _detect_subject(text: str, fallback: str) -> str:
    store = get_store()
    known = store.subjects()
    lowered = text.lower()
    for subject in known:
        if subject and subject.lower() in lowered:
            return subject
    for hint in SUBJECT_HINTS:
        if re.search(rf"\b{re.escape(hint)}\b", lowered):
            return hint.upper()
    return fallback or (known[0] if known else "General")


def _extract_days(text: str) -> int | None:
    patterns = [
        r"\b(\d{1,2})\s*[- ]?\s*day\b",
        r"\bin\s+(\d{1,2})\s+days?\b",
        r"\b(\d{1,2})\s+days?\s+(?:left|until|before|to)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return max(1, min(int(match.group(1)), 30))
    return None


def _extract_list(text: str) -> list[str]:
    cleaned = re.sub(r"\s+(?:please|thanks|and make|then)\b.*$", "", text, flags=re.I)
    parts = re.split(r",|;|/|\band\b|\bplus\b", cleaned)
    topics: list[str] = []
    for part in parts:
        topic = re.sub(r"^(?:the|a|an|my)\s+", "", part.strip(), flags=re.I).strip(" .!?")
        if 1 < len(topic) <= 40:
            topics.append(topic)
    return topics


def classify(text: str) -> str:
    lowered = text.lower()
    if re.search(r"\b(plan|schedule|roadmap|timetable|routine)\b", lowered) or "days left" in lowered:
        return "plan"
    if re.search(r"\b(quiz|mcq|test me|practice questions?|mock test)\b", lowered):
        return "quiz"
    if re.search(r"\b(progress|streak|how am i|dashboard|weak topics?|mastery|analytics)\b", lowered):
        return "progress"
    if re.search(r"\b(hi|hello|hey|help|what can you do|who are you)\b", lowered) and len(lowered.split()) <= 8:
        return "general"
    return "doubt"


def supervisor_node(state: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    messages = state.get("messages") or []
    query = ""
    for message in reversed(messages):
        if isinstance(message, HumanMessage) or getattr(message, "type", "") == "human":
            query = str(message.content).strip()
            break
    query = query or state.get("query") or ""
    intent = classify(query)
    student_id = state.get("student_id") or "demo-student"
    subject = _detect_subject(query, state.get("subject") or "")
    progress = get_store().progress(student_id)
    tracked_weak = [item["topic"] for item in progress.get("weak_topics", []) if item.get("topic")]

    params: dict[str, Any] = {}
    if intent == "plan":
        days = _extract_days(query) or 7
        params["days"] = days
        weak_match = re.search(
            r"(?:weak|struggling|bad|poor|need help|not good)\s+(?:in|at|with)\s+([^.?!]+)", query, re.I
        )
        weak = _extract_list(weak_match.group(1)) if weak_match else []
        params["weak_topics"] = weak or tracked_weak[:2]
        date_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", query)
        if date_match:
            try:
                params["exam_date"] = date.fromisoformat(date_match.group(1))
            except ValueError:
                pass
        params["exam_date"] = params.get("exam_date") or (date.today() + timedelta(days=days))
        minutes = re.search(r"(\d{1,3})\s*(?:min|minutes)", query, re.I)
        params["minutes_per_day"] = int(minutes.group(1)) if minutes else 90
    elif intent == "quiz":
        topic_match = re.search(
            r"(?:quiz|test|practice|questions?|mcq)\s*(?:me\s*)?(?:on|about|for|covering)?\s*([^.?!]{2,60})",
            query,
            re.I,
        )
        topic = ""
        if topic_match:
            candidate = re.sub(r"\b(\d+\s*questions?|easy|medium|hard|please)\b", "", topic_match.group(1), flags=re.I)
            candidate = candidate.strip(" .!?,-")
            if candidate and candidate.lower() not in {"me", "my notes", "this", "it"}:
                topic = candidate
        if not topic and tracked_weak:
            topic = tracked_weak[0]
        count_match = re.search(r"(\d{1,2})\s*(?:questions?|mcqs?)", query, re.I)
        difficulty = next((level for level in ("easy", "medium", "hard") if level in query.lower()), "medium")
        params.update(
            {
                "topic": topic,
                "count": int(count_match.group(1)) if count_match else 5,
                "difficulty": difficulty,
            }
        )

    return {
        "query": query,
        "intent": intent,  # type: ignore[typeddict-item]
        "subject": subject,
        "student_id": student_id,
        "params": params,
        "answer": CAPABILITIES if intent == "general" else "",
        "citations": [],
        "grounded": True,
        "trace_start": len(state.get("trace") or []),
        "trace": _trace(
            state,
            "supervisor",
            "Supervisor",
            f"intent={intent}" + (f" · subject={subject}" if subject else ""),
            started,
        ),
    }


def retrieve_node(state: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    query = state.get("query") or ""
    subject = state.get("subject") or ""
    store = get_store()
    hits = store.search(query, limit=6, subject=subject)
    if not hits and subject:
        hits = store.search(query, limit=6)
    return {
        "retrieved": hits,
        "trace": _trace(
            state,
            "retrieve",
            "Retrieval (RAG)",
            f"{len(hits)} passages · top score {hits[0]['score'] if hits else 0}",
            started,
        ),
    }


def general_node(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "answer": CAPABILITIES,
        "citations": [],
        "grounded": True,
        "suggested_actions": ["Make my study plan", "Quiz me on my weakest topic", "How am I doing?"],
    }


def finalize_node(state: dict[str, Any]) -> dict[str, Any]:
    start = int(state.get("trace_start") or 0)
    trace = list(state.get("trace") or [])[start:]
    answer = state.get("answer") or "I'm here — ask me about your notes."

    if state.get("intent") == "plan" and not state.get("plan"):
        answer = "I couldn't build a plan yet. Upload notes for this subject and try again."
    if state.get("intent") == "quiz" and not state.get("quiz"):
        answer = "I couldn't generate questions yet. Upload notes for this subject first."

    if state.get("intent") == "doubt":
        suggested = state.get("suggested_actions") or []
    else:
        suggested = state.get("suggested_actions") or ["Quiz me on this", "Add to my plan"]

    return {
        "answer": answer,
        "suggested_actions": suggested,
        "messages": [AIMessage(content=answer)],
        "trace": trace,
    }


def _route_intent(state: dict[str, Any]) -> str:
    intent = state.get("intent") or "doubt"
    if intent in {"doubt", "plan", "quiz"}:
        return "retrieve"
    if intent == "progress":
        return "progress"
    return "general"


def _route_after_retrieval(state: dict[str, Any]) -> str:
    intent = state.get("intent")
    return intent if intent in {"doubt", "plan", "quiz"} else "doubt"


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("doubt", doubt_node)
    graph.add_node("plan", plan_node)
    graph.add_node("quiz", quiz_node)
    graph.add_node("progress", progress_node)
    graph.add_node("general", general_node)
    graph.add_node("finalize", finalize_node)

    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges(
        "supervisor",
        _route_intent,
        {"retrieve": "retrieve", "progress": "progress", "general": "general"},
    )
    graph.add_conditional_edges(
        "retrieve",
        _route_after_retrieval,
        {"doubt": "doubt", "plan": "plan", "quiz": "quiz"},
    )
    for node in ("doubt", "plan", "quiz", "progress", "general"):
        graph.add_edge(node, "finalize")
    graph.add_edge("finalize", END)

    return graph.compile(checkpointer=MemorySaver())


GRAPH = build_graph()


def _to_response(state: dict[str, Any]) -> ChatResponse:
    plan = state.get("plan")
    quiz = state.get("quiz")
    grading = state.get("grading")
    return ChatResponse(
        intent=state.get("intent") or "doubt",
        answer=state.get("answer") or "",
        citations=[Citation.model_validate(item) for item in state.get("citations") or []],
        trace=[TraceEvent.model_validate(item) for item in state.get("trace") or []],
        plan=plan,
        quiz=quiz,
        grading=grading,
        grounded=bool(state.get("grounded", True)),
        suggested_actions=state.get("suggested_actions") or [],
    )


def run_agent(request: ChatRequest) -> ChatResponse:
    config = {"configurable": {"thread_id": request.thread_id}}
    inputs = {
        "messages": [HumanMessage(content=request.message)],
        "query": request.message,
        "student_id": request.student_id,
        "subject": request.subject or "",
        "trace": [],
        "trace_start": 0,
        "plan": None,
        "quiz": None,
        "grading": None,
        "answer": "",
    }
    state = GRAPH.invoke(inputs, config=config)  # type: ignore[arg-type]
    return _to_response(state)


async def stream_agent(request: ChatRequest):
    """Yield ('node', update) events, then ('final', ChatResponse)."""
    config = {"configurable": {"thread_id": request.thread_id}}
    inputs = {
        "messages": [HumanMessage(content=request.message)],
        "query": request.message,
        "student_id": request.student_id,
        "subject": request.subject or "",
        "trace": [],
        "trace_start": 0,
        "plan": None,
        "quiz": None,
        "grading": None,
        "answer": "",
    }
    async for update in GRAPH.astream(inputs, config=config, stream_mode="updates"):
        for node, payload in update.items():
            if node == "finalize":
                continue
            event: dict[str, Any] = {"node": node}
            if isinstance(payload, dict):
                if payload.get("trace"):
                    event["trace"] = payload["trace"][-1:]
                if payload.get("answer"):
                    event["answer"] = payload["answer"]
            yield "node", event

    state = GRAPH.get_state(config).values
    yield "final", _to_response(state)


def graph_mermaid() -> str:
    return GRAPH.get_graph().draw_mermaid()


def agent_status() -> dict[str, Any]:
    settings = get_settings()
    store = get_store()
    chunks = store.chunks_for(None)
    return {
        "llm_enabled": settings.llm_enabled,
        "model": settings.llm_model if settings.llm_enabled else "offline-heuristics",
        "embeddings": settings.embedding_enabled,
        "documents": len(store.list_documents()),
        "chunks": len(chunks),
        "topics": extract_topics(chunks, limit=8),
    }
