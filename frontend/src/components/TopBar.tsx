import { CalendarClock, RefreshCw, WifiOff } from "lucide-react";
import { useStudy } from "../store";
import { daysUntil, formatDate } from "../lib/format";
import type { Page } from "../lib/types";

const TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your exam-ready command center" },
  plan: { title: "Study plan", subtitle: "Adaptive, day-by-day, weakest topics first" },
  doubt: { title: "Doubt solver", subtitle: "Answers grounded in your notes — with page citations" },
  quiz: { title: "Quiz", subtitle: "Practice generated from your own material" },
  library: { title: "Library", subtitle: "Index your PDFs and class notes" },
};

export function TopBar({ page, onRefresh }: { page: Page; onRefresh?: () => void }) {
  const { subject, subjects, setSubject, plan, online, booting } = useStudy();
  const meta = TITLES[page];
  const countdown = plan ? daysUntil(plan.exam_date) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-ink-50/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-extrabold tracking-tight text-ink-900">{meta.title}</h1>
          <p className="hidden text-[12px] text-ink-500 sm:block">{meta.subtitle}</p>
        </div>

        {countdown !== null && countdown >= 0 && (
          <span className="hidden items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11.5px] font-bold text-amber-700 md:inline-flex">
            <CalendarClock size={13} />
            {countdown === 0 ? "Exam today" : `${countdown} day${countdown === 1 ? "" : "s"} to exam`}
            <span className="font-medium text-amber-500">· {formatDate(plan!.exam_date)}</span>
          </span>
        )}

        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="h-9 rounded-xl border border-ink-200 bg-white px-2.5 text-[12.5px] font-semibold text-ink-700 outline-none focus:border-brand-400"
          aria-label="Subject"
        >
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          onClick={onRefresh}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:text-brand-600"
          title="Refresh"
        >
          <RefreshCw size={15} className={booting ? "animate-spin" : ""} />
        </button>
      </div>

      {!online && (
        <div className="flex items-center gap-2 border-t border-rose-200 bg-rose-50 px-4 py-2 text-[11.5px] font-medium text-rose-700 sm:px-6 lg:px-8">
          <WifiOff size={13} />
          Agent API unreachable — start it with <code className="rounded bg-rose-100 px-1 py-0.5 font-mono">uv run studybuddy serve</code>.
        </div>
      )}
    </header>
  );
}
