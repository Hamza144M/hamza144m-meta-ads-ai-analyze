import { computeScorecard, type AnalysisResult, type ReportData, type Score } from "@maa/core";
import { aiConfig as config } from "../aiConfig";
import { chatCompletion, parseJsonReply } from "./client";
import { buildReportContext } from "./context";
import { CONSULTANT_SYSTEM_PROMPT, CREATIVE_AUDIENCE_TASK, OVERVIEW_TASK, RECOMMENDATIONS_TASK, reportMessage } from "./prompts";
import { ruleBasedAnalysis } from "./ruleBased";
import { creativeAudienceSchema, overviewSchema, recommendationsSchema } from "./schema";

export interface AnalysisOutput {
  model: string;
  scorecard: Score[];
  result: AnalysisResult;
}

async function runTask<T>(context: unknown, task: string, parse: (v: unknown) => T, maxTokens: number): Promise<T> {
  const reply = await chatCompletion(
    [
      { role: "system", content: CONSULTANT_SYSTEM_PROMPT },
      { role: "user", content: reportMessage(context) },
      { role: "user", content: task },
    ],
    { json: true, maxTokens },
  );
  return parse(parseJsonReply(reply));
}

/** Full analysis: deterministic scorecard + three parallel AI calls (or the rule-based fallback). */
export async function generateAnalysis(data: ReportData): Promise<AnalysisOutput> {
  const scorecard = computeScorecard(data);
  if (!config.aiEnabled) {
    return { model: "rule-based", scorecard, result: ruleBasedAnalysis(data, scorecard) };
  }

  const context = buildReportContext(data, scorecard);
  const [overview, creative, recs] = await Promise.all([
    runTask(context, OVERVIEW_TASK, (v) => overviewSchema.parse(v), 5000),
    runTask(context, CREATIVE_AUDIENCE_TASK, (v) => creativeAudienceSchema.parse(v), 4500),
    runTask(context, RECOMMENDATIONS_TASK, (v) => recommendationsSchema.parse(v), 4500),
  ]);

  return { model: config.AI_MODEL, scorecard, result: { ...overview, ...creative, ...recs } as AnalysisResult };
}
