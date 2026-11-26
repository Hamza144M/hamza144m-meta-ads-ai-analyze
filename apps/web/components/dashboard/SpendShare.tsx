"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ReportData } from "@maa/core";
import { formatPercent } from "@maa/core";
import { fmt } from "@/lib/metrics";
import { SERIES } from "@/lib/utils";
import { ChartCard, EmptyChart, TooltipBox } from "./ChartCard";

/** Spend share by campaign. Top 7 keep their own color; the rest fold into "Other". */
export function SpendShare({ report }: { report: ReportData }) {
  const total = report.totals.spend;
  const top = report.campaigns.slice(0, 7).map((c) => ({ name: c.key, value: c.metrics.spend }));
  const other = report.campaigns.slice(7).reduce((s, c) => s + c.metrics.spend, 0);
  const data = other > 0 ? [...top, { name: "Other", value: other }] : top;

  return (
    <ChartCard title="Spend share" subtitle="By campaign">
      {total <= 0 ? (
        <EmptyChart message="No spend data found." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="95%"
                  paddingAngle={1}
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={d.name === "Other" ? "var(--axis)" : SERIES[i]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <TooltipBox
                        title={String(payload[0].name)}
                        rows={[
                          { name: "Spend", value: fmt(report, "spend", payload[0].value as number) },
                          { name: "Share", value: formatPercent(((payload[0].value as number) / total) * 100, 1) },
                        ]}
                      />
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{fmt(report, "spend", total)}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.name === "Other" ? "var(--axis)" : SERIES[i] }} />
                <span className="truncate text-slate-600 dark:text-slate-300" title={d.name}>
                  {d.name}
                </span>
                <span className="tabular ml-auto font-semibold text-slate-900 dark:text-white">
                  {formatPercent((d.value / total) * 100, 1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
