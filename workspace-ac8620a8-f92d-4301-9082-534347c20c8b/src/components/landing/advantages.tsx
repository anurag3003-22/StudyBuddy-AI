"use client";

import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Split, Zap } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const ADVANTAGES = [
  {
    icon: ShieldCheck,
    ring: "from-emerald-400/30 to-emerald-400/5",
    iconClass: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    title: "Zero Hallucinations",
    body: "Every answer cites the exact page of the student's own notes.",
  },
  {
    icon: Split,
    ring: "from-sky-400/30 to-sky-400/5",
    iconClass: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    title: "True Full-Stack Split",
    body: "A clean REST contract between AI agents and the Java core.",
  },
  {
    icon: Zap,
    ring: "from-amber-400/30 to-amber-400/5",
    iconClass: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    title: "Instant Live Demo",
    body: "A relatable student workflow judges grasp in seconds.",
  },
];

export default function Advantages() {
  return (
    <section
      aria-label="Why StudyBuddy AI stands out"
      className="relative overflow-hidden py-24"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="06"
          kicker="WHY STUDYBUDDY AI STANDS OUT"
          title="High-Impact Intelligence. Rock-Solid Engineering."
          align="center"
          variant="dark"
        />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3"
        >
          {ADVANTAGES.map((adv) => (
            <motion.article
              key={adv.title}
              variants={item}
              whileHover={{ y: -6 }}
              className="card-glow group flex h-full flex-col items-center rounded-2xl border border-[#1D2A4A] bg-[#0F1830] p-8 text-center"
            >
              <span
                className={`rounded-full bg-gradient-to-br p-5 ${adv.ring}`}
                aria-hidden
              >
                <motion.span
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                  className={`flex size-12 items-center justify-center rounded-2xl border ${adv.iconClass}`}
                >
                  <adv.icon className="size-6" />
                </motion.span>
              </span>
              <h3 className="mt-6 font-display text-xl font-semibold text-slate-100">
                {adv.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                {adv.body}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
