/** Parse a numeric cell from a Meta export: "1,234.56", "$12.30", "3.2%", "—", "" … */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null) return 0;
  if (typeof value === "object" && "result" in (value as Record<string, unknown>)) {
    // exceljs formula cell
    return parseNumber((value as { result: unknown }).result);
  }
  let s = String(value).trim();
  if (s === "" || s === "-" || s === "—" || s === "–" || /^n\/?a$/i.test(s)) return 0;
  s = s.replace(/[^\d.,\-eE]/g, "");
  // European style "1.234,56" or "12,5"
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s) || /^-?\d+,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Parse a text cell; dates become YYYY-MM-DD. */
export function parseText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("text" in v) return String(v.text ?? "").trim(); // exceljs hyperlink/rich text
    if ("result" in v) return parseText(v.result);
    if ("richText" in v && Array.isArray(v.richText)) {
      return (v.richText as { text: string }[])
        .map((r) => r.text)
        .join("")
        .trim();
    }
  }
  return String(value).trim();
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Normalize a date-ish cell to YYYY-MM-DD when possible. */
export function parseDate(value: unknown): string {
  if (value instanceof Date) return toIsoDate(value);
  const s = parseText(value);
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return toIsoDate(new Date(t));
  return s;
}
