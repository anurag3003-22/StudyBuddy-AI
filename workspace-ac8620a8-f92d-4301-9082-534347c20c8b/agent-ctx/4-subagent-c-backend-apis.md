# Task 4 — Subagent C: Backend APIs (StudyBuddy AI)

**Status: COMPLETE.** All 6 API route files created, curl-tested against the running dev server, ESLint clean, tsc clean (for `src/app/api`). No files created/modified outside the 6 routes.

## Files created (ONLY these)

| File | Methods | Purpose |
|---|---|---|
| `src/app/api/chat/route.ts` | POST | Streaming Doubt-Solving Agent (grounded in notes, `[Source: TITLE, Page N]` citations) |
| `src/app/api/plan/route.ts` | POST | Study-Plan Generator Agent (LLM JSON + deterministic fallback, persisted to StudyPlan) |
| `src/app/api/quiz/generate/route.ts` | POST | Quiz Generator Agent (LLM MCQs + built-in 8-question normalization fallback bank) |
| `src/app/api/quiz/submit/route.ts` | POST | Grade attempt: streak logic, XP, rolling topic mastery, bestScore |
| `src/app/api/notes/route.ts` | GET / POST / DELETE | Notes library (preview strips `--- Page N ---` markers; pages derived from markers) |
| `src/app/api/stats/route.ts` | GET | Dashboard stats incl. 7-day weekly activity (local-date day keys) |

All routes: `export const dynamic = "force-dynamic"`, full try/catch → 400 (validation) / 404 (note delete miss) / 500 (unexpected). Z-AI SDK is server-side only, one memoized instance per LLM route (`zaiPromise ??= ZAI.create()`).

## Verification highlights (curl against running dev server)

- **GET /api/stats** → 200 `{streak:5, xp:1240, totalQuizzes:6, avgScore:60, notesCount:4, weakTopics[4 asc], recentAttempts[6], weeklyActivity[7 oldest→today]}`. Weekly math verified against seeded attempts (per-day avg pct, 0 for empty days).
- **POST /api/chat** → streams plain text incrementally (measured: first byte at 0.64s, total 2.1s — true streaming, not buffered). Emits **`[Source: DBMS Unit 3 — Normalization & Functional Dependencies, Page 6]`** (also Page 5/7, all correct per notes). Multi-turn history honored; out-of-notes question correctly returned "This isn't covered in your uploaded notes — … (outside notes)". Validation: empty messages / bad role / >4000-char content / malformed JSON → 400.
- **POST /api/plan** → 200 LLM plan (title "DBMS Exam Study Plan", 7 days, day numbers 1..7, hours=3, 3 tips, final day = revision+mock). Persistence to StudyPlan verified. Empty body → defaults (7 days/3h/DBMS); days=45→30, hours=99→8 (clamped); 30-day plan pads with "Spaced Revision: X" days.
- **POST /api/quiz/generate** → 200 LLM questions (count=3 and count=99→10 both verified: ids 1..N, 4 options each, answer 0-3, explanations, requested difficulty). Fallback bank slice verified during 429 outages (count=3 → first 3 normalization questions, difficulty field = requested).
- **POST /api/quiz/submit** → **streak 5→6 verified with `previousStreak:5, streak:6, xp:1240→1320 (+80 = 4×20)`** after resetting UserProfile to seed state. Same-day repeat → streak stays 6 (previousStreak 6). Gap branch (lastActiveDay 3 days ago, streak 9) → streak resets to 1, previousStreak 9. Rolling mastery math hand-verified (e.g. Normalization 42@3 → +80×3 → 62@6). bestScore = max pct across topic attempts.
- **POST /api/notes** → 200, pages=2 from two `--- Page N ---` markers, preview = marker-stripped collapsed 140 chars. Empty title → 400. **DELETE ?id=** → `{success:true}`; repeat delete → 404; missing id → 400.
- **GET /api/notes** → 200 array of NoteItem (4 seeded + test note), newest first.

## Notable engineering decisions (deviations/fixes beyond the baseline spec)

1. **Chat SSE line-buffering (bug fix):** the naive per-chunk `split("\n")` drops SSE `data:` payloads whose JSON is split across chunk boundaries → garbled output with missing words. Fixed by buffering bytes and only processing complete lines (tail carried to next chunk, final flush). Output is now fluent.
2. **Citation title fidelity:** clarified in the system prompt that NOTE_TITLE means the exact full heading title (the model otherwise emitted the literal "NOTE_TITLE" placeholder or abbreviated titles). One-line parenthetical added to the spec's prompt; everything else verbatim.
3. **`repairJson` in plan + quiz/generate:** the model intermittently omits the `]` closing the `plan` array before the `"tips"` key (~40% of runs). Added a bracket-stack repair that (a) rescues keys found inside unclosed arrays, (b) auto-closes containers truncated by max_tokens (incl. mid-string), (c) strips trailing commas. Plan LLM-path success went ~60% → 100% across repeated runs.
4. **Fallback diagnostics:** both LLM routes `console.error` a one-line reason when falling back (SDK error vs unusable output) — invaluable for dev.log triage; keeps client responses clean 200s.
5. **Upstream 429s:** the Z-AI endpoint rate-limits aggressively under repeated testing. Quiz/plan degrade gracefully to their fallbacks (client always gets a valid 200); chat surfaces a 500 JSON error per the spec's try/catch contract. Not a code issue.
6. **Validation posture:** persisted-data routes (notes POST, quiz submit) 400 on violations; generation routes coerce with defaults/clamps per spec defaults (days default 7 clamp 1–30, hours default 3 clamp 1–8, count default 5 clamp 3–10, difficulty whitelist default medium, subject defaults: plan→"DBMS", quiz/notes→"General").

## Lint / Type check

- `bunx eslint src/app/api --no-warn-ignored` → **exit 0, no errors**.
- `bunx tsc --noEmit -p tsconfig.json` → no errors in `app/api` (only pre-existing errors in `examples/` and `skills/`, untouched).
- `dev.log` — no runtime errors from these routes (only intentional fallback diagnostics + upstream 429 messages during stress testing).

## DB end state (for other agents)

UserProfile left at: streak **6**, lastActiveDay **today**, xp **1320** (reset to seed state, then one final demo submit — the intended 5→6 narrative). Extra QuizAttempts/StudyPlans from testing remain (realistic demo data for the stats dashboard). One "Smoke Test Note" exists (created by another agent's smoke test via POST /api/notes) plus the 4 seeded notes.

## Contract notes for Task 3 (frontend)

- Chat streams raw UTF-8 text (not JSON, not SSE-framed) — read via `response.body` reader; errors arrive as JSON `{error}` with 4xx/5xx status (check `content-type`).
- Quiz generate ALWAYS returns `questions[]` with ids 1..N (never trust fallback vs LLM difference).
- Quiz submit returns `{attempt, streak, previousStreak, xp, bestScore}` — use `streak > previousStreak` for the streak-bump animation.
