"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReportData } from "@maa/core";
import { fmt } from "@/lib/metrics";
import { SERIES } from "@/lib/utils";
import { axisProps, ChartCard, EmptyChart, Segmented, TooltipBox } from "./ChartCard";

type View = "money" | "results" | "ctr" | "cpm" | "cpa" | "frequency";

const VIEWS: { value: View; label: string; series: { key: string; label: string }[] }[] = [
  {
    value: "money",
    label: "Spend & revenue",
    series: [
      { key: "spend", label: "Spend" },
      { key: "revenue", label: "Revenue" },
    ],
  },
  { value: "results", label: "Results", series: [{ key: "results", label: "Results" }] },
  { value: "cpa", label: "Cost / result", series: [{ key: "costPerResult", label: "Cost per result" }] },
  { value: "ctr", label: "CTR", series: [{ key: "ctr", label: "CTR (link)" }] },
  { value: "cpm", label: "CPM", series: [{ key: "cpm", label: "CPM" }] },
  { value: "frequency", label: "Frequency", series: [{ key: "frequency", label: "Frequency" }] },
];

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export function TrendChart({ report, className }: { report: ReportData; className?: string }) {
  const [view, setView] = useState<View>("money");
  const cfg = VIEWS.find((v) => v.value === view)!;
  const series = view === "money" && report.totals.revenue === 0 ? cfg.series.slice(0, 1) : cfg.series;
  const data = useMemo(
    () =>
      report.daily.map((d) => ({
        date: d.key,
        ...Object.fromEntries(VIEWS.flatMap((v) => v.series).map((s) => [s.key, d.metrics[s.key as keyof typeof d.metrics] ?? null])),
      })),
    [report.daily],
  );

  return (
    <ChartCard
      className={className}
      title="Performance over time"
      subtitle={report.daily.length ? `${report.daily.length} days` : undefined}
      actions={
        report.daily.length > 1 ? (
          <Segmented label="Trend metric" value={view} onChange={setView} options={VIEWS.map(({ value, label }) => ({ value, label }))} />
        ) : undefined
      }
    >
      {report.daily.length < 2 ? (
        <EmptyChart message="Add the Day breakdown (Breakdown → By time → Day) in Ads Manager before exporting to see trends." />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {series.map((s, i) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: SERIES[i], stopOpacity: 0.22 }} />
                    <stop offset="100%" style={{ stopColor: SERIES[i], stopOpacity: 0 }} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axisProps} />
              <YAxis width={64} tickFormatter={(v: number) => fmt(report, series[0].key, v, true)} {...axisProps} axisLine={false} />
              <Tooltip
                cursor={{ stroke: "var(--axis)", strokeDasharray: "3 3" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={shortDate(String(label))}
                      rows={payload.map((p, i) => ({
                        name: series[i]?.label ?? String(p.name),
                        value: fmt(report, String(p.dataKey), p.value as number),
                        color: SERIES[i],
                      }))}
                    />
                  ) : null
                }
              />
              {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />}
              {series.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={SERIES[i]}
                  strokeWidth={2}
                  fill={`url(#grad-${s.key})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
