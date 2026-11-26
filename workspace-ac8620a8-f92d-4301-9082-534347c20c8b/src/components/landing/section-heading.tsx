"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  number: string; // e.g. "01"
  kicker: string; // e.g. "THE CHALLENGE & OPPORTUNITY"
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  variant?: "dark" | "light";
  className?: string;
}

/**
 * Numbered kicker pattern lifted straight from the StudyBuddy AI pitch deck:
 * "01 // THE CHALLENGE & OPPORTUNITY" + extra-bold display headline.
 */
export function SectionHeading({
  number,
  kicker,
  title,
  description,
  align = "left",
  variant = "dark",
  className,
}: SectionHeadingProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "text-center flex flex-col items-center",
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className={cn(
          "flex items-center gap-3 mb-5",
          align === "center" && "justify-center"
        )}
      >
        <span
          className={cn(
            "font-mono text-xs md:text-sm font-bold tracking-[0.18em] uppercase",
            isDark ? "text-sky-400" : "text-sky-600"
          )}
        >
          {number} <span className="opacity-50">{"//"}</span> {kicker}
        </span>
        <span
          className={cn(
            "h-px w-14",
            isDark ? "bg-amber-400/80" : "bg-amber-500/80"
          )}
          aria-hidden
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.65, delay: 0.08, ease: "easeOut" }}
        className={cn(
          "font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.08] tracking-tight max-w-3xl",
          isDark ? "text-slate-50" : "text-slate-900"
        )}
      >
        {title}
      </motion.h2>

      {description ? (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.16, ease: "easeOut" }}
          className={cn(
            "mt-5 text-base md:text-lg leading-relaxed max-w-2xl",
            isDark ? "text-slate-400" : "text-slate-600",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </motion.p>
      ) : null}
    </div>
  );
}
