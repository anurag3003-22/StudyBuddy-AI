import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

// ============================================================
// POST /api/demo/reset — wipe demo state and reseed the bundled
// DBMS notes, quiz history, mastery and profile.
// Useful before a live demo or a fresh smoke-test run.
// ============================================================

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await db.$transaction([
      db.note.deleteMany(),
      db.studyPlan.deleteMany(),
      db.quizAttempt.deleteMany(),
      db.topicProgress.deleteMany(),
      db.userProfile.deleteMany(),
    ]);
    await ensureSeeded();
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { error: `Reset failed: ${message}` },
      { status: 500 }
    );
  }
}
