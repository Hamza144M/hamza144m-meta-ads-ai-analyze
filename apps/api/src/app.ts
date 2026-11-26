import { aiConfig } from "@maa/server";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { config } from "./config";
import { HttpError } from "./lib/errors";
import { authEnabled, optionalAuth } from "./middleware/auth";
import { analysisRouter } from "./routes/analysis";
import { chatRouter } from "./routes/chat";
import { exportRouter } from "./routes/export";
import { reportsRouter } from "./routes/reports";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      storage: config.supabaseEnabled ? "supabase" : "memory",
      ai: config.aiEnabled ? aiConfig.activeModel : "rule-based",
      auth: authEnabled(),
    });
  });

  app.use("/api/reports/:id/analysis", optionalAuth, analysisRouter);
  app.use("/api/reports/:id/chat", optionalAuth, chatRouter);
  app.use("/api/reports/:id/export", optionalAuth, exportRouter);
  app.use("/api/reports", optionalAuth, reportsRouter);

  app.use((_req, _res, next) => next(new HttpError(404, "Not found.", "not_found")));

  // Express 5 forwards async errors here automatically.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      return res.status(tooBig ? 413 : 400).json({
        error: { code: err.code.toLowerCase(), message: tooBig ? `Files must be under ${config.MAX_UPLOAD_MB} MB.` : err.message },
      });
    }
    console.error(err);
    res.status(500).json({ error: { code: "internal", message: "Something went wrong. Please try again." } });
  });

  return app;
}
