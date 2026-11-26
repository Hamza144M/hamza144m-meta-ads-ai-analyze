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

  const send = async (payload: Record<string, unknown>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
    try {
      return await fetch(`${config.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.AI_API_KEY}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError")
        throw new HttpError(504, "The AI provider took too long to respond. Please try again.", "ai_timeout");
      throw new HttpError(502, "Couldn't reach the AI provider.", "ai_unreachable");
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await send(body);
  // Some compatible providers reject response_format; retry once without it.
  if (res.status === 400 && opts.json) {
    const { response_format: _drop, ...rest } = body;
    res = await send(rest);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`AI provider error ${res.status}: ${detail.slice(0, 500)}`);
    if (res.status === 401 || res.status === 403) throw new HttpError(502, "The AI provider rejected the API key.", "ai_auth");
    if (res.status === 429)
      throw new HttpError(429, "The AI provider is rate limiting requests. Try again in a minute.", "ai_rate_limited");
    throw new HttpError(502, "The AI provider returned an error.", "ai_error");
  }
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
  let res: Response;
  try {
    res = await fetch(`${config.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.AI_API_KEY}` },
      body: JSON.stringify({
        model: config.AI_MODEL,
        messages,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 1200,
        stream: true,
      }),
      signal: opts.signal,
    });
  } catch {
    throw new HttpError(502, "Couldn't reach the AI provider.", "ai_unreachable");
  }
  if (!res.ok || !res.body) {
    console.error(`AI provider error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 500)}`);
    if (res.status === 429)
      throw new HttpError(429, "The AI provider is rate limiting requests. Try again in a minute.", "ai_rate_limited");
    throw new HttpError(502, "The AI provider returned an error.", "ai_error");
  }

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
