import ExcelJS from "exceljs";
import type { BreakdownItem, ReportData, Score, StoredAnalysis } from "@maa/core";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
const STATUS_FILL = { good: "FFDCFCE7", warning: "FFFEF3C7", critical: "FFFEE2E2", unknown: "FFF1F5F9" } as const;

function styleHeader(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle" };
  row.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function breakdownSheet(wb: ExcelJS.Workbook, name: string, items: BreakdownItem[], currencyFmt: string, withParent = false) {
  if (!items.length) return;
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { header: "Name", key: "name", width: 40 },
    ...(withParent ? [{ header: "Parent", key: "parent", width: 32 }] : []),
    { header: "Delivery", key: "delivery", width: 16 },
    { header: "Spend", key: "spend", width: 12, style: { numFmt: currencyFmt } },
    { header: "Impressions", key: "impressions", width: 13, style: { numFmt: "#,##0" } },
    { header: "Reach", key: "reach", width: 12, style: { numFmt: "#,##0" } },
    { header: "Frequency", key: "frequency", width: 10, style: { numFmt: "0.00" } },
    { header: "CPM", key: "cpm", width: 10, style: { numFmt: currencyFmt } },
    { header: "Link clicks", key: "linkClicks", width: 11, style: { numFmt: "#,##0" } },
    { header: "CTR %", key: "ctr", width: 9, style: { numFmt: "0.00" } },
    { header: "CPC", key: "cpc", width: 10, style: { numFmt: currencyFmt } },
    { header: "LP views", key: "landingPageViews", width: 10, style: { numFmt: "#,##0" } },
    { header: "Leads", key: "leads", width: 9, style: { numFmt: "#,##0" } },
    { header: "Messages", key: "messages", width: 10, style: { numFmt: "#,##0" } },
    { header: "Purchases", key: "purchases", width: 10, style: { numFmt: "#,##0" } },
    { header: "Revenue", key: "revenue", width: 12, style: { numFmt: currencyFmt } },
    { header: "ROAS", key: "roas", width: 8, style: { numFmt: "0.00" } },
    { header: "Results", key: "results", width: 9, style: { numFmt: "#,##0" } },
    { header: "Cost/result", key: "costPerResult", width: 12, style: { numFmt: currencyFmt } },
    { header: "Conv. rate %", key: "conversionRate", width: 12, style: { numFmt: "0.00" } },
  ];
  for (const i of items) ws.addRow({ name: i.key, parent: i.parent, delivery: i.delivery, ...i.metrics });
  styleHeader(ws);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
}

function listSheet(wb: ExcelJS.Workbook, name: string, sections: [string, string[]][]) {
  const ws = wb.addWorksheet(name);
  ws.columns = [
    { header: "Section", key: "s", width: 28 },
    { header: "#", key: "n", width: 5 },
    { header: "Item", key: "i", width: 110 },
  ];
  for (const [section, items] of sections) items.forEach((item, idx) => ws.addRow({ s: section, n: idx + 1, i: item }));
  ws.getColumn("i").alignment = { wrapText: true, vertical: "top" };
  styleHeader(ws);
}

/** Excel summary: KPIs, scorecard, breakdowns and (when present) the AI action plan. */
export async function renderXlsx(data: ReportData, scorecard: Score[], analysis: StoredAnalysis | null): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Meta Ads AI Analyzer";
  wb.created = new Date();
  const symbol = { USD: "$", EUR: "€", GBP: "£" }[data.currency ?? "USD"] ?? "";
  const currencyFmt = symbol ? `"${symbol}"#,##0.00` : "#,##0.00";

  const t = data.totals;
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "m", width: 30 },
    { header: "Value", key: "v", width: 18 },
  ];
  const rows: [string, number | string | null, string?][] = [
    ["Report", data.fileName],
    ["Date range", data.dateRange ? `${data.dateRange.start} – ${data.dateRange.end}` : "n/a"],
    ["Currency", data.currency ?? "n/a"],
    ["Total spend", t.spend, currencyFmt],
    ["Revenue", t.revenue, currencyFmt],
    ["ROAS", t.roas, "0.00"],
    ["Results", t.results, "#,##0"],
    ["Cost per result", t.costPerResult, currencyFmt],
    ["Campaigns", data.counts.campaigns],
    ["Ad sets", data.counts.adSets],
    ["Ads", data.counts.ads],
    ["Impressions", t.impressions, "#,##0"],
    ["Reach", t.reach, "#,##0"],
    ["Frequency", t.frequency, "0.00"],
    ["CPM", t.cpm, currencyFmt],
    ["CPC (link)", t.cpc, currencyFmt],
    ["CTR (link) %", t.ctr, "0.00"],
    ["Clicks (all)", t.clicks, "#,##0"],
    ["Link clicks", t.linkClicks, "#,##0"],
    ["Landing page views", t.landingPageViews, "#,##0"],
    ["Leads", t.leads, "#,##0"],
    ["Messaging conversations", t.messages, "#,##0"],
    ["Purchases", t.purchases, "#,##0"],
    ["Conversion rate %", t.conversionRate, "0.00"],
  ];
  for (const [m, v, fmt] of rows) {
    const r = summary.addRow({ m, v: v ?? "n/a" });
    if (fmt) r.getCell("v").numFmt = fmt;
  }
  styleHeader(summary);

  const sc = wb.addWorksheet("Scorecard");
  sc.columns = [
    { header: "Metric", key: "l", width: 22 },
    { header: "Score", key: "s", width: 8 },
    { header: "Status", key: "st", width: 12 },
    { header: "Why", key: "n", width: 90 },
  ];
  for (const s of scorecard) {
    const r = sc.addRow({
      l: s.label,
      s: s.score ?? "n/a",
      st: { good: "Good", warning: "Needs work", critical: "Critical", unknown: "No data" }[s.status],
      n: analysis?.result.scoreNotes[s.key] || s.basis,
    });
    r.getCell("st").fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[s.status] } };
  }
  sc.getColumn("n").alignment = { wrapText: true, vertical: "top" };
  styleHeader(sc);

  breakdownSheet(wb, "Campaigns", data.campaigns, currencyFmt);
  breakdownSheet(wb, "Ad sets", data.adSets, currencyFmt, true);
  breakdownSheet(wb, "Ads", data.ads, currencyFmt, true);
  breakdownSheet(wb, "Daily", data.daily, currencyFmt);
  breakdownSheet(wb, "Age", data.age, currencyFmt);
  breakdownSheet(wb, "Gender", data.gender, currencyFmt);
  breakdownSheet(wb, "Location", data.region, currencyFmt);
  breakdownSheet(wb, "Placement", data.placement, currencyFmt);

  if (analysis) {
    const r = analysis.result;
    listSheet(wb, "Action plan", [
      ["Executive summary", [r.executiveSummary.headline, r.executiveSummary.overview, ...r.executiveSummary.keyFindings].filter(Boolean)],
      ["Top problems", r.recommendations.topProblems],
      ["Top improvements", r.recommendations.topImprovements],
      ["Quick wins", r.recommendations.quickWins],
      ["Scaling plan", r.recommendations.scalingPlan],
      ["Creative tests", r.recommendations.creativeTestingIdeas],
      ["Audience tests", r.recommendations.audienceTestingIdeas],
      ["Budget strategy", r.recommendations.budgetStrategy],
      ...r.recommendations.optimizationRoadmap.map((p) => [`Roadmap: ${p.timeframe} ${p.phase}`, p.actions] as [string, string[]]),
      ["New hooks", r.creativeAnalysis.suggestions.hooks],
      ["Headlines", r.creativeAnalysis.suggestions.headlines],
      ["Primary text", r.creativeAnalysis.suggestions.primaryText],
    ]);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
