import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded, todayKey, yesterdayKey } from "@/lib/seed";
import type { QuizSubmitResponse } from "@/lib/types";

// ============================================================
// POST /api/quiz/submit — Grade a finished quiz.
// Records the attempt, updates the daily streak (with
// previousStreak for streak-bump animations), awards XP,
// and blends rolling topic mastery.
// ============================================================

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      subject?: unknown;
      topic?: unknown;
      score?: unknown;
      total?: unknown;
    };

    // --- Validate inputs ---
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const subjectInput = typeof body.subject === "string" ? body.subject.trim() : "";
    const subject = subjectInput || "General";
    const { score, total } = body;

    if (!topic || topic.length > 80) {
      return NextResponse.json({ error: "topic is required (1-80 characters)" }, { status: 400 });
    }
    if (subject.length > 40) {
      return NextResponse.json({ error: "subject must be ≤ 40 characters" }, { status: 400 });
    }
    if (
      typeof score !== "number" ||
      typeof total !== "number" ||
      !Number.isInteger(score) ||
      !Number.isInteger(total) ||
      total < 1 ||
      total > 50 ||
      score < 0 ||
      score > total
    ) {
      return NextResponse.json(
        { error: "score and total must be integers with 0 ≤ score ≤ total and 1 ≤ total ≤ 50" },
        { status: 400 }
      );
    }

    await ensureSeeded();

    // --- Record the attempt ---
    const attempt = await db.quizAttempt.create({
      data: { subject, topic, score, total },
    });

    // --- Streak logic (single UserProfile row, create if missing) ---
    let profile = await db.userProfile.findFirst();
    if (!profile) {
      profile = await db.userProfile.create({ data: {} });
    }
    const today = todayKey();
    const previousStreak = profile.streak;
    let streak: number;
    if (profile.lastActiveDay === today) {
      streak = profile.streak; // already active today — streak unchanged
    } else if (profile.lastActiveDay === yesterdayKey()) {
      streak = profile.streak + 1; // consecutive day — streak bumps
    } else {
      streak = 1; // gap (or first ever activity) — streak restarts
    }
    const xp = profile.xp + score * 20;
    await db.userProfile.update({
      where: { id: profile.id },
      data: { streak, lastActiveDay: today, xp },
    });

    // --- Rolling topic mastery (upsert by subject+topic) ---
    let progress = await db.topicProgress.findFirst({ where: { subject, topic } });
    if (!progress) {
      progress = await db.topicProgress.create({
        data: { subject, topic, mastery: 0, attempts: 0 },
      });
    }
    const pct = Math.round((score / total) * 100);
    const attempts = progress.attempts + 1;
    const mastery = Math.min(
      100,
      Math.round((progress.mastery * (attempts - 1) + pct) / attempts)
    );
    await db.topicProgress.update({
      where: { id: progress.id },
      data: { attempts, mastery },
    });

    // --- Best score for this topic (after including the new attempt) ---
    const topicAttempts = await db.quizAttempt.findMany({ where: { subject, topic } });
    const bestScore = topicAttempts.reduce(
      (best, a) => Math.max(best, Math.round((a.score / a.total) * 100)),
      0
    );

    const payload: QuizSubmitResponse = {
      attempt: {
        id: attempt.id,
        subject: attempt.subject,
        topic: attempt.topic,
        score: attempt.score,
        total: attempt.total,
        createdAt: attempt.createdAt.toISOString(),
      },
      streak,
      previousStreak,
      xp,
      bestScore,
    };
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: `Quiz submit failed: ${message}` }, { status: 500 });
  }
}
