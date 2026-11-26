import { z } from "zod";
import { computeScorecard } from "@maa/core";
import { aiConfig, CHAT_SYSTEM_PROMPT, chatCompletionStream, chatContextMessage, ruleBasedChatAnswer } from "@maa/server";
import { requireUser } from "@/lib/server/auth";
import { consumeUsage } from "@/lib/server/quota";
import { analysisSchema, errorResponse, handleError, parseBody, rateLimited, readJson, reportDataSchema } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  data: reportDataSchema,
  analysis: analysisSchema,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(30)
    .refine((m) => m[m.length - 1].role === "user"),
});

/** Answer a question about the report. Streams plain text. */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "chat", 120)) return errorResponse(429, "Too many questions this hour. Please try again later.", "rate_limited");
    const user = await requireUser(req);
    const { data, analysis, messages } = parseBody(bodySchema, await readJson(req));
    await consumeUsage(user, "chats");
    const history = messages.slice(-12);
    const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" };

    if (!aiConfig.aiEnabled) return new Response(ruleBasedChatAnswer(history[history.length - 1].content, data), { headers });

    const scorecard = computeScorecard(data);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let sent = false;
        try {
          await chatCompletionStream(
            [
              { role: "system", content: CHAT_SYSTEM_PROMPT },
              { role: "system", content: chatContextMessage(data, scorecard, analysis) },
              ...history,
            ],
            (delta) => {
              sent = true;
              controller.enqueue(encoder.encode(delta));
            },
            { signal: req.signal },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "The answer was interrupted.";
          controller.enqueue(encoder.encode(sent ? "\n\n_Sorry, the answer was interrupted. Please try again._" : `_${message}_`));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers });
  } catch (err) {
    return handleError(err);
  }
}
