import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Auth is optional: without these env vars the app runs anonymously. */
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!firebaseEnabled || typeof window === "undefined") return null;
  if (!auth) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return auth;
}

/** Authorization header for API calls when a user is signed in. */
export async function authHeader(): Promise<Record<string, string>> {
  const a = getFirebaseAuth();
  if (!a) return {};
  await a.authStateReady();
  const token = await a.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
