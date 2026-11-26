/** Public site settings used for SEO and billing. All values come from env vars set at build time. */

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel sets this automatically to the production domain.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_URL = siteUrl();
export const SITE_NAME = "Meta Ads AI Analyzer";
export const SITE_TITLE = "Meta Ads AI Analyzer: AI audit for Facebook & Instagram ads reports";
export const SITE_DESCRIPTION =
  "Upload your Meta Ads Manager CSV or Excel report and get an instant AI audit: KPI dashboard, scorecard, wasted spend, creative fatigue, funnel leaks and a scaling plan. No Facebook login needed.";

/**
 * Hosted checkout links from your payment provider (Lemon Squeezy, Paddle, …).
 * When a link is empty, the plan button falls back to the free upload page.
 */
export const CHECKOUT_URLS = {
  pro: process.env.NEXT_PUBLIC_CHECKOUT_URL_PRO?.trim() || "",
  agency: process.env.NEXT_PUBLIC_CHECKOUT_URL_AGENCY?.trim() || "",
};

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";
