import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Upload } from "lucide-react";
import Link from "next/link";

const BARS = [42, 58, 51, 66, 72, 61, 80, 88, 76, 94];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl animate-float lg:max-w-none">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-500/30 via-indigo-500/20 to-sky-400/30 blur-2xl" />
      <div className="card overflow-hidden">
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-3 dark:border-white/5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="ml-3 text-xs text-slate-500">Q4 Account Audit · 6 campaigns</span>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4">
          {[
            { label: "ROAS", value: "3.42x", delta: "+18%" },
            { label: "CPA", value: "$21.80", delta: "−12%" },
            { label: "CTR", value: "1.74%", delta: "+0.3pt" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <p className="text-[11px] font-medium text-slate-500">{k.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{k.delta}</p>
            </div>
          ))}
        </div>
        <div className="px-4">
          <div className="flex h-28 items-end gap-1.5 rounded-xl bg-gradient-to-b from-brand-50 to-transparent p-3 dark:from-brand-500/10">
            {BARS.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-[4px] bg-brand-500/80 dark:bg-brand-400/80" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="m-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-400/20 dark:bg-brand-400/10">
          <p className="flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" /> AI insight
          </p>
          <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
            &ldquo;Interest Stack | Fitness&rdquo; spent $2,240 at 0.9x ROAS. Shift 40% of its budget to Retargeting (4.1x) and refresh the
            &ldquo;Old Hook&rdquo; video — frequency hit 4.3.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(37,99,235,.18),transparent)] dark:bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(37,99,235,.28),transparent)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(100,116,139,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      <div className="container grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-2 lg:pb-28">
        <div className="animate-fade-up text-center lg:text-left">
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" /> Your AI media buyer with 15+ years of experience
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
            Turn your Meta Ads report into a <span className="text-gradient">growth plan</span> in 60 seconds
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 lg:mx-0 dark:text-slate-400">
            Upload a CSV or Excel export from Ads Manager. Get an instant dashboard, a consultant-grade audit, KPI scorecard, and the exact
            changes to cut CPA and scale ROAS.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/upload" className="btn-primary h-12 px-6 text-base">
              <Upload className="h-4 w-4" /> Upload Your Meta Ads Report
            </Link>
            <Link href="/targeting" className="btn-secondary h-12 px-6 text-base">
              Find your target audience <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600 lg:justify-start dark:text-slate-400">
            {["No Meta login required", "CSV & XLSX", "Results in under a minute"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {t}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Your data stays private
            </li>
          </ul>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}
