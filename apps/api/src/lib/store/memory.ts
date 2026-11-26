import { randomUUID } from "node:crypto";
import type { ReportData, StoredAnalysis, StoredReport } from "@maa/core";
import type { ReportStore, ReportSummary } from "./types";

const MAX_REPORTS = 200;

/** In-memory store for local development. Data is lost when the process restarts. */
export class MemoryReportStore implements ReportStore {
  private reports = new Map<string, StoredReport>();
  private analyses = new Map<string, StoredAnalysis>(); // latest per report

  async create(data: ReportData, ownerId: string | null): Promise<StoredReport> {
    const report: StoredReport = { id: randomUUID(), ownerId, createdAt: new Date().toISOString(), data };
    this.reports.set(report.id, report);
    if (this.reports.size > MAX_REPORTS) {
      const oldest = this.reports.keys().next().value;
      if (oldest) {
        this.reports.delete(oldest);
        this.analyses.delete(oldest);
      }
    }
    return report;
  }

  async get(id: string) {
    return this.reports.get(id) ?? null;
  }

  async updateData(id: string, data: ReportData) {
    const r = this.reports.get(id);
    if (r) r.data = data;
  }

  async listByOwner(ownerId: string, limit = 50): Promise<ReportSummary[]> {
    return [...this.reports.values()]
      .filter((r) => r.ownerId === ownerId)
      .reverse()
      .slice(0, limit)
      .map((r) => ({ id: r.id, fileName: r.data.fileName, createdAt: r.createdAt, spend: r.data.totals.spend, currency: r.data.currency }));
  }

  async delete(id: string, ownerId: string) {
    const r = this.reports.get(id);
    if (!r || r.ownerId !== ownerId) return false;
    this.analyses.delete(id);
    return this.reports.delete(id);
  }

  async saveAnalysis(a: Omit<StoredAnalysis, "id" | "createdAt">): Promise<StoredAnalysis> {
    const stored: StoredAnalysis = { ...a, id: randomUUID(), createdAt: new Date().toISOString() };
    this.analyses.set(a.reportId, stored);
    return stored;
  }

  async ensureProfile() {}

  async getLatestAnalysis(reportId: string) {
    return this.analyses.get(reportId) ?? null;
  }
}
