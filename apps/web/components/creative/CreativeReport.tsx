"use client";

import { Check, CheckCircle2, ClipboardCopy, FlaskConical, Lightbulb, ListChecks, Megaphone, Ruler, Sparkles, Wrench } from "lucide-react";
import { useState } from "react";
import type { CreativeAnalysisOutput } from "@maa/server";
import type { Rating } from "@maa/core";
import { RATING_STYLE, RatingBadge, Section } from "@/components/analysis/ui";
import { cn } from "@/lib/utils";

const AREAS = [
  { key: "hook", label: "Hook (first 3 seconds)" },
  { key: "visual", label: "Visual & thumbnail" },
  { key: "textOverlay", label: "Text overlay" },
  { key: "branding", label: "Branding" },
  { key: "cta", label: "Call to action" },
  { key: "placementFit", label: "Placement & format fit" },
] as const;

const ratingOf = (score: number): Rating => (score >= 75 ? "good" : score >= 50 ? "warning" : score > 0 ? "critical" : "unknown");
const checkRating = (s: "good" | "warning" | "critical"): Rating => s;

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const style = RATING_STYLE[ratingOf(score)];
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 80 80" className="h-24 w-24" role="img" aria-label={`${label}: ${score} out of 100`}>
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-white/10" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={style.ring}
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="46" textAnchor="middle" className="fill-slate-900 text-[20px] font-bold dark:fill-white">
          {score}
        </text>
      </svg>
      <span className="text-center text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
    </div>
  );
}

function CopyList({ items }: { items: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  if (!items.length) return <p className="text-sm text-slate-500">No suggestions.</p>;
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10">
          <span className="flex-1 whitespace-pre-line text-slate-700 dark:text-slate-300">{t}</span>
          <button
            type="button"
            className="btn-ghost h-8 w-8 shrink-0 p-0"
            aria-label="Copy"
            onClick={() => {
              void navigator.clipboard?.writeText(t).then(() => {
                setCopied(i);
                setTimeout(() => setCopied(null), 1500);
              });
            }}
          >
            {copied === i ? <Check className="h-4 w-4 text-emerald-600" /> : <ClipboardCopy className="h-4 w-4" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

const PRIORITY_STYLE = {
  high: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
};

export function CreativeReport({ output }: { output: CreativeAnalysisOutput }) {
  const { result, formatChecks, model } = output;
  const fixes = [...result.fixes].sort(
    (a, b) => ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority),
  );
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex justify-center gap-6">
            <ScoreRing score={result.overallScore} label="Overall score" />
            <ScoreRing score={result.scrollStopScore} label="Scroll-stopping power" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{result.verdict || "Creative review"}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{result.summary}</p>
            <p className="mt-3 text-xs text-slate-400">Reviewed by {model}</p>
          </div>
        </div>
      </section>

      <Section icon={ListChecks} title="Scores by area" subtitle="What the AI sees in each part of the creative">
        <div className="grid gap-4 md:grid-cols-2">
          {AREAS.map(({ key, label }) => {
            const a = result.areas[key];
            const rating = ratingOf(a.score);
            return (
              <div key={key} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-900 dark:text-white">{label}</h3>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.score}/100</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                  <div className={cn("h-full rounded-full", RATING_STYLE[rating].bar)} style={{ width: `${a.score}%` }} />
                </div>
                {a.assessment && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{a.assessment}</p>}
                {a.fix && (
                  <p className="mt-2 flex gap-2 text-sm text-slate-800 dark:text-slate-200">
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" /> {a.fix}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={Ruler} title="Meta format check" subtitle="Size, aspect ratio and length for each placement">
        <ul className="space-y-3">
          {formatChecks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 text-sm">
              <RatingBadge rating={checkRating(c.status)} />
              <span>
                <span className="font-medium text-slate-900 dark:text-white">{c.label}:</span>{" "}
                <span className="text-slate-600 dark:text-slate-400">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Wrench} title="Fixes to make" subtitle="Most important first">
          {fixes.length ? (
            <ol className="space-y-3">
              {fixes.map((f, i) => (
                <li key={i} className="text-sm">
                  <span className={cn("mr-2 rounded-full px-2 py-0.5 text-xs font-semibold capitalize", PRIORITY_STYLE[f.priority])}>
                    {f.priority}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">{f.issue}</span>
                  {f.fix && <p className="mt-1 text-slate-600 dark:text-slate-400">{f.fix}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">No fixes suggested.</p>
          )}
        </Section>
        <Section icon={CheckCircle2} title="What's working">
          {result.strengths.length ? (
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nothing stood out yet.</p>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section icon={Sparkles} title="New hooks">
          <CopyList items={result.hooks} />
        </Section>
        <Section icon={Megaphone} title="Headlines">
          <CopyList items={result.headlines} />
        </Section>
        <Section icon={Lightbulb} title="Primary text">
          <CopyList items={result.primaryTexts} />
        </Section>
      </div>

      {result.testIdeas.length > 0 && (
        <Section icon={FlaskConical} title="A/B test ideas">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {result.testIdeas.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
