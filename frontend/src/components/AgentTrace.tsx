import {
  CalendarRange,
  CheckCircle2,
  ListChecks,
  MessageSquareQuote,
  Search,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { TraceEvent } from "../lib/types";
import { cn } from "../lib/format";

const ICONS: Record<string, typeof Workflow> = {
  supervisor: Workflow,
  retrieve: Search,
  doubt: MessageSquareQuote,
  plan: CalendarRange,
  quiz: ListChecks,
  progress: TrendingUp,
  general: Sparkles,
  finalize: CheckCircle2,
};

const TONES: Record<string, string> = {
  supervisor: "bg-brand-50 text-brand-600 border-brand-200",
  retrieve: "bg-sky-50 text-sky-600 border-sky-200",
  doubt: "bg-violet-50 text-violet-600 border-violet-200",
  plan: "bg-amber-50 text-amber-600 border-amber-200",
  quiz: "bg-emerald-50 text-emerald-600 border-emerald-200",
  progress: "bg-rose-50 text-rose-600 border-rose-200",
  general: "bg-brand-50 text-brand-600 border-brand-200",
};

export function AgentTrace({ trace, live = false }: { trace: TraceEvent[]; live?: boolean }) {
  if (!trace.length) return null;
  return (
    <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="section-title">LangGraph trace</span>
        {live && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> live
          </span>
        )}
      </div>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {trace.map((event, index) => {
          const Icon = ICONS[event.node] ?? Workflow;
          return (
            <li key={`${event.node}-${index}`} className="flex items-center gap-1">
              <span
                className={cn(
                  "animate-pop inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold",
                  TONES[event.node] ?? "border-ink-200 bg-white text-ink-600",
                )}
                title={event.detail}
              >
                <Icon size={12} strokeWidth={2.4} />
                {event.label}
                {event.ms > 0 && <span className="font-mono text-[10px] font-normal opacity-60">{event.ms}ms</span>}
              </span>
              {index < trace.length - 1 && <span className="text-ink-300">→</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
