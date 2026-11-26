import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";
import { Dropzone } from "@/components/upload/Dropzone";

export const metadata: Metadata = { title: "Upload report" };

const TIPS = [
  "In Ads Manager, open Campaigns, Ad sets or Ads and choose your date range.",
  "Columns → Performance and clicks (or a custom set with results, purchases and conversion value).",
  "Optional: Breakdown → By time → Day, or By delivery → Age / Gender for deeper insights.",
  "Click Export → Export table data, then pick .csv or .xlsx.",
];

export default function UploadPage() {
  return (
    <>
      <Navbar />
      <main className="container max-w-3xl py-12 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Upload your Meta Ads report</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">No Meta login required. Your dashboard is ready in seconds.</p>
        </div>
        <div className="mt-10">
          <Suspense>
            <Dropzone />
          </Suspense>
        </div>
        <section className="card mt-10 p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white">How to export from Ads Manager</h2>
          <ol className="mt-4 space-y-3">
            {TIPS.map((t, i) => (
              <li key={t} className="flex gap-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">
                  {i + 1}
                </span>
                {t}
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  );
}
