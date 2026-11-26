"use client";

import { ArrowDownRight, ArrowUpRight, Compass, Info, Lightbulb, MapPin, MonitorSmartphone, Users } from "lucide-react";
import Link from "next/link";
import { adviseTargeting, type DimensionAdvice, type ReportData, type SegmentVerdict, type TargetingDimension } from "@maa/core";
import { Section } from "@/components/analysis/ui";
import { fmt } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export const VERDICT_STYLE: Record<SegmentVerdict, { label: string; cls: string }> = {
  scale: { label: "Scale", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" },
  keep: { label: "Keep", cls: "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300" },
  watch: { label: "Reduce", cls: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300" },
  cut: { label: "Cut", cls: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300" },
  low_data: { label: "Low data", cls: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400" },
};

const ICONS: Record<TargetingDimension, typeof Users> = { age: Users, gender: Users, region: MapPin, placement: MonitorSmartphone };
const BASIS_COL = { roas: "ROAS", costPerResult: "Cost / result", ctr: "CTR (link)" } as const;

function DimensionCard({ report, advice }: { report: ReportData; advice: DimensionAdvice }) {
  const Icon = ICONS[advice.dimension];
  const segs = [...advice.segments].sort((a, b) => b.metrics.spend - a.metrics.spend).slice(0, 15);
  return (
    <Section icon={Icon} title={advice.label} subtitle={`Each segment compared with your account average ${BASIS_COL[advice.basis]}`}>
      {(advice.best || advice.worst) && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {advice.best && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <ArrowUpRight className="h-4 w-4" /> Best: {advice.best}
            </span>
          )}
          {advice.worst && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 font-medium text-red-700 dark:bg-red-400/10 dark:text-red-300">
              <ArrowDownRight className="h-4 w-4" /> Weakest: {advice.worst}
            </span>
          )}
        </div>
      )}
      <div className="-mx-5 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-white/10">
              <th className="px-5 py-2 font-medium sm:pl-0">Segment</th>
              <th className="px-2 py-2 text-right font-medium">Spend</th>
              <th className="px-2 py-2 text-right font-medium">Results</th>
              <th className="px-2 py-2 text-right font-medium">{BASIS_COL[advice.basis]}</th>
              <th className="px-5 py-2 font-medium sm:pr-0">Advice</th>
            </tr>
          </thead>
          <tbody>
            {segs.map((s) => (
              <tr key={s.key} className="border-b border-slate-100 align-top last:border-0 dark:border-white/5">
                <td className="px-5 py-3 font-medium text-slate-900 sm:pl-0 dark:text-white">{s.key}</td>
                <td className="whitespace-nowrap px-2 py-3 text-right text-slate-700 dark:text-slate-300">
                  {fmt(report, "spend", s.metrics.spend, true)}
                  <span className="block text-xs text-slate-400">{s.spendShare.toFixed(0)}%</span>
                </td>
                <td className="px-2 py-3 text-right text-slate-700 dark:text-slate-300">{fmt(report, "results", s.metrics.results)}</td>
                <td className="whitespace-nowrap px-2 py-3 text-right text-slate-700 dark:text-slate-300">
                  {fmt(report, advice.basis, s.metrics[advice.basis])}
                </td>
                <td className="px-5 py-3 sm:pr-0">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", VERDICT_STYLE[s.verdict].cls)}>
                    {VERDICT_STYLE[s.verdict].label}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{s.reason}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 space-y-2 rounded-xl bg-brand-50/60 p-4 text-sm dark:bg-brand-400/5">
        {advice.tips.map((t) => (
          <li key={t} className="flex gap-2 text-slate-700 dark:text-slate-300">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" /> {t}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const EXPORT_STEPS = [
  "In Ads Manager, open the Campaigns, Ad sets or Ads tab and pick your date range.",
  "Click Breakdown → By delivery, then choose Age, Gender, Age and gender, Country, Region or Placement.",
  "Click Export → Export table data and pick .csv or .xlsx.",
  "Upload that file here. Do one export per breakdown (for example one for age and gender, one for placement).",
];

export function BreakdownGuide({ missing }: { missing: string[] }) {
  return (
    <Section icon={Info} title={missing.length === 4 ? "Add breakdowns to see who buys" : `Also export: ${missing.join(", ")}`}>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {missing.length === 4
          ? "This report has no age, gender, location or placement columns, so we can't tell which people and placements work best."
          : "Your report doesn't include these breakdowns yet."}
      </p>
      <ol className="space-y-3">
        {EXPORT_STEPS.map((t, i) => (
          <li key={t} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function TargetingView({ report }: { report: ReportData }) {
  const advice = adviseTargeting(report);
  const have = new Set(advice.map((a) => a.dimension));
  const missing = (["Age", "Gender", "Location", "Placement"] as const).filter(
    (_, i) => !have.has((["age", "gender", "region", "placement"] as const)[i]),
  );
  return (
    <div className="space-y-6">
      {advice.length > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-white">Scale</strong> means the segment beats your average by 25% or more.{" "}
          <strong className="text-slate-900 dark:text-white">Cut</strong> means it is 40% worse, or spent a lot with no results. Segments
          under 3% of spend are marked low data.
        </p>
      )}
      {advice.map((a) => (
        <DimensionCard key={a.dimension} report={report} advice={a} />
      ))}
      {missing.length > 0 && <BreakdownGuide missing={[...missing]} />}
      <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Compass className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Starting a new campaign?</p>
            <p className="text-sm text-slate-500">Get a suggested age, gender, locations, interests, placements and budget.</p>
          </div>
        </div>
        <Link href="/targeting" className="btn-secondary shrink-0">
          Open targeting advisor
        </Link>
      </div>
    </div>
  );
}
