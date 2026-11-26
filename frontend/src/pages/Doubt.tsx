import { ArrowUp, BookOpenCheck, Bot, Loader2, MessageSquareQuote, RotateCcw, ShieldCheck, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { streamChat } from "../lib/api";
import { cn } from "../lib/format";
import { useStudy } from "../store";
import type { Citation, TraceEvent } from "../lib/types";
import { Markdown } from "../components/Markdown";
import { AgentTrace } from "../components/AgentTrace";
import { CitationCard } from "../components/CitationCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  trace?: TraceEvent[];
  grounded?: boolean;
  actions?: string[];
}

const EXAMPLES = [
  "Explain BCNF and why it is stronger than 3NF.",
  "What is the difference between 2NF and 3NF?",
  "Quiz me on normalization — 5 questions.",
  "My DBMS exam is in 7 days and I'm weak in normalization. Make me a plan.",
];

export function Doubt() {
  const { subject, documents, status, notify } = useStudy();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveTrace, setLiveTrace] = useState<TraceEvent[]>([]);
  const thread = useRef(`web-${Math.random().toString(36).slice(2, 10)}`);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming, liveTrace]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || streaming) return;
    setInput("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: value },
    ]);
    setStreaming(true);
    setLiveTrace([]);
    abort.current = new AbortController();

    try {
      await streamChat(
        value,
        subject,
        thread.current,
        {
          onNode: (_node, trace) => {
            if (trace?.length) setLiveTrace((current) => [...current, ...trace]);
          },
          onFinal: (response) => {
            setMessages((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: response.answer,
                citations: response.citations,
                trace: response.trace,
                grounded: response.grounded,
                actions: response.suggested_actions,
              },
            ]);
          },
        },
        abort.current.signal,
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") notify((error as Error).message, "error");
    } finally {
      setStreaming(false);
      setLiveTrace([]);
    }
  }

  function reset() {
    abort.current?.abort();
    thread.current = `web-${Math.random().toString(36).slice(2, 10)}`;
    setMessages([]);
    setLiveTrace([]);
    setStreaming(false);
  }

  const empty = messages.length === 0 && !streaming;

  return (
    <div className="mx-auto flex h-[calc(100dvh-190px)] min-h-[520px] max-w-4xl flex-col lg:h-[calc(100dvh-140px)]">
      {/* Conversation */}
      <div className="flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
        {empty && (
          <div className="animate-in">
            <div className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-100/60 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <ShieldCheck size={11} /> Zero hallucination mode
                </span>
                <h2 className="mt-4 text-[24px] font-extrabold tracking-tight text-ink-900">Ask anything from your syllabus.</h2>
                <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-500">
                  The doubt agent retrieves passages from your uploaded notes, answers only from them, and attaches the
                  exact document and page. If it isn't in your notes, it says so.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-500">
                  <span className="chip">
                    <BookOpenCheck size={12} className="text-brand-500" /> {documents.length} documents
                  </span>
                  <span className="chip">
                    <Sparkles size={12} className="text-violet-500" /> {status?.chunks ?? 0} indexed passages
                  </span>
                  <span className="chip">
                    <Bot size={12} className="text-emerald-500" /> {status?.model ?? "LangGraph agent"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  onClick={() => void send(example)}
                  className="group flex items-start gap-2.5 rounded-xl border border-ink-200/80 bg-white p-3.5 text-left transition hover:border-brand-300 hover:shadow-card"
                >
                  <MessageSquareQuote size={15} className="mt-0.5 shrink-0 text-brand-400" />
                  <span className="text-[12.5px] font-medium leading-relaxed text-ink-600 group-hover:text-ink-800">{example}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="animate-in flex justify-end">
              <div className="flex max-w-[85%] items-start gap-2.5">
                <div className="rounded-2xl rounded-tr-md bg-ink-950 px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-card">
                  {message.content}
                </div>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                  <User size={13} />
                </span>
              </div>
            </div>
          ) : (
            <div key={message.id} className="animate-in flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-md shadow-brand-500/20">
                <Bot size={16} />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="card p-4 sm:p-5">
                  {!message.grounded && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-medium text-amber-700">
                      Not found in your notes — the agent refused to guess.
                    </div>
                  )}
                  <Markdown text={message.content} />

                  {!!message.citations?.length && (
                    <div className="mt-4 border-t border-ink-100 pt-3">
                      <p className="section-title mb-2">Sources · {message.citations.length}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {message.citations.slice(0, 4).map((citation, index) => (
                          <CitationCard key={`${citation.doc_id}-${citation.page}-${index}`} citation={citation} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {message.trace && message.trace.length > 0 && <AgentTrace trace={message.trace} />}

                {!!message.actions?.length && (
                  <div className="flex flex-wrap gap-1.5">
                    {message.actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => void send(action)}
                        className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-50"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {streaming && (
          <div className="animate-in flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <Bot size={16} />
            </span>
            <div className="card min-w-0 flex-1 p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-500">
                <Loader2 size={13} className="animate-spin text-brand-500" />
                Agents working
              </div>
              <div className="mt-2">
                <AgentTrace trace={liveTrace} live />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="shimmer h-2.5 w-3/4 rounded" />
                <div className="shimmer h-2.5 w-1/2 rounded" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      {/* Composer */}
      <div className="border-t border-ink-200/70 bg-ink-50/60 pt-3 backdrop-blur">
        <div className="card flex items-end gap-2 p-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder={`Ask about ${subject} — answers cite the page…`}
            className="max-h-32 min-h-[38px] flex-1 resize-none bg-transparent px-2 py-2 text-[13.5px] text-ink-800 outline-none placeholder:text-ink-400"
          />
          {messages.length > 0 && (
            <button onClick={reset} className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-50 hover:text-ink-600" title="New conversation">
              <RotateCcw size={15} />
            </button>
          )}
          <button
            onClick={() => void send(input)}
            disabled={!input.trim() || streaming}
            className={cn(
              "mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl transition",
              input.trim() && !streaming
                ? "bg-brand-600 text-white shadow-md shadow-brand-500/30 hover:bg-brand-700"
                : "bg-ink-100 text-ink-400",
            )}
          >
            {streaming ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-ink-400">
          Grounded in your uploads · Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
