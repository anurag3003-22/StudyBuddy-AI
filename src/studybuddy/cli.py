"""Command line entry points."""

from __future__ import annotations

import argparse
import sys


def serve(host: str | None = None, port: int | None = None, reload: bool = False) -> None:
    import uvicorn

    from .config import get_settings

    settings = get_settings()
    uvicorn.run(
        "studybuddy.api:app",
        host=host or settings.host,
        port=port or settings.port,
        reload=reload,
    )


def demo() -> None:
    """Scripted end-to-end run of the four agents (no server needed)."""
    from .agents.graph import run_agent
    from .agents.planner import build_plan
    from .agents.quiz import generate_quiz, grade_quiz
    from .demo import seed_demo_notes
    from .models import ChatRequest
    from .rag.store import get_store

    print("=" * 72)
    print("StudyBuddy AI — offline agent demo")
    print("=" * 72)
    seeded = seed_demo_notes()
    store = get_store()
    docs = store.list_documents()
    print(f"\n[ingest] {len(docs)} document(s), {len(store.chunks_for(None))} chunks")
    for doc in docs:
        print(f"         • {doc.title} ({doc.subject}) — {doc.pages} pages, {doc.chunks} chunks")

    print("\n[doubt] 'Explain BCNF and why it is stronger than 3NF'")
    response = run_agent(
        ChatRequest(message="Explain BCNF and why it is stronger than 3NF", subject="DBMS", thread_id="cli-demo")
    )
    print(f"         intent={response.intent} grounded={response.grounded}")
    print(_indent(response.answer))
    for citation in response.citations[:3]:
        print(f"         ↳ {citation.doc_title} p.{citation.page} ({citation.score:.2f})")

    print("\n[planner] 7 days, weak in normalization")
    plan = build_plan("DBMS", days=7, weak_topics=["Normalization"], minutes_per_day=90)
    store.save_plan(plan)
    print(f"         {len(plan.tasks)} tasks · exam {plan.exam_date}")
    for task in plan.tasks[:4]:
        print(f"         Day {task.day}: {task.title} ({task.minutes}m)")

    print("\n[quiz] 5 questions on BCNF")
    quiz = generate_quiz("DBMS", "BCNF", count=5, difficulty="medium")
    for index, question in enumerate(quiz.questions, start=1):
        print(f"         {index}. {question.question}")
        for option_index, option in enumerate(question.options):
            marker = "*" if option_index == question.answer_index else " "
            print(f"            {marker} {option}")

    answers = [question.answer_index for question in quiz.questions]
    answers[0] = (answers[0] + 1) % 4
    result = grade_quiz(quiz.id, answers)
    print(f"\n[grade] {result.score}/{result.total} ({result.percent}%)")
    print(_indent(result.feedback))
    print(f"         weak topics: {result.weak_topics}")

    progress = store.progress()
    print(f"\n[progress] streak={progress['streak']} xp={progress['xp']} avg={progress['average_score']}%")
    print("\nDone. Start the API with: uv run studybuddy serve")


def _indent(text: str, width: int = 9) -> str:
    pad = " " * width
    return "\n".join(pad + line for line in text.splitlines())


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="studybuddy", description="StudyBuddy AI agent service")
    parser.add_argument("command", nargs="?", default="serve", choices=["serve", "demo"])
    parser.add_argument("--host", default=None)
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args(argv)

    if args.command == "demo":
        demo()
    else:
        serve(args.host, args.port, args.reload)


if __name__ == "__main__":
    sys.exit(main())
