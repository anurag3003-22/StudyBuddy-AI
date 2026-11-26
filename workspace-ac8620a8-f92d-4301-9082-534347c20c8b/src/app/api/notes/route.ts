import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import type { NoteItem } from "@/lib/types";

// ============================================================
// /api/notes — Notes library management.
//   GET    → list all notes (newest first) as NoteItem[]
//   POST   → upload a note ("--- Page N ---" markers drive pages)
//   DELETE → remove a note by ?id=...
// ============================================================

export const dynamic = "force-dynamic";

const PREVIEW_CHARS = 140;

interface NoteRow {
  id: string;
  title: string;
  subject: string;
  pages: number;
  content: string;
  createdAt: Date;
}

function toNoteItem(n: NoteRow): NoteItem {
  const preview = n.content
    .replace(/--- Page \d+ ---/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_CHARS);
  return {
    id: n.id,
    title: n.title,
    subject: n.subject,
    pages: n.pages,
    preview,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    await ensureSeeded();
    const notes = await db.note.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ notes: notes.map(toNoteItem) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Failed to load notes: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      title?: unknown;
      subject?: unknown;
      content?: unknown;
    };

    // --- Validate inputs ---
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) {
      return NextResponse.json(
        { error: "title is required (1-120 characters)" },
        { status: 400 }
      );
    }
    const subjectInput = typeof body.subject === "string" ? body.subject.trim() : "";
    const subject = subjectInput || "General";
    if (subject.length > 40) {
      return NextResponse.json(
        { error: "subject must be ≤ 40 characters" },
        { status: 400 }
      );
    }
    const content = typeof body.content === "string" ? body.content : "";
    if (!content.trim() || content.length > 20000) {
      return NextResponse.json(
        { error: "content is required (1-20000 characters)" },
        { status: 400 }
      );
    }

    // --- Derive page count from explicit markers, else estimate ---
    const markerCount = (content.match(/--- Page \d+ ---/g) || []).length;
    const pages = markerCount || Math.max(1, Math.ceil(content.length / 1800));

    const note = await db.note.create({
      data: { title, subject, content, pages },
    });

    return NextResponse.json({ note: toNoteItem(note) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Failed to create note: ${message}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id || id.trim() === "") {
      return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    }

    try {
      await db.note.delete({ where: { id } });
    } catch (e) {
      // P2025 = record not found in Prisma.
      if ((e as { code?: string })?.code === "P2025") {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Failed to delete note: ${message}` }, { status: 500 });
  }
}
