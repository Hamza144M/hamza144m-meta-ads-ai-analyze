import { AlertOctagon, CalendarRange, Lightbulb, Rocket, TestTube2, Users, Wallet, Zap } from "lucide-react";
import type { StoredAnalysis } from "@maa/core";
import { BulletList, Section } from "./ui";

export function ActionPlan({ analysis }: { analysis: StoredAnalysis }) {
  const r = analysis.result.recommendations;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={AlertOctagon} title="Top 10 problems" subtitle="Most costly first">
          <BulletList items={r.topProblems} numbered />
        </Section>
        <Section icon={Lightbulb} title="Top 10 improvements" subtitle="Highest impact first">
          <BulletList items={r.topImprovements} numbered />
        </Section>
      </div>
      <Section icon={Zap} title="Quick wins" subtitle="Do these today">
        <div className="grid gap-3 sm:grid-cols-2">
          {r.quickWins.map((q, i) => (
            <label
              key={i}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded accent-brand-600" />
              <span>{q}</span>
            </label>
          ))}
        </div>
      </Section>
      <Section icon={CalendarRange} title="Optimization roadmap" subtitle="Next 30 days">
        <ol className="relative space-y-6 border-l-2 border-brand-100 pl-6 dark:border-brand-400/20">
          {r.optimizationRoadmap.map((p, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[33px] grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white ring-4 ring-white dark:ring-slate-900">
                {i + 1}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{p.timeframe}</p>
              <p className="font-semibold text-slate-900 dark:text-white">{p.phase}</p>
              <BulletList items={p.actions} />
            </li>
          ))}
        </ol>
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section icon={Rocket} title="Scaling plan">
          <BulletList items={r.scalingPlan} numbered />
        </Section>
        <Section icon={Wallet} title="Budget strategy">
          <BulletList items={r.budgetStrategy} />
        </Section>
        <Section icon={TestTube2} title="Creative testing ideas">
          <BulletList items={r.creativeTestingIdeas} />
        </Section>
        <Section icon={Users} title="Audience testing ideas">
          <BulletList items={r.audienceTestingIdeas} />
        </Section>
      </div>
    </div>
  );
}
