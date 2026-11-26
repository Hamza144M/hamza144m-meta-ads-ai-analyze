import type { StoredAnalysis, StoredReport } from "@maa/core";

/**
 * Browser storage for reports when the site runs without a separate API (for example a
 * Vercel-only deployment). Reports live in this browser's localStorage only.
 */
interface Entry {
  report: StoredReport;
  analysis: StoredAnalysis | null;
}

const KEY = "maa:reports:v1";
const MAX_REPORTS = 20;
const memory = new Map<string, Entry>(); // fallback when storage is blocked

function readAll(): Entry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Entry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [...memory.values()];
  }
}

function writeAll(list: Entry[]): void {
  list.forEach((e) => memory.set(e.report.id, e));
  let items = list.slice(0, MAX_REPORTS);
  // Drop the oldest reports until it fits the storage quota.
  while (items.length) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
      return;
    } catch {
      if (items.length === 1) return;
      items = items.slice(0, -1);
    }
  }
}

export const isLocalId = (id: string) => id.startsWith("local-");

export function localGet(id: string): Entry | null {
  return readAll().find((e) => e.report.id === id) ?? memory.get(id) ?? null;
}

export function localSave(entry: Entry): void {
  const list = readAll().filter((e) => e.report.id !== entry.report.id);
  writeAll([entry, ...list]);
}

export function localList(): Entry[] {
  return readAll();
}

export function localDelete(id: string): void {
  memory.delete(id);
  writeAll(readAll().filter((e) => e.report.id !== id));
}

export function newLocalId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `local-${uuid}`;
}
