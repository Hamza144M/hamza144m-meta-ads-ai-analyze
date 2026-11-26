import type { Metadata } from "next";
import { CreativeAnalyzer } from "@/components/creative/CreativeAnalyzer";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "AI ad creative analyzer for Facebook & Instagram images and videos",
  description:
    "Upload a Meta ad image or video and get an AI score for the hook, visuals, text, branding, CTA and placement fit, plus fixes and new hook and headline ideas.",
  alternates: { canonical: "/creative" },
  openGraph: { url: "/creative" },
};

const CHECKS = [
  "Hook and first 3 seconds",
  "Visual and thumbnail",
  "Text overlay",
  "Branding",
  "Call to action",
  "Feed, Stories and Reels fit",
];

export default function CreativePage() {
  return (
    <>
      <Navbar />
      <main className="container max-w-5xl py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Ad creative analysis</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Upload an ad image or video. The AI scores how well it stops the scroll and tells you exactly what to change.
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {CHECKS.map((c) => (
              <li
                key={c}
                className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-400/10 dark:text-brand-300"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10">
          <CreativeAnalyzer />
        </div>
      </main>
      <Footer />
    </>
  );
}
