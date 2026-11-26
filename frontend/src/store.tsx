import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "./lib/api";
import type { AgentStatus, Doc, Progress, StudyPlan } from "./lib/types";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface StudyContextValue {
  online: boolean;
  booting: boolean;
  status: AgentStatus | null;
  documents: Doc[];
  progress: Progress | null;
  plan: StudyPlan | null;
  topics: string[];
  subjects: string[];
  subject: string;
  setSubject: (subject: string) => void;
  refresh: () => Promise<void>;
  refreshPlan: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  toasts: Toast[];
  notify: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [booting, setBooting] = useState(true);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [subject, setSubject] = useState("DBMS");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const firstLoad = useRef(true);

  const notify = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++toastId.current;
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [statusData, docsData, progressData] = await Promise.all([
        api.status(),
        api.documents(),
        api.progress(),
      ]);
      setStatus(statusData);
      setDocuments(docsData);
      setProgress(progressData);
      setOnline(true);

      const known = Array.from(
        new Set([
          ...docsData.map((doc) => doc.subject),
          ...progressData.weak_topics.map(() => ""),
          "DBMS",
        ].filter(Boolean)),
      );
      if (firstLoad.current) {
        firstLoad.current = false;
        setSubject((current) => (known.includes(current) ? current : known[0] ?? "DBMS"));
      }
    } catch {
      setOnline(false);
    } finally {
      setBooting(false);
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    try {
      const latest = await api.latestPlan(subject);
      setPlan(latest);
    } catch {
      setPlan(null);
    }
  }, [subject]);

  const refreshProgress = useCallback(async () => {
    try {
      setProgress(await api.progress());
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!online) return;
    void refreshPlan();
    void api
      .topics(subject)
      .then((data) => setTopics(data.topics))
      .catch(() => setTopics([]));
  }, [subject, online, refreshPlan]);

  const subjects = useMemo(() => {
    const values = new Set(documents.map((doc) => doc.subject));
    if (plan) values.add(plan.subject);
    values.add("DBMS");
    return Array.from(values).filter(Boolean).sort();
  }, [documents, plan]);

  const value: StudyContextValue = {
    online,
    booting,
    status,
    documents,
    progress,
    plan,
    topics,
    subjects,
    subject,
    setSubject,
    refresh,
    refreshPlan,
    refreshProgress,
    toasts,
    notify,
    dismissToast,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyContextValue {
  const context = useContext(StudyContext);
  if (!context) throw new Error("useStudy must be used inside StudyProvider");
  return context;
}
