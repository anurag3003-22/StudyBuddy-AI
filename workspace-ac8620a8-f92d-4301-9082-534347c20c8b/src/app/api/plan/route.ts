import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { completeChat } from "@/lib/llm";
import type { PlanDay, StudyPlanResponse } from "@/lib/types";

// ============================================================
// POST /api/plan — Study-Plan Generator Agent.
// Asks the LLM for a strict-JSON day-by-day plan, validates and
// coerces it, persists it to StudyPlan, and falls back to a
// deterministic plan when the model output is unusable.
// ============================================================

export const dynamic = "force-dynamic";

const DEFAULT_TIPS = [
  "Sleep 7+ hours",
  "Revise before sleep — spacing beats cramming",
  "Attempt one full mock before exam day",
];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Strip ```json fences / stray prose wrappers around a JSON payload. */
function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "");
    const end = t.lastIndexOf("```");
    if (end !== -1) t = t.slice(0, end);
  }
  return t.trim();
}

/**
 * Bracket-stack repair for slightly broken LLM JSON:
 * - rescues keys that appear inside an unclosed array (missing "]"
 *   before a following object key, e.g. before "tips")
 * - auto-closes containers truncated at max_tokens (incl. mid-string)
 * - drops trailing commas before closers
 */
function repairJson(s: string): string | null {
  let out = "";
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  const appendClose = (ch: string) => {
    out = out.replace(/,\s*$/, "") + ch;
  };
  // Does the string starting at idx (opening quote) act as an object KEY
  // (i.e. is followed by optional whitespace then ':')?
  const isKeyAhead = (idx: number): boolean => {
    let j = idx + 1;
    while (j < s.length) {
      const c = s[j];
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === '"') break;
      j++;
    }
    if (j >= s.length) return false;
    j++;
    while (j < s.length && /\s/.test(s[j])) j++;
    return j < s.length && s[j] === ":";
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      // A KEY inside array context means the array never closed.
      if (stack.length > 0 && stack[stack.length - 1] === "]" && isKeyAhead(i)) {
        while (stack.length > 0 && stack[stack.length - 1] === "]") {
          appendClose(stack.pop() as string);
        }
        if (stack.length === 0) return null;
        if (!/[{[,\s]$/.test(out)) out += ","; // separator before the rescued key
      }
      inStr = true;
      out += ch;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
      out += ch;
    } else if (ch === "}" || ch === "]") {
      // Auto-close any unclosed inner containers until this closer matches.
      while (stack.length > 0 && stack[stack.length - 1] !== ch) {
        appendClose(stack.pop() as string);
      }
      if (stack.length === 0) return null; // structural garbage
      stack.pop();
      appendClose(ch);
    } else {
      out += ch;
    }
  }
  if (inStr) out += '"'; // close a string truncated mid-token
  while (stack.length > 0) appendClose(stack.pop() as string);
  return out;
}

/** Tolerant JSON.parse for LLM output: strict → block-extract → repair. */
function parseJsonLoose(text: string): unknown {
  const cleaned = stripFences(text);
  const candidates: string[] = [];
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(cleaned.slice(first, last + 1));
  candidates.push(cleaned);
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      const repaired = repairJson(c);
      if (repaired && repaired !== c) {
        try {
          return JSON.parse(repaired);
        } catch {
          // fall through to next candidate
        }
      }
    }
  }
  return null;
}

function toStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim())
    .slice(0, max);
}

/** Deterministic fallback: split weak topics + core drills across the days. */
function buildFallbackPlan(
  subject: string,
  days: number,
  hoursPerDay: number,
  weakTopics: string
): StudyPlanResponse {
  const weakList = weakTopics
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const pool = [...weakList, "Core Concepts", "Problem Practice", "Mixed Revision"];
  const plan: PlanDay[] = [];

  for (let d = 1; d <= days; d++) {
    if (d === days) {
      plan.push({
        day: d,
        focus: "Full Revision + Mock Test",
        topics: ["All Topics", "Mock Test"],
        tasks: [
          `Revise all ${subject} notes end-to-end`,
          "Attempt one full timed mock test",
          "Review mistakes and revisit weak areas",
        ],
        hours: hoursPerDay,
      });
      continue;
    }
    const item = pool[(d - 1) % pool.length];
    const firstPass = d - 1 < pool.length;
    const isWeak = weakList.includes(item);
    const focus = firstPass
      ? isWeak
        ? `Weak Topic Drill: ${item}`
        : item
      : `Spaced Revision: ${item}`;
    plan.push({
      day: d,
      focus: focus.slice(0, 48),
      topics: [item, "Practice"],
      tasks: [`Study ${item} from notes`, `Solve 10 PYQs on ${item}`],
      hours: hoursPerDay,
    });
  }

  return {
    title: `${subject}: ${days}-Day Mastery Sprint`,
    plan,
    tips: [...DEFAULT_TIPS],
  };
}

/**
 * Validate + coerce the LLM's parsed JSON into a StudyPlanResponse.
 * Returns null when the output is fundamentally unusable.
 */
function coercePlan(
  parsed: unknown,
  days: number,
  hoursPerDay: number
): StudyPlanResponse | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { title?: unknown; plan?: unknown; tips?: unknown };
  if (!Array.isArray(obj.plan) || obj.plan.length === 0) return null;

  const plan: PlanDay[] = [];
  for (const rawDay of obj.plan) {
    if (plan.length >= days) break;
    if (!rawDay || typeof rawDay !== "object") continue;
    const d = rawDay as Record<string, unknown>;
    const focus =
      typeof d.focus === "string" && d.focus.trim() !== ""
        ? d.focus.trim().slice(0, 48)
        : `Day ${plan.length + 1} Focus`;
    const topics = toStringArray(d.topics, 3);
    const tasks = toStringArray(d.tasks, 4);
    if (topics.length === 0 && tasks.length === 0) continue; // empty husk day
    const hours =
      typeof d.hours === "number" && Number.isFinite(d.hours) && d.hours > 0
        ? Math.round(d.hours)
        : hoursPerDay;
    plan.push({
      day: plan.length + 1,
      focus,
      topics: topics.length > 0 ? topics : ["Study"],
      tasks: tasks.length > 0 ? tasks : ["Revise notes"],
      hours,
    });
  }

  if (plan.length === 0) return null;
  // Pad with spaced-revision days if the model returned too few.
  while (plan.length < days) {
    const prev = plan[plan.length - 1];
    plan.push({
      day: plan.length + 1,
      focus: `Spaced Revision: ${prev.topics[0]}`.slice(0, 48),
      topics: prev.topics,
      tasks: [`Revisit ${prev.topics[0]} flashcards`, "Redo missed questions"],
      hours: hoursPerDay,
    });
  }

  const tips = toStringArray(obj.tips, 5);
  const title =
    typeof obj.title === "string" && obj.title.trim() !== ""
      ? obj.title.trim().slice(0, 80)
      : null;

  return {
    title: title ?? `${days}-Day Study Plan`,
    plan,
    tips: tips.length > 0 ? tips : [...DEFAULT_TIPS],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      subject?: unknown;
      days?: unknown;
      hoursPerDay?: unknown;
      weakTopics?: unknown;
    };

    // --- Validate / coerce inputs ---
    const days = clampInt(body.days, 1, 30, 7);
    const hoursPerDay = clampInt(body.hoursPerDay, 1, 8, 3);
    const subjectInput = typeof body.subject === "string" ? body.subject.trim() : "";
    const subject = (subjectInput || "DBMS").slice(0, 60);
    const weakTopics =
      typeof body.weakTopics === "string" ? body.weakTopics.trim().slice(0, 200) : "";

    // --- Ask the LLM for a strict-JSON plan ---
    let result: StudyPlanResponse | null = null;
    try {
      const text = await completeChat(
        [
          {
            role: "system",
            content:
              "You are the Study-Plan Generator Agent of StudyBuddy AI. Output ONLY valid JSON — no markdown fences, no prose.",
          },
          {
            role: "user",
            content: `Create an exam study plan as JSON with this exact shape:
{"title": string, "plan": [{"day": number, "focus": string, "topics": string[], "tasks": string[], "hours": number}], "tips": string[]}
Constraints: exactly ${days} days (day 1..${days}); hours per day ≈ ${hoursPerDay}; subject: ${subject}; the student self-reports weakness in: ${weakTopics || "nothing specific"}. Prioritize weak topics in the first 60% of days, include spaced revision of earlier topics later, final day = full revision + mock test. Focus ≤ 48 chars. topics: 2-3 chips. tasks: 2-4 concrete actions, each ≤ 90 chars. tips: 3 short exam tips.`,
          },
        ],
        3000
      );

      if (!text) {
        console.error("[api/plan] no LLM configured — using deterministic fallback.");
      } else {
        const parsed = parseJsonLoose(text);
        if (parsed !== null) {
          result = coercePlan(parsed, days, hoursPerDay);
        }
        if (!result) {
          console.error(
            "[api/plan] LLM output unusable — using deterministic fallback. raw head:",
            JSON.stringify(text.slice(0, 120))
          );
        }
      }
    } catch (err) {
      // Provider error or unrepairable JSON — fall through to fallback.
      console.error("[api/plan] LLM call failed:", err instanceof Error ? err.message : err);
      result = null;
    }

    if (!result) {
      result = buildFallbackPlan(subject, days, hoursPerDay, weakTopics);
    }

    // --- Persist and respond ---
    await db.studyPlan.create({
      data: {
        subject,
        title: result.title,
        days,
        plan: JSON.stringify(result.plan),
        tips: JSON.stringify(result.tips),
      },
    });

    return NextResponse.json(result satisfies StudyPlanResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Plan generation failed: ${message}` }, { status: 500 });
  }
}

// ============================================================
// GET /api/plan?subject=DBMS — restore the latest saved plan.
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const subject = req.nextUrl.searchParams.get("subject")?.trim() || undefined;
    const row = await db.studyPlan.findFirst({
      where: subject ? { subject } : undefined,
      orderBy: { createdAt: "desc" },
    });

    if (!row) return NextResponse.json({ plan: null });

    let plan: PlanDay[] = [];
    let tips: string[] = [];
    try {
      plan = JSON.parse(row.plan) as PlanDay[];
      tips = JSON.parse(row.tips) as string[];
    } catch {
      // Corrupt legacy row — treat it as absent rather than 500.
      return NextResponse.json({ plan: null });
    }

    return NextResponse.json({
      title: row.title,
      plan,
      tips,
      subject: row.subject,
      days: row.days,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Failed to load plan: ${message}` }, { status: 500 });
  }
}
