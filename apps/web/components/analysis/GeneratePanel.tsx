"use client";

import { AlertCircle, Brain, Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Score } from "@maa/core";
import { Scorecard } from "./Scorecard";
import { Section } from "./ui";
import { Gauge } from "lucide-react";

const STEPS = [
  "Reading campaign, ad set and ad performance",
  "Checking creative fatigue and hooks",
  "Finding funnel bottlenecks",
  "Planning budget moves",
  "Writing your action plan",
];

/** Shown before an analysis exists, and while one is generating. */
export function GeneratePanel({
  scorecard,
  generating,
  error,
  onGenerate,
}: {
  scorecard: Score[];
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!generating) return setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4500);
    return () => clearInterval(t);
  }, [generating]);

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_-20%,rgba(37,99,235,.15),transparent)]" />
        <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lift">
          {generating ? <Loader2 className="h-7 w-7 animate-spin" /> : <Brain className="h-7 w-7" />}
        </span>
        <h2 className="relative mt-5 text-xl font-bold text-slate-900 dark:text-white">
          {generating ? "Your AI consultant is auditing the account…" : "Get your AI audit"}
        </h2>
        {generating ? (
          <ul className="relative mx-auto mt-6 max-w-sm space-y-2 text-left">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-2 text-sm ${i <= step ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}
              >
                {i < step ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                ) : (
                  <span className="h-4 w-4" />
                )}
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="relative mx-auto mt-2 max-w-lg text-slate-600 dark:text-slate-400">
              Executive summary, campaign, creative, audience, funnel and budget analysis, plus a 30-day action plan. Takes about 20–60
              seconds.
            </p>
            <button type="button" onClick={onGenerate} className="btn-primary relative mt-6 h-11 px-6">
              <Sparkles className="h-4 w-4" /> Generate AI analysis
            </button>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="relative mx-auto mt-5 flex max-w-lg items-start justify-center gap-2 text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </div>
      {scorecard.length > 0 && (
        <Section icon={Gauge} title="KPI scorecard" subtitle="Calculated from your data. The AI analysis explains each score.">
          <Scorecard scores={scorecard} />
        </Section>
      )}
    </div>
  );
}
