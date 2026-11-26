"use client";

import {
  AlertCircle,
  BarChart3,
  Brain,
  Crosshair,
  CalendarDays,
  FileSpreadsheet,
  ListChecks,
  MessageSquare,
  RefreshCw,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Score, StoredAnalysis, StoredReport } from "@maa/core";
import { ActionPlan } from "@/components/analysis/ActionPlan";
import { ANALYSIS_SECTIONS, AnalysisView } from "@/components/analysis/AnalysisView";
import { GeneratePanel } from "@/components/analysis/GeneratePanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { TargetingView } from "@/components/targeting/TargetingView";
import { generateAnalysis, getAnalysis, getReport } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BreakdownChart } from "./BreakdownChart";
import { CampaignBars } from "./CampaignBars";
import { CurrencySettings } from "./CurrencySettings";
import { DataNotes } from "./DataNotes";
import { ExportMenu } from "./ExportMenu";
import { FunnelChart } from "./FunnelChart";
import { KpiGrid } from "./KpiGrid";
import { PerformanceTable } from "./PerformanceTable";
import { SpendShare } from "./SpendShare";
import { TrendChart } from "./TrendChart";

const LEVEL_LABEL = { campaign: "Campaign level", adset: "Ad set level", ad: "Ad level", unknown: "Account" } as const;

function formatRange(r: { start: string; end: string }) {
  const f = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return r.start === r.end ? f(r.start) : `${f(r.start)} – ${f(r.end)}`;
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading report">
      <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

type Tab = "dashboard" | "targeting" | "analysis" | "plan" | "chat";
const TABS: { value: Tab; label: string; icon: typeof BarChart3 }[] = [
  { value: "dashboard", label: "Dashboard", icon: BarChart3 },
  { value: "targeting", label: "Targeting", icon: Crosshair },
  { value: "analysis", label: "AI analysis", icon: Brain },
  { value: "plan", label: "Action plan", icon: ListChecks },
  { value: "chat", label: "Ask AI", icon: MessageSquare },
];

export function ReportDashboard({ id }: { id: string }) {
  const [report, setReport] = useState<StoredReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab>("dashboard");
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [scorecard, setScorecard] = useState<Score[]>([]);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    history.replaceState(null, "", t === "dashboard" ? location.pathname : `#${t}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const h = location.hash.slice(1);
    if (h === "targeting" || h === "analysis" || h === "plan" || h === "chat") setTabState(h);
    let cancelled = false;
    getReport(id)
      .then(({ report }) => !cancelled && setReport(report))
      .catch((e: Error) => !cancelled && setError(e.message));
    getAnalysis(id)
      .then((a) => {
        if (cancelled) return;
        setAnalysis(a.analysis);
        setScorecard(a.scorecard);
      })
      .catch(() => {
        /* analysis is optional; the dashboard still works */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const runAnalysis = useCallback(async () => {
    setGenerating(true);
    setAiError(null);
    if (tab === "dashboard") setTab("analysis");
    try {
      const { analysis } = await generateAnalysis(id);
      setAnalysis(analysis);
      setScorecard(analysis.scorecard);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [id, tab, setTab]);

  if (error) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">We couldn&apos;t open this report</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <Link href="/upload" className="btn-primary mt-6">
          <Upload className="h-4 w-4" /> Upload a report
        </Link>
      </div>
    );
  }
  if (!report) return <Skeleton />;

  const d = report.data;
  const breakdowns = [
    { items: d.age, title: "Age" },
    { items: d.gender, title: "Gender" },
    { items: d.region, title: "Location" },
    { items: d.placement, title: "Placement" },
  ].filter((b) => b.items.length > 1);

  return (
    <div className="space-y-6 animate-fade-up">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="truncate">{d.fileName}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Account performance</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {d.dateRange && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5" /> {formatRange(d.dateRange)}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {LEVEL_LABEL[d.level]}
            </span>
            <CurrencySettings
              report={report}
              onUpdated={(r) => {
                setReport(r);
                getAnalysis(id)
                  .then((a) => setScorecard(a.scorecard))
                  .catch(() => {});
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu reportId={id} hasAnalysis={!!analysis} />
          <Link href="/upload" className="btn-secondary">
            <Upload className="h-4 w-4" /> New report
          </Link>
          {analysis ? (
            <button type="button" className="btn-secondary" onClick={runAnalysis} disabled={generating}>
              <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} /> Regenerate
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={runAnalysis} disabled={generating}>
              <Brain className="h-4 w-4" /> {generating ? "Analyzing…" : "Run AI analysis"}
            </button>
          )}
        </div>
      </header>

      <nav
        className="sticky top-16 z-30 -mx-4 border-b border-slate-200/70 bg-[var(--bg)]/90 px-4 backdrop-blur dark:border-white/10"
        aria-label="Report sections"
      >
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition",
                tab === t.value
                  ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
          {tab === "analysis" && analysis && (
            <div className="ml-auto hidden items-center gap-1 lg:flex">
              {ANALYSIS_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {(tab === "analysis" || tab === "plan") && (!analysis || generating) && (
        <GeneratePanel scorecard={scorecard} generating={generating} error={aiError} onGenerate={runAnalysis} />
      )}
      {tab === "analysis" && analysis && !generating && (
        <AnalysisView analysis={{ ...analysis, scorecard: scorecard.length ? scorecard : analysis.scorecard }} />
      )}
      {tab === "plan" && analysis && !generating && <ActionPlan analysis={analysis} />}
      {tab === "chat" && <ChatPanel reportId={id} />}
      {tab === "targeting" && <TargetingView report={d} />}

      {tab === "dashboard" && (
        <div className="space-y-6">
          <KpiGrid report={d} />

          <div className="grid gap-4 lg:grid-cols-3">
            <TrendChart report={d} className="lg:col-span-2" />
            <SpendShare report={d} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CampaignBars report={d} />
            <FunnelChart report={d} />
          </div>

          {breakdowns.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {breakdowns.map((b) => (
                <BreakdownChart key={b.title} report={d} items={b.items} title={b.title} />
              ))}
            </div>
          )}

          <PerformanceTable report={d} />
          <DataNotes report={d} />
        </div>
      )}
    </div>
  );
}
