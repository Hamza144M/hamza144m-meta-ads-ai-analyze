"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BreakdownItem, ReportData } from "@maa/core";
import { fmt, METRICS } from "@/lib/metrics";
import { axisProps, ChartCard, EmptyChart, Segmented, TooltipBox } from "./ChartCard";

type Key = "spend" | "roas" | "costPerResult" | "ctr" | "cpm";
const OPTIONS: { value: Key; label: string }[] = [
  { value: "spend", label: "Spend" },
  { value: "roas", label: "ROAS" },
  { value: "costPerResult", label: "Cost / result" },
  { value: "ctr", label: "CTR" },
  { value: "cpm", label: "CPM" },
];

const truncate = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function CampaignBars({
  report,
  items = report.campaigns,
  title = "Campaign comparison",
}: {
  report: ReportData;
  items?: BreakdownItem[];
  title?: string;
}) {
  const [metric, setMetric] = useState<Key>("spend");
  const available = OPTIONS.filter((o) => o.value !== "roas" || report.totals.roas != null);
  const data = useMemo(
    () =>
      items
        .slice(0, 10)
        .map((c) => ({ name: c.key, value: c.metrics[metric] }))
        .filter((d) => d.value != null)
        .sort((a, b) => (METRICS[metric].lowerIsBetter ? (a.value ?? 0) - (b.value ?? 0) : (b.value ?? 0) - (a.value ?? 0))),
    [items, metric],
  );

  return (
    <ChartCard
      title={title}
      subtitle={METRICS[metric].lowerIsBetter ? "Lower is better" : "Higher is better"}
      actions={<Segmented label="Campaign metric" value={metric} onChange={setMetric} options={available} />}
    >
      {data.length === 0 ? (
        <EmptyChart message="No campaign data for this metric." />
      ) : (
        <div style={{ height: Math.max(180, data.length * 40 + 24) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" tickFormatter={(v: number) => fmt(report, metric, v, true)} {...axisProps} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => (
                  <text x={Number(x) - 6} y={y} dy={4} textAnchor="end" fontSize={12} style={{ fill: "var(--text-muted)" }}>
                    <title>{String(payload.value)}</title>
                    {truncate(String(payload.value), 21)}
                  </text>
                )}
              />
              <Tooltip
                cursor={{ fill: "var(--grid)", opacity: 0.4 }}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <TooltipBox
                      title={String(payload[0].payload.name)}
                      rows={[
                        { name: METRICS[metric].label, value: fmt(report, metric, payload[0].value as number), color: "var(--series-1)" },
                      ]}
                    />
                  ) : null
                }
              />
              <Bar dataKey="value" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
