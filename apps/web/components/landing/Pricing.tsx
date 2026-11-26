import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ASSUMPTION: placeholder plans and prices. Billing is not wired up yet.
const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    blurb: "Try it on one account.",
    cta: "Start free",
    features: ["3 reports / month", "Full dashboard", "AI executive summary", "PDF export"],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    blurb: "For freelancers and growing brands.",
    cta: "Start Pro",
    popular: true,
    features: ["Unlimited reports", "Full AI audit & scorecard", "AI chat assistant", "PDF, Excel & Word exports", "Shareable links"],
  },
  {
    name: "Agency",
    price: "$99",
    period: "/month",
    blurb: "For teams managing many clients.",
    cta: "Contact sales",
    features: ["Everything in Pro", "Up to 10 team seats", "White-label reports", "Client workspaces", "Priority support"],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-20 sm:py-28 dark:bg-slate-950/60">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Pricing</span>
          <h2 className="section-title mt-4">Pays for itself with one fixed campaign</h2>
          <p className="section-sub">Start free. Upgrade when you&apos;re ready.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "card relative flex flex-col p-7",
                p.popular && "border-brand-500 ring-2 ring-brand-500 dark:border-brand-400 dark:ring-brand-400",
              )}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.blurb}</p>
              <p className="mt-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{p.price}</span>
                <span className="ml-1 text-sm text-slate-500">{p.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/upload" className={cn("mt-8 w-full", p.popular ? "btn-primary" : "btn-secondary")}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
