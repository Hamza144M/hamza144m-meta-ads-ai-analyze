import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { isValidCurrency, type ReportData } from "@maa/core";
import { config } from "../config";
import { HttpError } from "../lib/errors";
import { parseReportFile } from "../lib/parseFile";
import { reportStore } from "../lib/store";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

const idSchema = z.string().uuid();
const currencySchema = z.string().trim().toUpperCase().refine(isValidCurrency, "Unknown currency code.");

function applyCurrency(data: ReportData, currency: string, usdRate?: number | null): ReportData {
  return { ...data, currency, currencySource: "user", usdRate: usdRate ?? null };
}

export const reportsRouter = Router();

/** Upload and parse a Meta Ads export. */
reportsRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Attach a .csv or .xlsx file in the 'file' field.", "missing_file");
  const fileName = req.file.originalname.replace(/[^\w.\- ()]/g, "_").slice(0, 200);
  let data = await parseReportFile(req.file.buffer, fileName);
  // Optional currency chosen on the upload form overrides what the headers say.
  const chosen = typeof req.body?.currency === "string" && req.body.currency ? currencySchema.safeParse(req.body.currency) : null;
  if (chosen && !chosen.success) throw new HttpError(400, "Unknown currency code.", "invalid_currency");
  if (chosen?.success) data = applyCurrency(data, chosen.data);
  const report = await reportStore.create(data, req.userId);
  res.status(201).json({ id: report.id, report });
});

/** List the signed-in user's reports. */
reportsRouter.get("/", async (req, res) => {
  if (!req.userId) return res.json({ reports: [] });
  res.json({ reports: await reportStore.listByOwner(req.userId) });
});

/** Fetch one report. The unguessable UUID doubles as the shareable link. */
reportsRouter.get("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, "Report not found.", "not_found");
  const report = await reportStore.get(id.data);
  if (!report) throw new HttpError(404, "Report not found.", "not_found");
  res.json({ report });
});

/** Change the report currency (and optional USD rate used for scoring). */
const settingsSchema = z.object({ currency: currencySchema, usdRate: z.number().positive().max(1e7).nullable().optional() });
reportsRouter.patch("/:id/settings", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, "Report not found.", "not_found");
  const body = settingsSchema.safeParse(req.body);
  if (!body.success) throw new HttpError(400, body.error.issues[0]?.message ?? "Invalid settings.", "invalid_request");
  const report = await reportStore.get(id.data);
  if (!report) throw new HttpError(404, "Report not found.", "not_found");
  // Owned reports can only be changed by their owner; anonymous reports by anyone with the link.
  if (report.ownerId && report.ownerId !== req.userId)
    throw new HttpError(403, "Only the report owner can change its settings.", "forbidden");
  const data = applyCurrency(report.data, body.data.currency, body.data.usdRate);
  await reportStore.updateData(report.id, data);
  res.json({ report: { ...report, data } });
});

reportsRouter.delete("/:id", async (req, res) => {
  if (!req.userId) throw new HttpError(401, "Sign in to delete reports.", "unauthorized");
  const id = idSchema.safeParse(req.params.id);
  if (!id.success || !(await reportStore.delete(id.data, req.userId))) throw new HttpError(404, "Report not found.", "not_found");
  res.status(204).end();
});
