import { NextRequest, NextResponse } from "next/server";
import { completeChat } from "@/lib/llm";
import type { QuizGenerateResponse, QuizQuestion } from "@/lib/types";

// ============================================================
// POST /api/quiz/generate — Quiz & Grading Agent.
// Generates MCQs via the LLM (strict JSON), validates/coerces
// them, and falls back to a built-in normalization quiz when
// the model output is unusable.
// ============================================================

export const dynamic = "force-dynamic";

type Difficulty = "easy" | "medium" | "hard";
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

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
 *   before a following object key, e.g. before "explanation")
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

interface RawQuestion {
  question?: unknown;
  options?: unknown;
  answer?: unknown;
  explanation?: unknown;
  difficulty?: unknown;
}

/** Validate + coerce one LLM question. Returns null when unusable. */
function coerceQuestion(raw: RawQuestion, difficulty: Difficulty): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const question =
    typeof raw.question === "string" && raw.question.trim() !== ""
      ? raw.question.trim().slice(0, 200)
      : null;
  if (!question) return null;

  if (!Array.isArray(raw.options)) return null;
  const options = raw.options
    .filter((o): o is string => typeof o === "string" && o.trim() !== "")
    .map((o) => o.trim())
    .slice(0, 4);
  if (options.length !== 4) return null;

  const ans = raw.answer;
  const answer =
    typeof ans === "number" && Number.isInteger(ans) && ans >= 0 && ans <= 3
      ? ans
      : typeof ans === "string" && /^[0-3]$/.test(ans.trim())
        ? Number.parseInt(ans, 10)
        : -1;
  if (answer === -1) return null;

  const explanation =
    typeof raw.explanation === "string" && raw.explanation.trim() !== ""
      ? raw.explanation.trim().slice(0, 220)
      : "Review this concept in your notes.";
  const diff =
    typeof raw.difficulty === "string" && DIFFICULTIES.includes(raw.difficulty as Difficulty)
      ? (raw.difficulty as Difficulty)
      : difficulty;

  return { id: 0, question, options, answer, explanation, difficulty: diff };
}

/** Deterministic DBMS-normalization quiz used when the LLM path fails. */
function fallbackQuiz(count: number, difficulty: Difficulty): QuizQuestion[] {
  const bank: Omit<QuizQuestion, "id" | "difficulty">[] = [
    {
      question: "A relation is in 1NF when…",
      options: [
        "All values are atomic and there are no repeating groups",
        "Every attribute is a foreign key",
        "No transitive dependencies exist",
        "Every determinant is a candidate key",
      ],
      answer: 0,
      explanation:
        "1NF requires atomic (indivisible) values and no repeating groups or multi-valued columns.",
    },
    {
      question: "2NF removes which dependency?",
      options: [
        "Transitive dependency",
        "Partial dependency on part of a composite key",
        "Multi-valued dependency",
        "Join dependency",
      ],
      answer: 1,
      explanation:
        "2NF = 1NF + no partial dependency of non-prime attributes on a subset of a composite candidate key.",
    },
    {
      question: "A transitive dependency emp_id → dept_id → dept_name violates…",
      options: ["1NF", "2NF", "3NF", "BCNF"],
      answer: 2,
      explanation:
        "Non-prime dept_name depends transitively on emp_id through dept_id — that breaks 3NF.",
    },
    {
      question: "BCNF differs from 3NF because in BCNF…",
      options: [
        "Every determinant must be a superkey",
        "NULLs are forbidden",
        "Composite keys are banned",
        "All attributes must be prime",
      ],
      answer: 0,
      explanation:
        "BCNF: for every non-trivial FD X→Y, X must be a superkey; 3NF has an exception when Y is prime.",
    },
    {
      question: "A BCNF decomposition is guaranteed to be…",
      options: [
        "Dependency-preserving",
        "Lossless (spurious-tuple free)",
        "In 5NF",
        "Trivially in 1NF only",
      ],
      answer: 1,
      explanation:
        "BCNF decomposition is always lossless, but it may NOT preserve dependencies — the classic tradeoff.",
    },
    {
      question: "Which normal form handles multi-valued dependencies?",
      options: ["2NF", "3NF", "4NF", "BCNF"],
      answer: 2,
      explanation:
        "4NF: for every non-trivial MVD X ↠ Y, X must be a superkey — removing independent multi-valued facts.",
    },
    {
      question: "Lossless join for binary decomposition requires…",
      options: [
        "Shared attributes contain a key of at least one component",
        "Both relations have equal cardinality",
        "No NULLs in shared attributes",
        "A common foreign key",
      ],
      answer: 0,
      explanation:
        "R1∩R2 → R1 or R1∩R2 → R2 must hold — the shared attributes form a key of one component.",
    },
    {
      question: "The three classic design anomalies are…",
      options: [
        "Insertion, update, deletion",
        "Read, write, lock",
        "Selection, projection, join",
        "Serial, parallel, distributed",
      ],
      answer: 0,
      explanation:
        "Redundancy causes insertion, update, and deletion anomalies — normalization removes them.",
    },
  ];

  return bank.slice(0, count).map((q, i) => ({
    ...q,
    id: i + 1,
    difficulty,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      subject?: unknown;
      topic?: unknown;
      difficulty?: unknown;
      count?: unknown;
    };

    // --- Validate inputs ---
    const topicInput = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topicInput || topicInput.length > 80) {
      return NextResponse.json(
        { error: "topic is required (1-80 characters)" },
        { status: 400 }
      );
    }
    const subjectInput = typeof body.subject === "string" ? body.subject.trim() : "";
    const subject = (subjectInput || "General").slice(0, 40);
    const difficulty: Difficulty = DIFFICULTIES.includes(body.difficulty as Difficulty)
      ? (body.difficulty as Difficulty)
      : "medium";
    const n = typeof body.count === "number" ? body.count : Number(body.count);
    const count = Number.isFinite(n)
      ? Math.min(10, Math.max(3, Math.round(n)))
      : 5;

    // --- Ask the LLM for MCQs ---
    let questions: QuizQuestion[] = [];
    try {
      const text = await completeChat(
        [
          {
            role: "system",
            content:
              "You are the Quiz & Grading Agent of StudyBuddy AI. Output ONLY valid JSON.",
          },
          {
            role: "user",
            content: `Generate ${count} multiple-choice questions on "${topicInput}" (${subject}) at ${difficulty} difficulty as JSON:
{"questions":[{"question":string,"options":[string,string,string,string],"answer":number,"explanation":string,"difficulty":"${difficulty}"}]}
Rules: answer = 0-based index of the single correct option; options exactly 4, one correct, plausible distractors; explanation ≤ 220 chars, exam-style; question ≤ 200 chars; no repeats.`,
          },
        ],
        1500
      );

      if (!text) {
        console.error("[api/quiz/generate] no LLM configured — using built-in fallback quiz.");
      } else {
        const parsed = parseJsonLoose(text) as { questions?: unknown } | null;
        if (parsed && Array.isArray(parsed.questions)) {
          questions = parsed.questions
            .map((q) => coerceQuestion(q as RawQuestion, difficulty))
            .filter((q): q is QuizQuestion => q !== null)
            .slice(0, count);
        }
        if (questions.length < 3) {
          console.error(
            "[api/quiz/generate] LLM output unusable — raw head:",
            JSON.stringify(text.slice(0, 120))
          );
        }
      }
    } catch (err) {
      // Provider error or unrepairable JSON — use fallback below.
      console.error("[api/quiz/generate] LLM call failed:", err instanceof Error ? err.message : err);
      questions = [];
    }

    if (questions.length < 3) {
      if (questions.length === 0) {
        console.error("[api/quiz/generate] LLM output unusable — using built-in fallback quiz.");
      }
      questions = fallbackQuiz(count, difficulty);
    }

    // Re-map ids 1..N on whichever path produced the questions.
    const payload: QuizGenerateResponse = {
      questions: questions.map((q, i) => ({ ...q, id: i + 1 })),
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Quiz generation failed: ${message}` }, { status: 500 });
  }
}
