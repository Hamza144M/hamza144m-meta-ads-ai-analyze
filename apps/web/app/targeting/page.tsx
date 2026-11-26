import type { Metadata } from "next";
import { TargetingAdvisor } from "@/components/targeting/TargetingAdvisor";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Facebook ads targeting tool: best age, gender, cities and interests",
  description:
    "Not sure who to target on Facebook and Instagram? Enter your product, price and country to get the best cities, age range, gender, interests, placements and a starter budget.",
  alternates: { canonical: "/targeting" },
  openGraph: { url: "/targeting" },
};

export default function TargetingPage() {
  return (
    <>
      <Navbar />
      <main className="container max-w-5xl py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Who should you target?</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Tell us what you sell and where. Get the best cities, age range, gender, interests, placements and a starter budget, each with
            the reason, plus 3 audiences to test.
          </p>
        </div>
        <div className="mt-10">
          <TargetingAdvisor />
        </div>
      </main>
      <Footer />
    </>
  );
}
