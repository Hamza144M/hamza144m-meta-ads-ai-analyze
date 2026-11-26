import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAnalysis } from "@maa/server";
import { errorResponse, handleError, parseBody, rateLimited, readJson, reportDataSchema } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Generate the AI analysis (or the rule-based one when AI_API_KEY isn't set) for report data sent by the browser. */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "analysis", 20))
      return errorResponse(429, "You've generated a lot of analyses this hour. Please try again later.", "rate_limited");
    const { data } = parseBody(z.object({ data: reportDataSchema }), await readJson(req));
    return NextResponse.json(await generateAnalysis(data));
  } catch (err) {
    return handleError(err);
  }
}
