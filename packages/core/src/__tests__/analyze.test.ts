import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeTable, normalizeHeader, parseNumber, ReportParseError } from "../index";

test("normalizeHeader strips currency and punctuation", () => {
  assert.deepEqual(normalizeHeader("Amount spent (USD)"), { original: "Amount spent (USD)", normalized: "amount spent", currency: "USD" });
  assert.equal(normalizeHeader("CPC (cost per link click) (EUR)").normalized, "cpc cost per link click");
});

test("parseNumber handles Meta formats", () => {
  assert.equal(parseNumber("1,234.56"), 1234.56);
  assert.equal(parseNumber("$12.30"), 12.3);
  assert.equal(parseNumber("3.2%"), 3.2);
  assert.equal(parseNumber("—"), 0);
  assert.equal(parseNumber("1.234,5"), 1234.5);
  assert.equal(parseNumber(""), 0);
});

test("analyzeTable aggregates a simple campaign export with a title row and summary row", () => {
  const table = [
    ["My Ads Report"],
    ["Campaign name", "Amount spent (EUR)", "Impressions", "Reach", "Link clicks", "Purchases", "Purchases conversion value"],
    ["", "300", "30000", "20000", "300", "6", "600"],
    ["A", "100", "10000", "8000", "100", "2", "200"],
    ["B", "200", "20000", "12000", "200", "4", "400"],
  ];
  const r = analyzeTable(table, "t.csv");
  assert.equal(r.level, "campaign");
  assert.equal(r.currency, "EUR");
  assert.equal(r.rowCount, 2);
  assert.equal(r.totals.spend, 300);
  assert.equal(r.totals.cpm, 10);
  assert.equal(r.totals.ctr, 1);
  assert.equal(r.totals.roas, 2);
  assert.equal(r.totals.cpa, 50);
  assert.equal(r.campaigns[0].key, "B");
  assert.ok(r.warnings.some((w) => w.includes("summary row")));
});

test("analyzeTable derives revenue from ROAS when no value column", () => {
  const r = analyzeTable(
    [
      ["Campaign name", "Amount spent (USD)", "Impressions", "Purchase ROAS (return on ad spend)"],
      ["A", "50", "1000", "3"],
    ],
    "x.csv",
  );
  assert.equal(r.totals.revenue, 150);
});

test("analyzeTable rejects files without Meta columns", () => {
  assert.throws(
    () =>
      analyzeTable(
        [
          ["foo", "bar"],
          [1, 2],
        ],
        "x.csv",
      ),
    ReportParseError,
  );
});

test("sample export parses end to end", () => {
  const csv = readFileSync(resolve(__dirname, "../../../../apps/web/public/samples/meta-ads-sample.csv"), "utf8");
  const table = csv
    .trim()
    .split("\n")
    .map((l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "")));
  const r = analyzeTable(table, "sample.csv");
  assert.equal(r.level, "ad");
  assert.equal(r.counts.campaigns, 6);
  assert.equal(r.daily.length, 28);
  assert.ok((r.totals.roas ?? 0) > 1);
  assert.ok(r.funnel.length >= 6);
});

test("scorecard scores every KPI 1-100 with a traffic-light status", async () => {
  const { computeScorecard } = await import("../index");
  const r = analyzeTable(
    [
      [
        "Campaign name",
        "Day",
        "Amount spent (USD)",
        "Impressions",
        "Reach",
        "Link clicks",
        "Landing page views",
        "Purchases",
        "Purchases conversion value",
      ],
      ["A", "2026-01-01", "100", "10000", "8000", "150", "120", "3", "400"],
      ["A", "2026-01-02", "100", "10000", "8000", "150", "120", "3", "400"],
    ],
    "s.csv",
  );
  const s = computeScorecard(r);
  assert.equal(s.length, 11);
  for (const x of s) {
    if (x.score != null) assert.ok(x.score >= 1 && x.score <= 100, x.key);
    assert.ok(["good", "warning", "critical", "unknown"].includes(x.status));
  }
  assert.equal(s.find((x) => x.key === "roas")!.status, "good"); // 4x
});

test("scorecard converts other currencies to USD before scoring", async () => {
  const { computeScorecard } = await import("../index");
  // 5000 PKR / 10000 impressions = 500 PKR CPM, about $1.79 at 280 PKR/USD: excellent CPM
  const pkr = analyzeTable(
    [
      ["Campaign name", "Amount spent (PKR)", "Impressions", "Link clicks"],
      ["A", "5000", "10000", "100"],
    ],
    "s.csv",
  );
  assert.ok(computeScorecard(pkr).find((x) => x.key === "cpm")!.score! >= 90);
  // Unknown currency without a user rate is not scored
  const mnt = { ...pkr, currency: "MNT" };
  assert.equal(computeScorecard(mnt).find((x) => x.key === "cpm")!.status, "unknown");
  // A user-provided rate enables scoring
  assert.notEqual(computeScorecard({ ...mnt, usdRate: 3400 }).find((x) => x.key === "cpm")!.score, null);
});
