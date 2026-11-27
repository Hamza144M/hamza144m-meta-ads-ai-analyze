import { Check, Lock } from "lucide-react";
import { creemPlanEnabled } from "@/lib/server/creem";
import { CHECKOUT_URLS, CONTACT_EMAIL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { PlanButton } from "./PlanButton";

// ASSUMPTION: placeholder plans and prices. Paid plans open the payment provider's hosted
// checkout: Creem (CREEM_API_KEY + CREEM_PRODUCT_PRO / _AGENCY) when set, else a hosted link
// (NEXT_PUBLIC_CHECKOUT_URL_PRO / _AGENCY). Free accounts get 3 audits a day (lib/server/quota.ts).
export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "forever",
    blurb: "Try it on one account.",
    cta: "Sign up free",
    checkout: "",
    features: ["3 audits every day", "Full dashboard & KPI scorecard", "AI analysis & action plan", "PDF, Excel & Word exports"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    period: "/month",
    blurb: "For freelancers and growing brands.",
    cta: "Get Pro",
    popular: true,
    checkout: creemPlanEnabled("pro") ? "creem" : CHECKOUT_URLS.pro,
    features: ["Unlimited audits", "Unlimited AI analyses", "Unlimited AI chat", "PDF, Excel & Word exports"],
  },
  {
    id: "agency",
    name: "Agency",
    price: 99,
    period: "/month",
    blurb: "For teams managing many clients.",
    cta: "Get Agency",
    checkout: creemPlanEnabled("agency") ? "creem" : CHECKOUT_URLS.agency,
    features: ["Everything in Pro", "Up to 10 team seats", "White-label reports", "Client workspaces", "Priority support"],
  },
];

const CARDS = ["Visa", "Mastercard", "Amex"];

export function Pricing() {
  const anyCheckout = PLANS.some((p) => p.checkout);
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-20 bg-white py-20 sm:py-28 dark:bg-slate-950/60">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Pricing</span>
          <h2 id="pricing-title" className="section-title mt-4">
            Pays for itself with one fixed campaign
          </h2>
          <p className="section-sub">
            Start free. Upgrade when you&apos;re ready. Prices in USD; your card is charged in your local currency.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {PLANS.map((p) => {
            return (
              <div
                key={p.id}
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
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">${p.price}</span>
                  <span className="ml-1 text-sm text-slate-500">{p.period}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" /> {f}
                    </li>
                  ))}
                </ul>
                <PlanButton
                  planId={p.id}
                  label={p.cta}
                  checkout={p.checkout}
                  contactEmail={CONTACT_EMAIL}
                  primary={p.popular}
                  free={p.price === 0}
                />
                {p.checkout && <p className="mt-2 text-center text-xs text-slate-500">Pay by card · cancel anytime</p>}
              </div>
            );
          })}
        </div>
        {anyCheckout && (
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-slate-500">
            <Lock className="h-4 w-4" /> Secure card checkout. We accept
            {CARDS.map((c) => (
              <span
                key={c}
                className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300"
              >
                {c}
              </span>
            ))}
            and more. Card details are handled by our payment provider and never touch our servers.
          </p>
        )}
      </div>
    </section>
  );
}
