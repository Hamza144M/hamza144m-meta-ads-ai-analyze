import {
  BadgeDollarSign,
  CircleDollarSign,
  Eye,
  Gauge,
  Layers,
  LayoutGrid,
  MessageCircle,
  MousePointerClick,
  Percent,
  Repeat,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
  UserPlus,
  Megaphone,
  MonitorSmartphone,
  Link2,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReportData } from "@maa/core";
import { formatNumber } from "@maa/core";
import { fmt, METRICS } from "@/lib/metrics";

interface Tile {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  featured?: boolean;
}

export function KpiGrid({ report }: { report: ReportData }) {
  const t = report.totals;
  const SHORT: Record<string, string> = { messages: "Messages", conversionRate: "Conv. rate", landingPageViews: "LP views" };
  const m = (key: keyof typeof METRICS, icon: LucideIcon, featured = false): Tile => ({
    label: SHORT[key] ?? METRICS[key].label,
    value: fmt(report, key, t[METRICS[key].key] as number | null),
    hint: METRICS[key].hint,
    icon,
    featured,
  });

  const tiles: Tile[] = [
    m("spend", Wallet, true),
    m("revenue", CircleDollarSign, true),
    m("roas", TrendingUp, true),
    m("costPerResult", Receipt, true),
    { label: "Campaigns", value: formatNumber(report.counts.campaigns), hint: "Unique campaign names.", icon: Megaphone },
    { label: "Ad sets", value: formatNumber(report.counts.adSets), hint: "Unique ad set names.", icon: Layers },
    { label: "Ads", value: formatNumber(report.counts.ads), hint: "Unique ad names.", icon: LayoutGrid },
    m("impressions", Eye),
    m("reach", Users),
    m("frequency", Repeat),
    m("cpm", Gauge),
    m("cpc", BadgeDollarSign),
    m("ctr", Percent),
    m("clicks", MousePointerClick),
    m("linkClicks", Link2),
    m("landingPageViews", MonitorSmartphone),
    m("leads", UserPlus),
    m("messages", MessageCircle),
    m("purchases", ShoppingBag),
    m("conversionRate", Target),
  ];

  const featured = tiles.filter((x) => x.featured);
  const rest = tiles.filter((x) => !x.featured);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {featured.map((x) => (
          <div key={x.label} className="card relative overflow-hidden p-5" title={x.hint}>
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-500/10 blur-xl" />
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <x.icon className="h-4 w-4 text-brand-600 dark:text-brand-400" /> {x.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{x.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {rest.map((x) => (
          <div key={x.label} className="card p-4" title={x.hint}>
            <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
              <x.icon className="h-3.5 w-3.5 shrink-0" /> {x.label}
            </p>
            <p className="mt-1.5 truncate text-lg font-semibold text-slate-900 dark:text-white">{x.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
