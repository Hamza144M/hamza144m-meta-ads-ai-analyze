import { headerScore, mapColumns } from "./columns";
import { addSums, deriveMetrics, emptySums } from "./metrics";
import { parseDate, parseNumber, parseText } from "./parseValue";
import {
  DIMENSION_FIELDS,
  RATIO_FIELDS,
  SUM_FIELDS,
  type BreakdownItem,
  type DimensionField,
  type FunnelStep,
  type NormalizedRow,
  type ReportData,
  type ReportLevel,
  type Sums,
  type Trend,
} from "./types";

export class ReportParseError extends Error {}

const MAX_HEADER_SCAN = 15;
const MIN_HEADER_MATCHES = 3;
const DATE_FIELDS: DimensionField[] = ["date", "reportingStart", "reportingEnd"];

function findHeaderRow(table: unknown[][]): number {
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < Math.min(table.length, MAX_HEADER_SCAN); i++) {
    const score = headerScore(table[i] ?? []);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return bestScore >= MIN_HEADER_MATCHES ? best : -1;
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => parseText(c) === "");
}

interface Group {
  sums: Sums;
  parent?: string;
  delivery?: string;
  objective?: string;
  resultType?: string;
  budgets: Map<string, number>;
  first: Sums;
  second: Sums;
}

const pctChange = (a: number | null, b: number | null): number | null =>
  a != null && b != null && a !== 0 ? ((b - a) / Math.abs(a)) * 100 : null;

function buildTrend(first: Sums, second: Sums): Trend | undefined {
  if (first.impressions === 0 || second.impressions === 0) return undefined;
  const a = deriveMetrics(first);
  const b = deriveMetrics(second);
  return {
    ctr: pctChange(a.ctr, b.ctr),
    cpm: pctChange(a.cpm, b.cpm),
    frequency: pctChange(a.frequency, b.frequency),
    costPerResult: pctChange(a.costPerResult, b.costPerResult),
    spend: pctChange(a.spend, b.spend),
  };
}

function groupBy(
  rows: NormalizedRow[],
  keyOf: (r: NormalizedRow) => string | undefined,
  parentOf?: (r: NormalizedRow) => string | undefined,
  midDate?: string,
): BreakdownItem[] {
  // Same-named ad sets/ads under different parents are different entities.
  const groups = new Map<string, Group & { label: string }>();
  for (const r of rows) {
    const label = keyOf(r);
    if (!label) continue;
    const parent = parentOf?.(r);
    const key = parent ? `${parent}\u241f${label}` : label;
    let g = groups.get(key);
    if (!g) {
      g = { label, sums: emptySums(), parent, budgets: new Map(), first: emptySums(), second: emptySums() };
      groups.set(key, g);
    }
    addSums(g.sums, r.sums);
    if (midDate && r.dims.date) addSums(r.dims.date <= midDate ? g.first : g.second, r.sums);
    g.delivery ||= r.dims.delivery;
    g.objective ||= r.dims.objective;
    g.resultType ||= r.dims.resultType;
    if (r.ratios.budget) {
      const owner = `${r.dims.campaign ?? ""}/${r.dims.adSet ?? ""}`;
      g.budgets.set(owner, Math.max(g.budgets.get(owner) ?? 0, r.ratios.budget));
    }
  }
  return [...groups.values()].map((g) => ({
    key: g.label,
    parent: g.parent,
    delivery: g.delivery,
    objective: g.objective,
    resultType: g.resultType,
    budget: g.budgets.size ? [...g.budgets.values()].reduce((a, b) => a + b, 0) : undefined,
    metrics: deriveMetrics(g.sums),
    trend: midDate ? buildTrend(g.first, g.second) : undefined,
  }));
}

const bySpend = (a: BreakdownItem, b: BreakdownItem) => b.metrics.spend - a.metrics.spend;

function buildFunnel(s: Sums, segments: BreakdownItem[]): FunnelStep[] {
  type Def = { key: FunnelStep["key"]; label: string; value: number; from: FunnelStep["key"][] };
  // `from` lists the step each stage is measured against, falling back when a column is missing.
  // Leads and messages are parallel outcomes of a click, so they branch off clicks / page views
  // instead of chaining into the e-commerce path.
  const defs: Def[] = [
    { key: "impressions", label: "Impressions", value: s.impressions, from: [] },
    { key: "linkClicks", label: "Link clicks", value: s.linkClicks || s.clicks, from: ["impressions"] },
    { key: "landingPageViews", label: "Landing page views", value: s.landingPageViews, from: ["linkClicks"] },
    { key: "leads", label: "Leads", value: s.leads, from: ["linkClicks"] },
    { key: "messages", label: "Messages", value: s.messages, from: ["linkClicks"] },
    { key: "addsToCart", label: "Add to cart", value: s.addsToCart, from: ["landingPageViews", "linkClicks"] },
    { key: "checkouts", label: "Checkout", value: s.checkouts, from: ["addsToCart", "landingPageViews", "linkClicks"] },
    { key: "purchases", label: "Purchases", value: s.purchases, from: ["checkouts", "addsToCart", "landingPageViews", "linkClicks"] },
  ];
  const present = new Map(defs.filter((d) => d.value > 0).map((d) => [d.key, d]));
  const metricOf = (m: BreakdownItem["metrics"], k: FunnelStep["key"]) => (k === "linkClicks" ? m.linkClicks || m.clicks : m[k]);
  return [...present.values()].map((d) => {
    const base = d.from.map((k) => present.get(k)).find(Boolean);
    // Measure each step only against campaigns that can produce it (e.g. lead rate from
    // lead campaigns' clicks, not from every click in the account).
    const producing = segments.filter((c) => metricOf(c.metrics, d.key) > 0);
    const baseValue = base && producing.length ? producing.reduce((sum, c) => sum + metricOf(c.metrics, base.key), 0) : (base?.value ?? 0);
    return {
      key: d.key,
      label: d.label,
      value: d.value,
      rateFromPrevious: base && baseValue > 0 ? Math.min(100, (d.value / baseValue) * 100) : null,
      fromLabel: base ? base.label.toLowerCase() : null,
    };
  });
}

/**
 * Turn a 2-D table (from CSV or XLSX) into dashboard-ready report data.
 * The header row is auto-detected within the first rows, so exports with a
 * title line above the headers still work.
 */
export function analyzeTable(table: unknown[][], fileName: string): ReportData {
  const headerIdx = findHeaderRow(table);
  if (headerIdx === -1) {
    throw new ReportParseError(
      "We couldn't find Meta Ads columns in this file. Export it from Ads Manager with columns such as Campaign name, Amount spent and Impressions.",
    );
  }

  const mapping = mapColumns(table[headerIdx]);
  const { indexes } = mapping;
  const warnings: string[] = [];

  if (indexes.spend === undefined) warnings.push("No 'Amount spent' column found, so cost metrics will be empty.");
  if (indexes.impressions === undefined) warnings.push("No 'Impressions' column found, so CPM and CTR can't be calculated.");

  const rows: NormalizedRow[] = [];
  const nameFields: DimensionField[] = ["campaign", "adSet", "ad"];
  const hasNameColumn = nameFields.some((f) => indexes[f] !== undefined);
  let droppedSummary = 0;
  let derivedRevenue = false;

  for (const raw of table.slice(headerIdx + 1)) {
    if (!raw || isBlankRow(raw)) continue;
    const dims: NormalizedRow["dims"] = {};
    for (const f of DIMENSION_FIELDS) {
      const i = indexes[f];
      if (i === undefined) continue;
      const v = DATE_FIELDS.includes(f) ? parseDate(raw[i]) : parseText(raw[i]);
      if (v) dims[f] = v;
    }
    // Ads Manager can add a summary row with no names; skip it so totals aren't doubled.
    if (hasNameColumn && nameFields.every((f) => !dims[f])) {
      droppedSummary++;
      continue;
    }
    const sums = emptySums();
    for (const f of SUM_FIELDS) {
      const i = indexes[f];
      if (i !== undefined) sums[f] = parseNumber(raw[i]);
    }
    const ratios: NormalizedRow["ratios"] = {};
    for (const f of RATIO_FIELDS) {
      const i = indexes[f];
      if (i !== undefined) ratios[f] = parseNumber(raw[i]);
    }
    if (indexes.revenue === undefined && ratios.roas && sums.spend) {
      sums.revenue = ratios.roas * sums.spend;
      derivedRevenue = true;
    }
    if (indexes.reach === undefined && ratios.frequency && sums.impressions) {
      sums.reach = sums.impressions / ratios.frequency;
    }
    rows.push({ dims, sums, ratios });
  }

  if (rows.length === 0) throw new ReportParseError("The file has headers but no data rows.");
  if (droppedSummary) warnings.push(`Skipped ${droppedSummary} summary row(s) without campaign, ad set or ad names.`);
  if (derivedRevenue)
    warnings.push("Revenue was estimated from Purchase ROAS × Amount spent because no conversion value column was found.");

  const totalSums = rows.reduce((acc, r) => addSums(acc, r.sums), emptySums());
  const breakdownCols = (["date", "age", "gender", "region", "placement"] as const).filter((f) => indexes[f] !== undefined);
  if (indexes.reach !== undefined && rows.length > 1) {
    warnings.push(
      breakdownCols.length
        ? "Reach is summed across rows, so it overstates unique reach when the export is broken down by day, age, or placement."
        : "Reach is summed across rows; people reached by several campaigns are counted more than once.",
    );
  }

  const resultTypes = new Set(rows.map((r) => r.dims.resultType).filter(Boolean));
  if (resultTypes.size > 1) {
    warnings.push(
      "Campaigns optimize for different results (e.g. purchases and leads), so the account-level 'Results' total mixes result types. Compare cost per result within each campaign.",
    );
  }

  const level: ReportLevel =
    indexes.ad !== undefined ? "ad" : indexes.adSet !== undefined ? "adset" : indexes.campaign !== undefined ? "campaign" : "unknown";

  const allDates = rows
    .flatMap((r) => [r.dims.date, r.dims.reportingStart, r.dims.reportingEnd])
    .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  // Midpoint of the distinct days, used for first-half vs second-half trends (fatigue detection).
  const days = [...new Set(rows.map((r) => r.dims.date).filter((d): d is string => !!d))].sort();
  const midDate = days.length >= 4 ? days[Math.floor(days.length / 2) - 1] : undefined;
  const adSets = groupBy(
    rows,
    (r) => r.dims.adSet,
    (r) => r.dims.campaign,
    midDate,
  ).sort(bySpend);
  const ads = groupBy(
    rows,
    (r) => r.dims.ad,
    (r) => r.dims.adSet ?? r.dims.campaign,
    midDate,
  ).sort(bySpend);
  const campaigns = groupBy(rows, (r) => r.dims.campaign, undefined, midDate).sort(bySpend);

  return {
    fileName,
    level,
    rowCount: rows.length,
    currency: mapping.currency,
    currencySource: mapping.currency ? "file" : undefined,
    dateRange: allDates.length ? { start: allDates[0], end: allDates[allDates.length - 1] } : null,
    counts: { campaigns: campaigns.length, adSets: adSets.length, ads: ads.length },
    totals: deriveMetrics(totalSums),
    campaigns,
    adSets,
    ads,
    daily: groupBy(rows, (r) => r.dims.date).sort((a, b) => a.key.localeCompare(b.key)),
    age: groupBy(rows, (r) => r.dims.age).sort((a, b) => a.key.localeCompare(b.key)),
    gender: groupBy(rows, (r) => r.dims.gender).sort(bySpend),
    region: groupBy(rows, (r) => r.dims.region).sort(bySpend),
    placement: groupBy(rows, (r) => r.dims.placement).sort(bySpend),
    funnel: buildFunnel(totalSums, campaigns),
    columnMap: mapping.headers,
    unmappedColumns: mapping.unmapped,
    warnings,
  };
}
