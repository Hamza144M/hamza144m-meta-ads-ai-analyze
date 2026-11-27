"use client";

import { CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authHeader } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface Props {
  planId: string;
  label: string;
  /** "creem" for Creem's API checkout, otherwise a hosted checkout link (or empty). */
  checkout: string;
  contactEmail: string;
  primary?: boolean;
  free?: boolean;
}

/** Plan call-to-action: sign up, open the card checkout (tagged with the user's id), or show the current plan. */
export function PlanButton({ planId, label, checkout, contactEmail, primary, free }: Props) {
  const { enabled, user, account } = useAuth();
  const className = cn("mt-8 w-full", primary ? "btn-primary" : "btn-secondary");

  if (account && account.plan === planId)
    return (
      <span className={cn(className, "pointer-events-none opacity-70")} aria-disabled>
        Your current plan
      </span>
    );

  if (free)
    return (
      <Link href={enabled && !user ? "/signup" : "/upload"} className={className}>
        {label}
      </Link>
    );

  if (checkout === "creem") {
    if (enabled && !user)
      return (
        <Link href="/signup?next=/pricing" className={className}>
          <CreditCard className="h-4 w-4" /> {label}
        </Link>
      );
    return <CreemButton planId={planId} label={label} className={className} />;
  }

  if (checkout) {
    // Signed-out visitors create an account first, so the payment can be linked to it.
    if (enabled && !user)
      return (
        <Link href="/signup?next=/pricing" className={className}>
          <CreditCard className="h-4 w-4" /> {label}
        </Link>
      );
    let href = checkout;
    if (user) {
      const url = new URL(checkout);
      url.searchParams.set("checkout[custom][user_id]", user.uid);
      if (user.email) url.searchParams.set("checkout[email]", user.email);
      if (user.displayName) url.searchParams.set("checkout[name]", user.displayName);
      href = url.toString();
    }
    return (
      <a href={href} className={className} rel="noopener">
        <CreditCard className="h-4 w-4" /> {label}
      </a>
    );
  }

  if (contactEmail)
    return (
      <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`${planId} plan`)}`} className={className}>
        Contact us
      </a>
    );
  return (
    <Link href="/upload" className={className}>
      Start free
    </Link>
  );
}

/** Asks our server for a Creem checkout page for this user, then opens it. */
function CreemButton({ planId, label, className }: { planId: string; label: string; className: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ plan: planId }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
      if (!res.ok || !data.url) throw new Error(data.error?.message || "Could not open the payment page. Please try again.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the payment page. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={start} disabled={busy} className={className}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {label}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}
