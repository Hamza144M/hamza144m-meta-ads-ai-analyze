/**
 * Prompt templates for the Meta Ads consultant.
 * Every call gets the same system prompt and the report JSON; each task asks
 * for one slice of the analysis so calls run in parallel and stay within
 * output limits.
 */

export const CONSULTANT_SYSTEM_PROMPT = `You are a senior Meta Ads (Facebook & Instagram) performance consultant with 15+ years of hands-on experience managing eight-figure ad budgets for e-commerce, lead generation and local businesses. You audit accounts the way a top agency strategist would: direct, specific, numbers-first, and focused on what to do next.

Rules:
- Use ONLY the data in the REPORT JSON. Quote the actual numbers (spend, ROAS, CPA, CTR, frequency…) and campaign/ad set/ad names when you make a claim.
- Never invent metrics, names, benchmarks for this specific account, or columns that are not in the data. If something can't be judged from the export (e.g. thumbnails, interests targeted, audience type), say so briefly and infer cautiously from names, rating it "unknown" when there's no evidence.
- Campaign, ad set and ad names often reveal audience type (Broad, Interest, LAL/Lookalike, Retargeting/RT/WV) and creative format (UGC, Static, Carousel, Video, Reel). Use these cues and say when you're inferring from a name.
- "trendFirstVsSecondHalfPct" compares the first and second half of the date range: CTR falling while frequency rises is a creative fatigue signal.
- Respect the objective: judge lead-gen campaigns on cost per lead, messaging campaigns on cost per conversation, sales campaigns on ROAS and CPA.
- "Learning limited" in delivery means the ad set isn't getting ~50 optimization events per week; fixes include consolidating ad sets, raising budget, broadening audience or optimizing for a higher-funnel event.
- Recommendations must be concrete and actionable (what, where, how much, when). Prefer % budget changes, specific audiences, and specific creative tests.
- Currency is given in file.currency. Format money with that currency.
- Write in clear, plain English for a marketer or business owner. No fluff, no disclaimers.
- Reply with a single valid JSON object matching the requested schema. No markdown fences.`;

export function reportMessage(context: unknown): string {
  return `REPORT JSON:\n${JSON.stringify(context)}`;
}

const RATING = `"good" | "warning" | "critical" | "unknown"`;
const ASSESS = `{ "rating": ${RATING}, "assessment": string (2-3 sentences citing numbers) }`;
const INSIGHT = `{ "name": string, "reason": string (cite numbers), "action": string, "amount": string (optional money or % figure) }`;

export const OVERVIEW_TASK = `Write the executive summary, campaign analysis, funnel analysis, budget analysis and a one-sentence note for each scorecard metric.

Return JSON:
{
  "executiveSummary": {
    "headline": string (one punchy sentence on overall performance),
    "overview": string (one paragraph, 4-6 sentences: spend, results, efficiency, what's working, what's not),
    "keyFindings": string[] (4-6 bullets, each with a number)
  },
  "campaignAnalysis": {
    "bestCampaign": ${INSIGHT},
    "worstCampaign": ${INSIGHT},
    "budgetWaste": ${INSIGHT}[] (campaigns/ad sets/ads spending with poor or no return; "amount" = wasted spend estimate),
    "scalingOpportunities": ${INSIGHT}[],
    "learningLimited": ${INSIGHT}[] (from delivery status; empty array if none),
    "notes": string
  },
  "funnelAnalysis": {
    "summary": string,
    "bottlenecks": { "stage": string, "severity": ${RATING}, "issue": string (cite the rate), "fix": string (specific) }[] (every weak step from impressions → CTR → landing page views → leads → messages → add to cart → checkout → purchases that has data)
  },
  "budgetAnalysis": {
    "increase": ${INSIGHT}[] ("amount" = recommended change like "+20%"),
    "decrease": ${INSIGHT}[],
    "scaleStrategy": string (how to scale: vertical vs horizontal, increments, guardrails),
    "allocation": { "name": string, "currentShare": string, "recommendedShare": string, "reason": string }[] (cover the main campaigns; recommended shares sum to ~100%),
    "priorities": string[] (ordered campaign priorities)
  },
  "scoreNotes": { "ctr": string, "cpm": string, "cpc": string, "cpa": string, "roas": string, "frequency": string, "creative": string, "audience": string, "funnel": string, "landingPage": string, "overall": string }
}`;

export const CREATIVE_AUDIENCE_TASK = `Analyze creatives and audiences.

Return JSON:
{
  "creativeAnalysis": {
    "creativeFatigue": ${ASSESS},
    "hookStrength": ${ASSESS} (use hookRate = 3-second plays / impressions where available),
    "thumbnailQuality": ${ASSESS} (infer from CTR of static vs video; say it's inferred),
    "videoPerformance": ${ASSESS},
    "ctrQuality": ${ASSESS},
    "engagement": ${ASSESS},
    "suggestions": {
      "hooks": string[] (6 scroll-stopping first-3-second hooks tailored to the products/offers implied by names),
      "headlines": string[] (6),
      "primaryText": string[] (3 complete primary texts, 2-4 sentences each),
      "ctas": string[] (5),
      "creativeAngles": string[] (6, e.g. problem/solution, social proof, founder story, comparison, objection handling)
    }
  },
  "audienceAnalysis": {
    "interests": ${ASSESS},
    "broad": ${ASSESS},
    "lookalikes": ${ASSESS},
    "retargeting": ${ASSESS},
    "age": ${ASSESS},
    "gender": ${ASSESS},
    "locations": ${ASSESS},
    "recommendations": string[] (5-8 specific targeting changes)
  }
}`;

export const RECOMMENDATIONS_TASK = `Produce the action plan.

Return JSON:
{
  "recommendations": {
    "topProblems": string[] (exactly 10, most costly first, each citing numbers and names),
    "topImprovements": string[] (exactly 10, highest impact first),
    "quickWins": string[] (5-6 things to do today, under 30 minutes each),
    "scalingPlan": string[] (5-6 steps),
    "creativeTestingIdeas": string[] (5-6, each with hypothesis and success metric),
    "audienceTestingIdeas": string[] (5-6),
    "budgetStrategy": string[] (4-6),
    "optimizationRoadmap": { "phase": string, "timeframe": string (e.g. "Days 1-3"), "actions": string[] }[] (4 phases covering the next 30 days)
  }
}`;
