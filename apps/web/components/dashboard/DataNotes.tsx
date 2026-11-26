import { AlertTriangle, FileCheck2 } from "lucide-react";
import type { ReportData } from "@maa/core";

const FIELD_LABELS: Record<string, string> = {
  campaign: "Campaign",
  adSet: "Ad set",
  ad: "Ad",
  date: "Day",
  reportingStart: "Reporting start",
  reportingEnd: "Reporting end",
  age: "Age",
  gender: "Gender",
  region: "Region",
  placement: "Placement",
  delivery: "Delivery",
  objective: "Objective",
  resultType: "Result type",
  budgetType: "Budget type",
  spend: "Spend",
  impressions: "Impressions",
  reach: "Reach",
  clicks: "Clicks (all)",
  linkClicks: "Link clicks",
  landingPageViews: "Landing page views",
  leads: "Leads",
  messages: "Messages",
  addsToCart: "Adds to cart",
  checkouts: "Checkouts",
  purchases: "Purchases",
  revenue: "Revenue",
  results: "Results",
  videoPlays3s: "3s video plays",
  thruPlays: "ThruPlays",
  postEngagement: "Post engagement",
  budget: "Budget",
  roas: "ROAS",
  frequency: "Frequency",
  costPerResult: "Cost per result",
};

/** Shows which columns we recognized and any caveats about the data. */
export function DataNotes({ report }: { report: ReportData }) {
  const mapped = Object.entries(report.columnMap);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {report.warnings.length > 0 && (
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Data notes
          </h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-400">
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <details className="card p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <FileCheck2 className="h-4 w-4 text-brand-600" /> How we read your file
          <span className="ml-auto text-xs font-normal text-slate-500">
            {mapped.length} columns recognized · {report.rowCount} rows
          </span>
        </summary>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          {mapped.map(([field, header]) => (
            <div key={field} className="flex justify-between gap-3">
              <dt className="text-slate-500">{FIELD_LABELS[field] ?? field}</dt>
              <dd className="truncate text-right font-medium text-slate-800 dark:text-slate-200" title={header}>
                {header}
              </dd>
            </div>
          ))}
        </dl>
        {report.unmappedColumns.length > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            Not used: {report.unmappedColumns.slice(0, 20).join(", ")}
            {report.unmappedColumns.length > 20 && ` and ${report.unmappedColumns.length - 20} more`}
          </p>
        )}
      </details>
    </section>
  );
}
