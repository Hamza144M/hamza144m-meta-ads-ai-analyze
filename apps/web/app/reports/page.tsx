import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Navbar } from "@/components/ui/Navbar";
import { MyReports } from "./MyReports";

export const metadata: Metadata = { title: "My reports", robots: { index: false } };

export default function ReportsPage() {
  return (
    <>
      <Navbar />
      <main className="container max-w-4xl py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My reports</h1>
          <Link href="/upload" className="btn-primary">
            <Upload className="h-4 w-4" /> New report
          </Link>
        </div>
        <MyReports />
      </main>
    </>
  );
}
