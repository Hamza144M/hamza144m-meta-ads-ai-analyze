"use client";

import { useMemo } from "react";
import { POPULAR_CURRENCIES } from "@maa/core";

function allCurrencies(): string[] {
  try {
    // Every ISO 4217 currency the browser knows (~160+).
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("currency");
  } catch {
    return POPULAR_CURRENCIES;
  }
}

export function currencyLabel(code: string, names?: Intl.DisplayNames): string {
  let name = code;
  try {
    name = names?.of(code) ?? code;
  } catch {
    /* unknown code */
  }
  let symbol = "";
  try {
    symbol =
      new Intl.NumberFormat("en-US", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? "";
  } catch {
    /* ignore */
  }
  return `${code} — ${name}${symbol && symbol !== code ? ` (${symbol})` : ""}`;
}

/** Native select with popular currencies first, then every world currency. */
export function CurrencySelect({
  value,
  onChange,
  autoOption,
  id,
  className = "",
}: {
  value: string;
  onChange: (code: string) => void;
  /** Label for an empty "detect from file" option. */
  autoOption?: string;
  id?: string;
  className?: string;
}) {
  const { popular, rest, names } = useMemo(() => {
    const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "currency" }) : undefined;
    const all = allCurrencies();
    const popularSet = new Set(POPULAR_CURRENCIES);
    return { popular: POPULAR_CURRENCIES.filter((c) => all.includes(c)), rest: all.filter((c) => !popularSet.has(c)), names };
  }, []);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900 ${className}`}
    >
      {autoOption && <option value="">{autoOption}</option>}
      <optgroup label="Popular">
        {popular.map((c) => (
          <option key={c} value={c}>
            {currencyLabel(c, names)}
          </option>
        ))}
      </optgroup>
      <optgroup label="All currencies">
        {rest.map((c) => (
          <option key={c} value={c}>
            {currencyLabel(c, names)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
