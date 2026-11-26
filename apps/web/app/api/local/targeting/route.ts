import { NextResponse } from "next/server";
import { adviseTargetingPlan, targetingInputSchema, HttpError } from "@maa/server";
import { requireUser } from "@/lib/server/auth";
import { consumeUsage } from "@/lib/server/quota";
import { errorResponse, handleError, rateLimited, readJson } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Targeting advisor: a starter targeting and placement plan from a few answers. */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "targeting", 30))
      return errorResponse(429, "You've asked for a lot of targeting plans this hour. Please try again later.", "rate_limited");
    const user = await requireUser(req);
    const parsed = targetingInputSchema.safeParse(await readJson(req, 20_000));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Please check the form.", "invalid_request");
    await consumeUsage(user, "analyses");
    return NextResponse.json(await adviseTargetingPlan(parsed.data));
  } catch (err) {
    return handleError(err);
  }
}
