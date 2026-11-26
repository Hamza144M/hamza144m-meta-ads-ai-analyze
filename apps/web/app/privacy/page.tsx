import { Footer } from "@/components/ui/Footer";
import { Navbar } from "@/components/ui/Navbar";

export const metadata = {
  title: "Privacy Policy",
  description: "How Meta Ads AI Analyzer handles your uploaded reports and personal data.",
  alternates: { canonical: "/privacy" },
};

// Placeholder: replace with your reviewed legal text before launch.
export default function Page() {
  return (
    <>
      <Navbar />
      <main className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          This page is a placeholder. Add your Privacy Policy here before launching.
        </p>
      </main>
      <Footer />
    </>
  );
}
