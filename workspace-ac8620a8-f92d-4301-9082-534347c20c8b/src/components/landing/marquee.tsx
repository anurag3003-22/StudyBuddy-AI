"use client";

import { BookOpen } from "lucide-react";

const SUBJECTS = [
  "DBMS · Normalization",
  "Operating Systems",
  "Computer Networks",
  "Data Structures & Algorithms",
  "Machine Learning",
  "Discrete Math",
  "Compiler Design",
  "Software Engineering",
  "Organic Chemistry",
  "Calculus II",
];

export default function SubjectMarquee() {
  // Duplicated once so the -50% translateX loop is seamless.
  const loop = [...SUBJECTS, ...SUBJECTS];

  return (
    <section
      aria-label="Supported subjects"
      className="relative overflow-hidden border-y border-[#1D2A4A] bg-[#0C1428] py-4"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="animate-marquee flex w-max items-center">
        {loop.map((subject, i) => (
          <span
            key={`${subject}-${i}`}
            aria-hidden={i >= SUBJECTS.length}
            className="flex items-center gap-2.5 whitespace-nowrap px-6 font-mono text-sm text-slate-400 transition-colors duration-300 hover:text-sky-300"
          >
            <BookOpen className="size-3.5 text-sky-400/60" aria-hidden />
            {subject}
          </span>
        ))}
      </div>
    </section>
  );
}
