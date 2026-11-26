import { config } from "../../config";
import { MemoryReportStore } from "./memory";
import { SupabaseReportStore } from "./supabase";
import type { ReportStore } from "./types";

export type { ReportStore, ReportSummary } from "./types";

export const reportStore: ReportStore = config.supabaseEnabled
  ? new SupabaseReportStore(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!)
  : new MemoryReportStore();
