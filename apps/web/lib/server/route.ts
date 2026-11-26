import { z } from "zod";
import type { ReportData, StoredAnalysis } from "@maa/core";
import { NextResponse } from "next/server";
import { HttpError } from "@maa/server";

export function errorResponse(status: number, message: string, code = "error") {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Turn thrown errors into the same JSON error shape the Express API uses. */
export function handleError(err: unknown) {
  if (err instanceof HttpError) return errorResponse(err.status, err.message, err.code);
  console.error(err);
  return errorResponse(500, "Something went wrong. Please try again.", "internal");
}

/**
 * Best-effort per-IP limit. Serverless instances don't share memory, so this only
 * slows down abuse from one client; the AI provider's own limits still apply.
 */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimited(req: Request, key: string, limit: number, windowMs = 60 * 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || bucket.reset < now) {
    buckets.set(id, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export async function readJson(req: Request, maxBytes = 4_000_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "This report is too large to process.", "too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid request body.", "invalid_request");
  }
}

const arr = z.array(z.any()).max(20_000);
/** Loose shape check for report data the browser sends back (it came from /api/local/parse). */
export const reportDataSchema = z
  .object({
    fileName: z.string().max(300),
    rowCount: z.number(),
    currency: z.string().max(3).nullable(),
    totals: z.record(z.any()),
    counts: z.object({ campaigns: z.number(), adSets: z.number(), ads: z.number() }),
    campaigns: arr,
    adSets: arr,
    ads: arr,
    daily: arr,
    age: arr,
    gender: arr,
    region: arr,
    placement: arr,
    funnel: arr,
    warnings: z.array(z.string()),
  })
  .passthrough()
  .transform((v) => v as unknown as ReportData);

export const analysisSchema = z
  .object({ id: z.string(), model: z.string(), scorecard: z.array(z.any()), result: z.record(z.any()) })
  .passthrough()
  .nullable()
  .optional()
  .transform((v) => (v ?? null) as unknown as StoredAnalysis | null);

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, "Invalid request.", "invalid_request");
  return r.data;
}
