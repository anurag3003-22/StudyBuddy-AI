import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useStudy } from "../store";
import { cn } from "../lib/format";

export function Toasts() {
  const { toasts, dismissToast } = useStudy();
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2 lg:bottom-6">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? XCircle : Info;
        return (
          <div
            key={toast.id}
            className={cn(
              "animate-in pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white p-3 shadow-lift",
              toast.kind === "success" && "border-emerald-200",
              toast.kind === "error" && "border-rose-200",
              toast.kind === "info" && "border-ink-200",
            )}
          >
            <Icon
              size={17}
              className={cn(
                "mt-0.5 shrink-0",
                toast.kind === "success" && "text-emerald-500",
                toast.kind === "error" && "text-rose-500",
                toast.kind === "info" && "text-brand-500",
              )}
            />
            <p className="flex-1 text-[12.5px] font-medium leading-snug text-ink-700">{toast.message}</p>
            <button onClick={() => dismissToast(toast.id)} className="text-ink-300 transition hover:text-ink-500">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
