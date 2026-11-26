/**
 * AI provider settings, read from the environment on every call so the same code
 * works in the Express API and in Next.js route handlers (Vercel).
 */
export const aiConfig = {
  get AI_BASE_URL(): string {
    return process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  },
  get AI_API_KEY(): string {
    return process.env.AI_API_KEY?.trim() || "";
  },
  get AI_MODEL(): string {
    return process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  },
  get aiEnabled(): boolean {
    return Boolean(process.env.AI_API_KEY?.trim());
  },
};
