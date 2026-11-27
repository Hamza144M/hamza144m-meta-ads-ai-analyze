import { formatCurrency, formatNumber, formatPercent, formatRatio } from "./format";
import type { BreakdownItem, Metrics } from "./types";

/**
 * Rule-based "ad A vs ad B" comparison. Works fully offline (no AI), so it
 * keeps working when the AI provider is out of quota.
 */

export type CompareGoal = "revenue" | "results" | "clicks";

export type CompareMetricKey =
  | "spend"
  | "impressions"
  | "reach"
  | "linkClicks"
  | "results"
  | "revenue"
  | "roas"
  | "costPerResult"
  | "conversionRate"
  | "ctr"
  | "cpc"
  | "cpm"
  | "frequency"
  | "hookRate"
  | "landingPageViewRate";

export interface CompareRow {
  key: CompareMetricKey;
  label: string;
  a: number | null;
  b: number | null;
  aText: string;
  bText: string;
  /** Which side is better on this metric, or null for info-only / tie / missing. */
  better: "a" | "b" | null;
  /** How much better, in percent, from the winner's point of view. */
  diffPct: number | null;
}

export interface CompareResult {
  goal: CompareGoal;
  goalLabel: string;
  winner: "a" | "b" | "tie";
  /** How sure we are: more data and bigger gaps give higher confidence. */
  confidence: "high" | "medium" | "low";
  headline: string;
  /** Why the winner wins, most important first. */
  reasons: string[];
  /** Where the loser is still better (fair-play notes). */
  loserStrengths: string[];
  /** Data-quality cautions. */
  cautions: string[];
  /** What to do next. */
  actions: string[];
  rows: CompareRow[];
  scoreA: number;
  scoreB: number;
}

interface MetricSpec {
  key: CompareMetricKey;
  label: string;
  kind: "money" | "number" | "percent" | "ratio" | "decimal";
  /** true lower is better, false higher is better, null info only */
  lowerIsBetter: boolean | null;
}

const SPECS: MetricSpec[] = [
  { key: "spend", label: "Spend", kind: "money", lowerIsBetter: null },
  { key: "impressions", label: "Impressions", kind: "number", lowerIsBetter: null },
  { key: "reach", label: "Reach", kind: "number", lowerIsBetter: null },
  { key: "linkClicks", label: "Link clicks", kind: "number", lowerIsBetter: null },
  { key: "results", label: "Results", kind: "number", lowerIsBetter: null },
  { key: "revenue", label: "Revenue", kind: "money", lowerIsBetter: null },
  { key: "roas", label: "ROAS", kind: "ratio", lowerIsBetter: false },
  { key: "costPerResult", label: "Cost per result", kind: "money", lowerIsBetter: true },
  { key: "conversionRate", label: "Conversion rate", kind: "percent", lowerIsBetter: false },
  { key: "ctr", label: "CTR (link)", kind: "percent", lowerIsBetter: false },
  { key: "cpc", label: "CPC (link)", kind: "money", lowerIsBetter: true },
  { key: "cpm", label: "CPM", kind: "money", lowerIsBetter: true },
  { key: "frequency", label: "Frequency", kind: "decimal", lowerIsBetter: true },
  { key: "hookRate", label: "Hook rate (3s video)", kind: "percent", lowerIsBetter: false },
  { key: "landingPageViewRate", label: "Landing page view rate", kind: "percent", lowerIsBetter: false },
];

/** Weights of each efficiency metric in the overall score, per goal. */
const WEIGHTS: Record<CompareGoal, Partial<Record<CompareMetricKey, number>>> = {
  revenue: { roas: 5, costPerResult: 2, conversionRate: 1.5, ctr: 1, cpc: 0.75, cpm: 0.5, frequency: 0.25 },
  results: { costPerResult: 5, conversionRate: 1.5, ctr: 1.25, cpc: 1, cpm: 0.75, frequency: 0.25, landingPageViewRate: 0.5 },
  clicks: { cpc: 3, ctr: 3, cpm: 1.25, landingPageViewRate: 1, frequency: 0.5, hookRate: 0.5 },
};

const GOAL_LABEL: Record<CompareGoal, string> = {
  revenue: "sales revenue (ROAS)",
  results: "cost per result",
  clicks: "clicks and traffic",
};

/** Smallest relative gap (percent) we treat as a real difference. */
const MIN_GAP = 5;

function fmtValue(kind: MetricSpec["kind"], v: number | null, currency: string | null): string {
  switch (kind) {
    case "money":
      return formatCurrency(v, currency, v != null && Math.abs(v) >= 1000 ? 0 : 2);
    case "number":
      return formatNumber(v);
    case "percent":
      return formatPercent(v);
    case "ratio":
      return formatRatio(v);
    case "decimal":
      return formatNumber(v, 2);
  }
}

function value(m: Metrics, key: CompareMetricKey): number | null {
  const v = m[key] as number | null | undefined;
  if (v == null || !Number.isFinite(v)) return null;
  // 0% hook rate means "not a video", not "terrible video".
  if (key === "hookRate" && v === 0) return null;
  return v;
}

/** Percent by which `win` beats `lose` (always ≥ 0). */
function gapPct(win: number, lose: number, lowerIsBetter: boolean): number {
  if (lowerIsBetter) return lose > 0 ? ((lose - win) / lose) * 100 : 0;
  return lose > 0 ? ((win - lose) / lose) * 100 : win > 0 ? 100 : 0;
}

/** Pick the most meaningful goal both items can be judged on. */
export function compareGoal(a: Metrics, b: Metrics): CompareGoal {
  if (a.revenue > 0 || b.revenue > 0) return "revenue";
  if (a.results > 0 || b.results > 0) return "results";
  return "clicks";
}

const pctText = (p: number) => (p >= 1000 ? `${formatNumber(p / 100, 0)}x` : `${formatNumber(p, 0)}%`);

export function compareItems(
  itemA: BreakdownItem,
  itemB: BreakdownItem,
  currency: string | null,
  opts: { nameA?: string; nameB?: string; unit?: string } = {},
): CompareResult {
  const a = itemA.metrics;
  const b = itemB.metrics;
  const nameA = opts.nameA ?? itemA.key;
  const nameB = opts.nameB ?? itemB.key;
  const unit = opts.unit ?? "ad";
  const goal = compareGoal(a, b);
  const money = (v: number | null) => fmtValue("money", v, currency);

  const rows: CompareRow[] = [];
  for (const s of SPECS) {
    const va = value(a, s.key);
    const vb = value(b, s.key);
    if ((va == null || va === 0) && (vb == null || vb === 0)) continue;
    let better: CompareRow["better"] = null;
    let diffPct: number | null = null;
    if (s.lowerIsBetter != null && va != null && vb != null) {
      const aWins = s.lowerIsBetter ? va < vb : va > vb;
      const win = aWins ? va : vb;
      const lose = aWins ? vb : va;
      const g = gapPct(win, lose, s.lowerIsBetter);
      if (g >= 1) {
        better = aWins ? "a" : "b";
        diffPct = g;
      }
    } else if (s.key === "roas" && (va != null) !== (vb != null)) {
      // e.g. only one side has ROAS: that side made sales, the other didn't.
      better = va != null ? "a" : "b";
    }
    rows.push({
      key: s.key,
      label: s.label,
      a: va,
      b: vb,
      aText: fmtValue(s.kind, va, currency),
      bText: fmtValue(s.kind, vb, currency),
      better,
      diffPct,
    });
  }

  // Weighted score: each metric's weight goes to the side that's better by at least MIN_GAP.
  let scoreA = 0;
  let scoreB = 0;
  const weights = WEIGHTS[goal];
  for (const r of rows) {
    const w = weights[r.key];
    if (!w || !r.better) continue;
    if (r.diffPct != null && r.diffPct < MIN_GAP) continue;
    // Scale by size of the gap (cap at 2x) so a 60% gap counts more than a 6% one.
    const scale = r.diffPct == null ? 1.5 : Math.min(2, 0.75 + r.diffPct / 40);
    if (r.better === "a") scoreA += w * scale;
    else scoreB += w * scale;
  }

  // The goal metric decides on its own when the gap is clear.
  const goalKey: CompareMetricKey = goal === "revenue" ? "roas" : goal === "results" ? "costPerResult" : "cpc";
  const goalRow = rows.find((r) => r.key === goalKey);
  let winner: CompareResult["winner"];
  // A side with results/sales beats one with none, whatever the other metrics say.
  const aHas = goal === "revenue" ? a.revenue > 0 : goal === "results" ? a.results > 0 : true;
  const bHas = goal === "revenue" ? b.revenue > 0 : goal === "results" ? b.results > 0 : true;
  if (aHas && !bHas) winner = "a";
  else if (bHas && !aHas) winner = "b";
  else if (goalRow?.better && (goalRow.diffPct ?? 0) >= MIN_GAP * 2) winner = goalRow.better;
  else {
    const total = scoreA + scoreB;
    winner = total === 0 || Math.abs(scoreA - scoreB) / total < 0.1 ? "tie" : scoreA > scoreB ? "a" : "b";
  }

  const W = winner === "b" ? b : a;
  const L = winner === "b" ? a : b;
  const wName = winner === "b" ? nameB : nameA;
  const lName = winner === "b" ? nameA : nameB;
  const wSide: "a" | "b" = winner === "b" ? "b" : "a";
  const row = (k: CompareMetricKey) => rows.find((r) => r.key === k);
  const wins = (k: CompareMetricKey) => {
    const r = row(k);
    return r?.better === wSide && (r.diffPct == null || r.diffPct >= MIN_GAP) ? r : null;
  };
  const loses = (k: CompareMetricKey) => {
    const r = row(k);
    return r?.better && r.better !== wSide && (r.diffPct == null || r.diffPct >= MIN_GAP) ? r : null;
  };

  const reasons: string[] = [];
  const loserStrengths: string[] = [];
  const actions: string[] = [];
  const cautions: string[] = [];

  if (winner !== "tie") {
    // 1. The goal metric.
    if (goal === "revenue") {
      if (L.revenue <= 0)
        reasons.push(`${wName} made sales (${money(W.revenue)} revenue) while ${lName} made no sales from ${money(L.spend)} spent.`);
      else if (wins("roas"))
        reasons.push(
          `Better return on ad spend: every 1 spent brings back ${formatRatio(W.roas)} vs ${formatRatio(L.roas)} (${pctText(wins("roas")!.diffPct!)} more).`,
        );
    } else if (goal === "results") {
      if (L.results <= 0)
        reasons.push(`${wName} got ${formatNumber(W.results)} results while ${lName} got none from ${money(L.spend)} spent.`);
      else if (wins("costPerResult"))
        reasons.push(
          `Cheaper results: each result costs ${money(W.costPerResult)} vs ${money(L.costPerResult)} (${pctText(wins("costPerResult")!.diffPct!)} cheaper).`,
        );
    } else if (wins("cpc")) {
      reasons.push(`Cheaper clicks: ${money(W.cpc)} per link click vs ${money(L.cpc)} (${pctText(wins("cpc")!.diffPct!)} cheaper).`);
    }

    // 2. Diagnose where along the funnel the win comes from.
    const ctr = wins("ctr");
    if (ctr)
      reasons.push(
        `More people click it: CTR ${formatPercent(W.ctr)} vs ${formatPercent(L.ctr)}. The creative and message grab attention better, so the ${unit} pays less for each visitor.`,
      );
    const cvr = wins("conversionRate");
    if (cvr && goal !== "clicks")
      reasons.push(
        `Visitors convert better: ${formatPercent(W.conversionRate)} of clicks become results vs ${formatPercent(L.conversionRate)}. The offer or audience is a better match.`,
      );
    const cpm = wins("cpm");
    if (cpm)
      reasons.push(
        `Cheaper to show: CPM ${money(W.cpm)} vs ${money(L.cpm)}. Meta rates this ${unit} as more relevant or its audience is less competitive.`,
      );
    const cpc = wins("cpc");
    if (cpc && goal !== "clicks") reasons.push(`Cheaper clicks: ${money(W.cpc)} per link click vs ${money(L.cpc)}.`);
    const freq = wins("frequency");
    if (freq && (L.frequency ?? 0) >= 2.5)
      reasons.push(
        `Less ad fatigue: people see it ${formatNumber(W.frequency, 1)} times on average vs ${formatNumber(L.frequency, 1)} for ${lName}.`,
      );
    const hook = wins("hookRate");
    if (hook) reasons.push(`Stronger video hook: ${formatPercent(W.hookRate)} watch the first 3 seconds vs ${formatPercent(L.hookRate)}.`);
    const lpv = wins("landingPageViewRate");
    if (lpv)
      reasons.push(
        `More clicks reach the page: ${formatPercent(W.landingPageViewRate)} vs ${formatPercent(L.landingPageViewRate)}, so fewer visitors are lost to slow loading.`,
      );

    // Loser's strengths (keeps the verdict honest).
    if (loses("ctr"))
      loserStrengths.push(
        `${lName} has the higher CTR (${formatPercent(L.ctr)} vs ${formatPercent(W.ctr)}), so its creative gets attention, but it converts worse.`,
      );
    if (loses("cpm")) loserStrengths.push(`${lName} is cheaper to show (CPM ${money(L.cpm)} vs ${money(W.cpm)}).`);
    if (loses("cpc") && goal !== "clicks") loserStrengths.push(`${lName} gets cheaper clicks (${money(L.cpc)} vs ${money(W.cpc)}).`);
    if (loses("conversionRate") && goal !== "clicks")
      loserStrengths.push(
        `${lName} converts a higher share of clicks (${formatPercent(L.conversionRate)} vs ${formatPercent(W.conversionRate)}).`,
      );
    if (loses("hookRate"))
      loserStrengths.push(`${lName} has the stronger video hook (${formatPercent(L.hookRate)} vs ${formatPercent(W.hookRate)}).`);

    // What to do.
    actions.push(`Move more budget to ${wName}. Raise it 20–30% at a time so it stays out of the learning phase.`);
    if (ctr) actions.push(`Reuse ${wName}'s hook, visual and headline in a new version of ${lName}.`);
    else if (loses("ctr")) actions.push(`Keep ${lName}'s creative (it gets clicks) but check its landing page, offer and audience.`);
    if (cvr) actions.push(`Send ${lName}'s traffic to the same page or offer as ${wName}, or test ${wName}'s audience.`);
    if ((L.frequency ?? 0) >= 3)
      actions.push(`${lName} is shown ${formatNumber(L.frequency, 1)} times per person. Refresh its creative or widen its audience.`);
    const lGoal = goal === "revenue" ? L.revenue <= 0 : goal === "results" ? L.results <= 0 : false;
    if (lGoal && L.spend > 0)
      actions.push(
        `Pause ${lName} or give it a short final test with a new creative; it has spent ${money(L.spend)} with nothing to show.`,
      );
  } else {
    reasons.push(`Both are very close on ${GOAL_LABEL[goal]}, so neither is clearly better yet.`);
    actions.push(`Keep both running and compare again after each has more results.`);
    actions.push(`To force a clear winner, test one change at a time (only the image, or only the headline).`);
  }

  // Data-quality cautions.
  const minResults = Math.min(a.results, b.results);
  const minImpr = Math.min(a.impressions, b.impressions);
  const spendRatio = Math.max(a.spend, b.spend) / Math.max(1e-9, Math.min(a.spend, b.spend));
  const maxResults = Math.max(a.results, b.results);
  if (goal !== "clicks" && maxResults < 10)
    cautions.push(`Both have fewer than 10 results. Wait for at least 10–20 results each before making big changes.`);
  else if (goal !== "clicks" && minResults > 0 && minResults < 10)
    cautions.push(`One side has only ${formatNumber(minResults)} results. Give it a bit more time before you judge it.`);
  if (minImpr < 1000) cautions.push(`One side has fewer than 1,000 impressions, which is too little data to trust.`);
  if (spendRatio >= 3 && Number.isFinite(spendRatio))
    cautions.push(
      `Spend is very uneven (${money(a.spend)} vs ${money(b.spend)}). The ${unit} with less spend may look better or worse simply because it hasn't scaled yet.`,
    );
  if (itemA.objective && itemB.objective && itemA.objective !== itemB.objective)
    cautions.push(`They have different objectives (${itemA.objective} vs ${itemB.objective}), so results aren't the same thing.`);
  else if (itemA.resultType && itemB.resultType && itemA.resultType !== itemB.resultType)
    cautions.push(
      `Their result types differ (${itemA.resultType} vs ${itemB.resultType}), so cost per result isn't a like-for-like comparison.`,
    );

  let confidence: CompareResult["confidence"] = "high";
  const gap = aHas !== bHas ? 100 : (goalRow?.diffPct ?? 0);
  if (winner === "tie" || cautions.length >= 2 || minImpr < 1000 || (goal !== "clicks" && Math.max(a.results, b.results) < 10))
    confidence = "low";
  else if (cautions.length === 1 || gap < 20) confidence = "medium";

  const headline = winner === "tie" ? `It's a tie: ${nameA} and ${nameB} perform about the same.` : `${wName} is the better ${unit}.`;

  return {
    goal,
    goalLabel: GOAL_LABEL[goal],
    winner,
    confidence,
    headline,
    reasons: reasons.slice(0, 6),
    loserStrengths,
    cautions,
    actions: actions.slice(0, 5),
    rows,
    scoreA: Math.round(scoreA * 10) / 10,
    scoreB: Math.round(scoreB * 10) / 10,
  };
}
