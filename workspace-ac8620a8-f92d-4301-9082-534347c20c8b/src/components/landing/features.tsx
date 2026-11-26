"use client";

import { motion, type Variants } from "framer-motion";
import {
  CalendarRange,
  ClipboardCheck,
  LibraryBig,
  MessageSquareQuote,
  Scale,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const AGENTS = [
  {
    id: "01",
    name: "Syllabus RAG Agent",
    icon: LibraryBig,
    iconClass: "bg-sky-400/10 text-sky-300",
    description:
      "Semantic chunking over your PDFs and handwritten notes. One unified, searchable knowledge hub.",
    tag: "LangGraph · RAG",
    tagClass: "border-sky-400/30 text-sky-300",
  },
  {
    id: "02",
    name: "Doubt-Solving Agent",
    icon: MessageSquareQuote,
    iconClass: "bg-amber-400/10 text-amber-300",
    description:
      "Context-grounded answers with exact page citations. Zero hallucinations, exam-focused.",
    tag: "Cited Answers",
    tagClass: "border-amber-400/30 text-amber-300",
  },
  {
    id: "03",
    name: "Study-Plan Generator",
    icon: CalendarRange,
    iconClass: "bg-emerald-400/10 text-emerald-300",
    description:
      "Day-wise adaptive schedules built around your weak topics and exam countdown.",
    tag: "Adaptive Planner",
    tagClass: "border-emerald-400/30 text-emerald-300",
  },
  {
    id: "04",
    name: "Quiz & Grading Agent",
    icon: ClipboardCheck,
    iconClass: "bg-violet-400/10 text-violet-300",
    description:
      "Auto-generated quizzes with instant grading, feedback, and streak sync.",
    tag: "Auto-Grading",
    tagClass: "border-violet-400/30 text-violet-300",
  },
];

export default function Features() {
  return (
    <section
      id="agents"
      aria-label="The four cooperating AI agents"
      className="relative overflow-hidden py-24"
    >
      {/* Faint ambient orb */}
      <motion.div
        aria-hidden
        className="absolute right-[-10%] top-1/4 size-[460px] rounded-full bg-sky-500/[0.07] blur-[120px]"
        animate={{ y: [0, 34, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="02"
          kicker="THE AGENT CREW"
          title="Four Agents. One Goal: Exam Mastery."
          description="AI reasoning meets a rock-solid backend — a LangGraph crew that reads your notes, plans your days, answers with citations, and grades your drills."
        />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
        >
          {AGENTS.map((agent) => (
            <motion.article
              key={agent.id}
              variants={item}
              whileHover={{ y: -6 }}
              className={`card-glow group flex h-full flex-col rounded-2xl border border-[#1D2A4A] bg-[#0F1830] p-6`}
            >
              <span
                className={`mb-5 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${agent.iconClass}`}
              >
                <agent.icon className="size-6" aria-hidden />
              </span>
              <p className="font-mono text-xs tracking-widest text-slate-500">
                AGENT {agent.id}
              </p>
              <h3 className="mt-1.5 font-display text-lg font-semibold text-slate-100">
                {agent.name}
              </h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-slate-400">
                {agent.description}
              </p>
              <span
                className={`mt-5 inline-flex w-fit rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${agent.tagClass}`}
              >
                {agent.tag}
              </span>
            </motion.article>
          ))}
        </motion.div>

        {/* Golden Architectural Rule */}
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, delay: 0.15, ease: "easeOut" }}
          className="mt-8 flex items-start gap-4 rounded-r-2xl border border-l-4 border-[#1D2A4A] border-l-amber-400 bg-amber-400/5 p-5 md:items-center md:gap-5 md:p-6"
        >
          <motion.span
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300"
            aria-hidden
          >
            <Scale className="size-5" />
          </motion.span>
          <p className="text-sm leading-relaxed text-slate-300 md:text-base">
            <strong className="font-semibold text-amber-300">
              Golden Architectural Rule
            </strong>{" "}
            — The Java backend remains the single source of truth; AI agents
            propose structured actions via approved REST APIs.
          </p>
        </motion.aside>
      </div>
    </section>
  );
}
