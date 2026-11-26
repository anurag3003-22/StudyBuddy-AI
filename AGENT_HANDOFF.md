# StudyBuddy AI — Agent Handoff

Compact snapshot of the project. Build artifacts, dependencies, caches, logs, lockfiles and `.env` secrets were stripped before zipping.

## What it is

Personalized learning + source-cited doubt agent for *AI + Java Hackathon, Problem Statement #07*. Uploaded syllabus PDFs/notes become an adaptive study plan, auto-generated quizzes, and grounded answers with page-level citations. Ships with a LangGraph multi-agent service (Python/FastAPI) and a React/Vite frontend. Works fully offline with zero API keys.

## Architecture

```
React + Vite UI  --REST/SSE-->  FastAPI agent service  --> LangGraph supervisor
                                    |                        |-- doubt   (cited RAG answers)
                                    |                        |-- planner (adaptive schedule)
                                    |                        |-- quiz    (author + grade)
                                    |                        `-- progress(streak/XP/coaching)
                                    `--> JSON store (demo only)
UI -.-> Spring Boot API (teammate-owned, not in this repo) --> PostgreSQL
```

Golden rule: Java/Spring Boot is the source of truth; agents only **propose** typed JSON (`StudyPlan`, `Quiz`, `GradeResult`). Frontend swaps backends via `frontend/src/lib/api.ts` + `VITE_AGENT_API_URL`.

LangGraph flow: `supervisor -> retrieve -> {doubt|plan|quiz} -> finalize`, with `progress`/`general` bypassing retrieval. Checkpointed per `thread_id` with `MemorySaver`.

## Layout

```
src/studybuddy/
  api.py  cli.py  config.py  models.py  llm.py  demo.py
  agents/  graph.py doubt.py planner.py quiz.py progress.py topics.py state.py
  rag/     ingest.py text.py index.py store.py
frontend/src/   pages/ components/ lib/api.ts lib/types.ts store.tsx
tests/test_agents.py          # 9 end-to-end agent tests
data/                         # state.json + seeded DBMS notes PDF
docs/screenshots/             # README images
scripts/                      # dev.sh, start.ps1
workspace-ac8620a8-.../       # separate Next.js landing-page/demo app (own package.json, src/, prisma/)
```

Two independent apps live here: the Python agent service + `frontend/` (Vite SPA, the real UI), and the `workspace-*` Next.js marketing/demo site.

## Run

```bash
# Windows: one click
Start StudyBuddy.bat            # installs uv + deps, builds UI, serves :8000
# Dev
cp .env.example .env && ./scripts/dev.sh   # API :8000, UI :5173
# Single process (demo)
cd frontend && npm install && npm run build && cd .. && uv run studybuddy serve
# Terminal walkthrough / tests
uv run studybuddy demo
uv run pytest -q
```

Requirements: Python 3.12+ with `uv`, Node 20+.

## Key API (FastAPI, `/api/*`)

`GET /health`, `GET /agent/status`, `GET /agent/graph`, `POST /documents`, `GET|DELETE /documents/{id}`, `POST /documents/seed-demo`, `GET /topics?subject=`, `POST /agent/chat`, `POST /agent/chat/stream` (SSE `node` then `final`), `POST /agent/plan`, `GET /plans/latest`, `PATCH /plans/{id}/tasks/{taskId}?done=`, `POST /agent/quiz`, `POST /agent/grade`, `GET /progress`, `POST /demo/reset`. Interactive docs at `/docs`.

Chat response shape: `{ intent, answer, citations[{doc_id,doc_title,page,heading,snippet,score}], trace[{node,label,detail,ms}], plan, quiz, grading, grounded, suggested_actions[] }`.

## Config

`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (default `gpt-4o-mini`), `EMBEDDING_MODEL` (hybrid retrieval), `CORS_ORIGINS`. Empty key = deterministic offline agents. Frontend: `VITE_AGENT_API_URL`.

## Known limits

- JSON store is demo-only; Java service owns persistence.
- Image-only PDFs need OCR (`pypdf` can't read them).
- Offline quiz distractors come from the same corpus; LLM key improves quality.
- `MemorySaver` is in-process; swap for a persistent checkpointer when deployed.
