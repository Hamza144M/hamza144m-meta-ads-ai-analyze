"use client";

import { AlertCircle, FileSpreadsheet, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { uploadReport } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_MB = 15;

function validate(file: File): string | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) return "Legacy .xls isn't supported. In Ads Manager, export as .xlsx or .csv.";
  if (!name.endsWith(".csv") && !name.endsWith(".xlsx")) return "Please choose a .csv or .xlsx file exported from Meta Ads Manager.";
  if (file.size > MAX_MB * 1024 * 1024) return `Files must be under ${MAX_MB} MB.`;
  if (file.size === 0) return "This file is empty.";
  return null;
}

export function Dropzone() {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("");

  const submit = useCallback(
    async (f: File) => {
      const problem = validate(f);
      setFile(f);
      if (problem) {
        setError(problem);
        setStatus("error");
        return;
      }
      setError(null);
      setStatus("uploading");
      try {
        const { id } = await uploadReport(f, currency || undefined);
        router.push(`/reports/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
        setStatus("error");
      }
    },
    [router, currency],
  );

  const trySample = useCallback(async () => {
    setStatus("uploading");
    setError(null);
    try {
      const res = await fetch("/samples/meta-ads-sample.csv");
      const blob = await res.blob();
      await submit(new File([blob], "meta-ads-sample.csv", { type: "text/csv" }));
    } catch {
      setError("Couldn't load the sample report.");
      setStatus("error");
    }
  }, [submit]);

  useEffect(() => {
    if (params.get("sample") === "1") void trySample();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void submit(f);
  };

  const busy = status === "uploading";

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a Meta Ads report"
        aria-busy={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "card relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border-2 border-dashed px-6 py-16 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          dragging
            ? "scale-[1.01] border-brand-500 bg-brand-50/70 dark:bg-brand-500/10"
            : "border-slate-300 hover:border-brand-400 dark:border-white/15",
          busy && "cursor-wait",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void submit(f);
            e.target.value = "";
          }}
        />
        {busy ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-brand-600" />
            <p className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">Analyzing {file?.name ?? "your report"}…</p>
            <p className="mt-1 text-sm text-slate-500">Mapping columns and calculating KPIs</p>
            <div className="absolute inset-x-0 bottom-0 h-1 animate-shimmer bg-[linear-gradient(90deg,transparent,#2563EB,transparent)] bg-[length:200%_100%]" />
          </>
        ) : (
          <>
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
              <UploadCloud className="h-8 w-8" />
            </span>
            <p className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">Drag & drop your Meta Ads report</p>
            <p className="mt-1 text-sm text-slate-500">
              or <span className="font-semibold text-brand-600 dark:text-brand-400">browse files</span> · CSV or XLSX up to {MAX_MB} MB
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="upload-currency" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Ad account currency
        </label>
        <CurrencySelect
          id="upload-currency"
          value={currency}
          onChange={setCurrency}
          autoOption="Auto-detect from file (default USD)"
          className="sm:max-w-xs"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            {file && <p className="font-semibold">{file.name}</p>}
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-3 rounded-xl bg-slate-100/70 p-4 sm:flex-row dark:bg-white/5">
        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <FileSpreadsheet className="h-4 w-4" /> No report handy? Explore a realistic sample account.
        </p>
        <button type="button" onClick={() => void trySample()} disabled={busy} className="btn-secondary">
          <Sparkles className="h-4 w-4" /> Use sample report
        </button>
      </div>
    </div>
  );
}
