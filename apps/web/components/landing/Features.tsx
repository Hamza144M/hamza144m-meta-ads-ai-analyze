import Link from "next/link";
import { BarChart3, Brain, Filter, Layers, MessageSquare, PiggyBank, Target, FileDown } from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Instant dashboard",
    body: "20+ KPIs from spend and CPM to ROAS and conversion rate, with interactive charts by campaign, day, and creative.",
  },
  {
    icon: Brain,
    title: "Consultant-grade AI audit",
    body: "An executive summary and deep dives written like a senior Meta Ads strategist who has managed millions in spend.",
  },
  {
    icon: Layers,
    title: "Creative analysis",
    body: "Upload an ad image or video and get scores for the hook, visuals, text, branding and CTA, plus new hooks and headlines to test.",
    href: "/creative",
  },
  {
    icon: Target,
    title: "Audience insights",
    body: "Compare broad, interest, lookalike, and retargeting audiences plus age, gender, and location performance.",
  },
  {
    icon: Filter,
    title: "Funnel bottlenecks",
    body: "See where people drop off from impression to purchase and exactly how to fix each leak.",
  },
  {
    icon: PiggyBank,
    title: "Budget strategy",
    body: "Know which campaigns to scale, cut, or pause, with a clear allocation plan and priorities.",
  },
  {
    icon: MessageSquare,
    title: "Ask your data",
    body: "Chat with an AI that knows your report: “Why is my CPM high?” “Which campaign should I scale?”",
  },
  {
    icon: FileDown,
    title: "Client-ready exports",
    body: "Export to PDF, Excel, or Word, print it, or share a private link with your team or clients.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Features</span>
          <h2 className="section-title mt-4">Everything a senior media buyer would check</h2>
          <p className="section-sub">From a single export file, without connecting your ad account.</p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body, href }: { icon: typeof BarChart3; title: string; body: string; href?: string }) => (
            <div key={title} className="card group p-6 transition hover:-translate-y-1 hover:shadow-lift">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-400/10 dark:text-brand-400">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
              {href && (
                <Link href={href} className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  Analyze a creative →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
