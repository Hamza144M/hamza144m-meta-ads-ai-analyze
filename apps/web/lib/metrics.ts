import { formatCompact, formatCurrency, formatNumber, formatPercent, formatRatio, type Metrics, type ReportData } from "@maa/core";

export type MetricKey = keyof Metrics;
export type MetricFormat = "currency" | "number" | "percent" | "ratio" | "decimal";

export interface MetricDef {
  key: MetricKey;
  label: string;
  format: MetricFormat;
  /** true when a lower value is better (CPM, CPC, CPA…) */
  lowerIsBetter?: boolean;
  hint: string;
}

export const METRICS: Record<string, MetricDef> = {
  spend: { key: "spend", label: "Total spend", format: "currency", hint: "Amount spent across all rows." },
  impressions: { key: "impressions", label: "Impressions", format: "number", hint: "Times your ads were on screen." },
  reach: { key: "reach", label: "Reach", format: "number", hint: "People who saw your ads (summed across rows)." },
  frequency: { key: "frequency", label: "Frequency", format: "decimal", lowerIsBetter: true, hint: "Impressions ÷ reach." },
  cpm: { key: "cpm", label: "CPM", format: "currency", lowerIsBetter: true, hint: "Cost per 1,000 impressions." },
  clicks: { key: "clicks", label: "Clicks (all)", format: "number", hint: "All clicks, including likes and profile clicks." },
  linkClicks: { key: "linkClicks", label: "Link clicks", format: "number", hint: "Clicks to your destination." },
  ctr: { key: "ctr", label: "CTR (link)", format: "percent", hint: "Link clicks ÷ impressions." },
  cpc: { key: "cpc", label: "CPC (link)", format: "currency", lowerIsBetter: true, hint: "Spend ÷ link clicks." },
  landingPageViews: { key: "landingPageViews", label: "Landing page views", format: "number", hint: "Clicks where the page loaded." },
  leads: { key: "leads", label: "Leads", format: "number", hint: "Lead events tracked by Meta." },
  messages: { key: "messages", label: "Messaging conversations", format: "number", hint: "Conversations started." },
  purchases: { key: "purchases", label: "Purchases", format: "number", hint: "Purchase events tracked by Meta." },
  revenue: { key: "revenue", label: "Revenue", format: "currency", hint: "Purchase conversion value." },
  roas: { key: "roas", label: "ROAS", format: "ratio", hint: "Revenue ÷ spend." },
  results: { key: "results", label: "Results", format: "number", hint: "Meta's Results column, or purchases → leads → messages." },
  costPerResult: { key: "costPerResult", label: "Cost per result", format: "currency", lowerIsBetter: true, hint: "Spend ÷ results." },
  cpa: { key: "cpa", label: "CPA", format: "currency", lowerIsBetter: true, hint: "Spend ÷ purchases (or leads)." },
  conversionRate: { key: "conversionRate", label: "Conversion rate", format: "percent", hint: "Results ÷ link clicks." },
  addsToCart: { key: "addsToCart", label: "Adds to cart", format: "number", hint: "Add-to-cart events." },
  checkouts: { key: "checkouts", label: "Checkouts initiated", format: "number", hint: "Initiate-checkout events." },
  hookRate: { key: "hookRate", label: "Hook rate", format: "percent", hint: "3-second video plays ÷ impressions." },
  landingPageViewRate: { key: "landingPageViewRate", label: "LPV rate", format: "percent", hint: "Landing page views ÷ link clicks." },
};

export function formatMetric(value: number | null | undefined, format: MetricFormat, currency: string | null, compact = false): string {
  switch (format) {
    case "currency":
      return formatCurrency(value, currency, value != null && Math.abs(value) >= 1000 ? 0 : 2);
    case "number":
      return compact ? formatCompact(value) : formatNumber(value);
    case "percent":
      return formatPercent(value);
    case "ratio":
      return formatRatio(value);
    case "decimal":
      return formatNumber(value, 2);
  }
}

export function fmt(report: ReportData, key: string, value: number | null | undefined, compact = false) {
  const def = METRICS[key];
  return formatMetric(value, def?.format ?? "number", report.currency, compact);
}
