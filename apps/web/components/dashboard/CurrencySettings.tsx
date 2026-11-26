"use client";

import { Check, Coins, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { APPROX_USD_RATES, USD_LIKE_CURRENCIES, type StoredReport } from "@maa/core";
import { CurrencySelect } from "@/components/ui/CurrencySelect";
import { updateReportSettings } from "@/lib/api";

/** Header chip that lets the viewer set the report currency and the USD rate used for scoring. */
export function CurrencySettings({ report, onUpdated }: { report: StoredReport; onUpdated: (r: StoredReport) => void }) {
  const d = report.data;
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState(d.currency ?? "USD");
  const [rate, setRate] = useState<string>(String(d.usdRate ?? APPROX_USD_RATES[d.currency ?? "USD"] ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const pick = (c: string) => {
    setCurrency(c);
    setRate(APPROX_USD_RATES[c] != null ? String(APPROX_USD_RATES[c]) : "");
  };

  const save = async () => {
    const parsed = rate.trim() ? Number(rate) : null;
    if (parsed != null && (!Number.isFinite(parsed) || parsed <= 0)) return setError("Enter a positive number.");
    setBusy(true);
    setError(null);
    try {
      const { report: updated } = await updateReportSettings(report.id, {
        currency,
        usdRate: USD_LIKE_CURRENCIES.has(currency) && currency !== "USD" && parsed === APPROX_USD_RATES[currency] ? null : parsed,
      });
      onUpdated(updated);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
        aria-expanded={open}
        title="Change currency"
      >
        <Coins className="h-3.5 w-3.5" /> {d.currency ?? "Set currency"}
      </button>
      {open && (
        <div className="card absolute left-0 z-40 mt-2 w-80 space-y-3 p-4 text-sm">
          <div>
            <label htmlFor="report-currency" className="font-semibold text-slate-900 dark:text-white">
              Report currency
            </label>
            <p className="mb-2 text-xs text-slate-500">
              {d.currencySource === "file" ? "Detected from your file's column headers." : "Pick the currency your ad account bills in."}
            </p>
            <CurrencySelect id="report-currency" value={currency} onChange={pick} />
          </div>
          {currency !== "USD" && (
            <div>
              <label htmlFor="usd-rate" className="font-semibold text-slate-900 dark:text-white">
                1 USD = ? {currency}
              </label>
              <p className="mb-2 text-xs text-slate-500">
                Used to compare CPM, CPC and CPA with USD benchmarks. Pre-filled with an approximate rate; edit it if needed.
              </p>
              <input
                id="usd-rate"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="e.g. 280"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="button" onClick={() => void save()} disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Apply
          </button>
          <p className="text-xs text-slate-500">This changes how amounts are labeled. It doesn&apos;t convert the numbers in your file.</p>
        </div>
      )}
    </div>
  );
}
