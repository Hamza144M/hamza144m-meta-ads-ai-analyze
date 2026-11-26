import { createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError } from "@maa/server";

/**
 * Verifies Firebase ID tokens with Google's public keys. Needs only the (public)
 * Firebase project id, so no service-account secret is required on Vercel.
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "";
export const authRequired = Boolean(PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim());

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
}

export async function getUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !PROJECT_ID) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      algorithms: ["RS256"],
    });
    if (!payload.sub) return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}

/** When sign-in is configured, the audit routes need a signed-in user. */
export async function requireUser(req: Request): Promise<AuthUser | null> {
  const user = await getUser(req);
  if (authRequired && !user) throw new HttpError(401, "Create a free account or log in to run an audit.", "auth_required");
  return user;
}
