import {
  Bot,
  CalendarRange,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Zap,
} from "lucide-react";
import { useStudy } from "../store";
import { cn } from "../lib/format";
import type { Page } from "../lib/types";

const NAV: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "plan", label: "Study plan", icon: CalendarRange },
  { id: "doubt", label: "Doubt solver", icon: MessageSquareQuote },
  { id: "quiz", label: "Quiz", icon: ListChecks },
  { id: "library", label: "Library", icon: Library },
];

export function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  const { progress, status, online } = useStudy();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-ink-950 lg:flex">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.35]" />
        <div className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full bg-brand-600/20 blur-3xl" />

        <div className="relative flex items-center gap-3 px-5 pb-5 pt-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 shadow-lg shadow-brand-900/40">
            <GraduationCap size={21} className="text-white" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight text-white">StudyBuddy</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300/80">Grounded AI</p>
          </div>
        </div>

        <nav className="relative mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition",
                  active
                    ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "text-ink-400 hover:bg-white/[0.05] hover:text-ink-100",
                )}
              >
                {active && (
                  <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-violet-500" />
                )}
                <item.icon size={17} strokeWidth={2.1} className={active ? "text-brand-300" : "text-ink-500 group-hover:text-ink-300"} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="relative space-y-2.5 p-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                <Flame size={13} className="text-amber-400" /> Streak
              </span>
              <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                +{progress?.xp ?? 0} XP
              </span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-white">
              {progress?.streak ?? 0}
              <span className="ml-1.5 text-xs font-medium text-ink-400">{progress?.streak === 1 ? "day" : "days"}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                style={{ width: `${Math.min(100, ((progress?.streak ?? 0) / 7) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-ink-500">{7 - Math.min(7, progress?.streak ?? 0)} days to a 7-day streak</p>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <Bot size={15} />
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-ink-950",
                  online ? "bg-emerald-400" : "bg-rose-500",
                )}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-ink-200">
                {online ? status?.model ?? "LangGraph agent" : "Agent offline"}
              </p>
              <p className="text-[10px] text-ink-500">
                {online ? `${status?.chunks ?? 0} chunks indexed` : "start the API"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] font-medium text-ink-600">
            <Zap size={10} /> LangGraph · RAG · 4 agents
            <Sparkles size={10} />
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-ink-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur lg:hidden">
        {NAV.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold",
                active ? "text-brand-600" : "text-ink-400",
              )}
            >
              <item.icon size={19} strokeWidth={active ? 2.4 : 2} />
              {item.label.split(" ")[0]}
            </button>
          );
        })}
      </nav>
    </>
  );
}
