"use client";

import { motion } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CtaSection() {
  return (
    <section
      aria-label="Get started with StudyBuddy AI"
      className="relative py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl"
        >
          {/* Rotating conic-gradient border glow */}
          <motion.div
            aria-hidden
            className="absolute inset-[-150%]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.85) 35deg, transparent 85deg, transparent 180deg, rgba(245,166,35,0.65) 215deg, transparent 265deg)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />

          {/* Inner card */}
          <div className="bg-grid relative m-[1.5px] overflow-hidden rounded-[calc(1.5rem-1.5px)] border border-sky-400/10 bg-gradient-to-br from-[#0F1830] via-[#0D1730] to-[#0F1830] p-10 text-center md:p-16">
            {/* Inner glow orbs */}
            <motion.div
              aria-hidden
              className="absolute -left-16 -top-16 size-64 rounded-full bg-sky-500/15 blur-[80px]"
              animate={{ x: [0, 26, 0], y: [0, 18, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -right-14 -bottom-14 size-56 rounded-full bg-amber-500/10 blur-[70px]"
              animate={{ x: [0, -22, 0], y: [0, -16, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                className="flex items-center gap-3 font-mono text-xs font-bold tracking-[0.2em] text-amber-300"
              >
                <span className="h-px w-8 bg-amber-400/80" aria-hidden />
                READY WHEN YOU ARE
                <span className="h-px w-8 bg-amber-400/80" aria-hidden />
              </motion.span>

              <motion.h2
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.25, ease: "easeOut" }}
                className="mt-6 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl"
              >
                Turn Exam Chaos into Structured{" "}
                <span className="text-gradient-sky">Mastery.</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
                className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg"
              >
                Upload your notes, get a cited answer, a 7-day plan, and a graded
                quiz — in under 90 seconds.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
                className="mt-9 flex flex-wrap items-center justify-center gap-3.5"
              >
                <Button
                  asChild
                  className="h-12 rounded-xl bg-sky-400 px-7 text-base font-semibold text-[#051423] shadow-[0_14px_40px_-10px_rgba(56,189,248,0.75)] transition-all duration-300 hover:scale-[1.05] hover:bg-sky-300"
                >
                  <a href="#demo">
                    Start Studying with AI
                    <ArrowRight className="size-5" aria-hidden />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="h-12 rounded-xl px-7 text-base text-slate-300 transition-all duration-300 hover:scale-[1.05] hover:bg-white/5 hover:text-white"
                >
                  <a href="#architecture">
                    <GitBranch className="size-5" aria-hidden />
                    Review the Pipeline
                  </a>
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-9 font-mono text-[11px] tracking-wider text-slate-600"
              >
                AI + JAVA HACKATHON // PROBLEM STATEMENT #07 — LANGGRAPH + SPRING
                BOOT
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
