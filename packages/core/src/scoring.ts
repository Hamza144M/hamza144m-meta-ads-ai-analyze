import { USD_LIKE_CURRENCIES, usdRateFor } from "./currency";
import { resultCount } from "./metrics";
import type { ReportData } from "./types";

/**
 * Deterministic 1–100 KPI scorecard.
 *
 * ASSUMPTION: thresholds are broad, cross-industry Meta Ads benchmarks in USD
 * (2025–26). They are a starting point, not a verdict: the AI analysis explains
 * each score in the context of the account's objective. Edit BENCHMARKS to tune.
 */
export type ScoreStatus = "good" | "warning" | "critical" | "unknown";
export type ScoreKey =
  "ctr" | "cpm" | "cpc" | "cpa" | "roas" | "frequency" | "creative" | "audience" | "funnel" | "landingPage" | "overall";

export interface Score {
  key: ScoreKey;
  label: string;
  score: number | null;
  status: ScoreStatus;
  /** One line on what the score is based on. */
  basis: string;
}

type Curve = [value: number, score: number][];

/** Piecewise-linear interpolation; points sorted by value ascending. */
function curve(points: Curve, value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (value <= x1) return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

export const BENCHMARKS = {
  ctr: [
    [0.3, 15],
    [0.6, 35],
    [0.9, 55],
    [1.2, 70],
    [1.6, 85],
    [2.5, 97],
  ] as Curve,
  cpm: [
    [5, 95],
    [8, 88],
    [12, 74],
    [18, 55],
    [25, 35],
    [40, 12],
  ] as Curve,
  cpc: [
    [0.3, 95],
    [0.6, 85],
    [1, 72],
    [1.6, 55],
    [2.5, 35],
    [4, 15],
  ] as Curve,
  roas: [
    [0.5, 10],
    [1, 30],
    [1.5, 50],
    [2, 65],
    [3, 82],
    [4, 92],
    [6, 98],
  ] as Curve,
  frequency: [
    [1.2, 95],
    [1.8, 85],
    [2.5, 70],
    [3.5, 50],
    [5, 25],
    [7, 8],
  ] as Curve,
  hookRate: [
    [10, 20],
    [15, 40],
    [20, 58],
    [25, 72],
    [30, 85],
    [40, 96],
  ] as Curve,
  lpvRate: [
    [35, 15],
    [50, 35],
    [65, 58],
    [75, 75],
    [85, 90],
    [95, 98],
  ] as Curve,
  conversionRate: [
    [0.5, 15],
    [1.5, 38],
    [3, 58],
    [5, 74],
    [10, 90],
    [20, 98],
  ] as Curve,
  /** purchase CPA as a share of average order value (lower is better) */
  cpaToAov: [
    [0.15, 96],
    [0.25, 88],
    [0.4, 72],
    [0.6, 52],
    [1, 25],
    [1.5, 8],
  ] as Curve,
  leadCpa: [
    [3, 95],
    [8, 82],
    [15, 68],
    [30, 48],
    [60, 25],
    [120, 8],
  ] as Curve,
  messageCpa: [
    [1, 95],
    [2.5, 82],
    [5, 66],
    [10, 45],
    [20, 22],
    [40, 8],
  ] as Curve,
  atcRate: [
    [1, 18],
    [2, 35],
    [4, 55],
    [6, 70],
    [10, 88],
    [15, 96],
  ] as Curve,
  checkoutRate: [
    [15, 20],
    [25, 40],
    [35, 58],
    [45, 74],
    [60, 90],
  ] as Curve,
  purchaseRate: [
    [20, 22],
    [30, 42],
    [40, 60],
    [50, 75],
    [65, 92],
  ] as Curve,
  leadRate: [
    [1, 15],
    [3, 38],
    [6, 58],
    [10, 75],
    [15, 88],
    [25, 97],
  ] as Curve,
};

export function statusOf(score: number | null): ScoreStatus {
  if (score == null) return "unknown";
  if (score >= 70) return "good";
  if (score >= 45) return "warning";
  return "critical";
}

const avg = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

const clamp = (n: number | null) => (n == null ? null : Math.round(Math.min(100, Math.max(1, n))));

export function computeScorecard(r: ReportData): Score[] {
  const t = r.totals;
  const curr = r.currency ?? "USD";
  // Convert money metrics to USD before applying the USD benchmarks.
  const usdLike = !r.currency || USD_LIKE_CURRENCIES.has(r.currency);
  const rate = usdLike && !r.usdRate ? 1 : usdRateFor(r.currency, r.usdRate);
  const moneyComparable = rate != null;
  const toUsd = (n: number | null) => (n == null || rate == null ? null : n / rate);
  const fmt = (n: number | null | undefined, d = 2) => (n == null ? "n/a" : n.toFixed(d));

  const ctr = curve(BENCHMARKS.ctr, t.ctr);
  const cpm = moneyComparable ? curve(BENCHMARKS.cpm, toUsd(t.cpm)) : null;
  const cpc = moneyComparable ? curve(BENCHMARKS.cpc, toUsd(t.cpc)) : null;
  const roas = t.revenue > 0 ? curve(BENCHMARKS.roas, t.roas) : null;
  const frequency = curve(BENCHMARKS.frequency, t.frequency);

  let cpa: number | null = null;
  let cpaBasis = "No purchases, leads or messages in the export.";
  if (t.purchases > 0 && t.revenue > 0 && t.cpa != null) {
    const aov = t.revenue / t.purchases;
    cpa = curve(BENCHMARKS.cpaToAov, t.cpa / aov);
    cpaBasis = `Cost per purchase ${fmt(t.cpa)} ${curr} is ${fmt((t.cpa / aov) * 100, 0)}% of the average order value.`;
  } else if (moneyComparable && t.leads > 0 && t.cpa != null) {
    cpa = curve(BENCHMARKS.leadCpa, toUsd(t.cpa));
    cpaBasis = `Cost per lead ${fmt(t.cpa)} ${curr}.`;
  } else if (moneyComparable && t.messages > 0 && t.cpa != null) {
    cpa = curve(BENCHMARKS.messageCpa, toUsd(t.cpa));
    cpaBasis = `Cost per conversation ${fmt(t.cpa)} ${curr}.`;
  }

  // Creative: click-through, hook rate, and the share of spend on fatiguing ads.
  const hook = curve(BENCHMARKS.hookRate, t.hookRate);
  const fatiguedSpend = r.ads
    .filter((a) => a.trend?.ctr != null && a.trend.ctr < -25 && (a.trend.frequency ?? 0) > 10)
    .reduce((s, a) => s + a.metrics.spend, 0);
  const fatigueShare = t.spend > 0 ? fatiguedSpend / t.spend : 0;
  const creativeBase = avg([ctr, hook]);
  const creative = creativeBase == null ? null : creativeBase - fatigueShare * 40;

  const conv = curve(BENCHMARKS.conversionRate, t.conversionRate);
  const audience = avg([frequency, frequency, cpm, conv]); // frequency weighted double

  const lpvRate = r.funnel.find((f) => f.key === "landingPageViews")?.rateFromPrevious ?? null;
  const landingPage = curve(BENCHMARKS.lpvRate, lpvRate);

  const step = (key: string) => r.funnel.find((f) => f.key === key)?.rateFromPrevious ?? null;
  const funnel = avg([
    t.addsToCart > 0 ? curve(BENCHMARKS.atcRate, step("addsToCart")) : null,
    t.checkouts > 0 ? curve(BENCHMARKS.checkoutRate, step("checkouts")) : null,
    t.purchases > 0 && t.checkouts > 0 ? curve(BENCHMARKS.purchaseRate, step("purchases")) : null,
    t.leads > 0 ? curve(BENCHMARKS.leadRate, step("leads")) : null,
    landingPage,
  ]);

  const weighted: [number | null, number][] = [
    [roas, 3],
    [cpa, 3],
    [ctr, 2],
    [cpm, 1],
    [cpc, 1],
    [frequency, 1],
    [creative, 2],
    [audience, 1],
    [funnel, 2],
    [landingPage, 1],
  ];
  const present = weighted.filter(([s]) => s != null) as [number, number][];
  const overall = present.length ? present.reduce((a, [s, w]) => a + s * w, 0) / present.reduce((a, [, w]) => a + w, 0) : null;

  const noMoney = `Not scored: set a USD exchange rate for ${r.currency} in the report's currency settings.`;
  const usdNote = rate != null && rate !== 1 ? ` (scored at 1 USD = ${rate} ${curr})` : "";
  const items: [ScoreKey, string, number | null, string][] = [
    ["ctr", "CTR", ctr, `Link CTR ${fmt(t.ctr)}% (≈1.2% is a healthy average).`],
    ["cpm", "CPM", cpm, moneyComparable ? `CPM ${fmt(t.cpm)} ${curr}${usdNote}.` : noMoney],
    ["cpc", "CPC", cpc, moneyComparable ? `Cost per link click ${fmt(t.cpc)} ${curr}${usdNote}.` : noMoney],
    ["cpa", "CPA", cpa, cpaBasis],
    ["roas", "ROAS", roas, t.revenue > 0 ? `ROAS ${fmt(t.roas)}x.` : "No conversion value column, so ROAS isn't available."],
    ["frequency", "Frequency", frequency, `Average frequency ${fmt(t.frequency)}.`],
    [
      "creative",
      "Creative",
      creative,
      `CTR${t.hookRate != null ? ` and ${fmt(t.hookRate, 1)}% hook rate` : ""}${fatigueShare > 0 ? `; ${fmt(fatigueShare * 100, 0)}% of spend on ads showing fatigue` : ""}.`,
    ],
    ["audience", "Audience", audience, `Frequency, CPM and ${fmt(t.conversionRate)}% conversion rate.`],
    ["funnel", "Funnel", funnel, "Step-by-step conversion rates from click to result."],
    [
      "landingPage",
      "Landing page",
      landingPage,
      t.landingPageViews > 0
        ? `${fmt(lpvRate, 0)}% of link clicks became landing page views (website campaigns only).`
        : "No landing page views column.",
    ],
    ["overall", "Overall performance", overall, "Weighted: ROAS and CPA ×3; CTR, creative and funnel ×2; others ×1."],
  ];
  return items.map(([key, label, score, basis]) => {
    const s = clamp(score);
    return { key, label, score: s, status: statusOf(s), basis };
  });
}

/** Convenience for rule-based insights and the AI context. */
export function accountResultLabel(r: ReportData): string {
  const t = r.totals;
  if (t.purchases > 0) return "purchases";
  if (t.leads > 0) return "leads";
  if (t.messages > 0) return "messaging conversations";
  return resultCount(t) > 0 ? "results" : "clicks";
}
