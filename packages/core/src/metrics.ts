import { SUM_FIELDS, type Metrics, type Sums } from "./types";

export function emptySums(): Sums {
  return Object.fromEntries(SUM_FIELDS.map((f) => [f, 0])) as Sums;
}

export function addSums(target: Sums, source: Sums): Sums {
  for (const f of SUM_FIELDS) target[f] += source[f];
  return target;
}

const ratio = (num: number, den: number, scale = 1): number | null => (den > 0 ? (num / den) * scale : null);

/**
 * Best single "result" count for a slice: Meta's own Results column when
 * present, otherwise purchases → leads → messaging conversations.
 */
export function resultCount(s: Sums): number {
  if (s.results > 0) return s.results;
  if (s.purchases > 0) return s.purchases;
  if (s.leads > 0) return s.leads;
  return s.messages;
}

export function deriveMetrics(s: Sums): Metrics {
  const clicksForCpc = s.linkClicks > 0 ? s.linkClicks : s.clicks;
  const results = resultCount(s);
  const cpaBase = s.purchases > 0 ? s.purchases : s.leads > 0 ? s.leads : s.messages;
  return {
    ...s,
    results,
    cpm: ratio(s.spend, s.impressions, 1000),
    cpc: ratio(s.spend, clicksForCpc),
    ctr: ratio(s.linkClicks > 0 ? s.linkClicks : s.clicks, s.impressions, 100),
    ctrAll: ratio(s.clicks, s.impressions, 100),
    frequency: ratio(s.impressions, s.reach),
    roas: s.revenue > 0 ? ratio(s.revenue, s.spend) : null,
    costPerResult: ratio(s.spend, results),
    cpa: ratio(s.spend, cpaBase),
    conversionRate: ratio(results, clicksForCpc, 100),
    landingPageViewRate: ratio(s.landingPageViews, s.linkClicks, 100),
    hookRate: ratio(s.videoPlays3s, s.impressions, 100),
  };
}
