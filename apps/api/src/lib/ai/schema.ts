import { z } from "zod";

/**
 * Lenient validators for model output: every field has a default so a partial
 * or slightly malformed answer still renders instead of failing the request.
 */
const str = z.preprocess((v) => (v == null ? "" : v), z.coerce.string()).catch("");
const strList = (max = 12) =>
  z
    .array(z.union([z.string(), z.number()]).transform(String))
    .catch([])
    .transform((a) =>
      a
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max),
    );
const rating = z.enum(["good", "warning", "critical", "unknown"]).catch("unknown");

const assessment = z
  .object({ rating, assessment: str })
  .catch({ rating: "unknown", assessment: "Not enough data in the export to assess this." });

const optStr = z.preprocess((v) => (v == null || v === "" ? undefined : v), z.coerce.string().optional()).catch(undefined);
const insight = z.object({ name: str, reason: str, action: optStr, amount: optStr });
const insightList = (max = 8) =>
  z
    .array(insight.catch({ name: "", reason: "" }))
    .catch([])
    .transform((a) => a.filter((i) => i.name || i.reason).slice(0, max));

export const overviewSchema = z.object({
  executiveSummary: z
    .object({ headline: str, overview: str, keyFindings: strList(8) })
    .catch({ headline: "", overview: "", keyFindings: [] }),
  campaignAnalysis: z
    .object({
      bestCampaign: insight.nullable().catch(null),
      worstCampaign: insight.nullable().catch(null),
      budgetWaste: insightList(),
      scalingOpportunities: insightList(),
      learningLimited: insightList(),
      notes: str,
    })
    .catch({ bestCampaign: null, worstCampaign: null, budgetWaste: [], scalingOpportunities: [], learningLimited: [], notes: "" }),
  funnelAnalysis: z
    .object({
      summary: str,
      bottlenecks: z.array(z.object({ stage: str, severity: rating, issue: str, fix: str })).catch([]),
    })
    .catch({ summary: "", bottlenecks: [] }),
  budgetAnalysis: z
    .object({
      increase: insightList(),
      decrease: insightList(),
      scaleStrategy: str,
      allocation: z.array(z.object({ name: str, currentShare: str, recommendedShare: str, reason: str })).catch([]),
      priorities: strList(10),
    })
    .catch({ increase: [], decrease: [], scaleStrategy: "", allocation: [], priorities: [] }),
  scoreNotes: z.record(z.string(), z.coerce.string()).catch({}),
});

export const creativeAudienceSchema = z.object({
  creativeAnalysis: z
    .object({
      creativeFatigue: assessment,
      hookStrength: assessment,
      thumbnailQuality: assessment,
      videoPerformance: assessment,
      ctrQuality: assessment,
      engagement: assessment,
      suggestions: z
        .object({ hooks: strList(8), headlines: strList(8), primaryText: strList(5), ctas: strList(6), creativeAngles: strList(8) })
        .catch({ hooks: [], headlines: [], primaryText: [], ctas: [], creativeAngles: [] }),
    })
    .catch(() => {
      const a = { rating: "unknown" as const, assessment: "Not available." };
      return {
        creativeFatigue: a,
        hookStrength: a,
        thumbnailQuality: a,
        videoPerformance: a,
        ctrQuality: a,
        engagement: a,
        suggestions: { hooks: [], headlines: [], primaryText: [], ctas: [], creativeAngles: [] },
      };
    }),
  audienceAnalysis: z
    .object({
      interests: assessment,
      broad: assessment,
      lookalikes: assessment,
      retargeting: assessment,
      age: assessment,
      gender: assessment,
      locations: assessment,
      recommendations: strList(10),
    })
    .catch(() => {
      const a = { rating: "unknown" as const, assessment: "Not available." };
      return { interests: a, broad: a, lookalikes: a, retargeting: a, age: a, gender: a, locations: a, recommendations: [] };
    }),
});

export const recommendationsSchema = z.object({
  recommendations: z
    .object({
      topProblems: strList(10),
      topImprovements: strList(10),
      quickWins: strList(8),
      scalingPlan: strList(8),
      creativeTestingIdeas: strList(8),
      audienceTestingIdeas: strList(8),
      budgetStrategy: strList(8),
      optimizationRoadmap: z
        .array(z.object({ phase: str, timeframe: str, actions: strList(8) }))
        .catch([])
        .transform((a) => a.slice(0, 6)),
    })
    .catch({
      topProblems: [],
      topImprovements: [],
      quickWins: [],
      scalingPlan: [],
      creativeTestingIdeas: [],
      audienceTestingIdeas: [],
      budgetStrategy: [],
      optimizationRoadmap: [],
    }),
});
