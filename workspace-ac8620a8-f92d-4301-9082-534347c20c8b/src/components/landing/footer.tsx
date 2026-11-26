"use client";

import { GraduationCap } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Doubt Solver", href: "#demo" },
  { label: "Study Planner", href: "#demo" },
  { label: "Quiz Arena", href: "#demo" },
  { label: "Notes Hub", href: "#demo" },
];

const AGENT_LINKS = [
  { label: "RAG Agent", href: "#agents" },
  { label: "Doubt Agent", href: "#agents" },
  { label: "Planner", href: "#agents" },
  { label: "Quiz Agent", href: "#agents" },
];

const STACK_ITEMS = ["LangGraph", "Spring Boot", "PostgreSQL", "Next.js"];

export default function Footer() {
  return (
    <footer className="border-t border-[#1D2A4A] bg-[#081020]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Top: brand + link columns */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a
              href="#top"
              className="flex w-fit items-center gap-2.5"
              aria-label="StudyBuddy AI — back to top"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-amber-400">
                <GraduationCap className="size-5 text-white" aria-hidden />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                StudyBuddy <span className="text-sky-400">AI</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Personalized learning with source-cited answers.
            </p>
            <span className="mt-4 inline-flex rounded-full border border-[#1D2A4A] bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] tracking-wider text-slate-500">
              v1.0 · hackathon build
            </span>
          </div>

          {/* Product */}
          <nav aria-label="Product">
            <h3 className="font-mono text-xs font-bold tracking-[0.18em] text-slate-300">
              PRODUCT
            </h3>
            <ul className="mt-4 space-y-1">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-9 items-center text-sm text-slate-500 transition-colors duration-200 hover:text-sky-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Agents */}
          <nav aria-label="Agents">
            <h3 className="font-mono text-xs font-bold tracking-[0.18em] text-slate-300">
              AGENTS
            </h3>
            <ul className="mt-4 space-y-1">
              {AGENT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-9 items-center text-sm text-slate-500 transition-colors duration-200 hover:text-sky-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Stack */}
          <nav aria-label="Technology stack">
            <h3 className="font-mono text-xs font-bold tracking-[0.18em] text-slate-300">
              STACK
            </h3>
            <ul className="mt-4 space-y-1">
              {STACK_ITEMS.map((name) => (
                <li
                  key={name}
                  className="flex min-h-7 items-center text-sm text-slate-500"
                >
                  {name}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Divider */}
        <div className="mt-12 h-px w-full bg-[#1D2A4A]" aria-hidden />

        {/* Bottom row */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-center text-sm text-slate-500">
            © 2026 StudyBuddy AI — From Exam Chaos to Structured Mastery.
          </p>
          <p className="font-mono text-xs text-slate-500">
            AI Agent Track · Java Backend Track
          </p>
        </div>
      </div>
    </footer>
  );
}
