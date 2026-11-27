/**
 * Creem (creem.io) card payments. Creem is the merchant of record: it charges buyers
 * worldwide, handles sales tax/VAT and pays the seller out by bank transfer
 * (Pakistan included). Server-only: the API key never reaches the browser.
 */
export type PaidPlan = "pro" | "agency";

export const CREEM_PRODUCTS: Record<PaidPlan, string> = {
  pro: process.env.CREEM_PRODUCT_PRO?.trim() || "",
  agency: process.env.CREEM_PRODUCT_AGENCY?.trim() || "",
};

export function creemKey(): string {
  return process.env.CREEM_API_KEY?.trim() || "";
}

/** Test keys (creem_test_…) talk to Creem's test API, live keys to the live API. */
export function creemApiBase(key = creemKey()): string {
  return key.startsWith("creem_test_") ? "https://test-api.creem.io/v1" : "https://api.creem.io/v1";
}

/** True when a plan can be bought through Creem's checkout. */
export function creemPlanEnabled(plan: PaidPlan): boolean {
  return Boolean(creemKey() && CREEM_PRODUCTS[plan]);
}
