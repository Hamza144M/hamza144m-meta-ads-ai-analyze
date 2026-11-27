import { test } from "node:test";
import assert from "node:assert/strict";
import { compareItems, deriveMetrics, emptySums, type BreakdownItem, type Sums } from "../index";

const item = (key: string, s: Partial<Sums>): BreakdownItem => ({ key, metrics: deriveMetrics({ ...emptySums(), ...s }) });

test("cheaper cost per result wins and explains CTR", () => {
  const a = item("Ad A", { spend: 100, impressions: 20000, reach: 15000, linkClicks: 400, results: 40 });
  const b = item("Ad B", { spend: 100, impressions: 20000, reach: 15000, linkClicks: 200, results: 20 });
  const r = compareItems(a, b, "PKR");
  assert.equal(r.goal, "results");
  assert.equal(r.winner, "a");
  assert.match(r.headline, /Ad A/);
  assert.ok(r.reasons.some((x) => x.includes("Cheaper results")));
  assert.ok(r.reasons.some((x) => x.includes("CTR")));
  assert.ok(r.reasons[0].includes("PKR") || r.reasons[0].includes("Rs"));
});

test("ROAS decides when there is revenue, even if the other has cheaper clicks", () => {
  const a = item("A", { spend: 100, impressions: 10000, linkClicks: 300, purchases: 3, revenue: 150 });
  const b = item("B", { spend: 100, impressions: 10000, linkClicks: 150, purchases: 5, revenue: 500 });
  const r = compareItems(a, b, "USD");
  assert.equal(r.goal, "revenue");
  assert.equal(r.winner, "b");
  assert.ok(r.loserStrengths.some((x) => x.includes("higher CTR")));
});

test("side with no results loses", () => {
  const a = item("A", { spend: 50, impressions: 5000, linkClicks: 200 });
  const b = item("B", { spend: 50, impressions: 5000, linkClicks: 50, leads: 4 });
  const r = compareItems(a, b, "INR");
  assert.equal(r.winner, "b");
  assert.ok(r.actions.some((x) => x.startsWith("Pause A")));
  assert.equal(r.confidence, "low");
});

test("near-identical items tie", () => {
  const a = item("A", { spend: 100, impressions: 10000, linkClicks: 200, results: 50 });
  const b = item("B", { spend: 101, impressions: 10050, linkClicks: 201, results: 50 });
  assert.equal(compareItems(a, b, "EUR").winner, "tie");
});
