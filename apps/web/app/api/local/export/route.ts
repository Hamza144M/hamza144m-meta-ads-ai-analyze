import { z } from "zod";
import { computeScorecard } from "@maa/core";
import { buildDocument, renderDocx, renderPdf, renderXlsx } from "@maa/server";
import { analysisSchema, errorResponse, handleError, parseBody, rateLimited, readJson, reportDataSchema } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORMATS = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

const bodySchema = z.object({ format: z.enum(["pdf", "xlsx", "docx"]), data: reportDataSchema, analysis: analysisSchema });

/** Build a PDF, Excel or Word export from report data sent by the browser. */
export async function POST(req: Request) {
  try {
    if (rateLimited(req, "export", 60)) return errorResponse(429, "Too many exports this hour. Please try again later.", "rate_limited");
    const { format, data, analysis } = parseBody(bodySchema, await readJson(req));
    const scorecard = computeScorecard(data);
    let file: Buffer;
    if (format === "xlsx") file = await renderXlsx(data, scorecard, analysis);
    else {
      const doc = buildDocument(data, scorecard, analysis);
      file = format === "pdf" ? await renderPdf(doc) : await renderDocx(doc);
    }
    const base =
      data.fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[^\w\- ]+/g, "")
        .trim()
        .slice(0, 60) || "meta-ads";
    return new Response(new Uint8Array(file), {
      headers: { "Content-Type": FORMATS[format], "Content-Disposition": `attachment; filename="${base}-analysis.${format}"` },
    });
  } catch (err) {
    return handleError(err);
  }
}
