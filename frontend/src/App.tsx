import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { StudyProvider, useStudy } from "./store";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Toasts } from "./components/Toasts";
import { Dashboard } from "./pages/Dashboard";
import { Planner } from "./pages/Planner";
import { Doubt } from "./pages/Doubt";
import { QuizPage } from "./pages/Quiz";
import { LibraryPage } from "./pages/Library";
import type { Page } from "./lib/types";

function Shell() {
  const [page, setPage] = useState<Page>("dashboard");
  const { booting, refresh } = useStudy();

  if (booting) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-950 text-white">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-20" />
        <span className="relative flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-violet-500 shadow-2xl shadow-brand-900/50">
          <GraduationCap size={28} />
        </span>
        <div className="relative text-center">
          <p className="text-[15px] font-extrabold tracking-tight">StudyBuddy AI</p>
          <p className="mt-1 text-[11px] font-medium text-ink-400">Connecting to the LangGraph agents…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink-50">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="lg:pl-64">
        <TopBar page={page} onRefresh={() => void refresh()} />
        <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-8">
          <div key={page} className="animate-in">
            {page === "dashboard" && <Dashboard onNavigate={setPage} />}
            {page === "plan" && <Planner />}
            {page === "doubt" && <Doubt />}
            {page === "quiz" && <QuizPage />}
            {page === "library" && <LibraryPage />}
          </div>
        </main>
      </div>
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <StudyProvider>
      <Shell />
    </StudyProvider>
  );
}
