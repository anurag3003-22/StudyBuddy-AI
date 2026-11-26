"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  ClipboardCheck,
  Flame,
  RefreshCw,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { StatsResponse, TopicMastery } from "@/lib/types";
import { useCountUp } from "./use-count-up";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function scoreTone(pct: number) {
  if (pct >= 80)
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (pct >= 50) return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return "border-rose-400/30 bg-rose-400/10 text-rose-300";
}

function masteryBarColor(mastery: number) {
  if (mastery < 35) return "bg-rose-400";
  if (mastery < 50) return "bg-amber-400";
  return "bg-emerald-400";
}

/** Exam countdown — follows the date chosen in the Planner tab. */
function useExamCountdown(examDate?: string) {
  return useMemo(() => {
    const exam = examDate ? new Date(`${examDate}T10:00:00`) : new Date();
    if (!examDate) {
      exam.setDate(exam.getDate() + 7);
      exam.setHours(10, 0, 0, 0);
    }
    if (Number.isNaN(exam.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 7);
      return {
        days: 7,
        label: fallback.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.max(
      0,
      Math.ceil((exam.getTime() - today.getTime()) / 86_400_000)
    );
    return {
      days,
      label: exam.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  }, [examDate]);
}

/* ------------------------------------------------------------------ */
/* stat card with count-up                                             */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  target: number;
  suffix?: string;
  sub: string;
  iconClass: string;
  valueClass: string;
  flame?: boolean;
}

function StatCard({
  icon: Icon,
  label,
  target,
  suffix = "",
  sub,
  iconClass,
  valueClass,
  flame = false,
}: StatCardProps) {
  const { ref, display } = useCountUp(target);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="card-glow rounded-2xl border border-[#1D2A4A] bg-[#0F1830] p-5"
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border",
            iconClass,
            flame && "animate-flame"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <span
        ref={ref}
        className={cn(
          "mt-3 block font-display text-4xl font-bold tabular-nums",
          valueClass
        )}
      >
        {display}
        <span className="text-xl">{suffix}</span>
      </span>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* exam countdown banner                                               */
/* ------------------------------------------------------------------ */

function CountdownBanner({
  coverage,
  examDate,
}: {
  coverage: number;
  examDate?: string;
}) {
  const exam = useExamCountdown(examDate);
  const { ref, display } = useCountUp(exam.days, { duration: 0.9 });
  const ring = 2 * Math.PI * 26; // r=26
  const ringColor =
    coverage >= 80 ? "#34d399" : coverage >= 50 ? "#f5a623" : "#fb7185";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl bg-gradient-to-r from-sky-400/60 via-[#1D2A4A] to-amber-400/50 p-[1px]"
    >
      <div className="flex flex-col gap-4 rounded-[15px] bg-[#0F1830] p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
          <CalendarClock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Exam countdown
          </p>
          <h3 className="font-display text-lg font-bold text-slate-50">
            DBMS Exam
          </h3>
          <p className="text-xs text-slate-500">
            {exam.label} · 10:00 AM · Lecture Hall B
          </p>
        </div>
        <div className="flex items-center gap-5 sm:ml-auto">
          <div className="text-right">
            <span
              ref={ref}
              className="block font-display text-3xl font-bold text-amber-300 tabular-nums"
            >
              {display}
            </span>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              days to go
            </p>
          </div>
          <div className="flex flex-col items-center" title="syllabus mastery">
            <div className="relative h-16 w-16">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke="#1D2A4A"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ring}
                  initial={{ strokeDashoffset: ring }}
                  animate={{ strokeDashoffset: ring * (1 - coverage / 100) }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-slate-200 tabular-nums">
                {Math.round(coverage)}%
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">
              syllabus mastery
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* weak topics                                                         */
/* ------------------------------------------------------------------ */

function WeakTopicRow({ topic, mastery, index }: TopicMastery & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm text-slate-300">{topic}</span>
        <span className="font-mono text-xs text-slate-500 tabular-nums">
          {mastery}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1D2A4A]">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${mastery}%` }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.9, delay: 0.1 + index * 0.07, ease: "easeOut" }}
          className={cn("h-full rounded-full", masteryBarColor(mastery))}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 animate-shimmer" aria-hidden />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Shimmer className="h-24 rounded-2xl border border-[#1D2A4A] bg-[#0F1830]" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer
            key={i}
            className="h-36 rounded-2xl border border-[#1D2A4A] bg-[#0F1830]"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Shimmer className="h-72 rounded-2xl border border-[#1D2A4A] bg-[#0F1830] lg:col-span-3" />
        <Shimmer className="h-72 rounded-2xl border border-[#1D2A4A] bg-[#0F1830] lg:col-span-2" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export default function Dashboard({ examDate }: { examDate?: string } = {}) {
  const { toast } = useToast();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`GET /api/stats → ${res.status}`);
      const json = (await res.json()) as StatsResponse;
      setData(json);
    } catch (err) {
      console.error("[dashboard] failed to load stats", err);
      toast({
        variant: "destructive",
        title: "Stats unavailable",
        description: "Could not reach /api/stats — is the backend awake?",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void fetchStats();
  }, [fetchStats]);

  const onRefresh = async () => {
    setSpinning(true);
    await fetchStats();
    window.setTimeout(() => setSpinning(false), 650);
  };

  if (loading && !data) return <DashboardSkeleton />;

  const stats: StatsResponse =
    data ??
    {
      streak: 0,
      xp: 0,
      totalQuizzes: 0,
      avgScore: 0,
      notesCount: 0,
      weakTopics: [],
      recentAttempts: [],
      weeklyActivity: [],
    };

  const weakTopics = [...stats.weakTopics].sort((a, b) => a.mastery - b.mastery);

  return (
    <div className="space-y-4">
      {/* header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          command-center · overview
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          aria-label="Refresh stats"
          className="h-8 gap-2 border-[#1D2A4A] bg-[#0F1830] font-mono text-xs text-slate-400 hover:text-sky-300"
        >
          <motion.span
            animate={spinning ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.65, ease: "easeInOut" }}
            className="flex"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </motion.span>
          sync
        </Button>
      </div>

      <CountdownBanner coverage={stats.avgScore} examDate={examDate} />

      {/* stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={Flame}
          label="streak"
          target={stats.streak}
          sub="days in a row — keep it burning"
          iconClass="border-amber-400/30 bg-amber-400/10 text-amber-400"
          valueClass="text-amber-300"
          flame
        />
        <StatCard
          icon={Zap}
          label="xp earned"
          target={stats.xp}
          sub="level up by acing quizzes"
          iconClass="border-sky-400/30 bg-sky-400/10 text-sky-400"
          valueClass="text-sky-300"
        />
        <StatCard
          icon={ClipboardCheck}
          label="quizzes"
          target={stats.totalQuizzes}
          sub="auto-graded attempts"
          iconClass="border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
          valueClass="text-emerald-300"
        />
        <StatCard
          icon={Target}
          label="avg score"
          target={stats.avgScore}
          suffix="%"
          sub="across all attempts"
          iconClass="border-violet-300/30 bg-violet-300/10 text-violet-300"
          valueClass="text-violet-300"
        />
      </div>

      {/* chart + weak topics */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-glow border-[#1D2A4A] bg-[#0F1830] lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold text-slate-100">
              Weekly Activity
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              avg quiz score · last 7 days
            </p>
          </CardHeader>
          <CardContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={stats.weeklyActivity}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    cursor={{ stroke: "#1D2A4A", strokeWidth: 12 }}
                    contentStyle={{
                      backgroundColor: "#0F1830",
                      border: "1px solid #1D2A4A",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "#e6edf7",
                    }}
                    labelStyle={{ color: "#7dd3fc", fontWeight: 600 }}
                    itemStyle={{ color: "#38bdf8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="avg score"
                    unit="%"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    fill="url(#weeklyFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </CardContent>
        </Card>

        <Card className="card-glow border-[#1D2A4A] bg-[#0F1830] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold text-slate-100">
              Weak-Topic Analytics
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              weakest first · mastery 0-100
            </p>
          </CardHeader>
          <CardContent>
            {weakTopics.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No weak topics detected — either you are perfect or you have not
                quizzed enough yet.
              </p>
            ) : (
              <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
                {weakTopics.map((t, i) => (
                  <WeakTopicRow key={t.topic} topic={t.topic} mastery={t.mastery} index={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* recent attempts */}
      <Card className="card-glow border-[#1D2A4A] bg-[#0F1830]">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold text-slate-100">
            Recent Quiz Attempts
          </CardTitle>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            auto-graded · newest first
          </p>
        </CardHeader>
        <CardContent>
          {stats.recentAttempts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No attempts yet — open the Quiz Arena and fire your first shot.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {stats.recentAttempts.map((a, i) => {
                const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20px" }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[#1D2A4A] hover:bg-[#0A0F1E]/60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-300">
                      <Trophy className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {a.topic}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {a.subject} ·{" "}
                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums",
                        scoreTone(pct)
                      )}
                    >
                      {a.score}/{a.total}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
