import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "../aiConfig";
import { HttpError } from "../errors";
import type { ChatMessage, CompletionOptions } from "./client";

/**
 * Claude (Anthropic) provider. Used for the AI analysis and the "Ask AI" chat
 * whenever ANTHROPIC_API_KEY is set. Model: ANTHROPIC_MODEL (default claude-opus-5-5).
 */
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: aiConfig.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 280_000 });
  return client;
}

// If a request is declined by Claude's safety checks, the API re-runs it on Anthropic's recommended fallback model.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Split our provider-neutral messages into Claude's top-level system blocks and user/assistant turns. */
function toClaude(messages: ChatMessage[]) {
  const system: Anthropic.Beta.BetaTextBlockParam[] = messages
    .filter((m) => m.role === "system")
    .map((m) => ({ type: "text" as const, text: m.content }));
  // Cache the system prompt + report context: it is identical across chat turns and analysis tasks.
  if (system.length) system[system.length - 1].cache_control = { type: "ephemeral" };
  const turns: Anthropic.Beta.BetaMessageParam[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  return { system, turns };
}

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return new HttpError(502, "The AI provider rejected the API key.", "ai_auth");
  if (err instanceof Anthropic.RateLimitError)
    return new HttpError(429, "The AI provider is rate limiting requests. Try again in a minute.", "ai_rate_limited");
  if (err instanceof Anthropic.APIConnectionTimeoutError)
    return new HttpError(504, "The AI provider took too long to respond. Please try again.", "ai_timeout");
  if (err instanceof Anthropic.APIConnectionError) return new HttpError(502, "Couldn't reach the AI provider.", "ai_unreachable");
  if (err instanceof Anthropic.APIError) {
    console.error(`Claude API error ${err.status}: ${err.message}`);
    return new HttpError(502, "The AI provider returned an error.", "ai_error");
  }
  console.error("Claude request failed:", err);
  return new HttpError(502, "The AI provider returned an error.", "ai_error");
}

/** True for failures worth retrying on the backup (OpenAI-compatible) provider. */
export function isProviderOutage(err: unknown): boolean {
  return err instanceof HttpError && ["ai_rate_limited", "ai_timeout", "ai_unreachable", "ai_error"].includes(err.code);
}

function textOf(message: Anthropic.Beta.BetaMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/** One complete answer (used for the JSON analysis tasks). Streams under the hood to avoid HTTP timeouts. */
export async function claudeCompletion(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const { system, turns } = toClaude(messages);
  let message: Anthropic.Beta.BetaMessage;
  try {
    const stream = getClient().beta.messages.stream({
      model: aiConfig.ANTHROPIC_MODEL,
      max_tokens: Math.max(opts.maxTokens ?? 16000, 16000),
      system,
      messages: turns,
      output_config: { effort: opts.effort ?? "medium" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    message = await stream.finalMessage();
  } catch (err) {
    throw toHttpError(err);
  }
  if (message.stop_reason === "refusal")
    throw new HttpError(422, "The AI declined to analyze this report. Please check the file and try again.", "ai_refused");
  const text = textOf(message);
  if (!text) throw new HttpError(502, "The AI provider returned an empty response.", "ai_empty");
  return text;
}

/** Streamed answer for the "Ask AI" chat. Calls onDelta with each text chunk. */
export async function claudeCompletionStream(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  opts: CompletionOptions & { signal?: AbortSignal } = {},
): Promise<string> {
  const { system, turns } = toClaude(messages);
  let full = "";
  try {
    const stream = getClient().beta.messages.stream(
      {
        model: aiConfig.ANTHROPIC_MODEL,
        max_tokens: Math.max(opts.maxTokens ?? 8000, 8000),
        system,
        messages: turns,
        // Chat answers are short and latency matters more than deep reasoning.
        output_config: { effort: opts.effort ?? "low" },
        betas: [FALLBACK_BETA],
        fallbacks: "default",
      },
      { signal: opts.signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        onDelta(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      const note = "\n\n_Sorry, I can't help with that request. Try asking about your ad performance._";
      full += note;
      onDelta(note);
    }
  } catch (err) {
    if (opts.signal?.aborted) return full;
    throw toHttpError(err);
  }
  return full;
}
