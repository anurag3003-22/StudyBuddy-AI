"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  CalendarRange,
  MessageSquareQuote,
  Quote,
  Timer,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { cn } from "@/lib/utils";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const STEPS = [
  {
    step: "STEP 01",
    icon: UploadCloud,
    title: "Ingest & Index",
    body: "Spring Boot stores the DBMS PDF; the RAG agent chunks 2NF, 3NF, and BCNF sections.",
  },
  {
    step: "STEP 02",
    icon: CalendarRange,
    title: "7-Day Study Plan",
    body: "Planner Agent builds a daily schedule prioritizing normalization drills first.",
  },
  {
    step: "STEP 03",
    icon: MessageSquareQuote,
    title: "Cited Doubt & Quiz",
    body: "Doubt Agent explains 1NF→BCNF with page citations; Quiz Agent tests mastery.",
  },
  {
    step: "STEP 04",
    icon: TrendingUp,
    title: "Sync Progress",
    body: "Java API records quiz scores, updates weak-topic analytics, increments the streak.",
  },
];

export default function Walkthrough() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActiveStep((s) => (s + 1) % STEPS.length),
      2500
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section
      id="walkthrough"
      aria-label="Live demo walkthrough — DBMS exam in 7 days"
      className="bg-grid relative bg-[#0C1428] py-24"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="04"
          kicker="LIVE DEMO WALKTHROUGH"
          title="Scenario: DBMS Exam in 7 Days"
          description="Watch the full pipeline — from raw PDF upload to graded quiz — exactly as the hackathon judges will see it."
        />

        {/* Student input quote */}
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass mx-auto mb-14 flex max-w-2xl items-start gap-4 rounded-2xl p-6"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300"
            aria-hidden
          >
            <Quote className="size-5" />
          </span>
          <div>
            <blockquote className="text-base italic leading-relaxed text-slate-200 md:text-lg">
              “Uploaded DBMS notes. My exam is in 7 days and I am weak in
              normalization.”
            </blockquote>
            <figcaption className="mt-2 font-mono text-xs text-slate-500">
              — Student input, Day 0
            </figcaption>
          </div>
        </motion.figure>

        {/* Steps + animated connector */}
        <div className="relative">
          {/* Dashed connector line with traveling dot (desktop) */}
          <div
            aria-hidden
            className="absolute -top-7 right-0 left-0 hidden h-3 lg:block"
          >
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 1000 3"
              preserveAspectRatio="none"
            >
              <line
                x1="12.5%"
                y1="1.5"
                x2="87.5%"
                y2="1.5"
                stroke="#38BDF8"
                strokeOpacity="0.4"
                strokeWidth="2"
                className="animate-dash"
              />
            </svg>
            <motion.span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.95)]"
              animate={{ left: `${12.5 + activeStep * 25}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            />
          </div>

          <motion.ol
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid gap-5 lg:grid-cols-4"
          >
            {STEPS.map((step, i) => {
              const active = activeStep === i;
              return (
                <motion.li
                  key={step.step}
                  variants={item}
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0F1830] p-6 transition-all duration-500",
                    active
                      ? "-translate-y-1.5 border-sky-400/50 shadow-[0_0_44px_-10px_rgba(56,189,248,0.45)]"
                      : "border-[#1D2A4A]"
                  )}
                >
                  {/* Active shimmer bar */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 top-0 h-0.5 transition-opacity duration-500",
                      active ? "animate-shimmer opacity-100" : "opacity-0"
                    )}
                  />

                  <div className="mb-5 flex items-center justify-between">
                    <span
                      className={cn(
                        "font-mono text-xs font-bold tracking-widest transition-colors duration-500",
                        active ? "text-sky-400" : "text-slate-500"
                      )}
                    >
                      {step.step}
                    </span>
                    <motion.span
                      animate={active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                      transition={{ duration: 1.6, repeat: active ? Infinity : 0, ease: "easeInOut" }}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl border transition-colors duration-500",
                        active
                          ? "border-sky-400/40 bg-sky-400/15 text-sky-300"
                          : "border-[#1D2A4A] bg-white/[0.03] text-slate-400"
                      )}
                      aria-hidden
                    >
                      <step.icon className="size-5" />
                    </motion.span>
                  </div>

                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {step.body}
                  </p>

                  {/* Step progress ticks */}
                  <span className="mt-5 flex gap-1.5" aria-hidden>
                    {STEPS.map((_, dot) => (
                      <span
                        key={dot}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors duration-500",
                          dot === i && active
                            ? "bg-sky-400"
                            : dot < i
                              ? "bg-sky-400/30"
                              : "bg-[#1D2A4A]"
                        )}
                      />
                    ))}
                  </span>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>

        {/* Impact banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, delay: 0.1, ease: "easeOut" }}
          className="mx-auto mt-12 flex max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-6 py-5 text-center sm:flex-row sm:gap-4"
        >
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300"
            aria-hidden
          >
            <Timer className="size-5" />
          </motion.span>
          <p className="text-base text-slate-300 md:text-lg">
            <strong className="font-semibold text-amber-300">Demo Impact</strong>{" "}
            — raw PDF upload to interactive quiz grading in under{" "}
            <strong className="font-display text-xl font-bold text-amber-300">
              90 seconds
            </strong>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
