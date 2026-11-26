import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { cn } from "../lib/format";
import { useStudy } from "../store";
import type { GradeResult, Quiz } from "../lib/types";
import { ProgressRing } from "../components/ProgressRing";
import { CitationCard } from "../components/CitationCard";

type Phase = "setup" | "running" | "result";
const LETTERS = ["A", "B", "C", "D", "E"];

export function QuizPage() {
  const { subject, topics, progress, notify, refreshProgress } = useStudy();
  const [phase, setPhase] = useState<Phase>("setup");
  const [topic, setTopic] = useState(progress?.weak_topics[0]?.topic ?? "");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestions = useMemo(
    () =>
      Array.from(new Set([...(progress?.weak_topics.map((item) => item.topic) ?? []), ...topics])).slice(0, 6),
    [progress, topics],
  );

  async function generate(overrideTopic?: string) {
    const focus = (overrideTopic ?? topic).trim();
    setLoading(true);
    try {
      const created = await api.quiz({ subject, topic: focus, count, difficulty });
      if (!created.questions.length) {
        notify("No questions could be built — add notes for this subject first.", "error");
        return;
      }
      setQuiz(created);
      setAnswers(Array(created.questions.length).fill(null));
      setIndex(0);
      setResult(null);
      setPhase("running");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!quiz) return;
    setLoading(true);
    try {
      const graded = await api.grade(quiz.id, answers);
      setResult(graded);
      setPhase("result");
      await refreshProgress();
      notify(`Graded: ${graded.score}/${graded.total} (${Math.round(graded.percent)}%)`, "success");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  const answered = answers.filter((value) => value !== null).length;

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 text-white shadow-lift sm:p-7">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-200">
              <ListChecks size={11} /> Quiz agent
            </span>
            <h2 className="mt-3 text-[24px] font-extrabold tracking-tight">Test recall, not vibes.</h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-300">
              Questions are authored from your own notes. Grading is instant, and every miss is mapped to a topic plus the
              page to revise.
            </p>
          </div>
        </div>

        <div className="card space-y-5 p-5 sm:p-6">
          <div>
            <label className="label">Topic</label>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Leave empty for a mixed quiz across the subject"
              className="field"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => setTopic("")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  topic === "" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-500 hover:border-brand-200",
                )}
              >
                Mixed / whole subject
              </button>
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setTopic(item)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                    topic === item
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-ink-200 text-ink-500 hover:border-brand-200",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Questions</label>
              <div className="flex gap-1.5">
                {[3, 5, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => setCount(value)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-[12.5px] font-bold transition",
                      count === value
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-ink-200 bg-white text-ink-500 hover:border-brand-200",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <div className="flex gap-1.5">
                {(["easy", "medium", "hard"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setDifficulty(value)}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-[12px] font-bold capitalize transition",
                      difficulty === value
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-ink-200 bg-white text-ink-500 hover:border-brand-200",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => void generate()} disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Authoring questions…" : "Generate quiz"}
          </button>
          {progress?.weak_topics.length ? (
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
              <Target size={11} className="text-rose-400" />
              Suggested from your misses: {progress.weak_topics[0].topic}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "running" && quiz) {
    const question = quiz.questions[index];
    const selected = answers[index];
    const isLast = index === quiz.questions.length - 1;

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2 font-semibold text-ink-600">
              <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-600">
                {quiz.topic || "Mixed"}
              </span>
              <span className="capitalize text-ink-400">{quiz.difficulty}</span>
            </div>
            <span className="font-bold text-ink-500">
              {index + 1} / {quiz.questions.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300"
              style={{ width: `${((index + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="card animate-in p-5 sm:p-6" key={question.id}>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-brand-500">Question {index + 1}</p>
          <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-ink-900">{question.question}</h3>

          <div className="mt-5 space-y-2">
            {question.options.map((option, optionIndex) => {
              const active = selected === optionIndex;
              return (
                <button
                  key={optionIndex}
                  onClick={() =>
                    setAnswers((current) => current.map((value, position) => (position === index ? optionIndex : value)))
                  }
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                    active
                      ? "border-brand-400 bg-brand-50/70 shadow-[0_0_0_3px_rgba(99,102,241,0.08)]"
                      : "border-ink-200 bg-white hover:border-brand-200 hover:bg-brand-50/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                      active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500",
                    )}
                  >
                    {LETTERS[optionIndex]}
                  </span>
                  <span className={cn("text-[13px] leading-relaxed", active ? "font-semibold text-ink-800" : "text-ink-600")}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="btn-ghost"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-[11px] font-medium text-ink-400">
            {answered}/{quiz.questions.length} answered
          </span>
          {isLast ? (
            <button
              onClick={() => void submit()}
              disabled={loading || answered < quiz.questions.length}
              className="btn-primary"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {answered < quiz.questions.length ? `Answer all ${quiz.questions.length}` : "Submit & grade"}
            </button>
          ) : (
            <button
              onClick={() => setIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
              disabled={selected === null}
              className="btn-primary"
            >
              Next <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "result" && quiz && result) {
    const tone = result.percent >= 80 ? "emerald" : result.percent >= 50 ? "amber" : "brand";
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="card overflow-hidden">
          <div className="flex flex-col items-center gap-5 border-b border-ink-100 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="text-center sm:text-left">
              <p className="section-title">Quiz graded</p>
              <h2 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink-900">
                {result.percent >= 80 ? "Strong recall." : result.percent >= 50 ? "Getting there." : "Good signal."}
              </h2>
              <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-ink-500">{result.feedback}</p>
              {result.weak_topics.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Revise:</span>
                  {result.weak_topics.map((item) => (
                    <span key={item} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-600">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ProgressRing value={result.percent} size={124} stroke={11} label={`${result.score}/${result.total}`} sublabel={`${Math.round(result.percent)}%`} tone={tone} />
          </div>

          <div className="flex flex-wrap gap-2 p-4">
            <button
              onClick={() => {
                setPhase("setup");
                setQuiz(null);
                setResult(null);
              }}
              className="btn-ghost"
            >
              <RefreshCw size={14} /> New quiz
            </button>
            {result.weak_topics[0] && (
              <button
                onClick={() => {
                  setTopic(result.weak_topics[0]);
                  void generate(result.weak_topics[0]);
                }}
                disabled={loading}
                className="btn-soft"
              >
                <Target size={14} /> Drill {result.weak_topics[0]}
              </button>
            )}
            <span className="ml-auto self-center text-[11px] text-ink-400">
              {result.total} questions · {quiz.topic || "mixed"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {quiz.questions.map((question, questionIndex) => {
            const graded = result.per_question[questionIndex];
            const correct = graded?.correct;
            return (
              <article key={question.id} className={cn("card p-4", correct ? "border-emerald-200/80" : "border-rose-200/70")}>
                <div className="flex items-start gap-2.5">
                  {correct ? (
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle size={17} className="mt-0.5 shrink-0 text-rose-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold leading-snug text-ink-800">{question.question}</p>
                    <div className="mt-2 space-y-1">
                      {question.options.map((option, optionIndex) => {
                        const isCorrect = optionIndex === question.answer_index;
                        const isGiven = optionIndex === graded?.given;
                        if (!isCorrect && !isGiven) return null;
                        return (
                          <div
                            key={optionIndex}
                            className={cn(
                              "flex items-start gap-2 rounded-lg px-2 py-1.5 text-[12px]",
                              isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700",
                            )}
                          >
                            {isCorrect ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" /> : <Circle size={13} className="mt-0.5 shrink-0" />}
                            <span>
                              <span className="font-bold">{LETTERS[optionIndex]}.</span> {option}
                              {isGiven && !isCorrect && <span className="ml-1 text-[10.5px] font-semibold uppercase">(your answer)</span>}
                              {isCorrect && <span className="ml-1 text-[10.5px] font-semibold uppercase">(correct)</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {question.explanation && (
                      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">{question.explanation}</p>
                    )}
                    {question.citation && (
                      <div className="mt-2">
                        <CitationCard citation={question.citation} compact />
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} className="mt-1 shrink-0 text-ink-200" />
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 pb-2 text-[11px] text-ink-400">
          <FileText size={12} /> Every explanation is tied to a page in your notes.
        </div>
      </div>
    );
  }

  return null;
}
