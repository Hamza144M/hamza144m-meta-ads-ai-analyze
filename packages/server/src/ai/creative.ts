import { z } from "zod";
import { aiConfig } from "../aiConfig";
import { HttpError } from "../errors";
import { chatCompletion, parseJsonReply, type ContentPart } from "./client";

/**
 * Ad creative review: the browser sends a downscaled image, or a handful of frames
 * taken from a video (first 3 seconds + spread across the rest), plus basic metadata.
 */
export const creativeInputSchema = z.object({
  kind: z.enum(["image", "video"]),
  frames: z
    .array(
      z.object({
        time: z.number().min(0).max(36_000).optional(),
        dataUrl: z
          .string()
          .max(1_500_000)
          .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Frames must be JPEG, PNG or WebP data URLs."),
      }),
    )
    .min(1)
    .max(10),
  meta: z.object({
    fileName: z.string().max(200).default("creative"),
    width: z.number().int().positive().max(20_000),
    height: z.number().int().positive().max(20_000),
    durationSec: z.number().positive().max(36_000).optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
  }),
  context: z
    .object({
      product: z.string().trim().max(300).optional(),
      objective: z.string().trim().max(60).optional(),
      audience: z.string().trim().max(300).optional(),
      primaryText: z.string().trim().max(2000).optional(),
      headline: z.string().trim().max(200).optional(),
    })
    .default({}),
});
export type CreativeInput = z.infer<typeof creativeInputSchema>;

export interface FormatCheck {
  label: string;
  status: "good" | "warning" | "critical";
  detail: string;
}

/** Deterministic Meta format checks from size, aspect ratio and length. */
export function creativeFormatChecks(input: CreativeInput): FormatCheck[] {
  const { width, height, durationSec } = input.meta;
  const ratio = width / height;
  const checks: FormatCheck[] = [];
  const near = (r: number) => Math.abs(ratio - r) / r < 0.04;
  const shape = near(9 / 16) ? "9:16" : near(4 / 5) ? "4:5" : near(1) ? "1:1" : near(16 / 9) ? "16:9" : `${width}×${height}`;

  checks.push(
    near(9 / 16)
      ? { label: "Stories & Reels", status: "good", detail: "9:16 vertical fills the full screen in Stories and Reels." }
      : near(4 / 5) || near(1)
        ? {
            label: "Stories & Reels",
            status: "warning",
            detail: `${shape} will show with bars or be cropped in Stories and Reels. Add a 9:16 version for those placements.`,
          }
        : {
            label: "Stories & Reels",
            status: "critical",
            detail: `${shape} wastes most of the screen in Stories and Reels. Make a 9:16 version.`,
          },
  );
  checks.push(
    near(4 / 5) || near(1)
      ? { label: "Feed", status: "good", detail: `${shape} is a strong size for Facebook and Instagram Feed.` }
      : near(9 / 16)
        ? {
            label: "Feed",
            status: "warning",
            detail: "9:16 is cropped to 4:5 in Feed. Keep text and the product in the middle 4:5 area.",
          }
        : { label: "Feed", status: "warning", detail: `${shape} takes less space in Feed than 4:5 or 1:1. Consider a 4:5 version.` },
  );
  const shortSide = Math.min(width, height);
  checks.push(
    shortSide >= 1080
      ? { label: "Resolution", status: "good", detail: `${width}×${height} meets Meta's recommended 1080 px minimum.` }
      : shortSide >= 600
        ? { label: "Resolution", status: "warning", detail: `${width}×${height} is below the recommended 1080 px and may look soft.` }
        : {
            label: "Resolution",
            status: "critical",
            detail: `${width}×${height} is too small and will look blurry. Export at 1080 px or more.`,
          },
  );
  if (input.kind === "video" && durationSec) {
    const s = Math.round(durationSec);
    checks.push(
      s <= 15
        ? { label: "Length", status: "good", detail: `${s}s is a strong length for Reels, Stories and Feed.` }
        : s <= 60
          ? { label: "Length", status: "warning", detail: `${s}s is fine for Feed. Test a 6 to 15 second cut for Reels and Stories.` }
          : {
              label: "Length",
              status: "critical",
              detail: `${s}s is long for paid social. Most viewers drop off early, so cut a 15 second version.`,
            },
    );
  }
  return checks;
}

const str = z.preprocess((v) => (v == null ? "" : v), z.coerce.string()).catch("");
const strList = (max = 8) =>
  z
    .array(z.union([z.string(), z.number()]).transform(String))
    .catch([])
    .transform((a) =>
      a
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, max),
    );
const score = z.coerce
  .number()
  .catch(0)
  .transform((n) => Math.max(0, Math.min(100, Math.round(n))));

export const CREATIVE_AREAS = [
  { key: "hook", label: "Hook (first 3 seconds)" },
  { key: "visual", label: "Visual & thumbnail" },
  { key: "textOverlay", label: "Text overlay" },
  { key: "branding", label: "Branding" },
  { key: "cta", label: "Call to action" },
  { key: "placementFit", label: "Placement & format fit" },
] as const;

const area = z.object({ score, assessment: str, fix: str }).catch({ score: 0, assessment: "", fix: "" });

export const creativeResultSchema = z.object({
  overallScore: score,
  scrollStopScore: score,
  verdict: str,
  summary: str,
  areas: z
    .object({
      hook: area,
      visual: area,
      textOverlay: area,
      branding: area,
      cta: area,
      placementFit: area,
    })
    .catch({
      hook: { score: 0, assessment: "", fix: "" },
      visual: { score: 0, assessment: "", fix: "" },
      textOverlay: { score: 0, assessment: "", fix: "" },
      branding: { score: 0, assessment: "", fix: "" },
      cta: { score: 0, assessment: "", fix: "" },
      placementFit: { score: 0, assessment: "", fix: "" },
    }),
  strengths: strList(6),
  fixes: z
    .array(
      z
        .object({ priority: z.enum(["high", "medium", "low"]).catch("medium"), issue: str, fix: str })
        .catch({ priority: "medium", issue: "", fix: "" }),
    )
    .catch([])
    .transform((a) => a.filter((f) => f.issue || f.fix).slice(0, 8)),
  hooks: strList(6),
  headlines: strList(6),
  primaryTexts: strList(4),
  testIdeas: strList(5),
});
export type CreativeResult = z.infer<typeof creativeResultSchema>;

const SYSTEM_PROMPT = `You are a senior Meta Ads creative strategist with 15+ years of experience running Facebook and Instagram campaigns. You review ad creatives (images and short videos) and explain, in plain language, what will stop the scroll and what will make people keep scrolling.

Rules:
- Judge only what you can see in the frames provided. For videos you get still frames with timestamps; you cannot hear audio, so say so if sound matters.
- Be specific: refer to what is on screen (colors, faces, product, words, layout, timing).
- Every fix must be a concrete change the advertiser can make today.
- Scores are 0 to 100: 80+ strong, 60 to 79 decent, 40 to 59 weak, under 40 poor. Be honest; most creatives are not 90+.
- Write hooks, headlines and primary text in the same language as any text in the creative or the advertiser's notes (English if there is none). Do not invent prices, discounts or claims the advertiser didn't give.
- Reply with JSON only, no markdown.`;

function taskText(input: CreativeInput, checks: FormatCheck[]): string {
  const { meta, context, kind } = input;
  const lines = [
    `Creative type: ${kind === "video" ? "video" : "image"}`,
    `File: ${meta.fileName}, ${meta.width}×${meta.height}px${meta.durationSec ? `, ${Math.round(meta.durationSec)}s long` : ""}`,
    context.product && `Product / offer: ${context.product}`,
    context.objective && `Campaign objective: ${context.objective}`,
    context.audience && `Target audience: ${context.audience}`,
    context.headline && `Current headline: ${context.headline}`,
    context.primaryText && `Current primary text: ${context.primaryText}`,
    `Automatic format checks: ${checks.map((c) => `${c.label}: ${c.status} (${c.detail})`).join(" | ")}`,
  ].filter(Boolean);
  return `${lines.join("\n")}

Review this ad creative and return JSON with exactly these keys:
{
  "overallScore": 0-100,
  "scrollStopScore": 0-100 (predicted ability to stop the scroll in the first second),
  "verdict": "one short sentence verdict",
  "summary": "3-4 sentences: what works, what hurts performance, the single most important change",
  "areas": {
    "hook": {"score": 0-100, "assessment": "first 3 seconds / first glance", "fix": "concrete change"},
    "visual": {"score": 0-100, "assessment": "composition, contrast, thumbnail / first frame, product visibility", "fix": "..."},
    "textOverlay": {"score": 0-100, "assessment": "amount, readability on a phone, safe zones", "fix": "..."},
    "branding": {"score": 0-100, "assessment": "logo / brand cues, how early they appear", "fix": "..."},
    "cta": {"score": 0-100, "assessment": "clarity of the next step", "fix": "..."},
    "placementFit": {"score": 0-100, "assessment": "Feed vs Stories/Reels fit, aspect ratio, safe zones, length", "fix": "..."}
  },
  "strengths": ["..."],
  "fixes": [{"priority": "high|medium|low", "issue": "...", "fix": "..."}],
  "hooks": ["5 new opening hooks (first 3 seconds or first line on the image)"],
  "headlines": ["5 headline ideas, max 40 characters"],
  "primaryTexts": ["3 primary text ideas, 1-3 short lines each"],
  "testIdeas": ["3-5 A/B test ideas for this creative"]
}`;
}

export interface CreativeAnalysisOutput {
  model: string;
  result: CreativeResult;
  formatChecks: FormatCheck[];
}

export async function analyzeCreative(input: CreativeInput): Promise<CreativeAnalysisOutput> {
  const formatChecks = creativeFormatChecks(input);
  if (!aiConfig.aiEnabled)
    throw new HttpError(
      503,
      "Creative analysis needs an AI key. Add AI_API_KEY (or ANTHROPIC_API_KEY) in your hosting settings.",
      "ai_not_configured",
    );

  const parts: ContentPart[] = [{ type: "text", text: taskText(input, formatChecks) }];
  for (const [i, f] of input.frames.entries()) {
    parts.push({
      type: "text",
      text: input.kind === "video" ? `Frame ${i + 1} at ${(f.time ?? 0).toFixed(1)}s:` : "The ad image:",
    });
    parts.push({ type: "image_url", image_url: { url: f.dataUrl } });
  }
  const reply = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: parts },
    ],
    { json: true, maxTokens: 6000, effort: "medium" },
  );
  return { model: aiConfig.activeModel, result: creativeResultSchema.parse(parseJsonReply(reply)), formatChecks };
}
