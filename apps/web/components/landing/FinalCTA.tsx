import { Upload } from "lucide-react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-indigo-600 to-ink bg-[length:200%_200%] px-6 py-16 text-center animate-gradient-x sm:px-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Stop guessing. Start scaling.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">Upload your Meta Ads report and get your first AI audit free.</p>
          <Link href="/upload" className="btn mt-8 h-12 bg-white px-6 text-base text-brand-700 hover:bg-brand-50">
            <Upload className="h-4 w-4" /> Upload Your Meta Ads Report
          </Link>
        </div>
      </div>
    </section>
  );
}
