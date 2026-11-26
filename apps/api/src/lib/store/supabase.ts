import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisResult, ReportData, Score, StoredAnalysis, StoredReport } from "@maa/core";
import type { ReportStore, ReportSummary } from "./types";

interface ReportRow {
  id: string;
  owner_id: string | null;
  created_at: string;
  file_name: string;
  currency: string | null;
  total_spend: number;
  data: ReportData;
}

interface AnalysisRow {
  id: string;
  report_id: string;
  created_at: string;
  model: string;
  result: { scorecard: Score[]; analysis: AnalysisResult };
}

/** Supabase-backed store. Uses the service role key, so it must only run server-side. See supabase/schema.sql. */
export class SupabaseReportStore implements ReportStore {
  private db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }

  private toReport(row: ReportRow): StoredReport {
    return { id: row.id, ownerId: row.owner_id, createdAt: row.created_at, data: row.data };
  }

  async create(data: ReportData, ownerId: string | null): Promise<StoredReport> {
    const { data: row, error } = await this.db
      .from("reports")
      .insert({ owner_id: ownerId, file_name: data.fileName, currency: data.currency, total_spend: data.totals.spend, data })
      .select()
      .single<ReportRow>();
    if (error) throw error;
    return this.toReport(row);
  }

  async get(id: string) {
    const { data: row, error } = await this.db.from("reports").select("*").eq("id", id).maybeSingle<ReportRow>();
    if (error) throw error;
    return row ? this.toReport(row) : null;
  }

  async updateData(id: string, data: ReportData) {
    const { error } = await this.db.from("reports").update({ data, currency: data.currency }).eq("id", id);
    if (error) throw error;
  }

  async listByOwner(ownerId: string, limit = 50): Promise<ReportSummary[]> {
    const { data, error } = await this.db
      .from("reports")
      .select("id, file_name, created_at, total_spend, currency")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      fileName: r.file_name,
      createdAt: r.created_at,
      spend: Number(r.total_spend),
      currency: r.currency,
    }));
  }

  async delete(id: string, ownerId: string) {
    const { error, count } = await this.db.from("reports").delete({ count: "exact" }).eq("id", id).eq("owner_id", ownerId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async ensureProfile(userId: string, email: string | null, displayName: string | null) {
    const { error } = await this.db
      .from("profiles")
      .upsert({ id: userId, email, display_name: displayName }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }

  async saveAnalysis(a: Omit<StoredAnalysis, "id" | "createdAt">): Promise<StoredAnalysis> {
    const { data: row, error } = await this.db
      .from("analyses")
      .insert({ report_id: a.reportId, model: a.model, status: "complete", result: { scorecard: a.scorecard, analysis: a.result } })
      .select()
      .single<AnalysisRow>();
    if (error) throw error;
    return { ...a, id: row.id, createdAt: row.created_at };
  }

  async getLatestAnalysis(reportId: string): Promise<StoredAnalysis | null> {
    const { data: row, error } = await this.db
      .from("analyses")
      .select("*")
      .eq("report_id", reportId)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<AnalysisRow>();
    if (error) throw error;
    if (!row) return null;
    return {
      id: row.id,
      reportId: row.report_id,
      createdAt: row.created_at,
      model: row.model,
      scorecard: row.result.scorecard,
      result: row.result.analysis,
    };
  }
}
