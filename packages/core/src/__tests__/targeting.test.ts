import { test } from "node:test";
import assert from "node:assert/strict";
import { adviseTargeting, analyzeTable } from "../index";

test("adviseTargeting ranks age segments by ROAS and flags no-sale segments", () => {
  const table = [
    ["Campaign name", "Age", "Gender", "Amount spent (USD)", "Impressions", "Link clicks", "Purchases", "Purchases conversion value"],
    ["A", "18-24", "female", "100", "10000", "100", "10", "600"],
    ["A", "25-34", "female", "100", "10000", "100", "5", "300"],
    ["A", "35-44", "female", "100", "10000", "100", "2", "100"],
    ["A", "45-54", "male", "100", "10000", "100", "0", "0"],
  ];
  const advice = adviseTargeting(analyzeTable(table, "t.csv"));
  const age = advice.find((a) => a.dimension === "age")!;
  assert.equal(age.basis, "roas");
  assert.equal(age.best, "18-24");
  assert.equal(age.worst, "45-54");
  const verdict = Object.fromEntries(age.segments.map((s) => [s.key, s.verdict]));
  assert.equal(verdict["18-24"], "scale"); // ROAS 6 vs 2.5 average
  assert.equal(verdict["25-34"], "keep"); // ROAS 3 vs 2.5
  assert.equal(verdict["35-44"], "cut"); // ROAS 1 vs 2.5
  assert.equal(verdict["45-54"], "cut");
  assert.ok(age.segments.every((s) => !s.reason.includes("Infinity")));
  assert.ok(advice.some((a) => a.dimension === "gender"));
  assert.ok(!advice.some((a) => a.dimension === "placement"));
});
