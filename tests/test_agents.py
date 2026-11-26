"""End-to-end tests for the LangGraph agents (offline mode)."""

from __future__ import annotations

import pytest

from studybuddy.agents.graph import run_agent
from studybuddy.agents.planner import build_plan
from studybuddy.agents.quiz import generate_quiz, grade_quiz
from studybuddy.models import ChatRequest
from studybuddy.rag import store as store_module
from studybuddy.rag.ingest import build_chunks
from studybuddy.rag.store import Store
from studybuddy.rag.text import chunk_pages, split_sentences

PAGES = [
    (
        1,
        """Unit 1: Normalization
Normalization is the process of organizing data to reduce redundancy and remove anomalies.
First normal form requires every attribute to hold atomic values.
""",
    ),
    (
        2,
        """Boyce-Codd Normal Form (BCNF)
Boyce-Codd normal form is a stronger version of third normal form.
A relation is in BCNF if every determinant is a superkey.
BCNF removes anomalies caused by overlapping candidate keys.
""",
    ),
]


@pytest.fixture()
def store(tmp_path, monkeypatch):
    instance = Store(tmp_path / "state.json")
    monkeypatch.setattr(store_module, "_STORE", instance)
    chunks = build_chunks("doc1", "DBMS Notes", "DBMS", PAGES)
    instance.add_document(
        title="DBMS Notes",
        filename="dbms.pdf",
        subject="DBMS",
        pages=len(PAGES),
        chunks=chunks,
        doc_id="doc1",
    )
    return instance


def test_sentence_split_handles_wrapped_lines():
    text = "BCNF is stronger than 3NF.\nA relation is in BCNF if every determinant is a superkey."
    sentences = split_sentences(text)
    assert len(sentences) == 2
    assert sentences[0].endswith("3NF.")


def test_chunking_keeps_page_and_heading():
    chunks = chunk_pages(PAGES)
    assert chunks[0].page == 1
    assert chunks[0].heading.startswith("Unit 1")
    bcnf = [chunk for chunk in chunks if chunk.page == 2]
    assert bcnf and bcnf[0].heading == "Boyce-Codd Normal Form (BCNF)"
    assert "Boyce-Codd normal form is a stronger" in bcnf[0].text


def test_retrieval_is_scoped_and_cited(store):
    hits = store.search("BCNF superkey", subject="DBMS")
    assert hits
    assert hits[0]["page"] == 2
    assert hits[0]["doc_title"] == "DBMS Notes"


def test_doubt_agent_grounds_answer(store):
    response = run_agent(ChatRequest(message="Why is BCNF stronger than 3NF?", subject="DBMS", thread_id="t-doubt"))
    assert response.intent == "doubt"
    assert response.grounded is True
    assert response.citations
    assert "BCNF" in response.answer
    assert [event.node for event in response.trace] == ["supervisor", "retrieve", "doubt"]


def test_doubt_agent_refuses_outside_notes(store):
    response = run_agent(ChatRequest(message="Explain quantum chromodynamics", subject="DBMS", thread_id="t-gap"))
    assert response.grounded is False
    assert response.citations == []


def test_planner_prioritises_weak_topic(store):
    plan = build_plan("DBMS", days=5, weak_topics=["Normalization"], minutes_per_day=60)
    assert plan.days == 5
    assert plan.tasks[0].topic == "Normalization"
    assert plan.tasks[0].kind == "learn"
    assert any(task.kind == "quiz" for task in plan.tasks)
    assert any(task.kind == "review" for task in plan.tasks)


def test_quiz_generation_and_grading(store):
    quiz = generate_quiz("DBMS", "BCNF", count=4, difficulty="medium")
    assert quiz.questions
    assert all(len(question.options) == 4 for question in quiz.questions)
    assert all(0 <= question.answer_index < 4 for question in quiz.questions)

    answers = [question.answer_index for question in quiz.questions]
    answers[0] = (answers[0] + 1) % 4
    result = grade_quiz(quiz.id, answers)
    assert result.total == len(quiz.questions)
    assert result.score == len(quiz.questions) - 1
    assert result.weak_topics


def test_plan_intent_from_chat(store):
    response = run_agent(
        ChatRequest(
            message="My DBMS exam is in 7 days and I am weak in normalization. Make me a plan.",
            subject="DBMS",
            thread_id="t-plan",
        )
    )
    assert response.intent == "plan"
    assert response.plan is not None
    assert response.plan.days == 7
    assert any("normalization" in topic.lower() for topic in response.plan.focus_topics)


def test_progress_accumulates(store):
    quiz = generate_quiz("DBMS", "BCNF", count=3, difficulty="easy")
    grade_quiz(quiz.id, [question.answer_index for question in quiz.questions])
    progress = store.progress()
    assert progress["quizzes_taken"] == 1
    assert progress["average_score"] == 100.0
    assert progress["xp"] > 0
