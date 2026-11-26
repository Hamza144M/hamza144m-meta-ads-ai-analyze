import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Private pages (uploaded reports, API, checkout return page) stay out of search results.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/reports/", "/billing/", "/login"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
