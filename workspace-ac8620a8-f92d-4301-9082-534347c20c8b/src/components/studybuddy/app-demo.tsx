"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  FolderOpen,
  LayoutDashboard,
  MessageSquareQuote,
  Target,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Dashboard from "./dashboard";
import DoubtSolver from "./doubt-solver";
import Planner from "./planner";
import QuizArena from "./quiz-arena";
import NotesLibrary from "./notes-library";

const DEMO_TABS = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "doubt", label: "Doubt Solver", icon: MessageSquareQuote },
  { value: "planner", label: "Planner", icon: CalendarRange },
  { value: "quiz", label: "Quiz Arena", icon: Target },
  { value: "notes", label: "Notes", icon: FolderOpen },
] as const;

type TabValue = (typeof DEMO_TABS)[number]["value"];

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function AppDemo() {
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");
  const [examDate, setExamDate] = useState(defaultExamDate);

  // Shared exam date: the Planner input drives the Dashboard countdown.
  const updateExamDate = (value: string) => {
    setExamDate(value);
  };

  return (
    <section id="demo" className="relative py-24 bg-[#0A0F1E] overflow-hidden">
      {/* Blueprint grid + faint sky orb */}
      <div className="absolute inset-0 bg-grid" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 right-[-12%] h-[28rem] w-[28rem] rounded-full bg-sky-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[-10rem] left-[-10%] h-96 w-96 rounded-full bg-amber-400/[0.04] blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="03"
          kicker="LIVE DEMO — FULLY INTERACTIVE"
          title={
            <>
              Your Study <span className="text-gradient-sky">Command Center</span>
            </>
          }
          description="Not a mockup — this is the real product running live: cited doubt solving, adaptive planning, quiz grading, and streak sync."
        />

        {/* App shell with window chrome */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass rounded-3xl p-2 md:p-3"
        >
          {/* Window chrome header */}
          <div className="flex items-center gap-3 rounded-t-[20px] border-b border-[#1D2A4A]/70 bg-[#0A0F1E]/60 px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="hidden font-mono text-xs text-slate-500 sm:inline">
              studybuddy://command-center
            </span>
            <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-emerald-300">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
          </div>

          {/* Tab bar */}
          <div className="px-1 pt-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabValue)}
            >
              <TabsList className="grid h-auto w-full grid-cols-5 gap-1 rounded-xl border border-[#1D2A4A] bg-[#0F1830]/80 p-1.5 md:inline-flex md:w-auto">
                {DEMO_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        "relative h-auto flex-col gap-1 rounded-lg px-1.5 py-2 md:flex-row md:gap-2 md:px-4 md:py-2.5",
                        "font-mono uppercase leading-none tracking-wide",
                        "text-[10px] text-slate-400 md:text-xs",
                        "transition-colors duration-300",
                        "data-[state=active]:bg-sky-400/10 data-[state=active]:text-sky-300",
                        "data-[state=active]:border data-[state=active]:border-sky-400/30"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden min-[420px]:inline">
                        {tab.label}
                      </span>
                      {isActive && (
                        <motion.span
                          layoutId="demo-tab-underline"
                          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-sky-400"
                          transition={{ duration: 0.35, ease: "easeOut" }}
                        />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Tab content — animated swap */}
          <div className="mt-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                role="tabpanel"
                aria-label={`${DEMO_TABS.find((t) => t.value === activeTab)?.label ?? activeTab} panel`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="min-h-[560px]"
              >
                {activeTab === "dashboard" && <Dashboard examDate={examDate} />}
                {activeTab === "doubt" && <DoubtSolver />}
                {activeTab === "planner" && (
                  <Planner
                    examDate={examDate}
                    onExamDateChange={updateExamDate}
                  />
                )}
                {activeTab === "quiz" && (
                  <QuizArena onOpenDashboard={() => setActiveTab("dashboard")} />
                )}
                {activeTab === "notes" && <NotesLibrary />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
