"""LangGraph state definition."""

from __future__ import annotations

from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

Intent = Literal["doubt", "plan", "quiz", "progress", "general"]


class AgentState(TypedDict, total=False):
    # conversation (checkpointed per thread)
    messages: Annotated[list[BaseMessage], add_messages]

    # routing
    intent: Intent
    query: str
    subject: str
    student_id: str
    params: dict[str, Any]

    # retrieval
    retrieved: list[dict[str, Any]]

    # outputs
    answer: str
    citations: list[dict[str, Any]]
    grounded: bool
    plan: dict[str, Any] | None
    quiz: dict[str, Any] | None
    grading: dict[str, Any] | None
    progress: dict[str, Any] | None
    suggested_actions: list[str]

    # observability
    trace: list[dict[str, Any]]
    trace_start: int
