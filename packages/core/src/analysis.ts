import type { Score } from "./scoring";

/** Shape of the AI analysis returned by POST /api/reports/:id/analysis. */
export type Rating = "good" | "warning" | "critical" | "unknown";

export interface Assessment {
  rating: Rating;
  assessment: string;
}

export interface NamedInsight {
  name: string;
  reason: string;
  action?: string;
  /** e.g. "$1,240" or "+20%" */
  amount?: string;
}

export interface ExecutiveSummary {
  headline: string;
  overview: string;
  keyFindings: string[];
}

export interface CampaignAnalysis {
  bestCampaign: NamedInsight | null;
  worstCampaign: NamedInsight | null;
  budgetWaste: NamedInsight[];
  scalingOpportunities: NamedInsight[];
  learningLimited: NamedInsight[];
  notes: string;
}

export interface CreativeAnalysis {
  creativeFatigue: Assessment;
  hookStrength: Assessment;
  thumbnailQuality: Assessment;
  videoPerformance: Assessment;
  ctrQuality: Assessment;
  engagement: Assessment;
  suggestions: {
    hooks: string[];
    headlines: string[];
    primaryText: string[];
    ctas: string[];
    creativeAngles: string[];
  };
}

export interface AudienceAnalysis {
  interests: Assessment;
  broad: Assessment;
  lookalikes: Assessment;
  retargeting: Assessment;
  age: Assessment;
  gender: Assessment;
  locations: Assessment;
  recommendations: string[];
}

export interface FunnelBottleneck {
  stage: string;
  severity: Rating;
  issue: string;
  fix: string;
}

export interface FunnelAnalysis {
  summary: string;
  bottlenecks: FunnelBottleneck[];
}

export interface BudgetAnalysis {
  increase: NamedInsight[];
  decrease: NamedInsight[];
  scaleStrategy: string;
  allocation: { name: string; currentShare: string; recommendedShare: string; reason: string }[];
  priorities: string[];
}

export interface Recommendations {
  topProblems: string[];
  topImprovements: string[];
  quickWins: string[];
  scalingPlan: string[];
  creativeTestingIdeas: string[];
  audienceTestingIdeas: string[];
  budgetStrategy: string[];
  optimizationRoadmap: { phase: string; timeframe: string; actions: string[] }[];
}

export interface AnalysisResult {
  executiveSummary: ExecutiveSummary;
  campaignAnalysis: CampaignAnalysis;
  creativeAnalysis: CreativeAnalysis;
  audienceAnalysis: AudienceAnalysis;
  funnelAnalysis: FunnelAnalysis;
  budgetAnalysis: BudgetAnalysis;
  /** Short AI explanation per scorecard key. */
  scoreNotes: Partial<Record<string, string>>;
  recommendations: Recommendations;
}

export interface StoredAnalysis {
  id: string;
  reportId: string;
  createdAt: string;
  /** Model id, or "rule-based" when no AI provider is configured. */
  model: string;
  scorecard: Score[];
  result: AnalysisResult;
}
