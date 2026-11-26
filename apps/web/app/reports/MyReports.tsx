"use client";

import { FileSpreadsheet, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCurrency } from "@maa/core";
import { useAuth } from "@/components/auth/AuthProvider";
import { deleteReport, listReports, type ReportSummary } from "@/lib/api";

export function MyReports() {
  const { enabled, user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (enabled && !user) return router.replace("/login?next=/reports");
    if (!enabled) return setReports([]);
    listReports()
      .then((r) => setReports(r.reports))
      .catch((e: Error) => setError(e.message));
  }, [enabled, user, loading, router]);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this report? This can't be undone.")) return;
    try {
      await deleteReport(id);
      setReports((r) => r?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!enabled)
    return (
      <p className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Accounts aren&apos;t enabled on this deployment, so reports aren&apos;t saved to a list. Keep the report link to come back to it.
      </p>
    );
  if (error) return <p className="card p-6 text-sm text-red-600">{error}</p>;
  if (!reports)
    return (
      <div className="grid place-items-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  if (!reports.length)
    return (
      <div className="card p-10 text-center">
        <p className="font-semibold text-slate-900 dark:text-white">No reports yet</p>
        <p className="mt-1 text-sm text-slate-500">Upload your first Meta Ads export to get started.</p>
        <Link href="/upload" className="btn-primary mt-5">
          <Upload className="h-4 w-4" /> Upload report
        </Link>
      </div>
    );

  return (
    <ul className="card divide-y divide-slate-100 dark:divide-white/5">
      {reports.map((r) => (
        <li key={r.id} className="flex items-center gap-4 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <Link href={`/reports/${r.id}`} className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900 hover:text-brand-600 dark:text-white">{r.fileName}</p>
            <p className="text-xs text-slate-500">
              {new Date(r.createdAt).toLocaleString()} · {formatCurrency(r.spend, r.currency, 0)} spend
            </p>
          </Link>
          <button type="button" onClick={() => void remove(r.id)} className="btn-ghost h-9 w-9 p-0" aria-label={`Delete ${r.fileName}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
