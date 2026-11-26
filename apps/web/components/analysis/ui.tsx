import { CheckCircle2, CircleDashed, HelpCircle, XCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Rating } from "@maa/core";
import { cn } from "@/lib/utils";

export const RATING_STYLE: Record<Rating, { label: string; Icon: LucideIcon; text: string; bg: string; bar: string; ring: string }> = {
  good: {
    label: "Good",
    Icon: CheckCircle2,
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-400/10",
    bar: "bg-emerald-500",
    ring: "#0aac23",
  },
  warning: {
    label: "Needs work",
    Icon: CircleDashed,
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-400/10",
    bar: "bg-amber-400",
    ring: "#fbb315",
  },
  critical: {
    label: "Critical",
    Icon: XCircle,
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-400/10",
    bar: "bg-red-500",
    ring: "#dc3c3d",
  },
  unknown: {
    label: "No data",
    Icon: HelpCircle,
    text: "text-slate-500",
    bg: "bg-slate-100 dark:bg-white/5",
    bar: "bg-slate-300 dark:bg-slate-600",
    ring: "#94a3b8",
  },
};

export function RatingBadge({ rating, className }: { rating: Rating; className?: string }) {
  const s = RATING_STYLE[rating];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.bg, s.text, className)}>
      <s.Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}

export function Section({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-32 p-5 sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function BulletList({
  items,
  numbered = false,
  empty = "Nothing to flag.",
}: {
  items: string[];
  numbered?: boolean;
  empty?: string;
}) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  const List = numbered ? "ol" : "ul";
  return (
    <List className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {numbered ? (
            <span className="tabular grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {i + 1}
            </span>
          ) : (
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </List>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</h3>;
}
