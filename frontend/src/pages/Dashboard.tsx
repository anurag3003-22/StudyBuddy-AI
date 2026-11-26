import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  Flame,
  GraduationCap,
  Library,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { cn, daysUntil, formatDate, localISO, weekday } from "../lib/format";
import { useStudy } from "../store";
import type { Page } from "../lib/types";
import { ProgressRing } from "../components/ProgressRing";
import { EmptyState } from "../components/EmptyState";

export function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { progress, plan, documents, subject, topics, status, refreshPlan, notify, online } = useStudy();
  const [busy, setBusy] = useState<string | null>(null);

  const today = localISO();
  const todayTasks = plan?.tasks.filter((task) => task.date === today) ?? [];
  const nextTasks = plan?.tasks.filter((task) => task.date > today).slice(0, 3) ?? [];
  const done = plan?.tasks.filter((task) => task.done).length ?? 0;
  const total = plan?.tasks.length ?? 0;
  const completion = total ? Math.round((done / total) * 100) : 0;
  const countdown = plan ? daysUntil(plan.exam_date) : null;
  const maxMinutes = Math.max(60, ...(progress?.daily_minutes.map((day) => day.minutes) ?? [0]));

  async function toggle(taskId: string, value: boolean) {
    if (!plan) return;
    setBusy(taskId);
    try {
      await api.toggleTask(plan.id, taskId, value);
      await refreshPlan();
      if (value) notify("Task complete — streak kept alive.", "success");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-200">
              <Sparkles size={11} /> {online ? "Agent online" : "Agent offline"} · {status?.chunks ?? 0} chunks grounded
            </span>
            <h2 className="mt-4 text-balance text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">
              {countdown !== null && countdown >= 0
                ? `You're ${countdown} day${countdown === 1 ? "" : "s"} from ${plan?.subject ?? subject}.`
                : "Turn scattered notes into exam-ready recall."}
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-300">
              {plan
                ? plan.rationale
                : "Upload your syllabus PDFs, then let the planner build a day-wise roadmap around your weak topics — every answer cites the exact page."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button onClick={() => onNavigate("plan")} className="btn-primary">
                <CalendarCheck2 size={15} />
                {plan ? "Open study plan" : "Build my plan"}
              </button>
              <button
                onClick={() => onNavigate("doubt")}
                className="btn border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]"
              >
                <MessageSquareQuote size={15} /> Ask a doubt
              </button>
            </div>
            {plan && plan.focus_topics.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400">
                <Target size={12} className="text-brand-300" /> Focus:
                {plan.focus_topics.slice(0, 3).map((topic) => (
                  <span key={topic} className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-ink-200">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 lg:gap-8">
            <div className="text-center">
              <ProgressRing value={completion} size={132} stroke={11} label={`${completion}%`} sublabel="plan done" />
            </div>
            <div className="hidden space-y-3 sm:block">
              {plan ? (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Tasks done</p>
                    <p className="text-xl font-extrabold text-white">
                      {done}
                      <span className="text-sm font-medium text-ink-500">/{total}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Exam</p>
                    <p className="text-sm font-bold text-white">{formatDate(plan.exam_date, { month: "short", day: "numeric" })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Daily load</p>
                    <p className="text-sm font-bold text-white">{plan.minutes_per_day} min</p>
                  </div>
                </>
              ) : (
                <div className="w-44 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Get started</p>
                  {["Index your notes", "Generate a plan", "Ask a cited doubt"].map((step, index) => (
                    <p key={step} className="flex items-center gap-2 text-[12px] font-medium text-ink-200">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-brand-200">
                        {index + 1}
                      </span>
                      {step}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          tone="amber"
          label="Study streak"
          value={`${progress?.streak ?? 0} ${progress?.streak === 1 ? "day" : "days"}`}
          hint={`${progress?.xp ?? 0} XP earned`}
        />
        <StatCard
          icon={TrendingUp}
          tone="emerald"
          label="Average score"
          value={`${progress?.average_score ?? 0}%`}
          hint={`${progress?.quizzes_taken ?? 0} quizzes graded`}
        />
        <StatCard
          icon={Library}
          tone="brand"
          label="Indexed material"
          value={`${documents.length} doc${documents.length === 1 ? "" : "s"}`}
          hint={`${status?.chunks ?? 0} passages searchable`}
        />
        <StatCard
          icon={Trophy}
          tone="violet"
          label="Mastered topics"
          value={`${progress?.mastered_topics.length ?? 0}`}
          hint={progress?.mastered_topics[0] ? `Top: ${progress.mastered_topics[0]}` : "Take a quiz to track"}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          {/* Today */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-ink-900">Today's sessions</h3>
                <p className="text-[12px] text-ink-500">{formatDate(today, { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
              <button onClick={() => onNavigate("plan")} className="btn-ghost !px-3 !py-1.5 text-[12px]">
                Full plan <ArrowRight size={13} />
              </button>
            </div>

            {todayTasks.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title={plan ? "Nothing scheduled today" : "No plan yet"}
                description={
                  plan
                    ? "Enjoy the breather, or pull tomorrow's session forward."
                    : "Generate a day-wise roadmap weighted toward your weakest topics."
                }
                action={
                  <button onClick={() => onNavigate("plan")} className="btn-primary">
                    <Sparkles size={14} /> {plan ? "Adjust plan" : "Generate plan"}
                  </button>
                }
              />
            ) : (
              <ul className="space-y-2">
                {todayTasks.map((task) => (
                  <li
                    key={task.id}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl border p-3 transition",
                      task.done ? "border-emerald-200/70 bg-emerald-50/40" : "border-ink-200/80 bg-white hover:border-brand-200",
                    )}
                  >
                    <button
                      onClick={() => void toggle(task.id, !task.done)}
                      disabled={busy === task.id}
                      className={cn(
                        "mt-0.5 shrink-0 transition",
                        task.done ? "text-emerald-500" : "text-ink-300 hover:text-brand-500",
                        busy === task.id && "animate-pulse",
                      )}
                    >
                      {task.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[13.5px] font-semibold", task.done ? "text-ink-400 line-through" : "text-ink-800")}>
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-400">
                        <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-semibold text-ink-600">{task.minutes} min</span>
                        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-semibold capitalize text-brand-600">{task.kind}</span>
                        {task.citation && (
                          <span>
                            {task.citation.doc_title} · p. {task.citation.page}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Weekly activity */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-ink-900">Study minutes</h3>
                <p className="text-[12px] text-ink-500">Last 7 days of completed work</p>
              </div>
              <span className="chip">
                <TrendingUp size={12} className="text-emerald-500" />
                {progress?.daily_minutes.reduce((sum, day) => sum + day.minutes, 0) ?? 0} min total
              </span>
            </div>
            <div className="flex h-36 items-end gap-2">
              {(progress?.daily_minutes ?? []).map((day) => {
                const height = Math.max(6, (day.minutes / maxMinutes) * 100);
                const isToday = day.date === today;
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-28 w-full items-end justify-center">
                      <div
                        className={cn(
                          "w-full max-w-9 rounded-lg transition-all duration-500",
                          isToday
                            ? "bg-gradient-to-t from-brand-600 to-violet-400"
                            : "bg-gradient-to-t from-ink-200 to-ink-100",
                        )}
                        style={{ height: `${height}%` }}
                        title={`${day.minutes} minutes`}
                      />
                    </div>
                    <span className={cn("text-[10px] font-semibold", isToday ? "text-brand-600" : "text-ink-400")}>
                      {weekday(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Weak topics */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink-900">Weak topics</h3>
              <span className="section-title">auto-detected</span>
            </div>
            {progress?.weak_topics.length ? (
              <ul className="space-y-3">
                {progress.weak_topics.slice(0, 4).map((item) => (
                  <li key={item.topic}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-ink-700">{item.topic}</span>
                      <span className="font-mono text-[11px] text-rose-500">{Math.round(item.accuracy * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-700"
                        style={{ width: `${Math.max(4, item.accuracy * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-500">
                No weak spots detected yet. Grade a quiz and the planner will start prioritising the topics you miss.
              </p>
            )}
            <button onClick={() => onNavigate("quiz")} className="btn-soft mt-4 w-full text-[12.5px]">
              <ListChecks size={14} /> Drill my weakest topic
            </button>
          </section>

          {/* Upcoming */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink-900">Coming up</h3>
              <BookOpen size={15} className="text-ink-300" />
            </div>
            {nextTasks.length ? (
              <ul className="space-y-2.5">
                {nextTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-600">
                      D{task.day}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink-700">{task.title}</p>
                      <p className="text-[11px] text-ink-400">
                        {formatDate(task.date, { weekday: "short", month: "short", day: "numeric" })} · {task.minutes} min
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-500">Your schedule is clear. Build a plan to fill it.</p>
            )}
          </section>

          {/* Recent */}
          <section className="card p-5">
            <h3 className="mb-3 text-[15px] font-bold text-ink-900">Recent quizzes</h3>
            {progress?.recent_attempts.length ? (
              <ul className="space-y-2">
                {progress.recent_attempts.slice(0, 3).map((attempt) => (
                  <li key={`${attempt.quiz_id}-${attempt.created_at}`} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-ink-700">{attempt.topic || "Mixed quiz"}</p>
                      <p className="text-[10.5px] text-ink-400">
                        {attempt.score}/{attempt.total} correct
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                        attempt.percent >= 80
                          ? "bg-emerald-50 text-emerald-600"
                          : attempt.percent >= 50
                            ? "bg-amber-50 text-amber-600"
                            : "bg-rose-50 text-rose-600",
                      )}
                    >
                      {Math.round(attempt.percent)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-500">No attempts yet — your first quiz unlocks analytics.</p>
            )}
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-2.5">
            <QuickAction icon={GraduationCap} label="Index notes" onClick={() => onNavigate("library")} />
            <QuickAction icon={MessageSquareQuote} label="Ask doubt" onClick={() => onNavigate("doubt")} />
          </section>
        </div>
      </div>

      {topics.length > 0 && (
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink-900">Indexed topics</h3>
            <span className="section-title">{subject}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 14).map((topic) => (
              <span key={topic} className="chip">
                {topic}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
  tone: "amber" | "emerald" | "brand" | "violet";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    brand: "bg-brand-50 text-brand-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tones[tone])}>
          <Icon size={15} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</span>
      </div>
      <p className="mt-2.5 text-[20px] font-extrabold tracking-tight text-ink-900">{value}</p>
      <p className="text-[11px] text-ink-400">{hint}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Flame; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-xl border border-ink-200/80 bg-white p-3 text-left transition hover:border-brand-300 hover:shadow-card"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-500 transition group-hover:bg-brand-50 group-hover:text-brand-600">
        <Icon size={15} />
      </span>
      <span className="flex w-full items-center justify-between text-[12px] font-semibold text-ink-700">
        {label}
        <ArrowRight size={12} className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </span>
    </button>
  );
}
