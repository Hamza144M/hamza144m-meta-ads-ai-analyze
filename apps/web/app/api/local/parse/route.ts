import { NextResponse } from "next/server";
import { isValidCurrency } from "@maa/core";
import { HttpError, parseReportFile } from "@maa/server";
import { errorResponse, handleError, rateLimited } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel caps request bodies at about 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

/** Parse an uploaded Meta Ads export and return the report data. Nothing is stored on the server. */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "parse", 60)) return errorResponse(429, "Too many uploads this hour. Please try again later.", "rate_limited");
    const form = await req.formData().catch(() => {
      throw new HttpError(400, "Attach a .csv or .xlsx file.", "missing_file");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Attach a .csv or .xlsx file in the 'file' field.", "missing_file");
    if (file.size > MAX_BYTES)
      throw new HttpError(413, "This file is over 4 MB. Export a shorter date range or fewer columns.", "too_large");
    const fileName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 200);
    let data = await parseReportFile(Buffer.from(await file.arrayBuffer()), fileName);
    const currency = form.get("currency");
    if (typeof currency === "string" && currency) {
      const code = currency.trim().toUpperCase();
      if (!isValidCurrency(code)) throw new HttpError(400, "Unknown currency code.", "invalid_currency");
      data = { ...data, currency: code, currencySource: "user", usdRate: null };
    }
    return NextResponse.json({ data });
  } catch (err) {
    return handleError(err);
  }
}
