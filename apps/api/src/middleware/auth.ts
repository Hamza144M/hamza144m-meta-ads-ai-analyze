import type { NextFunction, Request, Response } from "express";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { config } from "../config";
import { HttpError } from "../lib/errors";
import { reportStore } from "../lib/store";

declare module "express-serve-static-core" {
  interface Request {
    userId: string | null;
  }
}

function parseServiceAccount(raw: string): ServiceAccount {
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const sa = JSON.parse(json) as Record<string, string>;
  return { projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key?.replace(/\\n/g, "\n") };
}

let adminAuth: Auth | null = null;
if (config.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const app = getApps()[0] ?? initializeApp({ credential: cert(parseServiceAccount(config.FIREBASE_SERVICE_ACCOUNT)) });
    adminAuth = getAuth(app);
  } catch (err) {
    console.error("FIREBASE_SERVICE_ACCOUNT is invalid; authentication is disabled.", (err as Error).message);
  }
}
export const authEnabled = () => adminAuth !== null;

const knownProfiles = new Set<string>();

/**
 * Attaches req.userId when a valid Firebase ID token is sent as
 * `Authorization: Bearer <token>`. Anonymous requests continue with userId = null.
 * An invalid or expired token is rejected so the client can refresh it.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.userId = null;
  const header = req.headers.authorization;
  if (!adminAuth || !header?.startsWith("Bearer ")) return next();
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    req.userId = decoded.uid;
    if (!knownProfiles.has(decoded.uid)) {
      await reportStore.ensureProfile(decoded.uid, decoded.email ?? null, (decoded.name as string | undefined) ?? null);
      knownProfiles.add(decoded.uid);
    }
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, "Your session has expired. Please sign in again.", "invalid_token"));
  }
}
