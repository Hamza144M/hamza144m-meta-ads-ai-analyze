import { Download, Sparkles, TrendingUp, UploadCloud } from "lucide-react";

const STEPS = [
  {
    icon: Download,
    title: "Export from Ads Manager",
    body: "In Ads Manager, pick your date range and columns, then click Export → Export table data (.csv or .xlsx).",
  },
  {
    icon: UploadCloud,
    title: "Drop the file here",
    body: "Drag and drop your export. We map Meta’s column names automatically. No login to your ad account.",
  },
  {
    icon: Sparkles,
    title: "Get your AI audit",
    body: "See your dashboard instantly, then a full audit: scorecard, bottlenecks, creative and budget recommendations.",
  },
  {
    icon: TrendingUp,
    title: "Act and scale",
    body: "Follow the quick wins and roadmap, ask follow-up questions, and export a report for your team or client.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-20 sm:py-28 dark:bg-slate-950/60">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title mt-4">From export to action plan in four steps</h2>
        </div>
        <ol className="relative mt-14 grid gap-6 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block dark:via-brand-500/40" />
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative text-center">
              <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lift ring-8 ring-white dark:ring-slate-950">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">Step {i + 1}</p>
              <h3 className="mt-1 font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-400">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
