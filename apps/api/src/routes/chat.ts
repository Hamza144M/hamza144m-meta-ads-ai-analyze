import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { computeScorecard } from "@maa/core";
import { config } from "../config";
import { CHAT_SYSTEM_PROMPT, chatContextMessage, ruleBasedChatAnswer } from "../lib/ai/chat";
import { chatCompletionStream } from "../lib/ai/client";
import { HttpError } from "../lib/errors";
import { reportStore } from "../lib/store";

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === "user", "The last message must be from the user."),
});

const chatLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many questions this hour. Please try again later." } },
});

export const chatRouter = Router({ mergeParams: true });

/** Ask a question about a report. Streams the answer as plain text. */
chatRouter.post("/", chatLimiter, async (req, res) => {
  const id = z
    .string()
    .uuid()
    .safeParse((req.params as { id: string }).id);
  if (!id.success) throw new HttpError(404, "Report not found.", "not_found");
  const body = bodySchema.safeParse(req.body);
  if (!body.success) throw new HttpError(400, body.error.issues[0]?.message ?? "Invalid request.", "invalid_request");
  const report = await reportStore.get(id.data);
  if (!report) throw new HttpError(404, "Report not found.", "not_found");

  // Keep the last 12 turns to bound tokens.
  const history = body.data.messages.slice(-12);
  const question = history[history.length - 1].content;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  if (!config.aiEnabled) {
    res.end(ruleBasedChatAnswer(question, report.data));
    return;
  }

  const analysis = await reportStore.getLatestAnalysis(report.id);
  const scorecard = computeScorecard(report.data);
  const abort = new AbortController();
  res.on("close", () => abort.abort());

  try {
    await chatCompletionStream(
      [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        { role: "system", content: chatContextMessage(report.data, scorecard, analysis) },
        ...history,
      ],
      (delta) => res.write(delta),
      { signal: abort.signal },
    );
    res.end();
  } catch (err) {
    if (!res.headersSent || res.writableLength === 0) throw err;
    res.end("\n\n_Sorry, the answer was interrupted. Please try again._");
  }
});
