import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import type { StatsResponse } from "@/lib/types";

// ============================================================
// GET /api/stats — Dashboard stats.
// Streak + XP from UserProfile, quiz averages, note count,
// weakest topics, recent attempts and a 7-day activity chart.
// ============================================================

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Local-date day key (yyyy-mm-dd) matching seed.ts's dayKey format. */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  try {
    await ensureSeeded();

    // --- Profile (streak + XP) ---
    const profile = await db.userProfile.findFirst();
    const streak = profile?.streak ?? 0;
    const xp = profile?.xp ?? 0;

    // --- Quiz history ---
    const attempts = await db.quizAttempt.findMany({
      orderBy: { createdAt: "desc" },
    });
    const totalQuizzes = attempts.length;
    const avgScore = totalQuizzes
      ? Math.round(
          attempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / totalQuizzes
        )
      : 0;

    // --- Notes ---
    const notesCount = await db.note.count();

    // --- Weakest topics first ---
    const progress = await db.topicProgress.findMany({
      orderBy: { mastery: "asc" },
    });
    const weakTopics = progress.map((p) => ({ topic: p.topic, mastery: p.mastery }));

    // --- Recent attempts (latest 6) ---
    const recentAttempts = attempts.slice(0, 6).map((a) => ({
      id: a.id,
      topic: a.topic,
      subject: a.subject,
      score: a.score,
      total: a.total,
      createdAt: a.createdAt.toISOString(),
    }));

    // --- Weekly activity: avg quiz pct per local day, oldest → today ---
    const pctsByDay = new Map<string, number[]>();
    for (const a of attempts) {
      const key = localDayKey(a.createdAt);
      const pct = Math.round((a.score / a.total) * 100);
      const list = pctsByDay.get(key);
      if (list) list.push(pct);
      else pctsByDay.set(key, [pct]);
    }
    const now = new Date();
    const weeklyActivity: StatsResponse["weeklyActivity"] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const pcts = pctsByDay.get(localDayKey(d)) ?? [];
      const score = pcts.length
        ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)
        : 0;
      weeklyActivity.push({ day: DAY_LABELS[d.getDay()], score });
    }

    const payload: StatsResponse = {
      streak,
      xp,
      totalQuizzes,
      avgScore,
      notesCount,
      weakTopics,
      recentAttempts,
      weeklyActivity,
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Failed to load stats: ${message}` }, { status: 500 });
  }
}
