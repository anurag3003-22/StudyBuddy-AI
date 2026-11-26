"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  BookOpen,
  FileText,
  Loader2,
  RotateCcw,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { NoteItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* types & constants                                                   */
/* ------------------------------------------------------------------ */

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Explain BCNF vs 3NF with an example from my notes",
  "Which normal form kills transitive dependencies?",
  "Summarize ACID properties for my exam",
];

const FALLBACK_SOURCES = [
  { title: "DBMS Unit 3 — Normalization & FDs", pages: 12 },
  { title: "DBMS Unit 4 — Transactions & ACID", pages: 9 },
  { title: "DBMS Unit 2 — SQL & Relational Algebra", pages: 15 },
];

/* ------------------------------------------------------------------ */
/* citation / markdown-lite rendering                                  */
/* ------------------------------------------------------------------ */

const CITATION_PATTERN = /[\[【]Source:\s*(.+?),\s*(?:Page\s*)?(\d+)[\]】]/g;

/** Hides a trailing, still-incomplete `[Source: ...` chunk while streaming. */
function stripTrailingPartialCitation(text: string): string {
  return text.replace(/[\[【]Source:\s*[^\]】]*$/, "");
}

function CitationChip({ title, page }: { title: string; page: number }) {
  return (
    <span className="mx-1 inline-flex max-w-[240px] items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 align-middle font-mono text-[11px] text-amber-300">
      <FileText className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{title}</span>
      <span className="shrink-0">· p.{page}</span>
    </span>
  );
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  parts.forEach((part, i) => {
    if (!part) return;
    if (i % 2 === 1) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-sky-200">
          {part}
        </strong>
      );
    } else {
      nodes.push(<span key={`${keyPrefix}-t${i}`}>{part}</span>);
    }
  });
  return nodes;
}

function renderMultiline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  text.split("\n").forEach((line, li) => {
    if (li > 0) nodes.push(<br key={`${keyPrefix}-br${li}`} />);
    if (!line) return;
    const bullet = line.match(/^\s*([•*\-]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const marker = bullet[1] === "*" || bullet[1] === "-" ? "•" : bullet[1];
      nodes.push(
        <span
          key={`${keyPrefix}-m${li}`}
          className="mr-1.5 inline-block text-sky-400"
        >
          {marker}
        </span>
      );
      nodes.push(...renderInline(bullet[2], `${keyPrefix}-l${li}`));
    } else {
      nodes.push(...renderInline(line, `${keyPrefix}-l${li}`));
    }
  });
  return nodes;
}

/** Full body renderer: complete citations become amber chips. */
function renderBody(raw: string): React.ReactNode[] {
  const cleaned = stripTrailingPartialCitation(raw);
  const nodes: React.ReactNode[] = [];
  CITATION_PATTERN.lastIndex = 0;
  let last = 0;
  let k = 0;
  let match: RegExpExecArray | null;
  while ((match = CITATION_PATTERN.exec(cleaned)) !== null) {
    if (match.index > last) {
      nodes.push(...renderMultiline(cleaned.slice(last, match.index), `pre${k}`));
    }
    nodes.push(
      <CitationChip key={`cite${k}`} title={match[1]} page={Number(match[2])} />
    );
    last = match.index + match[0].length;
    k += 1;
  }
  if (last < cleaned.length) {
    nodes.push(...renderMultiline(cleaned.slice(last), `post${k}`));
  }
  return nodes;
}

/* ------------------------------------------------------------------ */
/* tiny streaming ellipsis                                             */
/* ------------------------------------------------------------------ */

function StreamingEllipsis() {
  return (
    <span className="inline-flex" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1.1s" }}
        >
          .
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* bubbles                                                             */
/* ------------------------------------------------------------------ */

function UserBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-sky-400/30 bg-sky-400/15 px-4 py-2.5 text-sm leading-relaxed text-sky-50"
    >
      {renderMultiline(content, "u")}
    </motion.div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mr-auto max-w-[90%] rounded-2xl rounded-bl-md border border-[#1D2A4A] bg-[#0F1830] px-4 py-3 text-sm leading-relaxed text-slate-300"
    >
      {renderBody(content)}
    </motion.div>
  );
}

function ErrorBubble({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      role="alert"
      className="mr-auto flex max-w-[90%] items-start gap-2 rounded-2xl rounded-bl-md border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm leading-relaxed text-rose-200"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
      <span>{message.replace(/^⚠️\s*/, "")}</span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* grounded sources side panel                                         */
/* ------------------------------------------------------------------ */

function GroundedSources() {
  const [sources, setSources] = useState(FALLBACK_SOURCES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notes");
        if (!res.ok) throw new Error(`GET /api/notes → ${res.status}`);
        const json = (await res.json()) as { notes: NoteItem[] };
        if (!cancelled && Array.isArray(json.notes) && json.notes.length > 0) {
          setSources(json.notes.map((n) => ({ title: n.title, pages: n.pages })));
        }
      } catch (err) {
        // decorative panel — silent fallback to the demo corpus
        console.error("[doubt-solver] notes fetch failed, using demo sources", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="flex h-full flex-col border-[#1D2A4A] bg-[#0F1830]">
      <div className="border-b border-[#1D2A4A] p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Grounded Sources
          </h3>
          <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] text-sky-300 tabular-nums">
            {sources.length} docs
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          the RAG knowledge base
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {sources.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
            className="flex items-start gap-3 rounded-xl border border-[#1D2A4A] bg-[#0A0F1E]/60 p-3"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200" title={s.title}>
                {s.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                {s.pages} pages
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  indexed
                </span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="border-t border-[#1D2A4A] p-4 text-xs leading-relaxed text-slate-500">
        Answers cite these documents — every claim traceable to a page.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export default function DoubtSolver() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // keep the latest message in view while streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamText, error]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    setError(null);
    const history: ChatTurn[] = [...messages, { role: "user", content: question }];
    setMessages(history);
    setInput("");
    setStreaming(true);
    setStreamText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) }),
      });
      if (!res.ok || !res.body) throw new Error(`POST /api/chat → ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamText(acc);
      }
      acc += decoder.decode();

      if (acc.startsWith("⚠️")) {
        setError(acc);
        toast({
          variant: "destructive",
          title: "Doubt Agent hit an error",
          description: acc.replace(/^⚠️\s*/, "").slice(0, 140),
        });
      } else if (!acc.trim()) {
        throw new Error("Empty stream from Doubt Agent");
      } else {
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch (err) {
      console.error("[doubt-solver] chat failed", err);
      setError("Network error — could not reach the Doubt Agent. Try again.");
      toast({
        variant: "destructive",
        title: "Doubt Agent unavailable",
        description: "The stream could not be opened. Please try again.",
      });
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  }

  function resetConversation() {
    if (streaming) return;
    setMessages([]);
    setError(null);
    setInput("");
  }

  const empty = messages.length === 0 && !streaming && !error;

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* chat panel */}
      <Card className="flex h-[560px] flex-col overflow-hidden border-[#1D2A4A] bg-[#0F1830] lg:col-span-3">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-[#1D2A4A] p-4">
          <span className="glow-sky flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 text-[#051423]">
            <Bot className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Doubt-Solving Agent
            </h3>
            <p className="truncate font-mono text-[11px] text-slate-500">
              grounded in your notes · zero hallucination mode
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-emerald-300 sm:inline-flex">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              RAG
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetConversation}
              disabled={streaming}
              aria-label="Clear conversation"
              className="h-9 w-9 text-slate-500 hover:text-sky-300"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* messages */}
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <AnimatePresence>
              {empty && (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col items-center px-4 py-8 text-center"
                >
                  <div className="animate-float mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/30 to-amber-400/30 p-[3px]">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0A0F1E]">
                      <BookOpen className="h-8 w-8 text-sky-300" aria-hidden />
                      <Sparkles className="-ml-2 -mt-6 h-4 w-4 text-amber-300" aria-hidden />
                    </div>
                  </div>
                  <h4 className="font-display text-lg font-semibold text-slate-100">
                    Ask anything from your syllabus
                  </h4>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Every answer is retrieved from your indexed notes and cited
                    to an exact page.
                  </p>
                  <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
                    {SUGGESTED_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => send(p)}
                        className="rounded-full border border-sky-400/30 px-3 py-1.5 font-mono text-xs text-slate-400 transition-colors duration-300 hover:bg-sky-400/10 hover:text-sky-200"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((m, i) =>
                m.role === "user" ? (
                  <UserBubble key={`u${i}`} content={m.content} />
                ) : (
                  <AssistantBubble key={`a${i}`} content={m.content} />
                )
              )}

              {error && <ErrorBubble key="err" message={error} />}
            </AnimatePresence>

            {/* live streaming bubble with caret + agent status line */}
            {streaming && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="mr-auto max-w-[90%]"
              >
                <div className="rounded-2xl rounded-bl-md border border-[#1D2A4A] bg-[#0F1830] px-4 py-3 text-sm leading-relaxed text-slate-300">
                  {streamText ? (
                    renderBody(streamText)
                  ) : (
                    <span className="text-slate-600">…</span>
                  )}
                  <span
                    className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-caret bg-sky-400"
                    aria-hidden
                  />
                </div>
                <p className="mt-2 pl-1 font-mono text-xs text-sky-400/70">
                  doubt-agent ·{" "}
                  {streamText
                    ? "streaming grounded answer"
                    : "retrieving from notes"}
                  <StreamingEllipsis />
                </p>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* input */}
        <div className="border-t border-[#1D2A4A] p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              disabled={streaming}
              aria-label="Ask a doubt"
              placeholder="Ask a doubt from your uploaded notes…"
              className="min-h-[46px] max-h-[120px] resize-none border-[#1D2A4A] bg-[#0A0F1E] text-sm text-slate-200 placeholder:text-slate-600 focus-visible:ring-sky-400/40"
            />
            <Button
              type="button"
              onClick={() => void send(input)}
              disabled={streaming || !input.trim()}
              aria-label="Send message"
              className="h-10 w-10 shrink-0 rounded-xl bg-sky-400 text-[#051423] hover:bg-sky-300"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <SendHorizontal className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>
          <p className="mt-2 font-mono text-[10px] text-slate-600">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </Card>

      {/* sources panel */}
      <div className="min-h-[300px] lg:h-[560px]">
        <GroundedSources />
      </div>
    </div>
  );
}
