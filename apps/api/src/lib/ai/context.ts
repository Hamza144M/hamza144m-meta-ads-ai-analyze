import type { BreakdownItem, Metrics, ReportData, Score } from "@maa/core";

const r2 = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

function compactMetrics(m: Metrics) {
  const out: Record<string, number | null> = {
    spend: r2(m.spend),
    impressions: Math.round(m.impressions),
    reach: Math.round(m.reach),
    frequency: r2(m.frequency),
    cpm: r2(m.cpm),
    linkClicks: Math.round(m.linkClicks),
    ctr: r2(m.ctr),
    cpc: r2(m.cpc),
    landingPageViews: Math.round(m.landingPageViews),
    results: Math.round(m.results),
    costPerResult: r2(m.costPerResult),
    leads: Math.round(m.leads),
    messages: Math.round(m.messages),
    addsToCart: Math.round(m.addsToCart),
    checkouts: Math.round(m.checkouts),
    purchases: Math.round(m.purchases),
    revenue: r2(m.revenue),
    roas: r2(m.roas),
    conversionRate: r2(m.conversionRate),
    hookRate: r2(m.hookRate, 1),
    thruPlays: Math.round(m.thruPlays),
    postEngagement: Math.round(m.postEngagement),
  };
  // drop zero / null fields to keep the prompt small
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v != null && v !== 0));
}

function compactItem(i: BreakdownItem, totalSpend: number) {
  return {
    name: i.key,
    ...(i.parent ? { parent: i.parent } : {}),
    ...(i.delivery ? { delivery: i.delivery } : {}),
    ...(i.objective ? { objective: i.objective } : {}),
    ...(i.resultType ? { resultType: i.resultType.replace(/^actions:/, "") } : {}),
    ...(i.budget ? { dailyBudget: r2(i.budget) } : {}),
    spendShare: totalSpend > 0 ? `${r2((i.metrics.spend / totalSpend) * 100, 1)}%` : null,
    ...compactMetrics(i.metrics),
    ...(i.trend
      ? {
          trendFirstVsSecondHalfPct: Object.fromEntries(
            Object.entries(i.trend)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, r2(v as number, 0)]),
          ),
        }
      : {}),
  };
}

/** A compact, model-friendly JSON view of the report. Caps list sizes to bound tokens. */
export function buildReportContext(data: ReportData, scorecard: Score[]) {
  const total = data.totals.spend;
  const weekly =
    data.daily.length > 14
      ? chunk(data.daily, 7).map((w) => ({
          week: `${w[0].key}..${w[w.length - 1].key}`,
          ...compactMetrics(sumItems(w)),
        }))
      : data.daily.map((d) => ({ day: d.key, ...compactMetrics(d.metrics) }));

  return {
    file: { name: data.fileName, level: data.level, currency: data.currency ?? "unknown", dateRange: data.dateRange, rows: data.rowCount },
    counts: data.counts,
    accountTotals: compactMetrics(data.totals),
    scorecard: scorecard.map((s) => ({ metric: s.key, score: s.score, status: s.status, basis: s.basis })),
    funnel: data.funnel.map((f) => ({ stage: f.label, value: Math.round(f.value), ratePct: r2(f.rateFromPrevious, 1), of: f.fromLabel })),
    campaigns: data.campaigns.slice(0, 25).map((c) => compactItem(c, total)),
    adSets: data.adSets.slice(0, 30).map((c) => compactItem(c, total)),
    ads: data.ads.slice(0, 40).map((c) => compactItem(c, total)),
    timeSeries: weekly,
    breakdowns: {
      age: data.age.map((c) => compactItem(c, total)),
      gender: data.gender.map((c) => compactItem(c, total)),
      region: data.region.slice(0, 15).map((c) => compactItem(c, total)),
      placement: data.placement.slice(0, 15).map((c) => compactItem(c, total)),
    },
    dataNotes: data.warnings,
    truncated: {
      campaigns: Math.max(0, data.campaigns.length - 25),
      adSets: Math.max(0, data.adSets.length - 30),
      ads: Math.max(0, data.ads.length - 40),
    },
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sumItems(items: BreakdownItem[]): Metrics {
  // Recompute ratios from summed counts rather than averaging ratios.
  const s = items.reduce(
    (acc, i) => {
      for (const k of [
        "spend",
        "impressions",
        "reach",
        "clicks",
        "linkClicks",
        "landingPageViews",
        "leads",
        "messages",
        "addsToCart",
        "checkouts",
        "purchases",
        "revenue",
        "results",
        "videoPlays3s",
        "thruPlays",
        "postEngagement",
      ] as const) {
        acc[k] = (acc[k] ?? 0) + i.metrics[k];
      }
      return acc;
    },
    {} as Record<string, number>,
  );
  const m = { ...s } as unknown as Metrics;
  m.cpm = s.impressions ? (s.spend / s.impressions) * 1000 : null;
  m.ctr = s.impressions ? ((s.linkClicks || s.clicks) / s.impressions) * 100 : null;
  m.cpc = s.linkClicks ? s.spend / s.linkClicks : null;
  m.frequency = s.reach ? s.impressions / s.reach : null;
  m.roas = s.revenue && s.spend ? s.revenue / s.spend : null;
  m.costPerResult = s.results ? s.spend / s.results : null;
  m.conversionRate = s.linkClicks ? (s.results / s.linkClicks) * 100 : null;
  m.hookRate = s.impressions && s.videoPlays3s ? (s.videoPlays3s / s.impressions) * 100 : null;
  return m;
}
