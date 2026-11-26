import { aiConfig as config } from "../aiConfig";
import { HttpError } from "../errors";
import { claudeCompletion, claudeCompletionStream, isProviderOutage } from "./anthropic";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  json?: boolean;
  /** Claude only: how much reasoning to spend. */
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * One AI answer. Claude is used when ANTHROPIC_API_KEY is set; if it is unavailable and an
 * OpenAI-compatible key is also set, that provider answers instead.
 */
export async function chatCompletion(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  if (config.claudeEnabled) {
    try {
      return await claudeCompletion(messages, opts);
    } catch (err) {
      if (!config.openAiEnabled || !isProviderOutage(err)) throw err;
      console.warn("Claude unavailable, using the OpenAI-compatible backup provider.");
    }
  }
  return openAiCompletion(messages, opts);
}

/** Streamed answer: Claude first, OpenAI-compatible backup only if nothing was streamed yet. */
export async function chatCompletionStream(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  opts: CompletionOptions & { signal?: AbortSignal } = {},
): Promise<string> {
  if (config.claudeEnabled) {
    let streamed = false;
    try {
      return await claudeCompletionStream(
        messages,
        (t) => {
          streamed = true;
          onDelta(t);
        },
        opts,
      );
    } catch (err) {
      if (streamed || !config.openAiEnabled || !isProviderOutage(err)) throw err;
      console.warn("Claude unavailable, using the OpenAI-compatible backup provider.");
    }
  }
  return openAiCompletionStream(messages, onDelta, opts);
}

// Statuses worth retrying: rate limits, overloaded ("high demand") and temporary server errors.
const RETRYABLE = new Set([429, 500, 502, 503, 504, 529]);
const ATTEMPTS_PER_MODEL = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt: number, retryAfter: string | null): number {
  const header = Number(retryAfter);
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 8000);
  return Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 400);
}

/**
 * POST to /chat/completions with automatic retries (exponential backoff) on busy or
 * rate-limited responses. If AI_FALLBACK_MODEL is set, it is tried after the main model
 * keeps failing that way. Returns the first non-retryable response (ok or not).
 */
async function postCompletion(
  build: (model: string) => Record<string, unknown>,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Response> {
  const models = [...new Set([config.AI_MODEL, config.AI_FALLBACK_MODEL].filter(Boolean))];
  let last: { status: number; text: string } | null = null;
  let lastError: HttpError | null = null;
  for (const [m, model] of models.entries()) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      opts.signal?.addEventListener("abort", onAbort);
      const timer = opts.timeoutMs ? setTimeout(() => controller.abort(), opts.timeoutMs) : null;
      let res: Response | null = null;
      try {
        res = await fetch(completionsUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.AI_API_KEY}` },
          body: JSON.stringify(build(model)),
          signal: controller.signal,
        });
      } catch (err) {
        if (opts.signal?.aborted) throw err;
        lastError =
          (err as Error).name === "AbortError"
            ? new HttpError(504, "The AI provider took too long to respond. Please try again.", "ai_timeout")
            : new HttpError(502, "Couldn't reach the AI provider.", "ai_unreachable");
      } finally {
        if (timer) clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
      }
      if (res && !RETRYABLE.has(res.status)) return res;
      if (res) {
        last = { status: res.status, text: await res.text().catch(() => "") };
        lastError = null;
      }
      const isFinal = m === models.length - 1 && attempt === ATTEMPTS_PER_MODEL - 1;
      if (isFinal) break;
      if (attempt === ATTEMPTS_PER_MODEL - 1) {
        console.warn(`AI model ${model} is busy; switching to fallback model ${models[m + 1]}.`);
        break;
      }
      console.warn(`AI model ${model} busy (${res?.status ?? lastError?.code}); retrying (attempt ${attempt + 2}).`);
      await sleep(backoffMs(attempt, res?.headers.get("retry-after") ?? null));
    }
  }
  if (lastError) throw lastError;
  return new Response(last?.text ?? "", { status: last?.status ?? 502 });
}

/** Base URL + /chat/completions, whether or not AI_BASE_URL ends with a slash. */
function completionsUrl(): string {
  const base = config.AI_BASE_URL.replace(/\/+$/, "");
  return /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
}

/** Turn a failed provider response into an error that names the provider's status and message. */
async function providerError(res: Response): Promise<HttpError> {
  const raw = await res.text().catch(() => "");
  console.error(`AI provider error ${res.status}: ${raw.slice(0, 500)}`);
  let detail = "";
  try {
    // OpenAI shape {error:{message}}; Gemini sometimes wraps it in an array.
    const parsed = JSON.parse(raw) as unknown;
    const obj = (Array.isArray(parsed) ? parsed[0] : parsed) as { error?: { message?: string } | string; message?: string };
    detail = typeof obj?.error === "string" ? obj.error : (obj?.error?.message ?? obj?.message ?? "");
  } catch {
    detail = raw;
  }
  // Never echo anything that looks like a key back to the browser.
  detail = detail
    .replace(/\s+/g, " ")
    .replace(/[A-Za-z0-9_\-.]{30,}/g, "…")
    .trim()
    .slice(0, 240);
  const suffix = ` (${res.status}${detail ? `: ${detail}` : ""})`;
  if (res.status === 401 || res.status === 403) return new HttpError(502, `The AI provider rejected the API key${suffix}.`, "ai_auth");
  if (res.status === 429)
    return new HttpError(
      429,
      `The AI is getting too many requests right now. We retried automatically; please try again in a minute${suffix}.`,
      "ai_rate_limited",
    );
  if (res.status === 503 || res.status === 529)
    return new HttpError(
      503,
      `The AI model is very busy right now. We retried automatically, but it's still overloaded. Please try again in a minute${suffix}.`,
      "ai_busy",
    );
  if (res.status === 404)
    return new HttpError(502, `The AI model or URL was not found. Check AI_MODEL and AI_BASE_URL${suffix}.`, "ai_error");
  return new HttpError(502, `The AI provider returned an error${suffix}.`, "ai_error");
}

/**
 * Minimal client for any OpenAI-compatible Chat Completions API
 * (OpenAI, Azure OpenAI via proxy, OpenRouter, Together, Groq, Ollama, vLLM, …).
 * Configure with AI_BASE_URL, AI_API_KEY and AI_MODEL.
 */
async function openAiCompletion(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  if (!config.openAiEnabled) throw new HttpError(503, "AI is not configured on the server.", "ai_not_configured");

  const body: Record<string, unknown> = {
    model: config.AI_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const build = (model: string, withFormat = true) => {
    const payload: Record<string, unknown> = { ...body, model };
    if (!withFormat) delete payload.response_format;
    return payload;
  };
  let res = await postCompletion((m) => build(m), { timeoutMs: opts.timeoutMs ?? 120_000 });
  // Some compatible providers reject response_format; retry once without it.
  if (res.status === 400 && opts.json) res = await postCompletion((m) => build(m, false), { timeoutMs: opts.timeoutMs ?? 120_000 });
  if (!res.ok) throw await providerError(res);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new HttpError(502, "The AI provider returned an empty response.", "ai_empty");
  return content;
}

/** Parse JSON from a model reply, tolerating ```json fences or leading prose. */
export function parseJsonReply(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new HttpError(502, "The AI returned a response we couldn't read. Please try again.", "ai_bad_json");
  }
}

/**
 * OpenAI-compatible streamed completion. Calls onDelta with each text chunk and resolves
 * with the full text. Uses the standard `stream: true` server-sent-events format.
 */
async function openAiCompletionStream(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  opts: CompletionOptions & { signal?: AbortSignal } = {},
): Promise<string> {
  if (!config.openAiEnabled) throw new HttpError(503, "AI is not configured on the server.", "ai_not_configured");
  const res = await postCompletion(
    (model) => ({ model, messages, temperature: opts.temperature ?? 0.5, max_tokens: opts.maxTokens ?? 4000, stream: true }),
    { signal: opts.signal },
  );
  if (!res.ok || !res.body) throw await providerError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return full;
      try {
        const delta = (JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        /* ignore keep-alive or partial lines */
      }
    }
  }
  return full;
}
