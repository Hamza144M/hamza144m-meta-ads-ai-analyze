"use client";

import { AlertTriangle, ArrowLeftRight, CheckCircle2, Lightbulb, Scale, ThumbsUp, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { compareItems, type BreakdownItem, type ReportData } from "@maa/core";
import { Segmented } from "@/components/dashboard/ChartCard";
import { cn } from "@/lib/utils";

type Level = "ads" | "adSets" | "campaigns";
const UNIT: Record<Level, { one: string; many: string }> = {
  ads: { one: "ad", many: "Ads" },
  adSets: { one: "ad set", many: "Ad sets" },
  campaigns: { one: "campaign", many: "Campaigns" },
};

const CONFIDENCE = {
  high: { label: "Clear winner", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300" },
  medium: { label: "Likely winner", tone: "bg-sky-100 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300" },
  low: { label: "Early signal, needs more data", tone: "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300" },
} as const;

const label = (it: BreakdownItem) => (it.parent ? `${it.key} (${it.parent})` : it.key);

function Picker({
  id,
  title,
  items,
  value,
  disabledIndex,
  onChange,
  tone,
}: {
  id: string;
  title: string;
  items: BreakdownItem[];
  value: number;
  disabledIndex: number;
  onChange: (i: number) => void;
  tone: "a" | "b";
}) {
  return (
    <label htmlFor={id} className="block min-w-0 flex-1">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white",
            tone === "a" ? "bg-brand-600" : "bg-fuchsia-600",
          )}
        >
          {tone.toUpperCase()}
        </span>
        {title}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-10 w-full truncate rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900"
      >
        {items.map((it, i) => (
          <option key={i} value={i} disabled={i === disabledIndex}>
            {label(it)}
          </option>
        ))}
      </select>
    </label>
  );
}

function List({ icon: Icon, title, items, tone }: { icon: typeof Lightbulb; title: string; items: string[]; tone: string }) {
  if (!items.length) return null;
  return (
    <section className="card p-5">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Icon className={cn("h-4 w-4", tone)} /> {title}
      </h3>
      <ul className="mt-3 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current", tone)} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CompareView({ report }: { report: ReportData }) {
  const levels = (["ads", "adSets", "campaigns"] as Level[]).filter((l) => report[l].length >= 2);
  const [level, setLevelState] = useState<Level>(levels[0] ?? "ads");
  // Items sorted by spend so the two biggest spenders are picked by default.
  const items = useMemo(() => [...(report[level] ?? [])].sort((x, y) => y.metrics.spend - x.metrics.spend), [report, level]);
  const [ia, setIa] = useState(0);
  const [ib, setIb] = useState(1);
  const setLevel = (l: Level) => {
    setLevelState(l);
    setIa(0);
    setIb(1);
  };

  const A = items[ia];
  const B = items[ib];
  const unit = UNIT[level].one;
  const result = useMemo(
    () =>
      A && B
        ? compareItems(A, B, report.currency, {
            nameA: `${unit[0].toUpperCase()}${unit.slice(1)} A`,
            nameB: `${unit[0].toUpperCase()}${unit.slice(1)} B`,
            unit,
          })
        : null,
    [A, B, report.currency, unit],
  );

  if (!levels.length || !A || !B || !result) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <Scale className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Nothing to compare yet</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This report needs at least two ads, ad sets or campaigns. Export your report from Ads Manager at the ad level to compare
          individual ads.
        </p>
      </div>
    );
  }

  const winnerItem = result.winner === "a" ? A : result.winner === "b" ? B : null;
  const conf = CONFIDENCE[result.confidence];

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Compare two {UNIT[level].many.toLowerCase()}</h2>
            <p className="mt-0.5 text-sm text-slate-500">Pick any two and see which one is better and why. Works without AI.</p>
          </div>
          {levels.length > 1 && (
            <Segmented
              label="Compare level"
              value={level}
              onChange={setLevel}
              options={levels.map((l) => ({ value: l, label: `${UNIT[l].many} (${report[l].length})` }))}
            />
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Picker id="cmp-a" title={`${unit} A`} items={items} value={ia} disabledIndex={ib} onChange={setIa} tone="a" />
          <button
            type="button"
            className="btn-secondary h-10 shrink-0 self-center sm:self-end"
            onClick={() => {
              setIa(ib);
              setIb(ia);
            }}
            aria-label="Swap A and B"
            title="Swap A and B"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <Picker id="cmp-b" title={`${unit} B`} items={items} value={ib} disabledIndex={ia} onChange={setIb} tone="b" />
        </div>
      </section>

      <section
        className={cn(
          "card border-2 p-6",
          result.winner === "tie" ? "border-slate-200 dark:border-white/10" : "border-emerald-400/60 dark:border-emerald-400/40",
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              result.winner === "tie"
                ? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
            )}
          >
            {result.winner === "tie" ? <Scale className="h-6 w-6" /> : <Trophy className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{result.headline}</h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", conf.tone)}>{conf.label}</span>
            </div>
            {winnerItem && <p className="mt-1 break-words text-sm font-medium text-slate-700 dark:text-slate-300">{label(winnerItem)}</p>}
            <p className="mt-1 text-sm text-slate-500">Judged mainly on {result.goalLabel}, then CTR, CPC, CPM and conversion rate.</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
          {result.reasons.map((t, i) => (
            <li key={i} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">
                  Metric
                </th>
                <th scope="col" className="max-w-[220px] px-4 py-3 text-right font-semibold">
                  <span className="block truncate text-brand-700 dark:text-brand-300" title={label(A)}>
                    A · {A.key}
                  </span>
                </th>
                <th scope="col" className="max-w-[220px] px-4 py-3 text-right font-semibold">
                  <span className="block truncate text-fuchsia-700 dark:text-fuchsia-300" title={label(B)}>
                    B · {B.key}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {result.rows.map((r) => (
                <tr key={r.key}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-400">{r.label}</td>
                  {(["a", "b"] as const).map((side) => (
                    <td
                      key={side}
                      className={cn(
                        "tabular whitespace-nowrap px-4 py-2.5 text-right",
                        r.better === side ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {r.better === side && <ThumbsUp className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" aria-label="better" />}
                      {side === "a" ? r.aText : r.bText}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-white/5">
          Green with a thumbs up means better on that metric. Spend, impressions, clicks and revenue are shown for context only.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <List icon={Lightbulb} title="What to do next" items={result.actions} tone="text-brand-600 dark:text-brand-400" />
        <List
          icon={Scale}
          title={result.winner === "tie" ? "Worth knowing" : "Where the other one is still better"}
          items={result.loserStrengths}
          tone="text-fuchsia-600 dark:text-fuchsia-400"
        />
        <List icon={AlertTriangle} title="Before you decide" items={result.cautions} tone="text-amber-600 dark:text-amber-400" />
      </div>
    </div>
  );
}
