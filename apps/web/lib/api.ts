import type { Score, StoredAnalysis, StoredReport } from "@maa/core";
import { authHeader } from "./firebase";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...(init?.headers as Record<string, string>), ...(await authHeader()) } });
  } catch {
    throw new ApiError(0, "Can't reach the analysis server. Check that the API is running and NEXT_PUBLIC_API_URL is set.");
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? `Request failed (${res.status}).`, body?.error?.code);
  }
  return body as T;
}

export function uploadReport(file: File, currency?: string): Promise<{ id: string; report: StoredReport }> {
  const form = new FormData();
  form.append("file", file);
  if (currency) form.append("currency", currency);
  return request("/api/reports", { method: "POST", body: form });
}

export function getReport(id: string): Promise<{ report: StoredReport }> {
  return request(`/api/reports/${encodeURIComponent(id)}`, { cache: "no-store" });
}

export interface AnalysisResponse {
  analysis: StoredAnalysis | null;
  scorecard: Score[];
}

export function getAnalysis(id: string): Promise<AnalysisResponse> {
  return request(`/api/reports/${encodeURIComponent(id)}/analysis`, { cache: "no-store" });
}

export function generateAnalysis(id: string): Promise<{ analysis: StoredAnalysis }> {
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
    res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(id)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
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

export function listReports(): Promise<{ reports: ReportSummary[] }> {
  return request("/api/reports", { cache: "no-store" });
}

export function deleteReport(id: string): Promise<null> {
  return request(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Download an export file (xlsx, docx, pdf) with the user's auth header. */
export async function downloadExport(id: string, format: "pdf" | "xlsx" | "docx"): Promise<void> {
  const res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(id)}/export/${format}`, { headers: await authHeader() });
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

export function updateReportSettings(
  id: string,
  settings: { currency: string; usdRate?: number | null },
): Promise<{ report: StoredReport }> {
  return request(`/api/reports/${encodeURIComponent(id)}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
