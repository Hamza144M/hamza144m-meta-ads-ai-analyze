import { ArrowDown } from "lucide-react";
import type { ReportData } from "@maa/core";
import { formatCompact, formatNumber, formatPercent } from "@maa/core";
import { ChartCard, EmptyChart } from "./ChartCard";

// ASSUMPTION: rough benchmark step rates used only to flag likely bottlenecks
// on the dashboard. The AI analysis gives the nuanced read.
const WEAK_STEP_RATE: Partial<Record<string, number>> = {
  linkClicks: 0.9, // CTR below 0.9%
  landingPageViews: 70,
  addsToCart: 5,
  checkouts: 35,
  purchases: 40,
};

/** Ordinal blue ramp from light to dark for funnel stages. */
const RAMP = ["#84b9f3", "#6aabf1", "#519ced", "#338ced", "#257de0", "#2370cd", "#1b64be", "#1757ac"];

export function FunnelChart({ report }: { report: ReportData }) {
  const steps = report.funnel;
  if (steps.length < 2) {
    return (
      <ChartCard title="Conversion funnel">
        <EmptyChart message="Include clicks, landing page views and conversion columns in your export to see the funnel." />
      </ChartCard>
    );
  }
  const max = steps[0].value;
  // log scale keeps late, small stages visible next to impressions
  const width = (v: number) => Math.max(6, (Math.log10(v + 1) / Math.log10(max + 1)) * 100);

  return (
    <ChartCard title="Conversion funnel" subtitle="Bar length on a log scale so every stage stays visible">
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const weakAt = WEAK_STEP_RATE[s.key];
          const weak = s.rateFromPrevious != null && weakAt != null && s.rateFromPrevious < weakAt;
          return (
            <li key={s.key}>
              {i > 0 && (
                <div className="flex items-center gap-1.5 py-1 pl-1 text-xs text-slate-500">
                  <ArrowDown className="h-3 w-3" />
                  <span className={weak ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                    {formatPercent(s.rateFromPrevious, s.rateFromPrevious != null && s.rateFromPrevious < 1 ? 2 : 1)} of {s.fromLabel}
                    {weak && " · likely bottleneck"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm text-slate-600 sm:w-40 dark:text-slate-300">{s.label}</div>
                <div className="relative h-8 flex-1">
                  <div
                    className="flex h-8 items-center rounded-[4px] px-2 text-xs font-semibold text-white transition-[width] duration-700"
                    style={{ width: `${width(s.value)}%`, background: RAMP[Math.min(i, RAMP.length - 1)] }}
                    title={`${s.label}: ${formatNumber(s.value)}`}
                  />
                </div>
                <div className="tabular w-16 shrink-0 text-right text-sm font-semibold text-slate-900 dark:text-white">
                  {formatCompact(s.value)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </ChartCard>
  );
}
