"""Quiz agent: authors MCQs from the notes, then grades attempts."""

from __future__ import annotations

import random
import re
import time
import uuid
import zlib
from typing import Any

from pydantic import BaseModel, Field

from ..llm import llm_json, llm_text
from ..models import AttemptRecord, Citation, GradeResult, Quiz, QuizQuestion
from ..rag.store import get_store
from ..rag.text import split_sentences, strip_heading, tokenize
from .prompts import GRADER_SYSTEM, QUIZ_SYSTEM

DEFINITION_RE = re.compile(
    r"^(?P<term>[A-Z0-9][A-Za-z0-9][A-Za-z0-9 \-/()'&,.]{1,46}?)\s+"
    r"(?:is|are|refers to|means|is defined as|can be defined as|describes|denotes)\s+"
    r"(?P<body>[A-Za-z0-9].{20,300})$"
)

BAD_TERM_STARTS = {
    "it", "this", "that", "there", "they", "these", "those", "we", "you", "he",
    "she", "the", "a", "an", "in", "on", "for", "if", "when", "which", "what",
    "however", "therefore", "thus", "each", "every", "some", "all", "one",
}
CONNECTOR_ENDINGS = {"and", "or", "of", "for", "to", "with", "the", "a", "an", "in", "on", "by"}
TERM_VERBS = {
    "is", "are", "was", "were", "be", "requires", "require", "means", "mean",
    "refers", "refer", "describes", "describe", "must", "can", "should",
    "returns", "return", "holds", "uses", "use", "has", "have", "allows",
    "collapses", "applies", "removes", "creates", "stores", "contains",
}


def _valid_term(term: str) -> bool:
    words = term.replace("-", " ").split()
    if not (1 <= len(words) <= 6):
        return False
    if words[0].lower() in BAD_TERM_STARTS:
        return False
    if words[-1].lower() in CONNECTOR_ENDINGS:
        return False
    if any(word.lower().strip(".,") in TERM_VERBS for word in words):
        return False
    return True


class _LLMQuestion(BaseModel):
    question: str
    options: list[str]
    answer_index: int
    explanation: str = ""
    topic: str = ""
    difficulty: str = "medium"


class _LLMPayload(BaseModel):
    questions: list[_LLMQuestion] = Field(default_factory=list)


def _stable_seed(text: str) -> int:
    return zlib.crc32(text.encode("utf-8"))


def _shuffle(options: list[str], answer_index: int, seed: int) -> tuple[list[str], int]:
    order = list(range(len(options)))
    random.Random(seed).shuffle(order)
    shuffled = [options[i] for i in order]
    return shuffled, order.index(answer_index)


def _clean_option(text: str, limit: int = 170) -> str:
    clean = re.sub(r"\s+", " ", text).strip(" .;:-—–")
    if clean and clean[0].islower():
        clean = clean[0].upper() + clean[1:]
    if len(clean) > limit:
        clean = clean[: limit - 1].rsplit(" ", 1)[0] + "…"
    return clean


def _topic_of(chunk: dict[str, Any]) -> str:
    heading = (chunk.get("heading") or "").strip()
    heading = re.sub(
        r"^(?:unit|chapter|module|topic|section|lesson)\s*[\divx]+[:.\-]\s*", "", heading, flags=re.I
    ).strip()
    if heading and len(heading) <= 40:
        return heading
    words = tokenize(chunk.get("text", ""))[:4]
    return " ".join(words).title() if words else "General"


def _candidate_definitions(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for chunk in chunks:
        body_text = strip_heading(chunk.get("text", ""), chunk.get("heading") or "")
        for sentence in split_sentences(body_text):
            match = DEFINITION_RE.match(sentence.strip())
            if not match:
                continue
            term = match.group("term").strip(" ,;:-")
            body = match.group("body").strip()
            if not _valid_term(term) or len(body) < 18:
                continue
            items.append({"term": term, "body": _clean_option(body), "chunk": chunk})
    return items


def _candidate_clozes(chunks: list[dict[str, Any]], corpus_freq: dict[str, int]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for chunk in chunks:
        body_text = strip_heading(chunk.get("text", ""), chunk.get("heading") or "")
        for sentence in split_sentences(body_text):
            if not (55 <= len(sentence) <= 260):
                continue
            tokens = [t for t in tokenize(sentence) if len(t) >= 5]
            if not tokens:
                continue
            best = max(tokens, key=lambda token: (corpus_freq.get(token, 0), len(token)))
            if corpus_freq.get(best, 0) < 2:
                continue
            pattern = re.compile(rf"\b{re.escape(best)}\b", re.IGNORECASE)
            if len(pattern.findall(sentence)) != 1:
                continue
            question = pattern.sub("______", sentence)
            items.append({"question": question, "answer": best, "chunk": chunk})
    return items


def _build_offline_quiz(
    subject: str,
    topic: str,
    chunks: list[dict[str, Any]],
    count: int,
    difficulty: str,
    preferred_ids: set[str] | None = None,
) -> list[QuizQuestion]:
    preferred_ids = preferred_ids or set()
    corpus_freq: dict[str, int] = {}
    for chunk in chunks:
        for token in set(tokenize(chunk.get("text", ""))):
            corpus_freq[token] = corpus_freq.get(token, 0) + 1

    definitions = _candidate_definitions(chunks)
    clozes = _candidate_clozes(chunks, corpus_freq)
    all_terms = sorted({token for chunk in chunks for token in tokenize(chunk.get("text", ""))})

    questions: list[QuizQuestion] = []
    seen: set[str] = set()
    rng = random.Random(_stable_seed(f"{subject}:{topic}:{count}"))

    def add_definition(item: dict[str, Any], index: int) -> bool:
        term, body = item["term"], item["body"]
        if term.lower() in seen or len(body) < 25:
            return False
        distractors = [
            other["body"]
            for other in definitions
            if other["term"].lower() != term.lower() and other["body"] != body
        ]
        rng.shuffle(distractors)
        options = [body] + distractors[:3]
        if len(options) < 4:
            return False
        seen.add(term.lower())
        options, answer_index = _shuffle(options, 0, _stable_seed(term + str(index)))
        questions.append(
            QuizQuestion(
                id=uuid.uuid4().hex[:10],
                question=f"Which statement best describes {term}?",
                options=options,
                answer_index=answer_index,
                explanation=f"Your notes define {term} as: {_clean_option(body, 140)}.",
                topic=_topic_of(item["chunk"]),
                difficulty=difficulty if difficulty in {"easy", "medium", "hard"} else "medium",
                citation=_citation(item["chunk"]),
            )
        )
        return True

    def add_cloze(item: dict[str, Any], index: int) -> bool:
        answer = item["answer"]
        fingerprint = item["question"][:70]
        if fingerprint in seen:
            return False
        candidates = [
            term
            for term in all_terms
            if term != answer and abs(len(term) - len(answer)) <= 4
        ]
        rng.shuffle(candidates)
        options = [answer] + candidates[:3]
        if len(options) < 4:
            return False
        seen.add(fingerprint)
        options, answer_index = _shuffle(options, 0, _stable_seed(fingerprint + str(index)))
        questions.append(
            QuizQuestion(
                id=uuid.uuid4().hex[:10],
                question=f"Fill in the blank: {item['question']}",
                options=options,
                answer_index=answer_index,
                explanation=f"The missing term is “{answer}” — see the cited page.",
                topic=_topic_of(item["chunk"]),
                difficulty="hard" if difficulty == "hard" else "medium",
                citation=_citation(item["chunk"]),
            )
        )
        return True

    # Hard mode leans on recall (cloze); easy/medium lean on recognition.
    pools = [clozes, definitions] if difficulty == "hard" else [definitions, clozes]
    for pool in pools:
        rng.shuffle(pool)
        # Chunks retrieved for the requested topic come first, then filler.
        pool.sort(key=lambda item: 0 if item["chunk"].get("id") in preferred_ids else 1)
        for index, item in enumerate(pool):
            if len(questions) >= count:
                break
            if pool is definitions:
                add_definition(item, index)
            else:
                add_cloze(item, index)
        if len(questions) >= count:
            break

    return questions[:count]


def _citation(chunk: dict[str, Any]) -> Citation:
    body = strip_heading(chunk.get("text", ""), chunk.get("heading") or "")
    return Citation(
        doc_id=chunk["doc_id"],
        doc_title=chunk["doc_title"],
        page=chunk["page"],
        heading=chunk.get("heading") or "",
        snippet=" ".join(body.split())[:220],
        score=float(chunk.get("score", 0.0)),
    )


def generate_quiz(
    subject: str,
    topic: str,
    count: int = 5,
    difficulty: str = "medium",
    student_id: str = "demo-student",
) -> Quiz:
    store = get_store()
    count = max(1, min(int(count or 5), 15))
    chunks = store.chunks_for(subject) or store.chunks_for(None)

    focus = topic or subject
    hits = store.search(focus, limit=10, subject=subject) or store.search(focus, limit=10)
    context_chunks = hits or chunks[:10]

    questions: list[QuizQuestion] = []
    if context_chunks:
        context = "\n\n".join(
            f"[{index}] {hit['doc_title']} p.{hit['page']} ({hit.get('heading') or 'notes'})\n"
            + " ".join(hit.get("text", "").split())[:800]
            for index, hit in enumerate(context_chunks[:8], start=1)
        )
        payload = llm_json(
            QUIZ_SYSTEM,
            f"Subject: {subject}\nTopic: {focus}\nDifficulty: {difficulty}\n"
            f"Write {count} questions.\n\nCONTEXT\n{context}",
            _LLMPayload,
        )
        if payload:
            for item in payload.questions:
                options = [_clean_option(option) for option in item.options if option.strip()]
                if len(options) != 4 or not (0 <= item.answer_index < 4):
                    continue
                if len(set(option.lower() for option in options)) != 4:
                    continue
                chunk = context_chunks[min(len(questions), len(context_chunks) - 1)]
                questions.append(
                    QuizQuestion(
                        id=uuid.uuid4().hex[:10],
                        question=item.question.strip(),
                        options=options,
                        answer_index=item.answer_index,
                        explanation=item.explanation.strip(),
                        topic=item.topic.strip() or _topic_of(chunk),
                        difficulty=item.difficulty if item.difficulty in {"easy", "medium", "hard"} else difficulty,
                        citation=_citation(chunk),
                    )
                )

    if len(questions) < count:
        preferred = {hit.get("id") for hit in context_chunks if hit.get("id")}
        ordered = list(context_chunks) + [c for c in chunks if c.get("id") not in preferred]
        fallback = _build_offline_quiz(
            subject,
            focus,
            ordered,
            count - len(questions),
            difficulty,
            preferred_ids=preferred,
        )
        existing = {q.question.lower() for q in questions}
        questions.extend(q for q in fallback if q.question.lower() not in existing)

    quiz = Quiz(
        id=uuid.uuid4().hex[:12],
        subject=subject,
        topic=focus,
        difficulty=difficulty,
        questions=questions[:count],
    )
    return store.save_quiz(quiz)


def grade_quiz(quiz_id: str, answers: list[int | None], student_id: str = "demo-student") -> GradeResult:
    store = get_store()
    quiz = store.get_quiz(quiz_id)
    if quiz is None:
        raise ValueError(f"Quiz {quiz_id} not found")

    per_question: list[dict[str, Any]] = []
    correct_count = 0
    weak: list[str] = []
    for index, question in enumerate(quiz.questions):
        given = answers[index] if index < len(answers) else None
        correct = given == question.answer_index
        correct_count += 1 if correct else 0
        if not correct:
            weak.append(question.topic or quiz.topic)
        per_question.append(
            {
                "question_id": question.id,
                "topic": question.topic or quiz.topic,
                "correct": correct,
                "given": given,
                "answer_index": question.answer_index,
            }
        )

    total = len(quiz.questions)
    percent = round(100 * correct_count / total, 1) if total else 0.0
    weak = list(dict.fromkeys([w for w in weak if w]))

    if weak:
        feedback = (
            f"You scored {correct_count}/{total} ({percent}%). Focus next on "
            f"{', '.join(weak[:3])} — review the cited pages, then retry a short drill on the weakest one."
        )
    else:
        feedback = (
            f"Clean sweep — {correct_count}/{total} ({percent}%). Move this topic to spaced review in 3 days "
            f"and raise the difficulty to hard for the next drill."
        )
    llm_feedback = llm_text(
        GRADER_SYSTEM,
        f"Quiz topic: {quiz.topic}\nScore: {correct_count}/{total}\nMissed topics: {weak}\n"
        f"Question-level results: {per_question}",
        temperature=0.4,
    )
    if llm_feedback:
        feedback = llm_feedback

    result = GradeResult(
        quiz_id=quiz.id,
        score=correct_count,
        total=total,
        percent=percent,
        weak_topics=weak,
        per_question=per_question,
        feedback=feedback,
    )
    store.add_attempt(
        AttemptRecord(
            quiz_id=quiz.id,
            student_id=student_id,
            subject=quiz.subject,
            topic=quiz.topic,
            score=correct_count,
            total=total,
            percent=percent,
            weak_topics=weak,
            per_question=per_question,
        )
    )
    return result


def quiz_node(state: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    params = state.get("params") or {}
    subject = state.get("subject") or "DBMS"
    topic = params.get("topic") or ""
    quiz = generate_quiz(
        subject=subject,
        topic=topic,
        count=int(params.get("count") or 5),
        difficulty=params.get("difficulty") or "medium",
        student_id=state.get("student_id") or "demo-student",
    )
    if not quiz.questions:
        return {
            "answer": (
                "I couldn't build questions yet — upload at least one page of notes for this subject, "
                "then ask me again."
            ),
            "quiz": None,
            "citations": [],
            "grounded": False,
            "trace": _trace(state, "quiz", "Quiz agent", "No source material", started),
        }

    answer = (
        f"Here's a **{len(quiz.questions)}-question {quiz.difficulty} quiz on {quiz.topic}** "
        f"built only from your notes. Answer them and I'll grade instantly with page references for anything you miss."
    )
    return {
        "answer": answer,
        "quiz": quiz.model_dump(mode="json"),
        "citations": [],
        "grounded": True,
        "suggested_actions": ["Start quiz", "Make it harder", "Quiz my weakest topic"],
        "trace": _trace(state, "quiz", "Quiz agent", f"{len(quiz.questions)} MCQs · {quiz.topic}", started),
    }


def _trace(state: dict[str, Any], node: str, label: str, detail: str, started: float) -> list[dict[str, Any]]:
    events = list(state.get("trace") or [])
    events.append({"node": node, "label": label, "detail": detail, "ms": int((time.perf_counter() - started) * 1000)})
    return events
