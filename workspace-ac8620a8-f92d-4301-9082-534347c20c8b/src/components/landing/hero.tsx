"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  Database,
  FileText,
  Flame,
  Play,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Motion presets                                                     */
/* ------------------------------------------------------------------ */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

/* ------------------------------------------------------------------ */
/*  Count-up stat                                                      */
/* ------------------------------------------------------------------ */

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

const STATS = [
  { value: 90, unit: "sec", label: "PDF upload → graded quiz" },
  { value: 0, unit: "", label: "hallucinated answers" },
  { value: 4, unit: "", label: "cooperating AI agents" },
  { value: 2, unit: "", label: "full-stack tracks" },
];

/* ------------------------------------------------------------------ */
/*  Self-typing chat mockup                                            */
/* ------------------------------------------------------------------ */

const CONVERSATIONS = [
  {
    user: "I'm weak in normalization — explain BCNF vs 3NF?",
    agent:
      "BCNF is stricter: every determinant must be a superkey, while 3NF allows X→Y when Y is prime…",
    citation: "DBMS Unit 3 · Page 6",
  },
  {
    user: "Plan my DBMS revision — exam in 7 days.",
    agent:
      "Day 1 targets normalization: 2NF → BCNF drills with solved PYQs, then a 10-question mastery quiz…",
    citation: "DBMS Syllabus · Page 2",
  },
];

type ChatPhase = "user" | "agent" | "cite" | "hold";

function TypingChat() {
  const [convIndex, setConvIndex] = useState(0);
  const [phase, setPhase] = useState<ChatPhase>("user");
  const [userTyped, setUserTyped] = useState(0);
  const [agentTyped, setAgentTyped] = useState(0);

  const conv = CONVERSATIONS[convIndex];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phase === "user") {
      timer =
        userTyped < conv.user.length
          ? setTimeout(() => setUserTyped((c) => c + 1), 32)
          : setTimeout(() => setPhase("agent"), 750);
    } else if (phase === "agent") {
      timer =
        agentTyped < conv.agent.length
          ? setTimeout(() => setAgentTyped((c) => c + 1), 16)
          : setTimeout(() => setPhase("cite"), 450);
    } else if (phase === "cite") {
      timer = setTimeout(() => setPhase("hold"), 2800);
    } else {
      timer = setTimeout(() => {
        setConvIndex((i) => (i + 1) % CONVERSATIONS.length);
        setUserTyped(0);
        setAgentTyped(0);
        setPhase("user");
      }, 350);
    }
    return () => clearTimeout(timer);
  }, [phase, userTyped, agentTyped, convIndex, conv.user.length, conv.agent.length]);

  const userDone = userTyped >= conv.user.length;
  const agentDone = agentTyped >= conv.agent.length;
  const showAgent = phase !== "user";
  const showCitation = phase === "cite" || phase === "hold";

  return (
    <div className="glass glow-sky relative mx-auto w-full max-w-md rounded-2xl p-5">
      {/* Window chrome */}
      <div className="mb-4 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-rose-400/90" aria-hidden />
        <span className="size-2.5 rounded-full bg-amber-400/90" aria-hidden />
        <span className="size-2.5 rounded-full bg-emerald-400/90" aria-hidden />
        <span className="ml-2 font-mono text-xs text-slate-400">
          doubt-solver-agent
        </span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
          live
        </span>
      </div>

      <div className="flex min-h-56 flex-col gap-3">
        {/* User bubble */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md border border-sky-400/25 bg-sky-400/10 px-3.5 py-2.5 text-sm text-sky-100">
            {conv.user.slice(0, userTyped)}
            {!userDone && (
              <span className="animate-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-sky-300" aria-hidden />
            )}
          </div>
        </div>

        {/* Assistant bubble */}
        <AnimatePresence>
          {showAgent && (
            <motion.div
              key={`agent-${convIndex}`}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-start gap-2"
            >
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed text-slate-200">
                {conv.agent.slice(0, agentTyped)}
                {!agentDone && (
                  <span className="animate-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-amber-300" aria-hidden />
                )}
              </div>
              <AnimatePresence>
                {showCitation && (
                  <motion.span
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-300"
                  >
                    <FileText className="size-3.5" aria-hidden />
                    {conv.citation}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grounding badge */}
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
          <ShieldCheck className="size-3.5 text-emerald-400" aria-hidden />
          cited answer · zero hallucination
        </span>
        <span className="font-mono text-[10px] text-slate-600">
          spring-boot → langgraph
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating stat chips                                                */
/* ------------------------------------------------------------------ */

const FLOATING_CHIPS = [
  {
    icon: Flame,
    label: "5-day streak",
    className: "-left-6 top-8 border-amber-400/30 bg-amber-400/10 text-amber-300",
    iconClass: "animate-flame text-amber-400",
    delay: "0s",
  },
  {
    icon: TrendingUp,
    label: "Mastery +12%",
    className: "-right-4 top-1/3 border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    iconClass: "text-emerald-400",
    delay: "1.4s",
  },
  {
    icon: Database,
    label: "2NF→BCNF indexed",
    className: "-bottom-5 left-8 border-sky-400/30 bg-sky-400/10 text-sky-300",
    iconClass: "text-sky-400",
    delay: "2.6s",
  },
];

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export default function Hero() {
  return (
    <section
      id="top"
      aria-label="StudyBuddy AI intro"
      className="bg-grid relative overflow-hidden pb-0 pt-32 md:pt-40"
    >
      {/* Ambient orbs */}
      <motion.div
        aria-hidden
        className="absolute -left-24 top-16 size-[420px] rounded-full bg-sky-500/20 blur-[110px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-20 bottom-24 size-[380px] rounded-full bg-amber-500/10 blur-[100px]"
        animate={{ x: [0, -36, 0], y: [0, 26, 0] }}
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 pb-16 md:pb-20 lg:grid-cols-2 lg:gap-10">
          {/* ------------------------------ Left column ------------------------------ */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-start"
          >
            {/* Hackathon badge */}
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-[#1D2A4A] bg-white/[0.03] px-4 py-2 font-mono text-xs text-slate-300">
                <span className="relative flex size-2" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
                </span>
                AI + JAVA HACKATHON // PROBLEM STATEMENT #07
              </span>
            </motion.div>

            {/* Amber eyebrow rule */}
            <motion.span
              variants={item}
              aria-hidden
              className="mt-7 block h-1 w-12 rounded-full bg-amber-400"
            />

            {/* Headline with staggered reveal */}
            <motion.h1
              variants={item}
              className="mt-4 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl"
            >
              <span className="block overflow-hidden pb-1">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                >
                  StudyBuddy
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-2">
                <motion.span
                  className="text-gradient-sky block"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.28, ease: "easeOut" }}
                >
                  AI
                </motion.span>
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-5 text-lg font-semibold text-sky-300 md:text-2xl"
            >
              Personalized Learning &amp; Source-Cited Doubt Agent
            </motion.p>

            <motion.p
              variants={item}
              className="mt-4 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg"
            >
              Transforming scattered syllabus PDFs and class notes into adaptive
              study schedules, automated quizzes, and grounded answers.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3.5">
              <Button
                asChild
                className="h-12 rounded-xl bg-sky-400 px-6 text-base font-semibold text-[#051423] shadow-[0_12px_36px_-10px_rgba(56,189,248,0.75)] transition-all duration-300 hover:scale-[1.04] hover:bg-sky-300"
              >
                <a href="#demo">
                  <Zap className="size-5" aria-hidden />
                  Launch Live Demo
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-[#1D2A4A] bg-transparent px-6 text-base text-slate-300 transition-all duration-300 hover:scale-[1.04] hover:border-sky-400/40 hover:text-white"
              >
                <a href="#walkthrough">
                  <Play className="size-5" aria-hidden />
                  See How It Works
                </a>
              </Button>
            </motion.div>

            {/* Track chips */}
            <motion.div variants={item} className="mt-9 grid w-full gap-3 sm:grid-cols-2">
              {[
                {
                  title: "AI AGENT TRACK",
                  body: "RAG · Doubt Solver · Planner · Quiz",
                  accent: "text-sky-300",
                },
                {
                  title: "JAVA BACKEND TRACK",
                  body: "Spring Boot · Auth · Streaks · PostgreSQL",
                  accent: "text-amber-300",
                },
              ].map((track) => (
                <div
                  key={track.title}
                  className="rounded-xl border border-[#1D2A4A] bg-white/[0.02] px-4 py-3 transition-colors duration-300 hover:border-sky-400/30"
                >
                  <p className={`font-mono text-[11px] font-semibold tracking-wider ${track.accent}`}>
                    {track.title}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{track.body}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ------------------------------ Right column ------------------------------ */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
            className="relative"
          >
            <div className="animate-float" style={{ animationDuration: "7s" }}>
              <TypingChat />
            </div>

            {/* Floating stat chips */}
            {FLOATING_CHIPS.map((chip) => (
              <motion.span
                key={chip.label}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5, ease: "easeOut" }}
                className={`animate-float absolute z-10 hidden items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-md sm:flex ${chip.className}`}
                style={{ animationDelay: chip.delay }}
              >
                <chip.icon className={`size-4 ${chip.iconClass}`} aria-hidden />
                {chip.label}
              </motion.span>
            ))}
          </motion.div>
        </div>

        {/* ------------------------------ Stats strip ------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl border border-b-0 border-[#1D2A4A] bg-[#1D2A4A]/60 md:grid-cols-4"
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="group flex flex-col gap-1 bg-[#0B1226] px-6 py-7 transition-colors duration-300 hover:bg-[#0E1730]"
            >
              <p className="font-display text-4xl font-bold text-white">
                <CountUp value={stat.value} />
                {stat.unit && (
                  <span className="ml-1.5 text-xl font-semibold text-sky-400">{stat.unit}</span>
                )}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500 transition-colors group-hover:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
