import ZAI from "z-ai-web-dev-sdk";

// ============================================================
// Shared LLM access for every agent route.
//
// Providers are tried in order:
//   1. Z-AI SDK  — used automatically when .z-ai-config is present.
//   2. Any OpenAI-compatible endpoint — enabled by LLM_API_KEY
//      (or OPENAI_API_KEY), LLM_BASE_URL and LLM_MODEL.
//   3. null      — callers fall back to their deterministic path.
//
// Keeping this in one place means the chat, planner and quiz
// agents all upgrade together when a key is added.
// ============================================================

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasoningEffort?: string;
}

let zaiPromise: Promise<ZAI | null> | null = null;

/** Z-AI is optional: a missing/invalid config simply disables it. */
export function getZAI(): Promise<ZAI | null> {
  zaiPromise ??= ZAI.create().catch(() => null);
  return zaiPromise;
}

function openAiConfig(): OpenAiConfig | null {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (
    process.env.LLM_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const reasoningEffort = process.env.LLM_REASONING_EFFORT?.trim();
  return { apiKey, baseUrl, model, reasoningEffort };
}

/** Optional provider tuning (e.g. Groq gpt-oss reasoning effort). */
function tuningBody(cfg: OpenAiConfig): Record<string, unknown> {
  if (!cfg.reasoningEffort) return {};
  return { reasoning_effort: cfg.reasoningEffort };
}

interface SSEPayload {
  choices?: {
    delta?: { content?: unknown };
    message?: { content?: unknown };
  }[];
}

/** Pull a text delta out of one `data:` line of an OpenAI-style stream. */
function extractDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  let json: SSEPayload;
  try {
    json = JSON.parse(payload) as SSEPayload;
  } catch {
    return "";
  }
  const choice = json.choices?.[0];
  const delta = choice?.delta?.content;
  if (typeof delta === "string" && delta) return delta;
  const message = choice?.message?.content;
  return typeof message === "string" ? message : "";
}

/** Line-buffer an SSE byte stream and yield content deltas. */
async function* parseSSE(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const delta = extractDelta(line);
        if (delta) yield delta;
      }
    }
    buffer += decoder.decode();
    if (buffer) {
      const delta = extractDelta(buffer);
      if (delta) yield delta;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Z-AI returns an async iterable of raw SSE chunks. */
async function* parseZaiStream(
  res: AsyncIterable<string | Uint8Array>
): AsyncGenerator<string> {
  let buffer = "";
  for await (const chunk of res) {
    const raw =
      typeof chunk === "string"
        ? chunk
        : Buffer.from(chunk as Uint8Array).toString("utf-8");
    buffer += raw;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const delta = extractDelta(line);
      if (delta) yield delta;
    }
  }
  if (buffer) {
    const delta = extractDelta(buffer);
    if (delta) yield delta;
  }
}

/** POST to the configured endpoint, retrying once on rate limits / 5xx. */
async function postCompletion(
  cfg: OpenAiConfig,
  payload: Record<string, unknown>,
  label: string
): Promise<Response | null> {
  const url = `${cfg.baseUrl}/chat/completions`;
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(payload),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(url, init);
    if (res.ok) return res;

    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 2500)
          : 900;
      console.error(
        `[llm] ${label} → ${res.status}; retrying in ${waitMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    console.error(`[llm] ${label} → ${res.status}`);
    return null;
  }
  return null;
}

/** Open a streaming completion, or null when no provider is configured. */
export async function openChatStream(
  messages: LlmMessage[],
  maxTokens = 800
): Promise<AsyncGenerator<string> | null> {
  const zai = await getZAI();
  if (zai) {
    try {
      const res = await zai.chat.completions.create({
        messages,
        stream: true,
        thinking: { type: "disabled" },
        max_tokens: maxTokens,
      });
      if (res && typeof (res as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function") {
        return parseZaiStream(res as AsyncIterable<string | Uint8Array>);
      }
    } catch (err) {
      console.error(
        "[llm] Z-AI stream failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const cfg = openAiConfig();
  if (!cfg) return null;
  try {
    const res = await postCompletion(
      cfg,
      {
        model: cfg.model,
        messages,
        stream: true,
        max_tokens: maxTokens,
        ...tuningBody(cfg),
      },
      "OpenAI-compatible stream"
    );
    if (res?.body) return parseSSE(res.body);
  } catch (err) {
    console.error(
      "[llm] OpenAI-compatible stream failed:",
      err instanceof Error ? err.message : err
    );
  }
  return null;
}

/** Non-streaming completion used by the planner and quiz agents. */
export async function completeChat(
  messages: LlmMessage[],
  maxTokens = 1500
): Promise<string | null> {
  const zai = await getZAI();
  if (zai) {
    try {
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: "disabled" },
        max_tokens: maxTokens,
      });
      const text = completion?.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return text;
    } catch (err) {
      console.error(
        "[llm] Z-AI completion failed:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const cfg = openAiConfig();
  if (!cfg) return null;
  try {
    const res = await postCompletion(
      cfg,
      {
        model: cfg.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
        ...tuningBody(cfg),
      },
      "OpenAI-compatible completion"
    );
    if (!res) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const text = json.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text : null;
  } catch (err) {
    console.error(
      "[llm] OpenAI-compatible completion failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
