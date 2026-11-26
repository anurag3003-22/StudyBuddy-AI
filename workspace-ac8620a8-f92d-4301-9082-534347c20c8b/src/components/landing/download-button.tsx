"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";

export default function DownloadSourceButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 sm:bottom-6 sm:right-6"
    >
      {/* Breathing halo */}
      <motion.span
        aria-hidden
        className="absolute inset-0 -z-10 rounded-full bg-sky-400/30 blur-md"
        animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.12, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.a
        href="/studybuddy-project.zip"
        download="studybuddy-project.zip"
        aria-label="Download the complete StudyBuddy source code as a zip file"
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        className="group relative flex min-h-11 items-center gap-3 rounded-full border border-sky-400/30 bg-[#0B1226]/95 py-2 pl-2.5 pr-4 shadow-[0_12px_36px_-10px_rgba(56,189,248,0.55)] backdrop-blur-xl transition-colors duration-300 hover:border-sky-400/60 sm:pr-5"
      >
        {/* Icon with gentle bobbing */}
        <motion.span
          aria-hidden
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-amber-400 shadow-[0_6px_18px_-6px_rgba(56,189,248,0.8)]"
        >
          <Download className="size-4 text-white transition-transform duration-300 group-hover:translate-y-0.5" />
        </motion.span>

        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-white">Download Source</span>
          <span className="text-[11px] font-medium text-sky-300/80">
            Full project · ZIP
          </span>
        </span>

        {/* Shine sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/10 opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100" />
        </span>
      </motion.a>
    </motion.div>
  );
}
