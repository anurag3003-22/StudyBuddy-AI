import { CalendarRange, CheckCircle2, Circle, Clock, Loader2, Sparkles, Target, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { addDays, cn, daysUntil, formatDate, localISO } from "../lib/format";
import { useStudy } from "../store";
import { EmptyState } from "../components/EmptyState";
import type { PlanTask } from "../lib/types";

const KIND_STYLES: Record<string, string> = {
  learn: "bg-brand-50 text-brand-600 border-brand-100",
  drill: "bg-amber-50 text-amber-600 border-amber-100",
  review: "bg-violet-50 text-violet-600 border-violet-100",
  quiz: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rest: "bg-ink-50 text-ink-500 border-ink-100",
};

export function Planner() {
  const { plan, subject, topics, progress, refreshPlan, notify } = useStudy();
  const [examDate, setExamDate] = useState(plan?.exam_date ?? addDays(localISO(), 7));
  const [minutes, setMinutes] = useState(plan?.minutes_per_day ?? 90);
  const [weak, setWeak] = useState<string[]>(
    plan?.focus_topics ?? progress?.weak_topics.slice(0, 2).map((item) => item.topic) ?? [],
  );
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  const days = Math.max(1, Math.min(30, daysUntil(examDate) || 1));
  const suggestions = useMemo(
    () =>
      Array.from(
        new Set([...topics, ...(progress?.weak_topics.map((item) => item.topic) ?? [])]),
      ).filter((topic) => !weak.some((item) => item.toLowerCase() === topic.toLowerCase())),
    [topics, progress, weak],
  );

  const done = plan?.tasks.filter((task) => task.done).length ?? 0;
  const total = plan?.tasks.length ?? 0;

  const grouped = useMemo(() => {
    const map = new Map<number, PlanTask[]>();
    plan?.tasks.forEach((task) => {
      const bucket = map.get(task.day) ?? [];
      bucket.push(task);
      map.set(task.day, bucket);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [plan]);

  async function generate() {
    setLoading(true);
    try {
      await api.plan({
        subject,
        days,
        exam_date: examDate,
        weak_topics: weak,
        minutes_per_day: minutes,
      });
      await refreshPlan();
      notify(`Plan generated for ${subject} — ${days} days to go.`, "success");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(taskId: string, value: boolean) {
    if (!plan) return;
    setBusyTask(taskId);
    try {
      await api.toggleTask(plan.id, taskId, value);
      await refreshPlan();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusyTask(null);
    }
  }

  function addTopic(topic: string) {
    const value = topic.trim();
    if (!value) return;
    if (weak.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    setWeak((current) => [...current, value]);
    setCustom("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      {/* Builder */}
      <section className="card h-fit p-5 xl:sticky xl:top-[84px]">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Wand2 size={16} />
          </span>
          <div>
            <h3 className="text-[14px] font-bold text-ink-900">Plan builder</h3>
            <p className="text-[11px] text-ink-400">Weak topics get the earliest sessions</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="exam-date">
              Exam date
            </label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              min={localISO()}
              onChange={(event) => setExamDate(event.target.value)}
              className="field"
            />
            <p className="mt-1.5 text-[11px] text-ink-400">
              {days} study day{days === 1 ? "" : "s"} · ends {formatDate(examDate, { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label !mb-0" htmlFor="minutes">
                Daily minutes
              </label>
              <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-600">{minutes} min</span>
            </div>
            <input
              id="minutes"
              type="range"
              min={30}
              max={240}
              step={15}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-[10px] text-ink-400">
              <span>30m</span>
              <span>4h</span>
            </div>
          </div>

          <div>
            <label className="label">Weak topics (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {weak.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setWeak((current) => current.filter((item) => item !== topic))}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700"
                >
                  {topic} <span className="text-brand-400">×</span>
                </button>
              ))}
              {!weak.length && <span className="text-[11.5px] text-ink-400">None selected — plan will follow syllabus order.</span>}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addTopic(custom);
              }}
              className="mt-2 flex gap-1.5"
            >
              <input
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                placeholder="e.g. normalization"
                className="field !py-2 text-[12px]"
              />
              <button type="submit" className="btn-ghost !px-3 !py-2 text-[12px]">
                Add
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {suggestions.slice(0, 5).map((topic) => (
                  <button
                    key={topic}
                    onClick={() => addTopic(topic)}
                    className="rounded-full border border-dashed border-ink-200 px-2 py-0.5 text-[10.5px] font-medium text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
                  >
                    + {topic}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => void generate()} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Agents are planning…" : plan ? "Regenerate plan" : "Generate plan"}
          </button>
          <p className="text-center text-[10.5px] leading-relaxed text-ink-400">
            Planner agent interleaves learn → drill → spaced review, then a timed mock on the final day.
          </p>
        </div>
      </section>

      {/* Plan */}
      <section className="space-y-4">
        {!plan ? (
          <EmptyState
            icon={CalendarRange}
            title="No study plan yet"
            description="Pick your exam date and weak topics on the left. The planner agent will build a day-wise roadmap from your indexed notes."
            action={
              <button onClick={() => void generate()} disabled={loading} className="btn-primary">
                <Sparkles size={14} /> Generate my plan
              </button>
            }
          />
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="border-b border-ink-100 bg-gradient-to-r from-brand-50/70 to-violet-50/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-extrabold text-ink-900">
                        {plan.days}-day {plan.subject} roadmap
                      </h3>
                      <span className="chip !border-brand-200 !bg-white !text-brand-600">
                        <Clock size={11} /> {plan.minutes_per_day} min/day
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-500">{plan.rationale}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Exam</p>
                    <p className="text-[15px] font-extrabold text-ink-900">
                      {formatDate(plan.exam_date, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[10.5px] font-semibold text-amber-600">{Math.max(0, daysUntil(plan.exam_date))} days left</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-700"
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-ink-600">
                    {done}/{total} done
                  </span>
                </div>
              </div>

              {plan.focus_topics.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-100 px-5 py-2.5">
                  <Target size={12} className="text-brand-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Priority</span>
                  {plan.focus_topics.map((topic) => (
                    <span key={topic} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-600">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {grouped.map(([day, tasks]) => {
                const dayDone = tasks.filter((task) => task.done).length;
                const allDone = dayDone === tasks.length;
                return (
                  <article key={day} className={cn("card p-4", allDone && "border-emerald-200/80")}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-9 w-9 flex-col items-center justify-center rounded-xl text-[10px] font-bold leading-none",
                            allDone ? "bg-emerald-500 text-white" : "bg-ink-950 text-white",
                          )}
                        >
                          <span className="text-[8px] font-semibold uppercase opacity-70">Day</span>
                          {day}
                        </span>
                        <div>
                          <p className="text-[12.5px] font-bold text-ink-800">
                            {formatDate(tasks[0].date, { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                          <p className="text-[10.5px] text-ink-400">
                            {tasks.reduce((sum, task) => sum + task.minutes, 0)} min · {dayDone}/{tasks.length} complete
                          </p>
                        </div>
                      </div>
                      {allDone && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 size={11} /> Done
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1.5">
                      {tasks.map((task) => (
                        <li
                          key={task.id}
                          className={cn(
                            "flex items-start gap-2.5 rounded-lg border p-2.5 transition",
                            task.done ? "border-transparent bg-emerald-50/40" : "border-ink-100 bg-white hover:border-brand-200",
                          )}
                        >
                          <button
                            onClick={() => void toggle(task.id, !task.done)}
                            disabled={busyTask === task.id}
                            className={cn(
                              "mt-0.5 shrink-0 transition",
                              task.done ? "text-emerald-500" : "text-ink-300 hover:text-brand-500",
                              busyTask === task.id && "animate-pulse",
                            )}
                          >
                            {task.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={cn("rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide", KIND_STYLES[task.kind])}>
                                {task.kind}
                              </span>
                              <p className={cn("text-[12.5px] font-semibold", task.done ? "text-ink-400 line-through" : "text-ink-800")}>
                                {task.title}
                              </p>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-ink-400">
                              <span>{task.minutes} min</span>
                              {task.citation && (
                                <span className="truncate">
                                  · {task.citation.doc_title} p.{task.citation.page}
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
