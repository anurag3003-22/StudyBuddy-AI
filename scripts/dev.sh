#!/usr/bin/env bash
# Runs the LangGraph agent API and the Vite dev server together.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d frontend/node_modules ]; then
  echo "→ installing frontend dependencies"
  (cd frontend && npm install)
fi

cleanup() {
  echo
  echo "→ shutting down"
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "→ agent API   http://localhost:8000  (docs: /docs)"
uv run uvicorn studybuddy.api:app --reload --port 8000 --log-level info &
sleep 2

echo "→ frontend    http://localhost:5173"
(cd frontend && npm run dev)
