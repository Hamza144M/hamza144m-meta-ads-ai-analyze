import type { Metadata } from "next";
import { ReportDashboard } from "@/components/dashboard/ReportDashboard";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = { title: "Report dashboard", robots: { index: false } };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Navbar />
      <main className="container py-8 sm:py-10">
        <ReportDashboard id={id} />
      </main>
    </>
  );
}
