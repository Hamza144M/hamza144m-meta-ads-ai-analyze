"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getFirebaseAuth } from "@/lib/firebase";

function friendly(code: string): string {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account with this email already exists. Sign in instead.";
  if (code.includes("weak-password")) return "Use at least 6 characters for your password.";
  if (code.includes("popup-closed")) return "The Google sign-in window was closed.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

export function LoginForm({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const { enabled, user, refreshAccount } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const fallback = mode === "signup" ? "/upload" : "/reports";
  const next = params.get("next") || fallback;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : fallback;
  const nextQuery = params.get("next") ? `?next=${encodeURIComponent(safeNext)}` : "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [created, setCreated] = useState(mode !== "signup");
  useEffect(() => {
    // After sign-up, wait until the name is saved before leaving the page.
    if (user && created) router.replace(safeNext);
  }, [user, created, router, safeNext]);

  if (!enabled) {
    return (
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Sign-in isn&apos;t configured on this deployment. Reports still work without an account.
      </p>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(friendly(String((e as { code?: string }).code ?? e)));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const auth = getFirebaseAuth()!;
    if (mode === "signin") return void run(() => signInWithEmailAndPassword(auth, email, password));
    void run(async () => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = name.trim();
      if (displayName) await updateProfile(cred.user, { displayName });
      await refreshAccount(displayName || undefined);
      setCreated(true);
    }).finally(() => setCreated(true));
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setCreated(true);
          void run(() => signInWithPopup(getFirebaseAuth()!, new GoogleAuthProvider()));
        }}
        className="btn-secondary h-11 w-full"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
          <path
            fill="#34A853"
            d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"
          />
          <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Full name</span>
            <input
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5"
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5"
          />
        </label>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
        {info && <p className="text-sm text-emerald-700 dark:text-emerald-400">{info}</p>}
        <button type="submit" disabled={busy} className="btn-primary h-11 w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "signin" ? "Log in" : "Create free account"}
        </button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <Link
          href={`${mode === "signin" ? "/signup" : "/login"}${nextQuery}`}
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {mode === "signin" ? "Create a free account" : "I already have an account"}
        </Link>
        {mode === "signin" && (
          <button
            type="button"
            className="text-slate-500 hover:underline"
            onClick={() => {
              if (!email) return setError("Enter your email first.");
              void run(async () => {
                await sendPasswordResetEmail(getFirebaseAuth()!, email);
                setInfo("Check your inbox for a reset link.");
              });
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}
