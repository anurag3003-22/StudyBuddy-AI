"use client";

import { motion, type Variants } from "framer-motion";
import {
  CheckCircle2,
  GraduationCap,
  MoveRight,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const STRUGGLES = [
  {
    lead: "Fragmented Material:",
    body: "Scattered PDFs, PYQs, lectures, handwritten notes.",
  },
  {
    lead: "No Study Roadmap:",
    body: "Zero daily prioritization before tight exam deadlines.",
  },
  {
    lead: "Unverified Answers:",
    body: "Generic chatbots hallucinate outside syllabus bounds.",
  },
  {
    lead: "Passive Reading:",
    body: "Lack of targeted practice on weak concepts.",
  },
];

const SOLUTIONS = [
  {
    lead: "Unified RAG Hub:",
    body: "Single repository indexing syllabus and class notes.",
  },
  {
    lead: "Adaptive Roadmaps:",
    body: "Day-wise plans tailored to exam countdowns.",
  },
  {
    lead: "Cited Doubt Solving:",
    body: "Exact page and document references per answer.",
  },
  {
    lead: "Automated Quizzes:",
    body: "Instant evaluation synced with progress streaks.",
  },
];

export default function Problem() {
  return (
    <section
      id="problem"
      aria-label="The challenge and the StudyBuddy AI solution"
      className="bg-grid-light relative w-full bg-[#F7F8FA] py-24 text-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="01"
          kicker="THE CHALLENGE & OPPORTUNITY"
          title="From Exam Chaos to Structured Mastery"
          variant="light"
        />

        <div className="relative mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {/* Chaos card */}
          <motion.article
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.25)]"
          >
            <header className="mb-7 flex items-center gap-4">
              <span className="flex rounded-xl bg-rose-100 p-3 text-rose-500">
                <TriangleAlert className="size-6" aria-hidden />
              </span>
              <h3 className="font-display text-2xl font-bold text-slate-900">
                Current Student Struggle
              </h3>
            </header>
            <motion.ul
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="space-y-5"
            >
              {STRUGGLES.map((row) => (
                <motion.li key={row.lead} variants={item} className="flex gap-3">
                  <XCircle
                    className="mt-0.5 size-5 shrink-0 text-rose-400"
                    aria-hidden
                  />
                  <p className="leading-relaxed text-slate-600">
                    <strong className="font-semibold text-slate-900">{row.lead}</strong>{" "}
                    {row.body}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </motion.article>

          {/* Chaos → Mastery badge (desktop) */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, delay: 0.35, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:flex"
          >
            <motion.span
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="animate-pulse-ring flex size-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_14px_36px_-10px_rgba(14,165,233,0.7)] ring-4 ring-[#F7F8FA]"
            >
              <MoveRight className="size-6" aria-hidden />
            </motion.span>
          </motion.div>

          {/* Solution card */}
          <motion.article
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="rounded-2xl border border-[#D6E4F5] bg-[#EEF3FB] p-8 shadow-[0_20px_60px_-32px_rgba(14,116,187,0.28)]"
          >
            <header className="mb-7 flex items-center gap-4">
              <span className="flex rounded-xl bg-sky-100 p-3 text-sky-600">
                <GraduationCap className="size-6" aria-hidden />
              </span>
              <h3 className="font-display text-2xl font-bold text-slate-900">
                The StudyBuddy AI Solution
              </h3>
            </header>
            <motion.ul
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="space-y-5"
            >
              {SOLUTIONS.map((row) => (
                <motion.li key={row.lead} variants={item} className="flex gap-3">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                  <p className="leading-relaxed text-slate-600">
                    <strong className="font-semibold text-slate-900">{row.lead}</strong>{" "}
                    {row.body}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
