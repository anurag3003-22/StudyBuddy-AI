"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Check,
  Flame,
  LayoutDashboard,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { QuizGenerateResponse, QuizQuestion, QuizSubmitResponse } from "@/lib/types";
import { useCountUp } from "./use-count-up";

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

const TOPIC_OPTIONS = [
  "Normalization & FDs",
  "SQL & Relational Algebra",
  "Transactions & Concurrency",
  "Indexing & B+ Trees",
] as const;

const COUNT_OPTIONS = [3, 5, 8] as const;

const DIFFICULTY_OPTIONS = [
  {
    value: "easy",
    label: "Easy",
    idle: "border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10",
    active: "border-emerald-400 bg-emerald-400 text-emerald-950",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  {
    value: "medium",
    label: "Medium",
    idle: "border-amber-400/30 text-amber-300 hover:bg-amber-400/10",
    active: "border-amber-400 bg-amber-400 text-amber-950",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  {
    value: "hard",
    label: "Hard",
    idle: "border-rose-400/30 text-rose-300 hover:bg-rose-400/10",
    active: "border-rose-400 bg-rose-400 text-rose-950",
    badge: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  },
] as const;

type Difficulty = (typeof DIFFICULTY_OPTIONS)[number]["value"];
type Phase = "setup" | "playing" | "results";

const CELEBRATE_COLORS = ["#38BDF8", "#34D399", "#F5A623"];

function celebrate() {
  confetti({
    particleCount: 90,
    spread: 100,
    origin: { x: 0.5, y: 0.55 },
    colors: CELEBRATE_COLORS,
  });
  window.setTimeout(
    () =>
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: CELEBRATE_COLORS,
      }),
    250
  );
  window.setTimeout(
    () =>
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: CELEBRATE_COLORS,
      }),
    420
  );
}

function ringColor(pct: number) {
  if (pct >= 0.8) return "#34d399";
  if (pct >= 0.5) return "#f5a623";
  return "#fb7185";
}

function verdict(pct: number): string {
  if (pct >= 0.999) return "Flawless — you own this topic!";
  if (pct >= 0.7) return "Strong mastery";
  if (pct >= 0.4) return "Getting there — review the misses";
  return "Weak topic — rerun the plan & retry";
}

/* ------------------------------------------------------------------ */
/* option button                                                       */
/* ------------------------------------------------------------------ */

type OptionState = "idle" | "correct" | "wrong" | "dim";

function OptionButton({
  index,
  option,
  state,
  onPick,
}: {
  index: number;
  option: string;
  state: OptionState;
  onPick: (index: number) => void;
}) {
  const letter = ["A", "B", "C", "D"][index] ?? "?";
  const locked = state !== "idle";
  return (
    <motion.button
      type="button"
      onClick={() => onPick(index)}
      disabled={locked}
      animate={state === "wrong" ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-300",
        state === "idle" &&
          "border-[#1D2A4A] bg-[#0A0F1E]/60 text-slate-300 hover:border-sky-400/40 hover:bg-sky-400/5",
        state === "correct" &&
          "border-emerald-400/50 bg-emerald-400/15 text-emerald-100",
        state === "wrong" && "border-rose-400/50 bg-rose-400/15 text-rose-100",
        state === "dim" && "border-[#1D2A4A] bg-[#0A0F1E]/40 text-slate-500 opacity-45"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-xs",
          state === "idle" && "border-[#1D2A4A] text-slate-400",
          state === "correct" && "border-emerald-400/40 bg-emerald-400/20 text-emerald-200",
          state === "wrong" && "border-rose-400/40 bg-rose-400/20 text-rose-200",
          state === "dim" && "border-[#1D2A4A] text-slate-600"
        )}
      >
        {letter}
      </span>
      <span className="flex-1 leading-snug">{option}</span>
      {state === "correct" && <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />}
      {state === "wrong" && <X className="h-4 w-4 shrink-0 text-rose-300" aria-hidden />}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export default function QuizArena({
  onOpenDashboard,
}: {
  onOpenDashboard?: () => void;
} = {}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState<string>(TOPIC_OPTIONS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState<number>(5);

  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResponse | null>(null);
  const submittedRef = useRef(false);

  /* ---------------- actions ---------------- */

  async function startQuiz() {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "DBMS", topic, difficulty, count }),
      });
      if (!res.ok) throw new Error(`POST /api/quiz/generate → ${res.status}`);
      const data = (await res.json()) as QuizGenerateResponse;
      if (!data?.questions?.length) throw new Error("Quiz Agent returned no questions");
      setQuestions(data.questions);
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setScore(0);
      setSubmitResult(null);
      submittedRef.current = false;
      setPhase("playing");
    } catch (err) {
      console.error("[quiz-arena] generate failed", err);
      toast({
        variant: "destructive",
        title: "Quiz Agent unavailable — try again",
        description: "Question generation failed. Check the API and retry.",
      });
    } finally {
      setGenerating(false);
    }
  }

  function pick(index: number) {
    if (selected !== null) return;
    setSelected(index);
    setAnswers((a) => [...a, index]);
    if (index === questions[qIndex].answer) setScore((s) => s + 1);
  }

  function next() {
    if (selected === null) return;
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
    } else {
      setPhase("results");
    }
  }

  function retry() {
    submittedRef.current = false;
    setSubmitResult(null);
    setQuestions([]);
    setQIndex(0);
    setSelected(null);
    setAnswers([]);
    setScore(0);
    setPhase("setup");
  }

  /* ---------------- auto-submit on results ---------------- */

  const total = questions.length;
  const pct = total > 0 ? score / total : 0;

  useEffect(() => {
    if (phase !== "results") return;

    if (pct >= 0.7) celebrate();
    if (submittedRef.current) return;
    submittedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "DBMS", topic, score, total }),
        });
        if (!res.ok) throw new Error(`POST /api/quiz/submit → ${res.status}`);
        const data = (await res.json()) as QuizSubmitResponse;
        setSubmitResult(data);
        if (data.streak > data.previousStreak) {
          toast({
            title: `🔥 Streak extended to ${data.streak} days!`,
            description: "The flame keeps burning — attempt saved.",
          });
        } else {
          toast({
            title: `Streak: ${data.streak} days`,
            description: "Quiz attempt saved and graded.",
          });
        }
      } catch (err) {
        console.error("[quiz-arena] submit failed", err);
        toast({
          variant: "destructive",
          title: "Could not save attempt",
          description: "Your score is shown below but not synced to your profile.",
        });
      }
    })();
  }, [phase]);

  /* ---------------- setup view ---------------- */

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="card-glow border-[#1D2A4A] bg-[#0F1830]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <span className="glow-sky flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
                <Target className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <CardTitle className="font-display text-lg font-bold text-slate-50">
                  Quiz Arena
                </CardTitle>
                <p className="font-mono text-[11px] text-slate-500">
                  auto-generated · auto-graded
                </p>
              </div>
              <Badge className="ml-auto border-sky-400/30 bg-sky-400/10 text-sky-300">
                DBMS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="quiz-topic" className="text-xs text-slate-400">
                Topic
              </Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger
                  id="quiz-topic"
                  className="w-full border-[#1D2A4A] bg-[#0A0F1E] text-sm focus-visible:ring-sky-400/40"
                >
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent className="border-[#1D2A4A] bg-[#101a35]">
                  {TOPIC_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Difficulty</Label>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Difficulty">
                {DIFFICULTY_OPTIONS.map((d) => {
                  const active = difficulty === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDifficulty(d.value)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-300",
                        active ? d.active : d.idle
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Questions</Label>
              <div className="flex gap-2" role="group" aria-label="Question count">
                {COUNT_OPTIONS.map((c) => {
                  const active = count === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCount(c)}
                      aria-pressed={active}
                      className={cn(
                        "h-10 w-14 rounded-xl border font-mono text-sm tabular-nums transition-all duration-300",
                        active
                          ? "border-sky-400 bg-sky-400 text-[#051423]"
                          : "border-[#1D2A4A] text-slate-400 hover:border-sky-400/40 hover:bg-sky-400/5"
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {generating ? (
                <motion.div
                  key="gen-loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="rounded-xl border border-[#1D2A4A] bg-[#0A0F1E]/60 p-4"
                >
                  <p className="flex items-center gap-2 font-mono text-xs text-sky-400/80">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Quiz Agent is drafting questions…
                  </p>
                  <div className="mt-3 space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="relative h-3.5 overflow-hidden rounded bg-[#14213c]"
                      >
                        <div className="absolute inset-0 animate-shimmer" aria-hidden />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="gen-button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Button
                    onClick={() => void startQuiz()}
                    className="w-full rounded-xl bg-sky-400 py-6 text-base font-semibold text-[#051423] hover:bg-sky-300"
                  >
                    <Play className="h-5 w-5" aria-hidden />
                    Generate & Start Quiz
                  </Button>
                  <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-slate-600">
                    {difficulty} · {count} questions · {topic}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------------- playing view ---------------- */

  if (phase === "playing") {
    const q = questions[qIndex];
    const locked = selected !== null;
    const progress = (qIndex + (locked ? 1 : 0)) / questions.length;
    const diff = DIFFICULTY_OPTIONS.find((d) => d.value === q.difficulty) ??
      DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)!;
    const encouragement =
      score === qIndex && qIndex > 0
        ? "Flawless so far — keep the flame burning."
        : score === 0 && qIndex > 0
          ? "Rough start — the explanation is where the learning happens."
          : "Every attempt feeds the streak — press on.";

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {/* progress header */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              Question {qIndex + 1} of {questions.length}
            </span>
            <span
              className={cn(
                "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase",
                diff.badge
              )}
            >
              {q.difficulty}
            </span>
            <span className="ml-auto font-mono text-xs text-slate-500">
              score <span className="text-sky-300 tabular-nums">{score}</span>/
              {qIndex + (locked ? 1 : 0)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1D2A4A]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-xs italic text-slate-500">{encouragement}</p>
        </div>

        {/* question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className="card-glow border-[#1D2A4A] bg-[#0F1830]">
              <CardContent className="p-5 sm:p-6">
                <p className="text-lg font-medium leading-snug text-slate-100">
                  {q.question}
                </p>
                <div className="mt-5 space-y-2.5">
                  {q.options.map((option, i) => {
                    let state: OptionState = "idle";
                    if (locked) {
                      if (i === q.answer) state = "correct";
                      else if (i === selected) state = "wrong";
                      else state = "dim";
                    }
                    return (
                      <OptionButton
                        key={`${qIndex}-${i}`}
                        index={i}
                        option={option}
                        state={state}
                        onPick={pick}
                      />
                    );
                  })}
                </div>

                <AnimatePresence>
                  {locked && (
                    <motion.div
                      key="explanation"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="mt-5 rounded-xl border border-[#1D2A4A] bg-[#0A0F1E]/70 p-4"
                    >
                      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-sky-400">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        Why
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {q.explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {locked && (
                    <motion.div
                      key="next-btn"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
                      className="mt-5 flex justify-end"
                    >
                      <Button
                        onClick={next}
                        className="rounded-xl bg-sky-400 font-semibold text-[#051423] hover:bg-sky-300"
                      >
                        {qIndex === questions.length - 1
                          ? "See Results"
                          : "Next Question"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /* ---------------- results view ---------------- */

  return <Results
    questions={questions}
    answers={answers}
    score={score}
    topic={topic}
    submitResult={submitResult}
    onRetry={retry}
    onOpenDashboard={onOpenDashboard}
  />;
}

/* ------------------------------------------------------------------ */
/* results view (separate so hooks mount fresh)                        */
/* ------------------------------------------------------------------ */

function Results({
  questions,
  answers,
  score,
  topic,
  submitResult,
  onRetry,
  onOpenDashboard,
}: {
  questions: QuizQuestion[];
  answers: number[];
  score: number;
  topic: string;
  submitResult: QuizSubmitResponse | null;
  onRetry: () => void;
  onOpenDashboard?: () => void;
}) {
  const total = questions.length;
  const pct = total > 0 ? score / total : 0;
  const { ref, display } = useCountUp(Math.round(pct * 100), { duration: 1.1 });
  const circumference = 2 * Math.PI * 52;
  const color = ringColor(pct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto max-w-3xl space-y-5"
    >
      <Card className="card-glow border-[#1D2A4A] bg-[#0F1830]">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
          {/* score ring */}
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90">
              <circle cx="64" cy="64" r="52" fill="none" stroke="#1D2A4A" strokeWidth="10" />
              <motion.circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - pct) }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span ref={ref} className="font-display text-3xl font-bold tabular-nums" style={{ color }}>
                {display}
                <span className="text-lg">%</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {score}/{total}
              </span>
            </div>
          </div>

          {/* verdict + chips */}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
              {topic} · final verdict
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-slate-50">
              {verdict(pct)}
            </h3>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 font-mono text-xs text-sky-300 tabular-nums">
                <Zap className="h-3.5 w-3.5" aria-hidden />+{score * 20} XP
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs text-amber-300 tabular-nums">
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                best {submitResult ? submitResult.bestScore : "…"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-xs text-amber-300 tabular-nums">
                <Flame className="h-3.5 w-3.5 animate-flame" aria-hidden />
                {submitResult ? submitResult.streak : "…"} day streak
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* review */}
      <Card className="border-[#1D2A4A] bg-[#0F1830]">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold text-slate-100">
            Question Review
          </CardTitle>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            your answer vs the correct one
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((q, qi) => {
            const picked = answers[qi];
            const wasCorrect = picked === q.answer;
            return (
              <motion.div
                key={q.id ?? qi}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: qi * 0.06, ease: "easeOut" }}
                className={cn(
                  "rounded-xl border p-4",
                  wasCorrect
                    ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                    : "border-rose-400/20 bg-rose-400/[0.04]"
                )}
              >
                <p className="text-sm font-medium leading-snug text-slate-200">
                  <span className="mr-2 font-mono text-xs text-slate-500">
                    Q{qi + 1}
                  </span>
                  {q.question}
                </p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p
                    className={cn(
                      "flex items-start gap-2",
                      wasCorrect ? "text-emerald-300" : "text-rose-300"
                    )}
                  >
                    {wasCorrect ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span>
                      Your answer:{" "}
                      {picked !== undefined && picked !== null
                        ? `${["A", "B", "C", "D"][picked] ?? "?"}. ${q.options[picked] ?? "—"}`
                        : "—"}
                    </span>
                  </p>
                  {!wasCorrect && (
                    <p className="flex items-start gap-2 text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                      <span>
                        Correct: {["A", "B", "C", "D"][q.answer] ?? "?"}.{" "}
                        {q.options[q.answer] ?? "—"}
                      </span>
                    </p>
                  )}
                  <p className="pt-1 text-xs leading-relaxed text-slate-500">
                    {q.explanation}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={onRetry}
            variant="outline"
            className="rounded-xl border-[#1D2A4A] bg-[#0F1830] px-6 font-semibold text-slate-300 hover:bg-[#14213c] hover:text-sky-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Retry Quiz
          </Button>
          {onOpenDashboard && (
            <Button
              onClick={onOpenDashboard}
              className="rounded-xl bg-sky-400 px-6 font-semibold text-[#051423] hover:bg-sky-300"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Back to Dashboard
            </Button>
          )}
        </div>
        <p className="text-center font-mono text-[11px] text-slate-600">
          Your streak, XP and weak-topic mastery sync instantly.
        </p>
      </div>
    </motion.div>
  );
}
