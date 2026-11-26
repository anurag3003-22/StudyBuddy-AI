"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Github, GraduationCap, Menu, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Problem", href: "#problem" },
  { label: "Agents", href: "#agents" },
  { label: "Live Demo", href: "#demo" },
  { label: "Pipeline", href: "#architecture" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-[#1D2A4A] bg-[#0A0F1E]/90 shadow-[0_8px_40px_-16px_rgba(2,8,23,0.9)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <a
          href="#top"
          className="group flex min-h-11 items-center gap-2.5"
          aria-label="StudyBuddy AI — back to top"
        >
          <motion.span
            whileHover={{ rotate: -8, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 320, damping: 16 }}
            className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 shadow-[0_6px_20px_-6px_rgba(56,189,248,0.6)]"
          >
            <GraduationCap className="size-5 text-white" aria-hidden />
          </motion.span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            StudyBuddy <span className="text-sky-400">AI</span>
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="relative rounded-md px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-colors duration-300 after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-sky-400 after:transition-transform after:duration-300 hover:text-white hover:after:scale-x-100"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Button
            variant="outline"
            asChild
            className="h-11 border-[#1D2A4A] bg-white/[0.03] px-4 text-slate-300 transition-all duration-300 hover:scale-[1.03] hover:border-sky-400/40 hover:text-white"
          >
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <Github className="size-4" aria-hidden />
              GitHub
            </a>
          </Button>
          <Button
            asChild
            className="h-11 rounded-lg bg-sky-400 px-5 font-semibold text-[#051423] shadow-[0_8px_28px_-8px_rgba(56,189,248,0.7)] transition-all duration-300 hover:scale-[1.04] hover:bg-sky-300"
          >
            <a href="#demo">
              <Zap className="size-4" aria-hidden />
              Try Live Demo
            </a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/5 hover:text-white md:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass overflow-hidden border-b border-[#1D2A4A] md:hidden"
          >
            <ul className="space-y-1 px-4 py-4 sm:px-6">
              {LINKS.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.3, ease: "easeOut" }}
                >
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
              <motion.li
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.26, duration: 0.3, ease: "easeOut" }}
                className="pt-2"
              >
                <Button
                  asChild
                  className="h-12 w-full rounded-lg bg-sky-400 text-base font-semibold text-[#051423] transition-all hover:bg-sky-300"
                >
                  <a href="#demo" onClick={() => setOpen(false)}>
                    <Zap className="size-4" aria-hidden />
                    Try Live Demo
                  </a>
                </Button>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
