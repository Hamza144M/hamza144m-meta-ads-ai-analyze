/**
 * AI provider settings, read from the environment on every call so the same code
 * works in the Express API and in Next.js route handlers (Vercel).
 *
 * - ANTHROPIC_API_KEY set: Claude answers (model ANTHROPIC_MODEL, default claude-opus-5-5).
 * - AI_API_KEY set: any OpenAI-compatible provider (AI_BASE_URL, AI_MODEL). Used when Claude
 *   isn't configured, and as a backup if Claude is unavailable.
 * - Neither: the built-in rule-based analysis.
 */
/** Read an env var, dropping spaces, wrapping quotes and stray trailing dots/commas from copy-paste. */
function env(name: string): string {
  return (process.env[name] ?? "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.,;]+$/, "")
    .trim();
}

export const aiConfig = {
  get ANTHROPIC_API_KEY(): string {
    return env("ANTHROPIC_API_KEY") || "";
  },
  get ANTHROPIC_MODEL(): string {
    return env("ANTHROPIC_MODEL") || "claude-opus-5-5";
  },
  get AI_BASE_URL(): string {
    return env("AI_BASE_URL") || "https://api.openai.com/v1";
  },
  get AI_API_KEY(): string {
    return env("AI_API_KEY") || "";
  },
  get AI_MODEL(): string {
    return env("AI_MODEL") || "gpt-4o-mini";
  },
  get claudeEnabled(): boolean {
    return Boolean(this.ANTHROPIC_API_KEY);
  },
  get openAiEnabled(): boolean {
    return Boolean(this.AI_API_KEY);
  },
  get aiEnabled(): boolean {
    return this.claudeEnabled || this.openAiEnabled;
  },
  /** Model id shown with a generated analysis. */
  get activeModel(): string {
    return this.claudeEnabled ? this.ANTHROPIC_MODEL : this.AI_MODEL;
  },
};
