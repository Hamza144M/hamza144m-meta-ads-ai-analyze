"use client";

import { FolderOpen, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

export function UserMenu() {
  const { enabled, user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  if (!enabled || loading) return null;
  if (!user)
    return (
      <Link href="/login" className="btn-ghost hidden sm:inline-flex">
        Sign in
      </Link>
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
          <p className="truncate px-3 py-2 text-xs text-slate-500">{user.email}</p>
          <Link href="/reports" className="btn-ghost w-full justify-start" onClick={() => setOpen(false)}>
            <FolderOpen className="h-4 w-4" /> My reports
          </Link>
          <button type="button" className="btn-ghost w-full justify-start" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
