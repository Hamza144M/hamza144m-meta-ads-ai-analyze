import { z } from "zod";
import { aiConfig } from "../aiConfig";
import { HttpError } from "../errors";
import { chatCompletion, parseJsonReply } from "./client";

/** "Targeting advisor": a starter Meta Ads targeting and placement plan from a few answers. One AI call. */
export const targetingInputSchema = z.object({
  product: z.string().trim().min(2, "Describe your product or service.").max(300),
  price: z.string().trim().max(60).optional(),
  currency: z.string().trim().max(10).optional(),
  country: z.string().trim().min(2, "Enter the country or cities you sell to.").max(200),
  goal: z.string().trim().max(60).default("Sales"),
  budget: z.string().trim().max(60).optional(),
  customer: z.string().trim().max(400).optional(),
});
export type TargetingInput = z.infer<typeof targetingInputSchema>;

const str = z.preprocess((v) => (v == null ? "" : v), z.coerce.string()).catch("");
const strList = (max = 10) =>
  z
    .array(z.union([z.string(), z.number()]).transform(String))
    .catch([])
    .transform((a) =>
      a
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max),
    );
const named = z
  .array(z.object({ name: str, why: str }).catch({ name: "", why: "" }))
  .catch([])
  .transform((a) => a.filter((x) => x.name).slice(0, 10));

export const targetingPlanSchema = z.object({
  summary: str,
  age: z.object({ min: z.coerce.number().catch(18), max: z.coerce.number().catch(65), why: str }).catch({ min: 18, max: 65, why: "" }),
  gender: z.object({ value: str, why: str }).catch({ value: "All", why: "" }),
  locations: named,
  excludeLocations: strList(8),
  interests: named,
  behaviors: strList(8),
  exclusions: strList(8),
  advantagePlusAudience: z.object({ use: z.coerce.boolean().catch(true), why: str }).catch({ use: true, why: "" }),
  placements: z
    .object({
      mode: z.enum(["advantage_plus", "manual"]).catch("advantage_plus"),
      include: strList(12),
      exclude: strList(12),
      why: str,
    })
    .catch({ mode: "advantage_plus", include: [], exclude: [], why: "" }),
  budget: z.object({ daily: str, testDays: z.coerce.number().catch(7), why: str }).catch({ daily: "", testDays: 7, why: "" }),
  audiences: z
    .array(
      z
        .object({
          name: str,
          age: str,
          gender: str,
          locations: strList(8),
          interests: strList(8),
          why: str,
        })
        .catch({ name: "", age: "", gender: "", locations: [], interests: [], why: "" }),
    )
    .catch([])
    .transform((a) => a.filter((x) => x.name).slice(0, 3)),
  campaignSetup: strList(6),
  tips: strList(6),
});
export type TargetingPlan = z.infer<typeof targetingPlanSchema>;

const SYSTEM_PROMPT = `You are a senior Meta Ads media buyer who has set up thousands of Facebook and Instagram campaigns in many countries. You give a practical starting targeting and placement plan for a new advertiser.

Rules:
- Use only targeting options that exist in Meta Ads Manager today (age 18-65+, gender, locations with include/exclude, detailed targeting interests and behaviors, Advantage+ audience, Advantage+ placements or manual placements such as Facebook Feed, Instagram Feed, Instagram Reels, Facebook Reels, Instagram Stories, Facebook Stories, Messenger, Audience Network, Marketplace, Right column, Search results).
- Interests must be real Meta detailed-targeting interests that are likely to exist. Prefer broad-ish interests with large audiences.
- Locations: name the specific cities or regions (not just the country) where this product is most likely to sell, based on population, buying power and the product's price, and say why for each.
- Fit the plan to the country, local buying habits and the product's price. For low budgets, keep the setup simple (one campaign, one or two ad sets).
- Give the budget in the advertiser's currency when they gave one. Explain each choice in one short sentence.
- Reply with JSON only, no markdown.`;

function taskText(i: TargetingInput): string {
  return `Product / service: ${i.product}
${i.price ? `Price: ${i.price}${i.currency ? ` ${i.currency}` : ""}\n` : ""}Country / cities: ${i.country}
Campaign goal: ${i.goal}
${i.budget ? `Planned budget: ${i.budget}\n` : ""}${i.customer ? `What they know about their customers: ${i.customer}\n` : ""}
Return JSON with exactly these keys:
{
  "summary": "2-3 sentences: who to target first and why",
  "age": {"min": 18-65, "max": 18-65 (65 means 65+), "why": "..."},
  "gender": {"value": "All | Women | Men", "why": "..."},
  "locations": [{"name": "city or region, best first (4-8 items)", "why": "..."}],
  "excludeLocations": ["..."],
  "interests": [{"name": "Meta interest", "why": "..."}],
  "behaviors": ["Meta behaviors, e.g. Engaged Shoppers"],
  "exclusions": ["audiences to exclude, e.g. past purchasers in the last 30 days"],
  "advantagePlusAudience": {"use": true|false, "why": "..."},
  "placements": {"mode": "advantage_plus" | "manual", "include": ["..."], "exclude": ["..."], "why": "..."},
  "audiences": [{"name": "short name, e.g. Broad women in big cities", "age": "25-44", "gender": "Women", "locations": ["..."], "interests": ["... or none for broad"], "why": "..."}] (exactly 3 different audiences to test side by side in separate ad sets: one broad, one interest-based, one different angle),
  "budget": {"daily": "starter daily budget with currency", "testDays": 7, "why": "..."},
  "campaignSetup": ["3-5 short steps: campaign, ad sets, what to test"],
  "tips": ["3-5 practical tips for this market"]
}`;
}

export interface TargetingAdvisorOutput {
  model: string;
  plan: TargetingPlan;
}

export async function adviseTargetingPlan(input: TargetingInput): Promise<TargetingAdvisorOutput> {
  if (!aiConfig.aiEnabled)
    throw new HttpError(
      503,
      "The targeting advisor needs an AI key. Add AI_API_KEY (or ANTHROPIC_API_KEY) in your hosting settings.",
      "ai_not_configured",
    );
  const reply = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: taskText(input) },
    ],
    { json: true, maxTokens: 4000, effort: "low" },
  );
  return { model: aiConfig.activeModel, plan: targetingPlanSchema.parse(parseJsonReply(reply)) };
}
