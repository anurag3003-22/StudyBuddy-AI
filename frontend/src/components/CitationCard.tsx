import { FileText, Quote } from "lucide-react";
import type { Citation } from "../lib/types";

export function CitationCard({ citation, compact = false }: { citation: Citation; compact?: boolean }) {
  return (
    <div className="group rounded-xl border border-ink-200/80 bg-white p-3 transition hover:border-brand-200 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileText size={14} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink-800">{citation.doc_title}</p>
            <p className="text-[11px] text-ink-400">
              Page {citation.page}
              {citation.heading ? ` · ${citation.heading}` : ""}
            </p>
          </div>
        </div>
        {citation.score > 0 && (
          <span className="shrink-0 rounded-md bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-500">
            {(citation.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {!compact && (
        <p className="mt-2 line-clamp-3 border-l-2 border-brand-100 pl-2.5 text-[12px] leading-relaxed text-ink-500">
          <Quote size={11} className="mr-1 inline text-brand-300" />
          {citation.snippet}
        </p>
      )}
    </div>
  );
}
