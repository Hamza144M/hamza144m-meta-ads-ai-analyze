import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";

export const metadata = {
  title: "Terms of Service",
  description: "The terms for using Meta Ads AI Analyzer.",
  alternates: { canonical: "/terms" },
};

// Placeholder: replace with your reviewed legal text before launch.
export default function Page() {
  return (
    <>
      <Navbar />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Terms of Service</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          This page is a placeholder. Add your Terms of Service here before launching.
        </p>
      </main>
      <Footer />
    </>
  );
}
