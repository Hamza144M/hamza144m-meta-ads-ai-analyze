import type { BreakdownItem, Metrics, ReportData } from "./types";

/**
 * Rule-based targeting advice for age, gender, location and placement breakdowns.
 * No AI call: every segment is compared with the account average on the metric that
 * matters most for this report (ROAS, then cost per result, then link CTR).
 */

export type TargetingDimension = "age" | "gender" | "region" | "placement";
export type SegmentVerdict = "scale" | "keep" | "watch" | "cut" | "low_data";
export type TargetingBasis = "roas" | "costPerResult" | "ctr";

export interface SegmentAdvice {
  key: string;
  metrics: Metrics;
  spendShare: number; // percent of the dimension's spend
  /** Efficiency vs the account average (1 = same, 1.5 = 50% better), null when not comparable. */
  index: number | null;
  verdict: SegmentVerdict;
  reason: string;
}

export interface DimensionAdvice {
  dimension: TargetingDimension;
  label: string;
  basis: TargetingBasis;
  segments: SegmentAdvice[];
  best: string | null;
  worst: string | null;
  tips: string[];
}

export const TARGETING_DIMENSIONS: { key: TargetingDimension; label: string }[] = [
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "region", label: "Location" },
  { key: "placement", label: "Placement" },
];

const MIN_SHARE = 3; // percent of spend before a segment is judged

function pickBasis(t: Metrics): TargetingBasis {
  if (t.roas != null && t.revenue > 0) return "roas";
  if (t.costPerResult != null && t.results > 0) return "costPerResult";
  return "ctr";
}

function efficiency(basis: TargetingBasis, m: Metrics, avg: Metrics): number | null {
  if (basis === "roas") return avg.roas ? (m.roas ?? 0) / avg.roas : null;
  if (basis === "costPerResult") {
    if (!avg.costPerResult) return null;
    if (!m.results) return 0;
    return m.costPerResult ? avg.costPerResult / m.costPerResult : null;
  }
  return avg.ctr ? (m.ctr ?? 0) / avg.ctr : null;
}

/** How far the segment's own metric is from the average, as a percent string. */
function gap(basis: TargetingBasis, idx: number): string {
  // idx is "efficiency vs average"; for cost per result the segment's value is average / idx.
  const ratio = basis === "costPerResult" ? 1 / idx : idx;
  return `${Math.round(Math.abs(ratio - 1) * 100)}%`;
}
const BASIS_LABEL: Record<TargetingBasis, string> = { roas: "ROAS", costPerResult: "cost per result", ctr: "link CTR" };

function judge(
  basis: TargetingBasis,
  m: Metrics,
  share: number,
  idx: number | null,
  avg: Metrics,
): Pick<SegmentAdvice, "verdict" | "reason"> {
  const label = BASIS_LABEL[basis];
  if (share < MIN_SHARE) return { verdict: "low_data", reason: `Only ${share.toFixed(1)}% of spend, too little to judge yet.` };
  if (basis === "costPerResult" && !m.results) {
    const wasted = avg.costPerResult ? m.spend / avg.costPerResult : 0;
    return wasted >= 2
      ? { verdict: "cut", reason: `No results after spending about ${wasted.toFixed(1)}× your average cost per result.` }
      : { verdict: "watch", reason: "No results yet. Give it a little more budget before deciding." };
  }
  if (idx == null) return { verdict: "keep", reason: "Not enough data to compare with the average." };
  if (idx === 0)
    return {
      verdict: "cut",
      reason:
        basis === "roas"
          ? "No sales value yet from this segment. Exclude it or cut its budget."
          : "No link clicks yet. Exclude it or cut its budget.",
    };
  const better = basis === "costPerResult" ? "cheaper" : "higher";
  const worse = basis === "costPerResult" ? "more expensive" : "lower";
  if (idx >= 1.25) return { verdict: "scale", reason: `${label} is ${gap(basis, idx)} ${better} than average. Give it more budget.` };
  if (idx >= 0.85) return { verdict: "keep", reason: `${label} is close to the account average.` };
  if (idx >= 0.6)
    return { verdict: "watch", reason: `${label} is ${gap(basis, idx)} ${worse} than average. Lower its budget or test new creative.` };
  return { verdict: "cut", reason: `${label} is ${gap(basis, idx)} ${worse} than average. Exclude it or cut its budget.` };
}

function tipsFor(dim: TargetingDimension, segs: SegmentAdvice[]): string[] {
  const scale = segs.filter((s) => s.verdict === "scale").map((s) => s.key);
  const cut = segs.filter((s) => s.verdict === "cut").map((s) => s.key);
  const tips: string[] = [];
  const list = (a: string[]) => a.slice(0, 4).join(", ");
  if (dim === "age") {
    if (scale.length) tips.push(`Build a separate ad set or lookalike for ages ${list(scale)}, or narrow the age range toward them.`);
    if (cut.length) tips.push(`Remove ages ${list(cut)} from the age range, or set a lower budget for them in their own ad set.`);
  } else if (dim === "gender") {
    if (scale.length && cut.length) tips.push(`Target ${list(scale)} only, or make separate ad sets so each gender gets its own budget.`);
    else if (scale.length) tips.push(`Test creative and copy written for ${list(scale)}.`);
  } else if (dim === "region") {
    if (scale.length) tips.push(`Move budget to ${list(scale)}. Give the top locations their own ad set.`);
    if (cut.length) tips.push(`Exclude ${list(cut)} in the Locations setting (Exclude), or lower their budget.`);
  } else {
    if (cut.length)
      tips.push(
        `In the ad set, open Placements → Manual and untick ${list(cut)}. Keep Advantage+ placements if most placements are near average.`,
      );
    if (scale.length) tips.push(`Make creative in the right shape for ${list(scale)} (9:16 for Stories and Reels, 4:5 for Feed).`);
  }
  if (!tips.length) tips.push("No segment stands out yet. Keep the current setup and check again after more spend.");
  return tips;
}

export function adviseDimension(report: ReportData, dimension: TargetingDimension): DimensionAdvice | null {
  const items: BreakdownItem[] = report[dimension];
  if (items.length < 2) return null;
  const avg = report.totals;
  const basis = pickBasis(avg);
  const totalSpend = items.reduce((s, i) => s + i.metrics.spend, 0) || 1;
  const segments: SegmentAdvice[] = items.map((i) => {
    const share = (i.metrics.spend / totalSpend) * 100;
    const idx = efficiency(basis, i.metrics, avg);
    return { key: i.key, metrics: i.metrics, spendShare: share, index: idx, ...judge(basis, i.metrics, share, idx, avg) };
  });
  const judged = segments.filter((s) => s.verdict !== "low_data" && s.index != null);
  const sorted = [...judged].sort((a, b) => (b.index ?? 0) - (a.index ?? 0));
  return {
    dimension,
    label: TARGETING_DIMENSIONS.find((d) => d.key === dimension)!.label,
    basis,
    segments,
    best: sorted[0]?.key ?? null,
    worst: sorted.length > 1 ? sorted[sorted.length - 1].key : null,
    tips: tipsFor(dimension, segments),
  };
}

export function adviseTargeting(report: ReportData): DimensionAdvice[] {
  return TARGETING_DIMENSIONS.map((d) => adviseDimension(report, d.key)).filter((d): d is DimensionAdvice => d !== null);
}
