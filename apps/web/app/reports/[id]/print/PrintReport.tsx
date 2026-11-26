"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import type { Score, StoredAnalysis, StoredReport } from "@maa/core";
import { ActionPlan } from "@/components/analysis/ActionPlan";
import { AnalysisView } from "@/components/analysis/AnalysisView";
import { Scorecard } from "@/components/analysis/Scorecard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { Logo } from "@/components/ui/Logo";
import { getAnalysis, getReport } from "@/lib/api";
import { fmt } from "@/lib/metrics";

/** Print-optimized report. Opens the browser print dialog once loaded (Save as PDF works too). */
export function PrintReport({ id }: { id: string }) {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [scorecard, setScorecard] = useState<Score[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getReport(id), getAnalysis(id)])
      .then(([r, a]) => {
        setReport(r.report);
        setAnalysis(a.analysis);
        setScorecard(a.scorecard);
        setTimeout(() => window.print(), 800);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) return <p className="p-10 text-center text-red-600">{error}</p>;
  if (!report) return <p className="p-10 text-center text-slate-500">Preparing print version…</p>;
  const d = report.data;

  return (
    <div className="print-root mx-auto max-w-5xl space-y-6 bg-white p-6 text-slate-900 sm:p-10">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Logo />
        <button type="button" onClick={() => window.print()} className="btn-primary print:hidden">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
      <header>
        <h1 className="text-3xl font-bold">Meta Ads Performance Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          {d.fileName}
          {d.dateRange && ` · ${d.dateRange.start} to ${d.dateRange.end}`}
        </p>
      </header>
      <KpiGrid report={d} />
      <div className="break-inside-avoid">
        <FunnelChart report={d} />
      </div>
      <section className="card break-inside-avoid p-5">
        <h2 className="mb-3 font-semibold">Campaigns</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1.5">Campaign</th>
              {["Spend", "CTR", "CPM", "Results", "Cost/result", "ROAS"].map((h) => (
                <th key={h} className="py-1.5 text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {d.campaigns.map((c) => (
              <tr key={c.key}>
                <td className="py-1.5 pr-2">{c.key}</td>
                {(["spend", "ctr", "cpm", "results", "costPerResult", "roas"] as const).map((k) => (
                  <td key={k} className="tabular py-1.5 text-right">
                    {fmt(d, k, c.metrics[k] as number | null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {analysis ? (
        <>
          <AnalysisView analysis={analysis} />
          <ActionPlan analysis={analysis} />
        </>
      ) : (
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">KPI scorecard</h2>
          <Scorecard scores={scorecard} />
        </section>
      )}
    </div>
  );
}
