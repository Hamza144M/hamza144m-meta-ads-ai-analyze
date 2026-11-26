import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { FAQ } from "@/components/landing/FAQ";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Pricing: free daily audits, Pro and Agency plans",
  description:
    "Start free with 3 Meta Ads audits a day. Upgrade to Pro or Agency for unlimited AI audits and chat. Pay by card, cancel anytime.",
  alternates: { canonical: "/pricing" },
  openGraph: { url: "/pricing" },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <>
      <Navbar />
      <main>
        <h1 className="sr-only">Meta Ads AI Analyzer pricing</h1>
        {reason === "limit" && (
          <div className="bg-white pt-10 dark:bg-slate-950/60">
            <div className="container">
              <div
                role="status"
                className="card mx-auto flex max-w-3xl items-start gap-3 border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
              >
                <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">You&apos;ve used your free audits for today</p>
                  <p className="mt-1 text-sm">
                    Free accounts get 3 audits a day, and the count resets at midnight UTC (5 AM in Pakistan). Upgrade to Pro for unlimited
                    audits right now.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
