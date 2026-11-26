#!/usr/bin/env node
// ============================================================
// StudyBuddy AI — end-to-end API smoke test.
// Run the dev/prod server first, then:  npm run smoke
// Set SMOKE_BASE_URL to test a deployed instance.
// ============================================================

const BASE = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TIMEOUT = Number(process.env.SMOKE_TIMEOUT_MS || 120_000);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { res, text, data };
}

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err instanceof Error ? err.message : err}`);
  }
}

async function main() {
  console.log(`\nStudyBuddy AI smoke test → ${BASE}\n`);

  await check("home page renders", async () => {
    const { res, text } = await request("/");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(text.includes("StudyBuddy"), "page does not mention StudyBuddy");
  });

  await check("GET /api/stats returns dashboard data", async () => {
    const { res, data } = await request("/api/stats");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(typeof data.streak === "number", "streak missing");
    assert(typeof data.xp === "number", "xp missing");
    assert(Array.isArray(data.weeklyActivity) && data.weeklyActivity.length === 7, "weeklyActivity must have 7 days");
    assert(Array.isArray(data.weakTopics), "weakTopics missing");
    assert(data.notesCount >= 1, "expected seeded notes");
  });

  await check("GET /api/notes returns seeded notes", async () => {
    const { res, data } = await request("/api/notes");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(data.notes) && data.notes.length >= 4, "expected at least 4 notes");
    for (const note of data.notes) {
      assert(note.id && note.title && note.subject, "note is missing fields");
      assert(typeof note.pages === "number", "note.pages missing");
    }
  });

  await check("POST /api/notes creates a note with page markers", async () => {
    const { res, data } = await request("/api/notes", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        title: "Smoke Test Note",
        subject: "Testing",
        content: "--- Page 1 --- Intro\nDeadlocks and wait-for graphs.\n--- Page 2 --- More\nTwo-phase locking.",
      }),
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(data.note?.pages === 2, `expected 2 pages, got ${data.note?.pages}`);
    assert(data.note?.preview?.includes("Deadlocks"), "preview missing content");

    const del = await request(`/api/notes?id=${encodeURIComponent(data.note.id)}`, { method: "DELETE" });
    assert(del.res.status === 200, `delete expected 200, got ${del.res.status}`);
  });

  await check("POST /api/notes rejects empty titles", async () => {
    const { res } = await request("/api/notes", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ title: "" }),
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await check("POST /api/plan generates and persists a plan", async () => {
    const { res, data } = await request("/api/plan", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        subject: "DBMS",
        days: 3,
        hoursPerDay: 2,
        weakTopics: "Normalization",
      }),
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(data.title, "plan title missing");
    assert(Array.isArray(data.plan) && data.plan.length === 3, "expected 3 plan days");
    assert(Array.isArray(data.tips), "tips missing");
    for (const day of data.plan) {
      assert(day.day >= 1, "day number missing");
      assert(day.focus, "focus missing");
      assert(Array.isArray(day.topics), "topics missing");
      assert(Array.isArray(day.tasks) && day.tasks.length > 0, "tasks missing");
    }
  });

  await check("GET /api/plan restores the latest saved plan", async () => {
    const { res, data } = await request("/api/plan?subject=DBMS");
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(data.plan) && data.plan.length > 0, "saved plan not returned");
    assert(data.title, "saved plan title missing");
  });

  await check("POST /api/quiz/generate returns valid MCQs", async () => {
    const { res, data } = await request("/api/quiz/generate", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        subject: "DBMS",
        topic: "Normalization & FDs",
        difficulty: "medium",
        count: 3,
      }),
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(data.questions) && data.questions.length === 3, "expected 3 questions");
    for (const q of data.questions) {
      assert(q.question, "question text missing");
      assert(Array.isArray(q.options) && q.options.length === 4, "expected 4 options");
      assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3, "invalid answer index");
      assert(q.explanation, "explanation missing");
    }
  });

  await check("POST /api/quiz/submit grades and updates stats", async () => {
    const before = await request("/api/stats");
    const { res, data } = await request("/api/quiz/submit", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ subject: "DBMS", topic: "Smoke Topic", score: 2, total: 3 }),
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(data.attempt?.score === 2 && data.attempt?.total === 3, "attempt not recorded");
    assert(typeof data.streak === "number" && typeof data.xp === "number", "streak/xp missing");
    assert(data.xp >= before.data.xp, "xp did not increase");
  });

  await check("POST /api/quiz/submit rejects impossible scores", async () => {
    const { res } = await request("/api/quiz/submit", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ topic: "X", score: 5, total: 3 }),
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await check("POST /api/chat streams a cited answer", async () => {
    const { res, text } = await request("/api/chat", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: "Explain BCNF and why it is stronger than 3NF" }],
      }),
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(text.trim().length > 40, "answer is too short");
    assert(/Source:\s*.+?,\s*Page\s*\d+/i.test(text), "answer has no page citation");
    assert(!text.startsWith("{"), "chat returned an error object");
  });

  await check("POST /api/chat rejects an empty message list", async () => {
    const { res } = await request("/api/chat", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ messages: [] }),
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await check("POST /api/demo/reset restores the seed state", async () => {
    const { res } = await request("/api/demo/reset", { method: "POST" });
    assert(res.status === 200, `expected 200, got ${res.status}`);

    const stats = await request("/api/stats");
    assert(stats.data.streak === 5, `expected seed streak 5, got ${stats.data.streak}`);
    assert(stats.data.xp === 1240, `expected seed xp 1240, got ${stats.data.xp}`);
    assert(stats.data.totalQuizzes === 6, `expected 6 seed quizzes, got ${stats.data.totalQuizzes}`);
    assert(stats.data.notesCount === 4, `expected 4 seed notes, got ${stats.data.notesCount}`);
  });

  await check("seed a demo plan after reset", async () => {
    const { res, data } = await request("/api/plan", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({
        subject: "DBMS",
        days: 7,
        hoursPerDay: 3,
        weakTopics: "Normalization, BCNF decomposition",
      }),
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(data.plan) && data.plan.length === 7, "expected 7 plan days");
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nSmoke test crashed:", err);
  process.exit(1);
});
