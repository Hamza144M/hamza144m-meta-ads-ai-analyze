"use client";

import {
  AlertCircle,
  Ban,
  Check,
  ClipboardList,
  Crosshair,
  FlaskConical,
  Heart,
  Lightbulb,
  Loader2,
  MapPin,
  MonitorSmartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { TargetingAdvisorOutput, TargetingInput } from "@maa/server";
import { Section } from "@/components/analysis/ui";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { adviseTargeting } from "@/lib/api";

const GOALS = ["Sales", "Leads", "Messages (WhatsApp / Messenger)", "Traffic", "Awareness", "App installs"];
const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/15 dark:bg-slate-900 dark:text-white";
const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";
const STORE_KEY = "maa:targeting-form:v1";

function Why({ children }: { children: ReactNode }) {
  return children ? <p className="mt-1 text-sm text-slate-500">{children}</p> : null;
}

function Chips({ items, tone = "brand" }: { items: string[]; tone?: "brand" | "red" }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((t) => (
        <li
          key={t}
          className={
            tone === "red"
              ? "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-400/10 dark:text-red-300"
              : "rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-400/10 dark:text-brand-300"
          }
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

function Plan({ output }: { output: TargetingAdvisorOutput }) {
  const { plan, model } = output;
  const ageMax = plan.age.max >= 65 ? "65+" : String(plan.age.max);
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">Your starting targeting</p>
        <p className="mt-2 text-slate-700 dark:text-slate-300">{plan.summary}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
            <dt className="text-xs font-medium uppercase text-slate-500">Age</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {plan.age.min}–{ageMax}
            </dd>
            <Why>{plan.age.why}</Why>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
            <dt className="text-xs font-medium uppercase text-slate-500">Gender</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{plan.gender.value || "All"}</dd>
            <Why>{plan.gender.why}</Why>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
            <dt className="text-xs font-medium uppercase text-slate-500">Starter budget</dt>
            <dd className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{plan.budget.daily || "—"}</dd>
            <Why>
              {plan.budget.why}
              {plan.budget.testDays ? ` Run it for ${plan.budget.testDays} days before judging.` : ""}
            </Why>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">Suggested by {model}. Treat it as a starting point and let your results decide.</p>
      </section>

      <Section icon={MapPin} title="Best locations" subtitle="Where to show your ads first">
        <ol className="space-y-3">
          {plan.locations.map((l, i) => (
            <li key={l.name} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{l.name}</p>
                <Why>{l.why}</Why>
              </div>
            </li>
          ))}
        </ol>
        {plan.excludeLocations.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Exclude</p>
            <Chips items={plan.excludeLocations} tone="red" />
          </div>
        )}
      </Section>

      {plan.audiences.length > 0 && (
        <Section icon={FlaskConical} title="Audiences to test" subtitle="Put each one in its own ad set with the same ads and budget">
          <div className="grid gap-4 lg:grid-cols-3">
            {plan.audiences.map((a, i) => (
              <div key={a.name} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <p className="text-xs font-semibold uppercase text-brand-600 dark:text-brand-400">Ad set {i + 1}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{a.name}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Age</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{a.age || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Gender</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{a.gender || "All"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Locations</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{a.locations.join(", ") || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-slate-500">Interests</dt>
                    <dd className="text-slate-800 dark:text-slate-200">{a.interests.join(", ") || "None (broad)"}</dd>
                  </div>
                </dl>
                <Why>{a.why}</Why>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Heart} title="Interests" subtitle="Type these into Detailed targeting">
          <ul className="space-y-3">
            {plan.interests.map((x) => (
              <li key={x.name}>
                <p className="font-medium text-slate-900 dark:text-white">{x.name}</p>
                <Why>{x.why}</Why>
              </li>
            ))}
          </ul>
          {plan.behaviors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Behaviors</p>
              <Chips items={plan.behaviors} />
            </div>
          )}
          <p className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-400">
            <Users className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong className="text-slate-900 dark:text-white">
                Advantage+ audience: {plan.advantagePlusAudience.use ? "turn on" : "turn off"}.
              </strong>{" "}
              {plan.advantagePlusAudience.why}
            </span>
          </p>
        </Section>

        <Section icon={MonitorSmartphone} title="Placements">
          <p className="font-semibold text-slate-900 dark:text-white">
            {plan.placements.mode === "manual" ? "Manual placements" : "Advantage+ placements (automatic)"}
          </p>
          <Why>{plan.placements.why}</Why>
          {plan.placements.include.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Use</p>
              <Chips items={plan.placements.include} />
            </div>
          )}
          {plan.placements.exclude.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Turn off</p>
              <Chips items={plan.placements.exclude} tone="red" />
            </div>
          )}
          {plan.exclusions.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Ban className="h-4 w-4" /> Audiences to exclude
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {plan.exclusions.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {plan.campaignSetup.length > 0 && (
          <Section icon={ClipboardList} title="How to set it up">
            <ol className="space-y-2">
              {plan.campaignSetup.map((x, i) => (
                <li key={x} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{i + 1}.</span> {x}
                </li>
              ))}
            </ol>
          </Section>
        )}
        {plan.tips.length > 0 && (
          <Section icon={Lightbulb} title="Tips for your market">
            <ul className="space-y-2">
              {plan.tips.map((x) => (
                <li key={x} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {x}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

type Form = Required<Pick<TargetingInput, "product" | "country" | "goal">> & Partial<TargetingInput>;

export function TargetingAdvisor() {
  const [form, setForm] = useState<Form>({ product: "", country: "", goal: "Sales", currency: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<TargetingAdvisorOutput | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) setForm((f) => ({ ...f, ...(JSON.parse(saved) as Partial<Form>) }));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (output) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [output]);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(form));
    } catch {
      /* ignore */
    }
    try {
      setOutput(await adviseTargeting({ ...form, currency: form.currency || undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <label className={`${labelClass} sm:col-span-2`}>
          What do you sell? <span className="text-red-600">*</span>
          <input
            className={inputClass}
            required
            minLength={2}
            maxLength={300}
            placeholder="e.g. Women's lawn suits, handmade leather wallets, dental clinic"
            value={form.product}
            onChange={set("product")}
          />
        </label>
        <label className={labelClass}>
          Country or cities you sell to <span className="text-red-600">*</span>
          <input
            className={inputClass}
            required
            minLength={2}
            maxLength={200}
            placeholder="e.g. Pakistan, or Lahore and Karachi"
            value={form.country}
            onChange={set("country")}
          />
        </label>
        <label className={labelClass}>
          Goal
          <select className={inputClass} value={form.goal} onChange={set("goal")}>
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Price
          <input className={inputClass} maxLength={60} placeholder="e.g. 3,500" value={form.price ?? ""} onChange={set("price")} />
        </label>
        <div className={labelClass}>
          <label htmlFor="advisor-currency">Currency</label>
          <CurrencySelect
            id="advisor-currency"
            value={form.currency ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, currency: v }))}
            autoOption="Choose currency"
            className="mt-1"
          />
        </div>
        <label className={labelClass}>
          Daily budget you can spend <span className="font-normal text-slate-400">(optional)</span>
          <input className={inputClass} maxLength={60} placeholder="e.g. 2,000 a day" value={form.budget ?? ""} onChange={set("budget")} />
        </label>
        <label className={labelClass}>
          Anything you know about your buyers <span className="font-normal text-slate-400">(optional)</span>
          <input
            className={inputClass}
            maxLength={400}
            placeholder="e.g. mostly mothers, students, office workers"
            value={form.customer ?? ""}
            onChange={set("customer")}
          />
        </label>
        <div className="flex flex-col items-center gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : output ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Crosshair className="h-4 w-4" />
            )}
            {loading ? "Building your targeting plan…" : output ? "Get a new plan" : "Find my best audience"}
          </button>
          {loading && <p className="text-xs text-slate-500">This usually takes 10 to 30 seconds.</p>}
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {output && (
        <div ref={resultRef} className="scroll-mt-24">
          <Plan output={output} />
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
            <Wallet className="h-4 w-4" /> After 7 days, export your results with an Age, Gender, Region or Placement breakdown and upload
            them to see which segments really work.
          </p>
        </div>
      )}
    </div>
  );
}
