import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { computeScorecard } from "@maa/core";
import { generateAnalysis } from "../lib/ai/analyze";
import { HttpError } from "../lib/errors";
import { reportStore } from "../lib/store";

const idSchema = z.string().uuid();

// AI calls are expensive: cap generations per IP.
const generateLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "You've generated a lot of analyses this hour. Please try again later." } },
});

// In-flight generations, so double clicks don't trigger duplicate AI calls.
const inFlight = new Map<string, Promise<unknown>>();

export const analysisRouter = Router({ mergeParams: true });

async function loadReport(rawId: string) {
  const id = idSchema.safeParse(rawId);
  if (!id.success) throw new HttpError(404, "Report not found.", "not_found");
  const report = await reportStore.get(id.data);
  if (!report) throw new HttpError(404, "Report not found.", "not_found");
  return report;
}

/** Latest saved analysis, or just the deterministic scorecard if none yet. */
analysisRouter.get("/", async (req, res) => {
  const report = await loadReport((req.params as { id: string }).id);
  const analysis = await reportStore.getLatestAnalysis(report.id);
  // Scorecard is recomputed so currency changes apply without regenerating the analysis.
  res.json({ analysis, scorecard: computeScorecard(report.data) });
});

/** Generate (or regenerate) the AI analysis. */
analysisRouter.post("/", generateLimiter, async (req, res) => {
  const report = await loadReport((req.params as { id: string }).id);
  let job = inFlight.get(report.id);
  if (!job) {
    job = (async () => {
      const out = await generateAnalysis(report.data);
      return reportStore.saveAnalysis({ reportId: report.id, ...out });
    })().finally(() => inFlight.delete(report.id));
    inFlight.set(report.id, job);
  }
  res.status(201).json({ analysis: await job });
});
