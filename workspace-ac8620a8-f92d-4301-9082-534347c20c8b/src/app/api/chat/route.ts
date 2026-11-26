import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { openChatStream } from "@/lib/llm";
import { answerFromNotes } from "@/lib/offline-answer";
import { normalizeCitations } from "@/lib/citation";
import type { ChatMessage } from "@/lib/types";

// ============================================================
// POST /api/chat — Streaming Doubt-Solving Agent.
// Grounds every answer in the student's uploaded notes and
// streams plain-text deltas straight to the client as they arrive.
//
// Provider order: Z-AI (if .z-ai-config exists) → OpenAI-compatible
// (LLM_API_KEY) → deterministic offline RAG over the same notes.
// The offline path keeps the demo fully functional with no keys.
// ============================================================

export const dynamic = "force-dynamic";

const MAX_CONTENT_CHARS = 4000;
const MAX_HISTORY = 10;

function buildSystemPrompt(contextBlock: string): string {
  return `You are the Doubt-Solving Agent of StudyBuddy AI, an exam-prep copilot for college students.
STRICT GROUNDING RULES:
1. Answer ONLY from the student's notes below whenever they cover the topic. When you state a fact from the notes, attach an inline citation in EXACTLY this format: [Source: NOTE_TITLE, Page N] (NOTE_TITLE = the exact title only, WITHOUT the "(SUBJECT, N pages)" suffix — never include that parenthetical and never the literal text "NOTE_TITLE"; N = the page number from the "--- Page N ---" marker). Multiple citations allowed.
2. If the notes do not cover the question, say "This isn't covered in your uploaded notes —" then answer briefly from general knowledge and end with the tag (outside notes). The context below contains ALL uploaded notes — scan it carefully before deciding something is missing.
3. Be exam-focused and concise: max ~250 words, short paragraphs, bold key terms with **...**, simple lists with "•".
4. Never invent page numbers. Never fabricate citations. Repeat the full note title in every citation — never abbreviate to "[Source: Page N]".
STUDENT'S NOTES:
<context>
${contextBlock}
</context>`;
}

function textResponse(text: string): Response {
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { messages?: unknown };

    // --- Validate client history ---
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array of { role, content } objects" },
        { status: 400 }
      );
    }
    const validated: ChatMessage[] = [];
    for (const raw of body.messages) {
      const msg = raw as Partial<ChatMessage> | null;
      if (
        !msg ||
        (msg.role !== "user" && msg.role !== "assistant") ||
        typeof msg.content !== "string" ||
        msg.content.trim() === ""
      ) {
        return NextResponse.json(
          { error: "each message needs role 'user'|'assistant' and non-empty string content" },
          { status: 400 }
        );
      }
      if (msg.content.length > MAX_CONTENT_CHARS) {
        return NextResponse.json(
          { error: `message content exceeds ${MAX_CONTENT_CHARS} characters` },
          { status: 400 }
        );
      }
      validated.push({ role: msg.role, content: msg.content });
    }
    const history = validated.slice(-MAX_HISTORY);

    // --- Build grounded context from the student's notes ---
    await ensureSeeded();
    const notes = await db.note.findMany({ orderBy: { createdAt: "asc" } });
    const contextBlock = notes
      .map((n) => `# ${n.title} (${n.subject}, ${n.pages} pages)\n${n.content}`)
      .join("\n\n---\n\n");

    const lastUser = [...history].reverse().find((m) => m.role === "user");
    const question = lastUser?.content ?? "";
    const offlineAnswer = () =>
      answerFromNotes(
        question,
        notes.map((n) => ({
          title: n.title,
          subject: n.subject,
          pages: n.pages,
          content: n.content,
        }))
      );

    // --- Try a configured provider; fall back to offline RAG ---
    const deltas = await openChatStream(
      [{ role: "system", content: buildSystemPrompt(contextBlock) }, ...history],
      1400
    );

    if (!deltas) {
      return textResponse(offlineAnswer());
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (text: string) => {
          if (!text || req.signal.aborted) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            // Client disconnected mid-answer — nothing left to do.
          }
        };

        let full = "";
        try {
          for await (const delta of deltas) {
            if (delta) full += delta;
          }
        } catch (err) {
          console.error(
            "[api/chat] stream failed:",
            err instanceof Error ? err.message : err
          );
          if (!full.trim()) full = offlineAnswer();
        }

        if (!full.trim()) full = offlineAnswer();

        // Repair citation syntax before the client renders it.
        const answer = normalizeCitations(
          full,
          notes.map((n) => ({
            title: n.title,
            content: n.content,
            pages: n.pages,
          }))
        );

        // Re-stream in small chunks so the UI keeps its live typing feel.
        const CHUNK = 18;
        for (let i = 0; i < answer.length; i += CHUNK) {
          if (req.signal.aborted) break;
          send(answer.slice(i, i + CHUNK));
          await new Promise((resolve) => setTimeout(resolve, 8));
        }

        try {
          controller.close();
        } catch {
          // Already closed by the client — safe to ignore.
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Chat failed: ${message}` }, { status: 500 });
  }
}
