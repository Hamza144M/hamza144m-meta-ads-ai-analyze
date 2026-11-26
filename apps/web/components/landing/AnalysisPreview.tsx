import { AlertTriangle, CheckCircle2, Circle, Lightbulb, XCircle } from "lucide-react";

const SCORES = [
  { label: "CTR", score: 74 },
  { label: "CPM", score: 81 },
  { label: "CPA", score: 58 },
  { label: "ROAS", score: 69 },
  { label: "Frequency", score: 42 },
  { label: "Creative", score: 55 },
];

function tone(score: number) {
  if (score >= 70) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2, label: "Good" };
  if (score >= 50) return { bar: "bg-amber-400", text: "text-amber-700 dark:text-amber-400", Icon: Circle, label: "Needs work" };
  return { bar: "bg-red-500", text: "text-red-700 dark:text-red-400", Icon: XCircle, label: "Critical" };
}

export function AnalysisPreview() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="eyebrow">AI analysis preview</span>
          <h2 className="section-title mt-4">Not just charts. Decisions.</h2>
          <p className="section-sub">
            Every report ends with prioritized actions: what to pause today, what to scale this week, and what to test next. Each one is
            backed by the numbers in your file.
          </p>
          <div className="mt-8 space-y-3">
            <div className="card flex gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Budget waste: $1,960 on 0.9x ROAS</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Interest stack campaign is below break-even for 3 weeks. Cut 50% and move it to retargeting.
                </p>
              </div>
            </div>
            <div className="card flex gap-3 p-4">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Creative fatigue on &ldquo;Old Hook&rdquo;</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  CTR fell 46% while frequency rose to 4.3. Test: &ldquo;I wasted $300 on yoga mats before I found this.&rdquo;
                </p>
              </div>
            </div>
            <div className="card flex gap-3 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Scale: Retargeting at 4.1x ROAS</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Raise budget 20% every 48 hours while CPA stays under $25.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Overall performance</p>
              <p className="mt-1 text-5xl font-extrabold text-slate-900 dark:text-white">63</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
              Room to grow
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {SCORES.map(({ label, score }) => {
              const t = tone(score);
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
                    <span className={`flex items-center gap-1 font-semibold ${t.text}`}>
                      <t.Icon className="h-3.5 w-3.5" /> {score} · {t.label}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className={`h-2 rounded-full ${t.bar}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
