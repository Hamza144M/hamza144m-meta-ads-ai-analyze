"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface Props {
  planId: string;
  label: string;
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
