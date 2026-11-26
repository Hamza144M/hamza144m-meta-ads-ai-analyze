import type { Score } from "@maa/core";
import { RATING_STYLE } from "./ui";

function Ring({ score, color, size = 120 }: { score: number | null; color: string; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const v = score ?? 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score ?? "not available"} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid)" strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${(v / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-900 text-3xl font-extrabold dark:fill-white"
      >
        {score ?? "—"}
      </text>
    </svg>
  );
}

export function Scorecard({ scores, notes }: { scores: Score[]; notes?: Partial<Record<string, string>> }) {
  const overall = scores.find((s) => s.key === "overall");
  const rest = scores.filter((s) => s.key !== "overall");
  const o = RATING_STYLE[overall?.status ?? "unknown"];
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {overall && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-white p-6 text-center dark:from-white/5 dark:to-transparent">
          <Ring score={overall.score} color={o.ring} size={140} />
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">Overall performance</p>
          <p className={`mt-1 flex items-center gap-1 text-sm font-semibold ${o.text}`}>
            <o.Icon className="h-4 w-4" /> {o.label}
          </p>
          {notes?.overall && <p className="mt-3 text-xs text-slate-500">{notes.overall}</p>}
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {rest.map((s) => {
          const st = RATING_STYLE[s.status];
          return (
            <li key={s.key} className="rounded-xl border border-slate-100 p-4 dark:border-white/5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">{s.label}</span>
                <span className={`flex items-center gap-1 text-sm font-semibold ${st.text}`}>
                  <st.Icon className="h-4 w-4" />
                  <span className="tabular">{s.score ?? "—"}</span>
                  <span className="sr-only">{st.label}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                <div className={`h-1.5 rounded-full ${st.bar} transition-[width] duration-700`} style={{ width: `${s.score ?? 0}%` }} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{notes?.[s.key] || s.basis}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
