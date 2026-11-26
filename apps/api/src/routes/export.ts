import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { computeScorecard } from "@maa/core";
import { buildDocument } from "../lib/export/content";
import { renderDocx } from "../lib/export/docx";
import { renderPdf } from "../lib/export/pdf";
import { renderXlsx } from "../lib/export/xlsx";
import { HttpError } from "../lib/errors";
import { reportStore } from "../lib/store";

const FORMATS = {
  pdf: { type: "application/pdf", ext: "pdf" },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
} as const;

const exportLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

export const exportRouter = Router({ mergeParams: true });

/** GET /api/reports/:id/export/:format — pdf | xlsx | docx */
exportRouter.get("/:format", exportLimiter, async (req, res) => {
  const params = req.params as { id: string; format: string };
  const id = z.string().uuid().safeParse(params.id);
  if (!id.success) throw new HttpError(404, "Report not found.", "not_found");
  const format = FORMATS[params.format as keyof typeof FORMATS];
  if (!format) throw new HttpError(400, "Format must be pdf, xlsx or docx.", "invalid_format");
  const report = await reportStore.get(id.data);
  if (!report) throw new HttpError(404, "Report not found.", "not_found");

  const analysis = await reportStore.getLatestAnalysis(report.id);
  const scorecard = computeScorecard(report.data);
  let file: Buffer;
  if (params.format === "xlsx") file = await renderXlsx(report.data, scorecard, analysis);
  else {
    const doc = buildDocument(report.data, scorecard, analysis);
    file = params.format === "pdf" ? await renderPdf(doc) : await renderDocx(doc);
  }

  const base =
    report.data.fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 60) || "meta-ads";
  res.setHeader("Content-Type", format.type);
  res.setHeader("Content-Disposition", `attachment; filename="${base}-analysis.${format.ext}"`);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.send(file);
});
