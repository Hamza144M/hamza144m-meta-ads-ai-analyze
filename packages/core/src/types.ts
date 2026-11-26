/** Hierarchy level the uploaded report was exported at. */
export type ReportLevel = "campaign" | "adset" | "ad" | "unknown";

/** Text dimensions we try to read from each row. */
export const DIMENSION_FIELDS = [
  "campaign",
  "adSet",
  "ad",
  "date",
  "reportingStart",
  "reportingEnd",
  "age",
  "gender",
  "region",
  "placement",
  "delivery",
  "objective",
  "resultType",
  "budgetType",
] as const;
export type DimensionField = (typeof DIMENSION_FIELDS)[number];

/** Additive numeric metrics we sum across rows. */
export const SUM_FIELDS = [
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
] as const;
export type SumField = (typeof SUM_FIELDS)[number];

/** Non-additive columns: ratios used as fallbacks (e.g. ROAS → revenue) and budgets. */
export const RATIO_FIELDS = ["roas", "frequency", "costPerResult", "budget"] as const;
export type RatioField = (typeof RATIO_FIELDS)[number];

export type MappedField = DimensionField | SumField | RatioField;

export interface NormalizedRow {
  dims: Partial<Record<DimensionField, string>>;
  sums: Record<SumField, number>;
  ratios: Partial<Record<RatioField, number>>;
}

export type Sums = Record<SumField, number>;

/** Sums plus every derived KPI shown on the dashboard. */
export interface Metrics extends Sums {
  cpm: number | null;
  cpc: number | null;
  ctr: number | null; // link CTR, percent
  ctrAll: number | null; // all-clicks CTR, percent
  frequency: number | null;
  roas: number | null;
  costPerResult: number | null;
  cpa: number | null; // cost per purchase, else per lead
  conversionRate: number | null; // results / link clicks, percent
  landingPageViewRate: number | null; // LPV / link clicks, percent
  hookRate: number | null; // 3s plays / impressions, percent
}

export interface BreakdownItem {
  key: string;
  /** Parent names, e.g. the campaign an ad set belongs to. */
  parent?: string;
  delivery?: string;
  objective?: string;
  resultType?: string;
  /** Sum of the distinct ad set (or campaign) budgets seen in this slice. */
  budget?: number;
  metrics: Metrics;
  /** First half vs second half of the date range (only when the export has a Day column). */
  trend?: Trend;
}

/** Percent change from the first to the second half of the period; null when not computable. */
export interface Trend {
  ctr: number | null;
  cpm: number | null;
  frequency: number | null;
  costPerResult: number | null;
  spend: number | null;
}

export interface FunnelStep {
  key: "impressions" | "linkClicks" | "landingPageViews" | "leads" | "messages" | "addsToCart" | "checkouts" | "purchases";
  label: string;
  value: number;
  /** Percent of the step this one is measured from (see `fromLabel`). */
  rateFromPrevious: number | null;
  /** Label of the step the rate is measured from. Leads and messages branch off link clicks. */
  fromLabel: string | null;
}

export interface ReportData {
  fileName: string;
  level: ReportLevel;
  rowCount: number;
  /** ISO 4217 code: from the file headers, or chosen by the user. */
  currency: string | null;
  /** Where `currency` came from. */
  currencySource?: "file" | "user";
  /** Units of `currency` per 1 USD, set by the user; used to apply USD benchmarks. */
  usdRate?: number | null;
  dateRange: { start: string; end: string } | null;
  counts: { campaigns: number; adSets: number; ads: number };
  totals: Metrics;
  campaigns: BreakdownItem[];
  adSets: BreakdownItem[];
  ads: BreakdownItem[];
  daily: BreakdownItem[];
  age: BreakdownItem[];
  gender: BreakdownItem[];
  region: BreakdownItem[];
  placement: BreakdownItem[];
  funnel: FunnelStep[];
  /** Which source column each field came from. */
  columnMap: Partial<Record<MappedField, string>>;
  unmappedColumns: string[];
  warnings: string[];
}

export interface StoredReport {
  id: string;
  ownerId: string | null;
  createdAt: string;
  data: ReportData;
}
