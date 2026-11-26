"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2, Link2, Loader2, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { downloadExport } from "@/lib/api";

export function ExportMenu({ reportId, hasAnalysis }: { reportId: string; hasAnalysis: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  };

  const download = async (format: "pdf" | "xlsx" | "docx") => {
    setBusy(format);
    try {
      await downloadExport(reportId, format);
      setOpen(false);
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/reports/${reportId}`);
      flash("Share link copied");
    } catch {
      flash("Couldn't copy. Copy the address bar instead.");
    }
  };

  const items = [
    { key: "pdf", label: "PDF report", icon: FileText, onClick: () => download("pdf") },
    { key: "xlsx", label: "Excel summary", icon: FileSpreadsheet, onClick: () => download("xlsx") },
    { key: "docx", label: "Word report", icon: FileType2, onClick: () => download("docx") },
    { key: "print", label: "Print version", icon: Printer, onClick: () => window.open(`/reports/${reportId}/print`, "_blank", "noopener") },
    { key: "link", label: "Copy shareable link", icon: Link2, onClick: copyLink },
  ];

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="btn-secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Download className="h-4 w-4" /> Export <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 z-40 mt-2 w-60 p-1.5">
          {items.map((i) => (
            <button
              key={i.key}
              role="menuitem"
              type="button"
              onClick={() => void i.onClick()}
              disabled={busy !== null}
              className="btn-ghost w-full justify-start"
            >
              {busy === i.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <i.icon className="h-4 w-4" />} {i.label}
            </button>
          ))}
          {!hasAnalysis && (
            <p className="px-3 pb-1 pt-2 text-xs text-slate-500">Run the AI analysis first to include the audit and action plan.</p>
          )}
        </div>
      )}
      {msg && (
        <p
          role="status"
          className="absolute right-0 top-full z-40 mt-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-white dark:text-slate-900"
        >
          {msg}
        </p>
      )}
    </div>
  );
}
