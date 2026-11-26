"use client";

import { CreditCard, FolderOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LOCAL_MODE } from "@/lib/api";
import { useAuth } from "./AuthProvider";

export function UserMenu() {
  const { enabled, user, loading, signOut, account } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!enabled && LOCAL_MODE)
    return (
      <Link href="/reports" className="btn-ghost hidden sm:inline-flex">
        My reports
      </Link>
    );
  if (!enabled || loading) return null;
  if (!user)
    return (
      <>
        <Link href="/login" className="btn-ghost hidden sm:inline-flex">
          Log in
        </Link>
        <Link href="/signup" className="btn-secondary hidden sm:inline-flex">
          Sign up
        </Link>
      </>
    );

  const initial = (user.displayName || user.email || "?")[0].toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-sm font-semibold text-white"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="card absolute right-0 mt-2 w-56 p-1.5">
          <div className="px-3 py-2">
            {user.displayName && <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.displayName}</p>}
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            {account && (
              <p className="mt-1 text-xs text-slate-500">
                {account.limits
                  ? `Free plan · ${Math.max(0, account.limits.audits - account.used.audits)} of ${account.limits.audits} audits left today`
                  : `${account.plan === "agency" ? "Agency" : "Pro"} plan · unlimited audits`}
              </p>
            )}
          </div>
          <Link href="/pricing" className="btn-ghost w-full justify-start" onClick={() => setOpen(false)}>
            <CreditCard className="h-4 w-4" /> {account && !account.limits ? "Plans & billing" : "Upgrade plan"}
          </Link>
          <Link href="/reports" className="btn-ghost w-full justify-start" onClick={() => setOpen(false)}>
            <FolderOpen className="h-4 w-4" /> My reports
          </Link>
          <button type="button" className="btn-ghost w-full justify-start" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
