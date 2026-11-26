import { Banknote, Brain, Clapperboard, Filter, Gauge, Megaphone, Sparkles, Trophy, TrendingDown, TrendingUp, Users } from "lucide-react";
import type { Assessment, NamedInsight, StoredAnalysis } from "@maa/core";
import { Scorecard } from "./Scorecard";
import { BulletList, RatingBadge, Section, SubHeading } from "./ui";

function InsightCard({ item, tone }: { item: NamedInsight; tone: "good" | "bad" | "neutral" }) {
  const border = tone === "good" ? "border-l-emerald-500" : tone === "bad" ? "border-l-red-500" : "border-l-brand-500";
  return (
    <div className={`rounded-xl border border-l-4 border-slate-100 p-4 dark:border-white/5 ${border}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
        {item.amount && (
          <span className="tabular shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
            {item.amount}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.reason}</p>
      {item.action && <p className="mt-2 text-sm font-medium text-brand-700 dark:text-brand-300">→ {item.action}</p>}
    </div>
  );
}

function InsightGroup({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: NamedInsight[];
  tone: "good" | "bad" | "neutral";
  empty: string;
}) {
  return (
    <div>
      <SubHeading>{title}</SubHeading>
      {items.length ? (
        <div className="space-y-3">
          {items.map((i, k) => (
            <InsightCard key={k} item={i} tone={tone} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}

function AssessmentGrid({ items }: { items: [string, Assessment][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, a]) => (
        <div key={label} className="rounded-xl border border-slate-100 p-4 dark:border-white/5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-900 dark:text-white">{label}</p>
            <RatingBadge rating={a.rating} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{a.assessment}</p>
        </div>
      ))}
    </div>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <SubHeading>{title}</SubHeading>
      <ul className="space-y-2">
        {items.map((t, i) => (
          <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const ANALYSIS_SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "scorecard", label: "Scorecard" },
  { id: "campaigns", label: "Campaigns" },
  { id: "creative", label: "Creative" },
  { id: "audience", label: "Audience" },
  { id: "funnel", label: "Funnel" },
  { id: "budget", label: "Budget" },
];

export function AnalysisView({ analysis }: { analysis: StoredAnalysis }) {
  const r = analysis.result;
  const c = r.campaignAnalysis;
  const cr = r.creativeAnalysis;
  const au = r.audienceAnalysis;
  const b = r.budgetAnalysis;

  return (
    <div className="space-y-6">
      <Section id="summary" icon={Brain} title="Executive summary">
        {r.executiveSummary.headline && (
          <p className="text-xl font-semibold leading-snug text-slate-900 dark:text-white">{r.executiveSummary.headline}</p>
        )}
        {r.executiveSummary.overview && (
          <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300">{r.executiveSummary.overview}</p>
        )}
        {r.executiveSummary.keyFindings.length > 0 && (
          <div className="mt-5">
            <SubHeading>Key findings</SubHeading>
            <BulletList items={r.executiveSummary.keyFindings} />
          </div>
        )}
      </Section>

      <Section id="scorecard" icon={Gauge} title="KPI scorecard" subtitle="Scored 1–100 against broad Meta Ads benchmarks">
        <Scorecard scores={analysis.scorecard} notes={r.scoreNotes} />
      </Section>

      <Section id="campaigns" icon={Megaphone} title="Campaign analysis">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <SubHeading>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" /> Best campaign
              </span>
            </SubHeading>
            {c.bestCampaign ? (
              <InsightCard item={c.bestCampaign} tone="good" />
            ) : (
              <p className="text-sm text-slate-500">Not enough data.</p>
            )}
          </div>
          <div>
            <SubHeading>
              <span className="inline-flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Worst campaign
              </span>
            </SubHeading>
            {c.worstCampaign ? (
              <InsightCard item={c.worstCampaign} tone="bad" />
            ) : (
              <p className="text-sm text-slate-500">Not enough data.</p>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <InsightGroup title="Budget waste" items={c.budgetWaste} tone="bad" empty="No obvious wasted spend." />
          <InsightGroup title="Scaling opportunities" items={c.scalingOpportunities} tone="good" empty="No clear scaling candidates yet." />
          <InsightGroup
            title="Learning limited"
            items={c.learningLimited}
            tone="neutral"
            empty="No learning-limited campaigns in the export."
          />
        </div>
        {c.notes && <p className="mt-5 text-sm text-slate-500">{c.notes}</p>}
      </Section>

      <Section id="creative" icon={Clapperboard} title="Creative analysis">
        <AssessmentGrid
          items={[
            ["Creative fatigue", cr.creativeFatigue],
            ["Hook strength", cr.hookStrength],
            ["Thumbnail quality", cr.thumbnailQuality],
            ["Video performance", cr.videoPerformance],
            ["CTR quality", cr.ctrQuality],
            ["Engagement", cr.engagement],
          ]}
        />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Chips title="New hooks" items={cr.suggestions.hooks} />
          <Chips title="Headlines" items={cr.suggestions.headlines} />
          <Chips title="Primary text" items={cr.suggestions.primaryText} />
          <div className="space-y-6">
            <Chips title="CTAs" items={cr.suggestions.ctas} />
            <Chips title="Creative angles" items={cr.suggestions.creativeAngles} />
          </div>
        </div>
      </Section>

      <Section id="audience" icon={Users} title="Audience analysis">
        <AssessmentGrid
          items={[
            ["Interests", au.interests],
            ["Broad", au.broad],
            ["Lookalikes", au.lookalikes],
            ["Retargeting", au.retargeting],
            ["Age", au.age],
            ["Gender", au.gender],
            ["Locations", au.locations],
          ]}
        />
        <div className="mt-6">
          <SubHeading>Better targeting</SubHeading>
          <BulletList items={au.recommendations} />
        </div>
      </Section>

      <Section id="funnel" icon={Filter} title="Funnel analysis">
        {r.funnelAnalysis.summary && <p className="mb-4 text-slate-700 dark:text-slate-300">{r.funnelAnalysis.summary}</p>}
        {r.funnelAnalysis.bottlenecks.length ? (
          <div className="space-y-3">
            {r.funnelAnalysis.bottlenecks.map((f, i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-4 dark:border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">{f.stage}</p>
                  <RatingBadge rating={f.severity} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{f.issue}</p>
                <p className="mt-2 text-sm font-medium text-brand-700 dark:text-brand-300">Fix: {f.fix}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No funnel bottlenecks detected.</p>
        )}
      </Section>

      <Section id="budget" icon={Banknote} title="Budget analysis">
        <div className="grid gap-6 lg:grid-cols-2">
          <InsightGroup title="Increase budget" items={b.increase} tone="good" empty="No increases recommended." />
          <InsightGroup title="Decrease budget" items={b.decrease} tone="bad" empty="No cuts recommended." />
        </div>
        {b.scaleStrategy && (
          <div className="mt-6 rounded-xl bg-brand-50/60 p-4 dark:bg-brand-400/10">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-300">
              <TrendingUp className="h-4 w-4" /> Scale strategy
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{b.scaleStrategy}</p>
          </div>
        )}
        {b.allocation.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <SubHeading>Budget allocation</SubHeading>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Campaign</th>
                  <th className="py-2 pr-3 text-right font-semibold">Current</th>
                  <th className="py-2 pr-3 text-right font-semibold">Recommended</th>
                  <th className="py-2 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {b.allocation.map((a, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">{a.name}</td>
                    <td className="tabular py-2.5 pr-3 text-right text-slate-600 dark:text-slate-400">{a.currentShare}</td>
                    <td className="tabular py-2.5 pr-3 text-right font-semibold text-slate-900 dark:text-white">{a.recommendedShare}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {b.priorities.length > 0 && (
          <div className="mt-6">
            <SubHeading>Campaign priorities</SubHeading>
            <BulletList items={b.priorities} numbered />
          </div>
        )}
      </Section>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <Sparkles className="h-3.5 w-3.5" />
        {analysis.model === "rule-based"
          ? "Rule-based preview. Add an AI provider key on the server for the full consultant analysis."
          : `Generated by ${analysis.model}`}{" "}
        · {new Date(analysis.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
