import { accountResultLabel, formatCurrency, formatPercent, type ReportData, type Score, type StoredAnalysis } from "@maa/core";
import { buildReportContext } from "./context";

export const CHAT_SYSTEM_PROMPT = `You are the in-app AI assistant of Meta Ads AI Analyzer: a senior Meta Ads consultant with 15+ years of experience. You answer questions about ONE uploaded Meta Ads Manager report.

Rules:
- Ground every answer in the REPORT JSON (and the PRIOR ANALYSIS if present). Quote real numbers and campaign / ad set / ad names.
- If the data can't answer the question, say exactly what's missing and which column or breakdown to add to the export.
- Be concise and practical: lead with the direct answer in 1-2 sentences, then up to 5 short bullets with evidence and next steps. Use Markdown bullets and **bold** sparingly.
- Typical topics: high CPM (audience size, frequency, placement, creative quality, competition, seasonality), low CTR (hooks, offer, creative fatigue), high CPA (funnel leaks, targeting, landing page), no results (learning phase, budget vs CPA, tracking), whether to duplicate (only for horizontal scaling or new audiences; prefer budget increases of 15-20% every 48-72h), which campaign to scale (best ROAS/CPA with stable frequency).
- Don't invent data. Don't discuss anything unrelated to advertising and this report; politely steer back.`;

export function chatContextMessage(data: ReportData, scorecard: Score[], analysis: StoredAnalysis | null): string {
  const ctx = buildReportContext(data, scorecard);
  const prior = analysis
    ? {
        headline: analysis.result.executiveSummary.headline,
        topProblems: analysis.result.recommendations.topProblems,
        topImprovements: analysis.result.recommendations.topImprovements,
        best: analysis.result.campaignAnalysis.bestCampaign?.name,
        worst: analysis.result.campaignAnalysis.worstCampaign?.name,
      }
    : null;
  return `REPORT JSON:\n${JSON.stringify(ctx)}${prior ? `\n\nPRIOR ANALYSIS:\n${JSON.stringify(prior)}` : ""}`;
}

/** Keyword-based answers used when no AI provider is configured. */
export function ruleBasedChatAnswer(question: string, data: ReportData): string {
  const q = question.toLowerCase();
  const t = data.totals;
  const cur = data.currency;
  const money = (n: number | null | undefined) => formatCurrency(n, cur, n != null && Math.abs(n) >= 100 ? 0 : 2);
  const camps = data.campaigns.filter((c) => c.metrics.spend > 0);
  const by = (k: "cpm" | "ctr" | "roas" | "costPerResult", dir: 1 | -1) =>
    [...camps].filter((c) => c.metrics[k] != null).sort((a, b) => dir * ((a.metrics[k] as number) - (b.metrics[k] as number)));
  const note = "\n\n_Rule-based answer. Connect an AI provider for a full consultant reply._";

  if (q.includes("cpm")) {
    const high = by("cpm", -1).slice(0, 3);
    return `Your account CPM is **${money(t.cpm)}** with frequency ${t.frequency?.toFixed(2) ?? "n/a"}.\n\n${high.map((c) => `- ${c.key}: CPM ${money(c.metrics.cpm)}, frequency ${c.metrics.frequency?.toFixed(2) ?? "n/a"}`).join("\n")}\n\nHigh CPM usually comes from small or overlapping audiences (retargeting), rising frequency, low creative quality ranking, or seasonal competition. Broaden audiences, refresh creatives, and test Advantage+ placements.${note}`;
  }
  if (q.includes("ctr")) {
    const low = by("ctr", 1).slice(0, 3);
    return `Your link CTR is **${formatPercent(t.ctr)}** (about 1–1.5% is typical).\n\n${low.map((c) => `- ${c.key}: CTR ${formatPercent(c.metrics.ctr)}`).join("\n")}\n\nLow CTR usually means weak hooks or an unclear offer. Test 3 new hooks on your best video and put the offer in the first line of copy.${note}`;
  }
  if (q.includes("cpa") || q.includes("cost per")) {
    const worst = by("costPerResult", -1).slice(0, 3);
    return `Your cost per result is **${money(t.costPerResult)}** across ${Math.round(t.results)} results.\n\n${worst.map((c) => `- ${c.key}: ${money(c.metrics.costPerResult)} per result`).join("\n")}\n\nTo reduce CPA, cut the most expensive campaigns, fix the weakest funnel step (see the Funnel chart), and consolidate small ad sets so they exit learning.${note}`;
  }
  if (q.includes("scale") || q.includes("duplicate")) {
    const best = (t.revenue > 0 ? by("roas", -1) : by("costPerResult", 1)).slice(0, 2);
    return `${best[0] ? `**${best[0].key}** is your best scaling candidate` : "No clear scaling candidate"}${best[0]?.metrics.roas != null ? ` at ${best[0].metrics.roas.toFixed(2)}x ROAS` : best[0] ? ` at ${money(best[0].metrics.costPerResult)} per result` : ""}.\n\n- Raise its budget 15–20% every 48–72 hours while CPA holds.\n- Duplicate only to test a new audience (horizontal scaling), not to reset learning.\n- Watch frequency: above ~3 on prospecting means it's time for new creative.${note}`;
  }
  if (q.includes("result") || q.includes("not getting") || q.includes("no ")) {
    const zero = camps.filter((c) => c.metrics.results === 0);
    return `${zero.length ? `These campaigns have spend but no results: ${zero.map((c) => `**${c.key}** (${money(c.metrics.spend)})`).join(", ")}.` : "Every campaign has at least one result."}\n\nCommon causes: budget too low for the target CPA (aim for 50 ${accountResultLabel(data)} per week per ad set), wrong optimization event, broken pixel or Conversions API, or a weak offer.${note}`;
  }
  return `Here's the quick picture: ${money(t.spend)} spent, ${Math.round(t.results)} results at ${money(t.costPerResult)} each${t.roas != null ? `, ${t.roas.toFixed(2)}x ROAS` : ""}, CTR ${formatPercent(t.ctr)}, CPM ${money(t.cpm)}.\n\nTry asking about CPM, CTR, CPA, scaling, duplicating, or why a campaign isn't getting results.${note}`;
}
