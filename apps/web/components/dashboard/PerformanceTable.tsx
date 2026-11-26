"use client";

import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { BreakdownItem, Metrics, ReportData } from "@maa/core";
import { fmt, METRICS } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { Segmented } from "./ChartCard";

type Level = "campaigns" | "adSets" | "ads";
type SortKey = keyof Metrics | "key";

const COLUMNS: (keyof Metrics)[] = [
  "spend",
  "impressions",
  "cpm",
  "ctr",
  "cpc",
  "frequency",
  "results",
  "costPerResult",
  "purchases",
  "revenue",
  "roas",
  "conversionRate",
];

function deliveryTone(d?: string) {
  const s = (d ?? "").toLowerCase();
  if (s.includes("learning limited")) return "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300";
  if (s.includes("learning")) return "bg-sky-100 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300";
  if (s.includes("active")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (s.includes("off") || s.includes("inactive") || s.includes("paused"))
    return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
}

export function PerformanceTable({ report }: { report: ReportData }) {
  const levels = (
    [
      { value: "campaigns", label: `Campaigns (${report.campaigns.length})` },
      { value: "adSets", label: `Ad sets (${report.adSets.length})` },
      { value: "ads", label: `Ads (${report.ads.length})` },
    ] as { value: Level; label: string }[]
  ).filter((l) => report[l.value].length > 0);
  const [level, setLevel] = useState<Level>(levels[0]?.value ?? "campaigns");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "spend", dir: "desc" });
  const [query, setQuery] = useState("");

  const columns = COLUMNS.filter((c) => report.totals[c] != null && report.totals[c] !== 0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: BreakdownItem[] = report[level].filter(
      (r) => !q || r.key.toLowerCase().includes(q) || r.parent?.toLowerCase().includes(q),
    );
    const val = (r: BreakdownItem) => (sort.key === "key" ? r.key : r.metrics[sort.key]);
    return [...items].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : av - (bv as number);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [report, level, sort, query]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: key === "key" ? "asc" : "desc" }));

  if (!levels.length) return null;

  const Header = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th
      scope="col"
      className={cn("whitespace-nowrap px-3 py-3 font-semibold", align === "right" ? "text-right" : "text-left")}
      aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white",
          sort.key === k && "text-slate-900 dark:text-white",
        )}
      >
        {label}
        {sort.key === k && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/5">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Performance breakdown</h3>
          <p className="mt-0.5 text-sm text-slate-500">Click a column to sort</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative">
            <span className="sr-only">Filter by name</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:w-48 dark:border-white/10 dark:bg-white/5"
            />
          </label>
          {levels.length > 1 && <Segmented label="Table level" value={level} onChange={setLevel} options={levels} />}
        </div>
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500 dark:bg-slate-900">
            <tr>
              <Header k="key" label="Name" align="left" />
              {columns.map((c) => (
                <Header key={c} k={c} label={METRICS[c]?.label ?? c} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((r) => (
              <tr key={`${r.parent ?? ""}/${r.key}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[.03]">
                <td className="min-w-[220px] max-w-[320px] px-3 py-3">
                  <p className="truncate font-medium text-slate-900 dark:text-white" title={r.key}>
                    {r.key}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {r.parent && (
                      <span className="truncate text-xs text-slate-500" title={r.parent}>
                        {r.parent}
                      </span>
                    )}
                    {r.delivery && (
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", deliveryTone(r.delivery))}>
                        {r.delivery}
                      </span>
                    )}
                  </div>
                </td>
                {columns.map((c) => (
                  <td key={c} className="tabular whitespace-nowrap px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                    {fmt(report, c, r.metrics[c] as number | null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-50 font-semibold dark:bg-slate-900">
            <tr>
              <td className="px-3 py-3 text-slate-900 dark:text-white">Total</td>
              {columns.map((c) => (
                <td key={c} className="tabular whitespace-nowrap px-3 py-3 text-right text-slate-900 dark:text-white">
                  {fmt(report, c, report.totals[c] as number | null)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No rows match &ldquo;{query}&rdquo;.</p>}
      </div>
    </section>
  );
}
