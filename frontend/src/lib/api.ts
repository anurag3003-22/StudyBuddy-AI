import type {
  AgentStatus,
  ChatResponse,
  Doc,
  GradeResult,
  Progress,
  Quiz,
  StudyPlan,
} from "./types";

const BASE = (import.meta.env.VITE_AGENT_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError("Cannot reach the StudyBuddy agent. Is the API running on port 8000?", 0);
  }
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      detail = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  status: () => request<AgentStatus>("/api/agent/status"),

  documents: (subject?: string) =>
    request<Doc[]>(`/api/documents${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),

  upload: (file: File, subject: string, title: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);
    form.append("title", title);
    return request<Doc>("/api/documents", { method: "POST", body: form });
  },

  deleteDocument: (id: string) =>
    request<{ deleted: boolean }>(`/api/documents/${id}`, { method: "DELETE" }),

  topics: (subject?: string) =>
    request<{ topics: string[] }>(`/api/topics${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),

  chat: (message: string, subject: string, threadId: string) =>
    request<ChatResponse>(
      "/api/agent/chat",
      json({ message, subject, thread_id: threadId, student_id: "demo-student" }),
    ),

  plan: (payload: {
    subject: string;
    days: number;
    exam_date?: string;
    weak_topics: string[];
    minutes_per_day: number;
  }) =>
    request<StudyPlan>(
      "/api/agent/plan",
      json({ ...payload, student_id: "demo-student" }),
    ),

  latestPlan: (subject?: string) =>
    request<StudyPlan | null>(
      `/api/plans/latest${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
    ),

  toggleTask: (planId: string, taskId: string, done: boolean) =>
    request<StudyPlan>(
      `/api/plans/${planId}/tasks/${taskId}?done=${done}`,
      { method: "PATCH" },
    ),

  quiz: (payload: { subject: string; topic: string; count: number; difficulty: string }) =>
    request<Quiz>("/api/agent/quiz", json({ ...payload, student_id: "demo-student" })),

  grade: (quizId: string, answers: (number | null)[]) =>
    request<GradeResult>(
      "/api/agent/grade",
      json({ quiz_id: quizId, answers, student_id: "demo-student" }),
    ),

  progress: () => request<Progress>("/api/progress"),

  seedDemo: () => request<{ seeded: boolean }>("/api/documents/seed-demo", { method: "POST" }),

  resetDemo: () => request<{ reset: boolean }>("/api/demo/reset", { method: "POST" }),
};

export interface StreamHandlers {
  onNode?: (node: string, trace?: ChatResponse["trace"]) => void;
  onFinal: (response: ChatResponse) => void;
}

/** Streams LangGraph node updates over SSE. */
export async function streamChat(
  message: string,
  subject: string,
  threadId: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/api/agent/chat/stream`, {
      ...json({ message, subject, thread_id: threadId, student_id: "demo-student" }),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    throw new ApiError("Cannot reach the StudyBuddy agent. Is the API running on port 8000?");
  }
  if (!response.ok || !response.body) {
    throw new ApiError(`Agent stream failed (${response.status})`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (event === "node") handlers.onNode?.(parsed.node, parsed.trace);
        else if (event === "final") handlers.onFinal(parsed as ChatResponse);
        else if (event === "error") throw new ApiError(parsed.detail || "Agent error");
      } catch (error) {
        if (error instanceof ApiError) throw error;
      }
    }
  }
}
