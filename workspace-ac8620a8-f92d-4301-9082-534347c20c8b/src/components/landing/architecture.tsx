"use client";

import { motion } from "framer-motion";
import { Bot, Database, MonitorSmartphone, Server } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

/* ------------------------------------------------------------------ */
/*  Bidirectional connector (desktop)                                  */
/* ------------------------------------------------------------------ */

function DesktopConnector({ delay }: { delay: number }) {
  return (
    <div
      aria-hidden
      className="hidden w-[130px] shrink-0 flex-col items-center gap-1.5 self-center lg:flex"
    >
      <span className="whitespace-nowrap font-mono text-[9px] text-slate-500">
        REST · JSON
      </span>
      <svg width="130" height="64" viewBox="0 0 130 64" fill="none">
        {/* Request line (draw-in, then flowing dashes overlay) */}
        <motion.line
          x1="4"
          y1="20"
          x2="118"
          y2="20"
          stroke="#38BDF8"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
        <line
          x1="4"
          y1="20"
          x2="118"
          y2="20"
          stroke="#38BDF8"
          strokeOpacity="0.35"
          strokeWidth="1.6"
          className="animate-dash"
        />
        <path d="M118 14 L126 20 L118 26 Z" fill="#38BDF8" fillOpacity="0.7" />

        {/* Response line */}
        <motion.line
          x1="126"
          y1="44"
          x2="12"
          y2="44"
          stroke="#F5A623"
          strokeOpacity="0.55"
          strokeWidth="1.6"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: delay + 0.15, ease: "easeOut" }}
        />
        <line
          x1="126"
          y1="44"
          x2="12"
          y2="44"
          stroke="#F5A623"
          strokeOpacity="0.3"
          strokeWidth="1.6"
          className="animate-dash"
        />
        <path d="M12 38 L4 44 L12 50 Z" fill="#F5A623" fillOpacity="0.7" />

        {/* Traveling pulse dots */}
        <motion.circle
          r="3"
          fill="#7DD3FC"
          initial={{ cx: 4, cy: 20 }}
          animate={{ cx: [4, 118] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay }}
        />
        <motion.circle
          r="3"
          fill="#FBBF24"
          initial={{ cx: 126, cy: 44 }}
          animate={{ cx: [126, 12] }}
          transition={{
            duration: 1.7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 0.4,
          }}
        />
      </svg>
      <span className="whitespace-nowrap font-mono text-[9px] text-slate-500">
        structured proposals
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vertical connector (mobile)                                        */
/* ------------------------------------------------------------------ */

function MobileConnector() {
  return (
    <div
      aria-hidden
      className="flex flex-col items-center gap-1 py-1 lg:hidden"
    >
      <svg width="16" height="44" viewBox="0 0 16 44" fill="none">
        <line
          x1="8"
          y1="2"
          x2="8"
          y2="38"
          stroke="#38BDF8"
          strokeOpacity="0.5"
          strokeWidth="1.6"
          className="animate-dash"
        />
        <path d="M2 36 L8 43 L14 36 Z" fill="#38BDF8" fillOpacity="0.7" />
        <motion.circle
          r="3"
          fill="#7DD3FC"
          initial={{ cx: 8, cy: 4 }}
          animate={{ cy: [4, 36] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <span className="font-mono text-[10px] tracking-wider text-slate-500">
        REST · JSON / structured proposals
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Node card                                                          */
/* ------------------------------------------------------------------ */

const NODES = [
  {
    icon: MonitorSmartphone,
    title: "Student Interface",
    body: "Uploads notes · asks doubts · takes quizzes",
    iconClass: "border-white/10 bg-white/5 text-slate-200",
    chip: null as string | null,
  },
  {
    icon: Server,
    title: "Spring Boot API Core",
    body: "Single source of truth · auth · streaks · persistence",
    iconClass: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    chip: "PostgreSQL",
  },
  {
    icon: Bot,
    title: "LangGraph Agent Crew",
    body: "RAG · Doubt Solver · Planner · Quiz Grader",
    iconClass: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    chip: null,
  },
];

const CAPTIONS = [
  "Student uploads notes to Spring Boot",
  "LangGraph indexes & generates study plan",
  "Java API persists schedule & quiz metrics",
];

export default function Architecture() {
  return (
    <section
      id="architecture"
      aria-label="System architecture — end-to-end multi-agent pipeline"
      className="relative overflow-hidden py-24"
    >
      <motion.div
        aria-hidden
        className="absolute left-[-12%] bottom-0 size-[420px] rounded-full bg-sky-500/[0.06] blur-[120px]"
        animate={{ y: [0, -28, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="05"
          kicker="SYSTEM ARCHITECTURE"
          title="End-to-End Multi-Agent Pipeline"
          description="Three clean stages, one contract: the backend stays the single source of truth."
        />

        {/* Diagram */}
        <div className="flex flex-col items-stretch lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {NODES.map((node, i) => (
            <div key={node.title} className="contents">
              <motion.article
                initial={{ opacity: 0, y: 28, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.18, ease: "easeOut" }}
                whileHover={{ y: -5 }}
                className="card-glow glass rounded-2xl p-6"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${node.iconClass}`}
                    aria-hidden
                  >
                    <node.icon className="size-6" />
                  </span>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    {node.title}
                  </h3>
                </div>
                <p className="mt-3.5 text-sm leading-relaxed text-slate-400">
                  {node.body}
                </p>
                {node.chip && (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#1D2A4A] bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-slate-400">
                    <Database className="size-3.5 text-sky-400" aria-hidden />
                    {node.chip}
                  </span>
                )}
              </motion.article>

              {i < NODES.length - 1 && (
                <>
                  <DesktopConnector delay={0.35 + i * 0.3} />
                  <MobileConnector />
                </>
              )}
            </div>
          ))}
        </div>

        {/* Numbered flow captions */}
        <motion.ol
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.15 } },
          }}
          className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3"
        >
          {CAPTIONS.map((caption, i) => (
            <motion.li
              key={caption}
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
              }}
              className="flex items-center gap-3 rounded-xl border border-[#1D2A4A] bg-[#0F1830] px-4 py-3.5"
            >
              <span className="font-mono text-sm font-bold text-sky-400">
                {i + 1}.
              </span>
              <span className="font-mono text-xs leading-relaxed text-slate-400">
                {caption}
              </span>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
