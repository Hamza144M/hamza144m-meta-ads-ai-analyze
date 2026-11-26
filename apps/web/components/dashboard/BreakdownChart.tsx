"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BreakdownItem, ReportData } from "@maa/core";
import { fmt, METRICS } from "@/lib/metrics";
import { axisProps, ChartCard, TooltipBox } from "./ChartCard";

/** Spend and cost per result for a demographic breakdown (age, gender, region, placement). */
export function BreakdownChart({ report, items, title }: { report: ReportData; items: BreakdownItem[]; title: string }) {
  const data = items
    .slice(0, 12)
    .map((i) => ({ name: i.key, spend: i.metrics.spend, cpr: i.metrics.costPerResult, results: i.metrics.results }));
  return (
    <ChartCard title={title} subtitle="Spend by segment · hover for cost per result">
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="name" {...axisProps} interval={0} tick={{ ...axisProps.tick, fontSize: 11 }} />
            <YAxis width={56} tickFormatter={(v: number) => fmt(report, "spend", v, true)} {...axisProps} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--grid)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <TooltipBox
                    title={d.name}
                    rows={[
                      { name: "Spend", value: fmt(report, "spend", d.spend), color: "var(--series-1)" },
                      { name: METRICS.results.label, value: fmt(report, "results", d.results) },
                      { name: METRICS.costPerResult.label, value: fmt(report, "costPerResult", d.cpr) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="spend" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
