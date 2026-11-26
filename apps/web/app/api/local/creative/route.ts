import { NextResponse } from "next/server";
import { analyzeCreative, creativeInputSchema, HttpError } from "@maa/server";
import { requireUser } from "@/lib/server/auth";
import { consumeUsage } from "@/lib/server/quota";
import { errorResponse, handleError, rateLimited, readJson } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** AI review of an ad image, or of frames the browser took from an ad video. */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "creative", 30))
      return errorResponse(429, "You've analyzed a lot of creatives this hour. Please try again later.", "rate_limited");
    const user = await requireUser(req);
    const parsed = creativeInputSchema.safeParse(await readJson(req, 4_200_000));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid creative.", "invalid_request");
    await consumeUsage(user, "analyses");
    return NextResponse.json(await analyzeCreative(parsed.data));
  } catch (err) {
    return handleError(err);
  }
}
