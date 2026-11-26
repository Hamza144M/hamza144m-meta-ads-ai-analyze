import type { MappedField } from "./types";

/**
 * Header aliases for Meta Ads Manager exports.
 *
 * ASSUMPTION: these follow the English column names Ads Manager uses in
 * "Export table data" (CSV / XLSX) as of 2026. Headers are normalized before
 * matching: lower-cased, currency suffixes such as "(USD)" removed, and
 * punctuation collapsed to single spaces. The first alias in each list wins
 * when several columns match.
 */
export const COLUMN_ALIASES: Record<MappedField, string[]> = {
  // dimensions
  campaign: ["campaign name", "campaign"],
  adSet: ["ad set name", "adset name", "ad set"],
  ad: ["ad name", "ad"],
  date: ["day", "date"],
  reportingStart: ["reporting starts", "reporting start", "date start"],
  reportingEnd: ["reporting ends", "reporting end", "date stop", "date end"],
  age: ["age"],
  gender: ["gender"],
  region: ["region", "country", "dma region", "location"],
  placement: ["placement", "platform", "publisher platform"],
  delivery: ["delivery", "campaign delivery", "ad set delivery", "ad delivery", "delivery status"],
  objective: ["objective", "campaign objective"],
  resultType: ["result indicator", "result type"],
  budgetType: ["ad set budget type", "campaign budget type", "budget type"],
  // additive metrics
  spend: ["amount spent", "spend", "amount spent total", "cost"],
  impressions: ["impressions"],
  reach: ["reach"],
  clicks: ["clicks all", "clicks"],
  linkClicks: ["link clicks", "outbound clicks"],
  landingPageViews: ["landing page views", "website landing page views"],
  leads: ["leads", "website leads", "on facebook leads", "meta leads", "leads form"],
  messages: ["messaging conversations started", "messaging conversations", "messaging conversations started 7 day"],
  addsToCart: ["adds to cart", "website adds to cart", "add to cart"],
  checkouts: ["checkouts initiated", "website checkouts initiated", "initiate checkout", "checkouts"],
  purchases: ["purchases", "website purchases", "meta purchases"],
  revenue: ["purchases conversion value", "website purchases conversion value", "purchase conversion value", "conversion value", "revenue"],
  results: ["results"],
  videoPlays3s: ["3 second video plays", "video plays", "3 second plays"],
  thruPlays: ["thruplays", "thru plays"],
  postEngagement: ["post engagements", "post engagement"],
  budget: ["ad set budget", "campaign budget", "budget"],
  // ratios (fallbacks only)
  roas: ["purchase roas return on ad spend", "website purchase roas return on ad spend", "purchase roas", "roas"],
  frequency: ["frequency"],
  costPerResult: ["cost per result", "cost per results"],
};

const CURRENCY_RE = /\(([A-Za-z]{3})\)/;

export interface NormalizedHeader {
  original: string;
  normalized: string;
  currency: string | null;
}

export function normalizeHeader(header: string): NormalizedHeader {
  const original = String(header ?? "").trim();
  const currencyMatch = original.match(CURRENCY_RE);
  const currency = currencyMatch ? currencyMatch[1].toUpperCase() : null;
  const normalized = original
    .replace(CURRENCY_RE, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return { original, normalized, currency };
}

export interface ColumnMapping {
  /** field → column index */
  indexes: Partial<Record<MappedField, number>>;
  /** field → original header text */
  headers: Partial<Record<MappedField, string>>;
  currency: string | null;
  unmapped: string[];
}

export function mapColumns(headerRow: unknown[]): ColumnMapping {
  const normalized = headerRow.map((h) => normalizeHeader(String(h ?? "")));
  const indexes: ColumnMapping["indexes"] = {};
  const headers: ColumnMapping["headers"] = {};
  const used = new Set<number>();
  let currency: string | null = null;

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [MappedField, string[]][]) {
    for (const alias of aliases) {
      const idx = normalized.findIndex((h, i) => !used.has(i) && h.normalized === alias);
      if (idx !== -1) {
        indexes[field] = idx;
        headers[field] = normalized[idx].original;
        used.add(idx);
        if (!currency && normalized[idx].currency) currency = normalized[idx].currency;
        break;
      }
    }
  }

  const unmapped = normalized.filter((h, i) => !used.has(i) && h.original !== "").map((h) => h.original);

  return { indexes, headers, currency, unmapped };
}

/** How many known fields a candidate header row matches; used to find the header row. */
export function headerScore(row: unknown[]): number {
  return Object.keys(mapColumns(row).indexes).length;
}
