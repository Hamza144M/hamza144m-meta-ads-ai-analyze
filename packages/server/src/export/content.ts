import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
  type Assessment,
  type NamedInsight,
  type ReportData,
  type Score,
  type StoredAnalysis,
} from "@maa/core";

/** Format-neutral document blocks rendered by the PDF and Word exporters. */
export type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string; muted?: boolean }
  | { type: "bullets"; items: string[]; numbered?: boolean }
  | { type: "kv"; rows: [string, string][] }
  | { type: "table"; head: string[]; rows: string[][]; align?: ("left" | "right")[] }
  | { type: "scores"; scores: Score[]; notes: Partial<Record<string, string>> };

export const STATUS_LABEL = { good: "Good", warning: "Needs work", critical: "Critical", unknown: "No data" } as const;

export function buildDocument(
  data: ReportData,
  scorecard: Score[],
  analysis: StoredAnalysis | null,
): { title: string; subtitle: string; blocks: Block[] } {
  const t = data.totals;
  const cur = data.currency;
  const money = (n: number | null | undefined) => formatCurrency(n, cur, n != null && Math.abs(n) >= 1000 ? 0 : 2);
  const blocks: Block[] = [];
  const range = data.dateRange ? `${data.dateRange.start} to ${data.dateRange.end}` : "Date range not in export";

  const r = analysis?.result;
  if (r) {
    blocks.push({ type: "h2", text: "Executive summary" });
    if (r.executiveSummary.headline) blocks.push({ type: "p", text: r.executiveSummary.headline });
    if (r.executiveSummary.overview) blocks.push({ type: "p", text: r.executiveSummary.overview });
    if (r.executiveSummary.keyFindings.length) blocks.push({ type: "bullets", items: r.executiveSummary.keyFindings });
  }

  blocks.push({ type: "h2", text: "Key metrics" });
  blocks.push({
    type: "kv",
    rows: [
      ["Total spend", money(t.spend)],
      ["Revenue", money(t.revenue)],
      ["ROAS", formatRatio(t.roas)],
      ["Results", formatNumber(t.results)],
      ["Cost per result", money(t.costPerResult)],
      ["Campaigns / Ad sets / Ads", `${data.counts.campaigns} / ${data.counts.adSets} / ${data.counts.ads}`],
      ["Impressions", formatNumber(t.impressions)],
      ["Reach", formatNumber(t.reach)],
      ["Frequency", formatNumber(t.frequency, 2)],
      ["CPM", money(t.cpm)],
      ["CPC (link)", money(t.cpc)],
      ["CTR (link)", formatPercent(t.ctr)],
      ["Clicks (all)", formatNumber(t.clicks)],
      ["Link clicks", formatNumber(t.linkClicks)],
      ["Landing page views", formatNumber(t.landingPageViews)],
      ["Leads", formatNumber(t.leads)],
      ["Messaging conversations", formatNumber(t.messages)],
      ["Purchases", formatNumber(t.purchases)],
      ["Conversion rate", formatPercent(t.conversionRate)],
    ],
  });

  blocks.push({ type: "h2", text: "KPI scorecard" });
  blocks.push({ type: "scores", scores: scorecard, notes: r?.scoreNotes ?? {} });

  blocks.push({ type: "h2", text: "Campaign performance" });
  blocks.push({
    type: "table",
    head: ["Campaign", "Spend", "CTR", "CPM", "Results", "Cost/result", "ROAS"],
    align: ["left", "right", "right", "right", "right", "right", "right"],
    rows: data.campaigns
      .slice(0, 30)
      .map((c) => [
        c.key,
        money(c.metrics.spend),
        formatPercent(c.metrics.ctr),
        money(c.metrics.cpm),
        formatNumber(c.metrics.results),
        money(c.metrics.costPerResult),
        formatRatio(c.metrics.roas),
      ]),
  });

  if (data.funnel.length > 1) {
    blocks.push({ type: "h3", text: "Funnel" });
    blocks.push({
      type: "table",
      head: ["Stage", "Volume", "Rate"],
      align: ["left", "right", "right"],
      rows: data.funnel.map((f) => [
        f.label,
        formatNumber(f.value),
        f.rateFromPrevious != null ? `${formatPercent(f.rateFromPrevious, 1)} of ${f.fromLabel}` : "—",
      ]),
    });
  }

  if (r) {
    const insight = (i: NamedInsight) => `${i.name}${i.amount ? ` (${i.amount})` : ""}: ${i.reason}${i.action ? ` → ${i.action}` : ""}`;
    const assess = (label: string, a: Assessment) => `${label} [${STATUS_LABEL[a.rating]}]: ${a.assessment}`;
    const c = r.campaignAnalysis;

    blocks.push({ type: "h2", text: "Campaign analysis" });
    if (c.bestCampaign) blocks.push({ type: "p", text: `Best campaign — ${insight(c.bestCampaign)}` });
    if (c.worstCampaign) blocks.push({ type: "p", text: `Worst campaign — ${insight(c.worstCampaign)}` });
    for (const [title, list] of [
      ["Budget waste", c.budgetWaste],
      ["Scaling opportunities", c.scalingOpportunities],
      ["Learning limited", c.learningLimited],
    ] as const) {
      if (list.length) blocks.push({ type: "h3", text: title }, { type: "bullets", items: list.map(insight) });
    }

    const cr = r.creativeAnalysis;
    blocks.push({ type: "h2", text: "Creative analysis" });
    blocks.push({
      type: "bullets",
      items: [
        assess("Creative fatigue", cr.creativeFatigue),
        assess("Hook strength", cr.hookStrength),
        assess("Thumbnail quality", cr.thumbnailQuality),
        assess("Video performance", cr.videoPerformance),
        assess("CTR quality", cr.ctrQuality),
        assess("Engagement", cr.engagement),
      ],
    });
    for (const [title, items] of [
      ["New hooks", cr.suggestions.hooks],
      ["Headlines", cr.suggestions.headlines],
      ["Primary text", cr.suggestions.primaryText],
      ["CTAs", cr.suggestions.ctas],
      ["Creative angles", cr.suggestions.creativeAngles],
    ] as const) {
      if (items.length) blocks.push({ type: "h3", text: title }, { type: "bullets", items: [...items] });
    }

    const au = r.audienceAnalysis;
    blocks.push({ type: "h2", text: "Audience analysis" });
    blocks.push({
      type: "bullets",
      items: [
        assess("Interests", au.interests),
        assess("Broad", au.broad),
        assess("Lookalikes", au.lookalikes),
        assess("Retargeting", au.retargeting),
        assess("Age", au.age),
        assess("Gender", au.gender),
        assess("Locations", au.locations),
      ],
    });
    if (au.recommendations.length)
      blocks.push({ type: "h3", text: "Targeting recommendations" }, { type: "bullets", items: au.recommendations });

    blocks.push({ type: "h2", text: "Funnel analysis" });
    if (r.funnelAnalysis.summary) blocks.push({ type: "p", text: r.funnelAnalysis.summary });
    if (r.funnelAnalysis.bottlenecks.length)
      blocks.push({
        type: "bullets",
        items: r.funnelAnalysis.bottlenecks.map((b) => `${b.stage} [${STATUS_LABEL[b.severity]}]: ${b.issue} Fix: ${b.fix}`),
      });

    const b = r.budgetAnalysis;
    blocks.push({ type: "h2", text: "Budget analysis" });
    if (b.increase.length) blocks.push({ type: "h3", text: "Increase budget" }, { type: "bullets", items: b.increase.map(insight) });
    if (b.decrease.length) blocks.push({ type: "h3", text: "Decrease budget" }, { type: "bullets", items: b.decrease.map(insight) });
    if (b.scaleStrategy) blocks.push({ type: "h3", text: "Scale strategy" }, { type: "p", text: b.scaleStrategy });
    if (b.allocation.length)
      blocks.push({
        type: "table",
        head: ["Campaign", "Current", "Recommended", "Why"],
        align: ["left", "right", "right", "left"],
        rows: b.allocation.map((a) => [a.name, a.currentShare, a.recommendedShare, a.reason]),
      });
    if (b.priorities.length)
      blocks.push({ type: "h3", text: "Campaign priorities" }, { type: "bullets", items: b.priorities, numbered: true });

    const rec = r.recommendations;
    blocks.push({ type: "h2", text: "Action plan" });
    for (const [title, items, numbered] of [
      ["Top 10 problems", rec.topProblems, true],
      ["Top 10 improvements", rec.topImprovements, true],
      ["Quick wins", rec.quickWins, false],
      ["Scaling plan", rec.scalingPlan, true],
      ["Creative testing ideas", rec.creativeTestingIdeas, false],
      ["Audience testing ideas", rec.audienceTestingIdeas, false],
      ["Budget strategy", rec.budgetStrategy, false],
    ] as const) {
      if (items.length) blocks.push({ type: "h3", text: title }, { type: "bullets", items: [...items], numbered });
    }
    if (rec.optimizationRoadmap.length) {
      blocks.push({ type: "h3", text: "Optimization roadmap" });
      for (const p of rec.optimizationRoadmap)
        blocks.push({ type: "p", text: `${p.timeframe} — ${p.phase}` }, { type: "bullets", items: p.actions });
    }
    blocks.push({
      type: "p",
      muted: true,
      text:
        analysis!.model === "rule-based"
          ? "Analysis: rule-based preview."
          : `Analysis generated by ${analysis!.model} on ${analysis!.createdAt.slice(0, 10)}.`,
    });
  } else {
    blocks.push({
      type: "p",
      muted: true,
      text: "Run the AI analysis in the app to include the full audit and action plan in this export.",
    });
  }

  return { title: "Meta Ads Performance Report", subtitle: `${data.fileName} · ${range} · ${data.currency ?? ""}`.trim(), blocks };
}
