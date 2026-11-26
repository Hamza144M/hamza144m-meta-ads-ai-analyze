import type { ReportData, StoredAnalysis, StoredReport } from "@maa/core";

export interface ReportSummary {
  id: string;
  fileName: string;
  createdAt: string;
  spend: number;
  currency: string | null;
}

/** Persistence for uploaded reports. Supabase in production, memory for local dev. */
export interface ReportStore {
  create(data: ReportData, ownerId: string | null): Promise<StoredReport>;
  get(id: string): Promise<StoredReport | null>;
  updateData(id: string, data: ReportData): Promise<void>;
  listByOwner(ownerId: string, limit?: number): Promise<ReportSummary[]>;
  delete(id: string, ownerId: string): Promise<boolean>;
  saveAnalysis(analysis: Omit<StoredAnalysis, "id" | "createdAt">): Promise<StoredAnalysis>;
  getLatestAnalysis(reportId: string): Promise<StoredAnalysis | null>;
  /** Create the user's profile row on first sign-in (no-op for memory storage). */
  ensureProfile(userId: string, email: string | null, displayName: string | null): Promise<void>;
}
