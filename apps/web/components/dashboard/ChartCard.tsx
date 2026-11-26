import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card flex flex-col p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            value === o.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface TooltipRow {
  name: string;
  value: string;
  color?: string;
}

export function TooltipBox({ title, rows }: { title?: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/10 dark:bg-slate-900">
      {title && <p className="mb-1 font-semibold text-slate-900 dark:text-white">{title}</p>}
      {rows.map((r) => (
        <p key={r.name} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
          <span>{r.name}</span>
          <span className="tabular ml-auto pl-3 font-semibold text-slate-900 dark:text-white">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-full min-h-[200px] place-items-center rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-white/5">
      {message}
    </div>
  );
}

export const axisProps = {
  tick: { fill: "var(--text-muted)", fontSize: 12 },
  axisLine: { stroke: "var(--axis)" },
  tickLine: false,
} as const;
