import { computeScorecard, type Score, type StoredAnalysis, type StoredReport } from "@maa/core";
import { authHeader } from "./firebase";
import { isLocalId, localDelete, localGet, localList, localSave, newLocalId } from "./localStore";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");

/**
 * Without NEXT_PUBLIC_API_URL the site works on its own: files are parsed and analyzed by
 * this Next.js app's /api/local routes, and reports are kept in the browser.
 */
export const LOCAL_MODE = !API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function toJson<T>(res: Response): Promise<T> {
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status}).`, body?.error?.code);
  }
  return body as T;
}

/** Call this site's own /api/local routes. */
async function localRequest<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  }
  return toJson<T>(res);
}

const jsonInit = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function requireLocal(id: string) {
  const entry = localGet(id);
  if (!entry) {
    throw new ApiError(
      404,
      isLocalId(id)
        ? "This report is saved in another browser. Reports are kept in the browser that uploaded them, so upload the file again here."
        : "Report not found.",
      "not_found",
    );
  }
  return entry;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...(init?.headers as Record<string, string>), ...(await authHeader()) } });
  } catch {
    throw new ApiError(0, "Can't reach the analysis server. Check that the API is running and NEXT_PUBLIC_API_URL is set.");
  }
  return toJson<T>(res);
}

export async function uploadReport(file: File, currency?: string): Promise<{ id: string; report: StoredReport }> {
  const form = new FormData();
  form.append("file", file);
  if (currency) form.append("currency", currency);
  if (LOCAL_MODE) {
    if (file.size > 4 * 1024 * 1024)
      throw new ApiError(413, "This file is over 4 MB. Export a shorter date range or fewer columns.", "too_large");
    const { data } = await localRequest<{ data: StoredReport["data"] }>("/api/local/parse", { method: "POST", body: form });
    const report: StoredReport = { id: newLocalId(), ownerId: null, createdAt: new Date().toISOString(), data };
    localSave({ report, analysis: null });
    return { id: report.id, report };
  }
  return request("/api/reports", { method: "POST", body: form });
}

export async function getReport(id: string): Promise<{ report: StoredReport }> {
  if (LOCAL_MODE) return { report: requireLocal(id).report };
  return request(`/api/reports/${encodeURIComponent(id)}`, { cache: "no-store" });
}

export interface AnalysisResponse {
  analysis: StoredAnalysis | null;
  scorecard: Score[];
}

export async function getAnalysis(id: string): Promise<AnalysisResponse> {
  if (LOCAL_MODE) {
    const entry = requireLocal(id);
    return { analysis: entry.analysis, scorecard: computeScorecard(entry.report.data) };
  }
  return request(`/api/reports/${encodeURIComponent(id)}/analysis`, { cache: "no-store" });
}

export async function generateAnalysis(id: string): Promise<{ analysis: StoredAnalysis }> {
  if (LOCAL_MODE) {
    const entry = requireLocal(id);
    const out = await localRequest<Pick<StoredAnalysis, "model" | "scorecard" | "result">>(
      "/api/local/analysis",
      jsonInit({ data: entry.report.data }),
    );
    const analysis: StoredAnalysis = { id: newLocalId(), reportId: id, createdAt: new Date().toISOString(), ...out };
    localSave({ ...(localGet(id) ?? entry), analysis });
    return { analysis };
  }
  return request(`/api/reports/${encodeURIComponent(id)}/analysis`, { method: "POST" });
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Ask the report assistant. Streams text chunks to onDelta. */
export async function askReport(id: string, messages: ChatTurn[], onDelta: (text: string) => void, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    if (LOCAL_MODE) {
      const entry = requireLocal(id);
      res = await fetch("/api/local/chat", {
        ...jsonInit({ data: entry.report.data, analysis: entry.analysis, messages }),
        signal,
      });
    } else {
      res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(id)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ messages }),
        signal,
      });
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "Can't reach the analysis server.");
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status}).`, body?.error?.code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

export interface ReportSummary {
  id: string;
  fileName: string;
  createdAt: string;
  spend: number;
  currency: string | null;
}

export async function listReports(): Promise<{ reports: ReportSummary[] }> {
  if (LOCAL_MODE) {
    return {
      reports: localList().map(({ report }) => ({
        id: report.id,
        fileName: report.data.fileName,
        createdAt: report.createdAt,
        spend: report.data.totals.spend ?? 0,
        currency: report.data.currency,
      })),
    };
  }
  return request("/api/reports", { cache: "no-store" });
}

export async function deleteReport(id: string): Promise<null> {
  if (LOCAL_MODE) {
    localDelete(id);
    return null;
  }
  return request(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Download an export file (xlsx, docx, pdf) with the user's auth header. */
export async function downloadExport(id: string, format: "pdf" | "xlsx" | "docx"): Promise<void> {
  let res: Response;
  try {
    if (LOCAL_MODE) {
      const entry = requireLocal(id);
      res = await fetch("/api/local/export", jsonInit({ format, data: entry.report.data, analysis: entry.analysis }));
    } else {
      res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(id)}/export/${format}`, { headers: await authHeader() });
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? "Export failed.");
  }
  const blob = await res.blob();
  const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `meta-ads-report.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function updateReportSettings(
  id: string,
  settings: { currency: string; usdRate?: number | null },
): Promise<{ report: StoredReport }> {
  if (LOCAL_MODE) {
    const entry = requireLocal(id);
    const report: StoredReport = {
      ...entry.report,
      data: { ...entry.report.data, currency: settings.currency, currencySource: "user", usdRate: settings.usdRate ?? null },
    };
    localSave({ ...entry, report });
    return { report };
  }
  return request(`/api/reports/${encodeURIComponent(id)}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
