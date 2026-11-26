"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  CalendarRange,
  Clock,
  Lightbulb,
  Loader2,
  Wand2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { StudyPlanResponse } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function defaultExamDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const CONFETTI_COLORS = ["#38BDF8", "#F5A623", "#ffffff"];

function planConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    angle: 60,
    origin: { x: 0.02, y: 0.75 },
    colors: CONFETTI_COLORS,
  });
  confetti({
    particleCount: 90,
    spread: 70,
    angle: 120,
    origin: { x: 0.98, y: 0.75 },
    colors: CONFETTI_COLORS,
  });
}

/* ------------------------------------------------------------------ */
/* loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function PlanSkeleton() {
  return (
    <div className="space-y-4">
      <div className="relative h-8 w-2/3 overflow-hidden rounded-lg border border-[#1D2A4A] bg-[#0F1830]">
        <div className="absolute inset-0 animate-shimmer" aria-hidden />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="relative h-40 rounded-2xl border border-[#1D2A4A] bg-[#0F1830]"
        >
          <div className="absolute inset-0 animate-shimmer" aria-hidden />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* plan day card on the timeline                                       */
/* ------------------------------------------------------------------ */

interface PlanDayCardProps {
  day: number;
  focus: string;
  topics: string[];
  tasks: string[];
  hours: number;
  index: number;
  checked: Record<string, boolean>;
  onToggle: (key: string, value: boolean) => void;
}

function PlanDayCard({
  day,
  focus,
  topics,
  tasks,
  hours,
  index,
  checked,
  onToggle,
}: PlanDayCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -18 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
      className="relative pl-8"
    >
      {/* dot sitting on the timeline */}
      <span
        className="absolute -left-[15px] top-4 flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/40 bg-[#0A0F1E] font-mono text-[11px] font-bold text-sky-300 shadow-[0_0_16px_-4px_rgba(56,189,248,0.6)]"
        aria-hidden
      >
        {day}
      </span>
      <Card className="card-glow border-[#1D2A4A] bg-[#0F1830]/80">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[11px] font-bold tracking-widest text-sky-400">
              DAY {day}
            </span>
            <span className="font-semibold text-slate-100">{focus}</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#1D2A4A] bg-[#0A0F1E] px-2.5 py-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
              <Clock className="h-3 w-3 text-amber-400" aria-hidden />
              {hours}h
            </span>
          </div>
          {topics.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-sky-400/20 bg-sky-400/5 px-2 py-0.5 font-mono text-[11px] text-slate-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          <ul className="space-y-2">
            {tasks.map((task, ti) => {
              const key = `${day}-${ti}`;
              const done = !!checked[key];
              return (
                <li key={key} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`task-${key}`}
                    checked={done}
                    onCheckedChange={(v) => onToggle(key, v === true)}
                    aria-label={`Mark task: ${task}`}
                    className="mt-0.5 border-[#1D2A4A] data-[state=checked]:border-sky-400 data-[state=checked]:bg-sky-400 data-[state=checked]:text-[#051423]"
                  />
                  <label
                    htmlFor={`task-${key}`}
                    className={cn(
                      "cursor-pointer text-sm leading-snug transition-colors duration-300",
                      done ? "text-slate-500 line-through" : "text-slate-300"
                    )}
                  >
                    {task}
                  </label>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export default function Planner({
  examDate: controlledExamDate,
  onExamDateChange,
}: {
  examDate?: string;
  onExamDateChange?: (date: string) => void;
} = {}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("DBMS");
  const [localExamDate, setLocalExamDate] = useState(defaultExamDateISO);
  const examDate = controlledExamDate ?? localExamDate;
  const setExamDate = (value: string) => {
    setLocalExamDate(value);
    onExamDateChange?.(value);
  };
  const [weakTopics, setWeakTopics] = useState("Normalization, BCNF decomposition");
  const [hours, setHours] = useState(3);
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Restore the latest saved plan so the demo survives a refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plan?subject=DBMS");
        if (!res.ok) return;
        const data = (await res.json()) as {
          title?: string;
          plan?: StudyPlanResponse["plan"] | null;
          tips?: string[];
        };
        if (!cancelled && Array.isArray(data.plan) && data.plan.length > 0) {
          setPlan({
            title: data.title ?? "Saved study plan",
            plan: data.plan,
            tips: Array.isArray(data.tips) ? data.tips : [],
          });
        }
      } catch (err) {
        // No saved plan yet — the empty state is the correct UI.
        console.error("[planner] could not restore saved plan", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** days between today and the exam date, clamped to 1..30 */
  const days = useMemo(() => {
    const target = new Date(`${examDate}T00:00:00`);
    if (Number.isNaN(target.getTime())) return 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
    return Math.min(30, Math.max(1, diff));
  }, [examDate]);

  async function generate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || "DBMS",
          days,
          hoursPerDay: hours,
          weakTopics: weakTopics.trim(),
        }),
      });
      if (!res.ok) throw new Error(`POST /api/plan → ${res.status}`);
      const data = (await res.json()) as StudyPlanResponse;
      if (!data?.plan?.length) throw new Error("Planner returned an empty plan");
      setPlan(data);
      setChecked({});
      planConfetti();
      toast({
        title: "Study plan ready",
        description: `${data.plan.length} days locked in — ${data.title}`,
      });
    } catch (err) {
      console.error("[planner] failed to generate plan", err);
      toast({
        variant: "destructive",
        title: "Planner Agent unavailable",
        description: "Could not build the plan. Check the API and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  const toggleTask = (key: string, value: boolean) =>
    setChecked((c) => ({ ...c, [key]: value }));

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* parameters */}
      <Card className="card-glow h-fit border-[#1D2A4A] bg-[#0F1830]">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold text-slate-100">
            Plan Parameters
          </CardTitle>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            planner agent · inputs
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="plan-subject" className="text-xs text-slate-400">
              Subject
            </Label>
            <Input
              id="plan-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-[#1D2A4A] bg-[#0A0F1E] text-sm focus-visible:ring-sky-400/40"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="plan-exam" className="text-xs text-slate-400">
                Exam date
              </Label>
              <span className="font-mono text-[11px] text-sky-300">
                → {days} days of runway
              </span>
            </div>
            <Input
              id="plan-exam"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="border-[#1D2A4A] bg-[#0A0F1E] text-sm [color-scheme:dark] focus-visible:ring-sky-400/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-weak" className="text-xs text-slate-400">
              Weak topics
            </Label>
            <Textarea
              id="plan-weak"
              value={weakTopics}
              onChange={(e) => setWeakTopics(e.target.value)}
              rows={3}
              placeholder="Topics you keep losing marks on…"
              className="resize-none border-[#1D2A4A] bg-[#0A0F1E] text-sm placeholder:text-slate-600 focus-visible:ring-sky-400/40"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="plan-hours" className="text-xs text-slate-400">
                Hours / day
              </Label>
              <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 font-mono text-xs text-sky-300 tabular-nums">
                {hours}h
              </span>
            </div>
            <Slider
              id="plan-hours"
              value={[hours]}
              onValueChange={(v) => setHours(v[0] ?? hours)}
              min={1}
              max={8}
              step={1}
              aria-label="Hours per day"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-600">
              <span>1h</span>
              <span>8h</span>
            </div>
          </div>

          <Button
            onClick={() => void generate()}
            disabled={loading}
            className="w-full rounded-xl bg-sky-400 font-semibold text-[#051423] hover:bg-sky-300"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Planner Agent thinking…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" aria-hidden />
                Generate Adaptive Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* result */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <p className="mb-4 font-mono text-xs text-sky-400/70">
                planner-agent · composing your runway…
              </p>
              <PlanSkeleton />
            </motion.div>
          ) : plan ? (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <h3 className="font-display text-xl font-bold text-slate-50">
                {plan.title}
              </h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                {plan.plan.length}-day plan · {hours}h/day · {subject}
              </p>

              {plan.tips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.tips.map((tip) => (
                    <span
                      key={tip}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-200"
                    >
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                      {tip}
                    </span>
                  ))}
                </div>
              )}

              <ol className="relative ml-3 space-y-5 border-l-2 border-[#1D2A4A]">
                {plan.plan.map((d, i) => (
                  <PlanDayCard
                    key={d.day}
                    day={d.day}
                    focus={d.focus}
                    topics={d.topics}
                    tasks={d.tasks}
                    hours={d.hours}
                    index={i}
                    checked={checked}
                    onToggle={toggleTask}
                  />
                ))}
              </ol>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#1D2A4A] bg-[#0F1830]/40 p-8 text-center"
            >
              <div className="animate-float mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/25 to-amber-400/25 p-[3px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0A0F1E]">
                  <CalendarRange className="h-8 w-8 text-sky-300" aria-hidden />
                </div>
              </div>
              <h4 className="font-display text-lg font-semibold text-slate-100">
                Your {days}-day battle plan appears here
              </h4>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Set the exam date, your weak topics and daily hours — the
                Planner Agent turns them into a day-by-day runway with
                checkable tasks.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
