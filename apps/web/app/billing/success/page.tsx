import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

/** Set this page as the "redirect after purchase" URL in your payment provider. */
export default function BillingSuccessPage() {
  return (
    <>
      <Navbar />
      <main className="container grid min-h-[60vh] place-items-center py-20">
        <div className="card max-w-lg p-10 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Thank you, your payment went through</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            A receipt is on its way to your email. You can start analyzing your Meta Ads reports right away.
          </p>
          <Link href="/upload" className="btn-primary mt-6">
            Upload a report
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
