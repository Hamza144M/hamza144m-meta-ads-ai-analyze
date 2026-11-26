import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(100).default(15),
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseEnabled: Boolean(parsed.data.SUPABASE_URL && parsed.data.SUPABASE_SERVICE_ROLE_KEY),
  aiEnabled: Boolean(parsed.data.AI_API_KEY || parsed.data.ANTHROPIC_API_KEY),
};
