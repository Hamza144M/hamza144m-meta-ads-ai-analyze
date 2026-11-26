// Generates a realistic, fictional Meta Ads Manager export (ad level, by day)
// at apps/web/public/samples/meta-ads-sample.csv. Deterministic output.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const jitter = (v, pct = 0.25) => v * (1 + (rand() * 2 - 1) * pct);
// stochastic rounding keeps small daily counts from always rounding to zero
const sround = (x) => Math.floor(x + rand());

const campaigns = [
  {
    name: "Prospecting | Broad | Purchases",
    objective: "Sales",
    delivery: "Active",
    budget: 150,
    cpm: 11,
    ctr: 1.6,
    lpv: 0.82,
    atc: 0.09,
    ck: 0.5,
    pur: 0.55,
    aov: 68,
    adSets: [
      { name: "Broad 25-54 | Advantage+", ads: ["UGC Video - Unboxing", "Static - Bestseller Grid"] },
      { name: "Broad 18-34 | Reels", ads: ["Reel - Founder Story"] },
    ],
  },
  {
    name: "Retargeting | Website Visitors 30d",
    objective: "Sales",
    delivery: "Active",
    budget: 60,
    cpm: 19,
    ctr: 2.4,
    lpv: 0.86,
    atc: 0.16,
    ck: 0.6,
    pur: 0.62,
    aov: 72,
    adSets: [{ name: "WV 30d excl. purchasers", ads: ["Carousel - Reviews", "Static - 15% Off"] }],
  },
  {
    name: "Lookalike 1% | Purchasers",
    objective: "Sales",
    delivery: "Learning limited",
    budget: 40,
    cpm: 14,
    ctr: 1.1,
    lpv: 0.74,
    atc: 0.06,
    ck: 0.42,
    pur: 0.45,
    aov: 65,
    adSets: [{ name: "LAL 1% US Purchasers 180d", ads: ["UGC Video - Unboxing", "Video - How It Works"] }],
  },
  {
    name: "Interest Stack | Fitness",
    objective: "Sales",
    delivery: "Active",
    budget: 80,
    cpm: 16,
    ctr: 0.7,
    lpv: 0.61,
    atc: 0.03,
    ck: 0.35,
    pur: 0.4,
    aov: 60,
    adSets: [
      { name: "Interests: Yoga + Pilates", ads: ["Static - Lifestyle", "Video - Old Hook"] },
      { name: "Interests: Gym + CrossFit", ads: ["Video - Old Hook"] },
    ],
  },
  {
    name: "Lead Gen | Free Guide",
    objective: "Leads",
    delivery: "Active",
    budget: 50,
    cpm: 9,
    ctr: 1.3,
    lpv: 0,
    leadRate: 0.11,
    adSets: [{ name: "Instant Form | Broad", ads: ["Static - Free Guide", "Video - 3 Tips"] }],
  },
  {
    name: "Messages | WhatsApp Consult",
    objective: "Engagement",
    delivery: "Active",
    budget: 30,
    cpm: 7,
    ctr: 1.9,
    lpv: 0,
    msgRate: 0.18,
    adSets: [{ name: "Click-to-WhatsApp | 25-45", ads: ["Static - Book a Consult"] }],
  },
];

const header = [
  "Reporting starts",
  "Reporting ends",
  "Day",
  "Campaign name",
  "Ad set name",
  "Ad name",
  "Campaign delivery",
  "Objective",
  "Ad set budget",
  "Ad set budget type",
  "Result indicator",
  "Results",
  "Cost per result",
  "Amount spent (USD)",
  "Impressions",
  "Reach",
  "Frequency",
  "CPM (cost per 1,000 impressions) (USD)",
  "Clicks (all)",
  "Link clicks",
  "CTR (link click-through rate)",
  "CPC (cost per link click) (USD)",
  "Landing page views",
  "Leads",
  "Messaging conversations started",
  "Adds to cart",
  "Checkouts initiated",
  "Purchases",
  "Purchases conversion value",
  "Purchase ROAS (return on ad spend)",
  "3-second video plays",
  "ThruPlays",
  "Post engagements",
];

const start = new Date("2026-10-27T00:00:00Z");
const days = 28;
const rows = [];
const iso = (d) => d.toISOString().slice(0, 10);
const end = new Date(start.getTime() + (days - 1) * 864e5);

for (let d = 0; d < days; d++) {
  const date = new Date(start.getTime() + d * 864e5);
  for (const c of campaigns) {
    const adCount = c.adSets.reduce((n, s) => n + s.ads.length, 0);
    for (const s of c.adSets) {
      for (const adName of s.ads) {
        // creative fatigue: the "Old Hook" video decays over the month
        const fatigue = adName.includes("Old Hook") ? 1 - d / (days * 1.6) : 1;
        const spend = jitter(c.budget / adCount);
        const impressions = Math.round((spend / jitter(c.cpm, 0.15)) * 1000 * (adName.includes("Old Hook") ? 1 + d / 40 : 1));
        const freq = adName.includes("Old Hook") ? 1.6 + d / 10 : jitter(c.name.startsWith("Retargeting") ? 2.6 : 1.3, 0.1);
        const reach = Math.round(impressions / freq);
        const linkClicks = Math.round((impressions * (jitter(c.ctr, 0.2) * fatigue)) / 100);
        const clicks = Math.round(linkClicks * jitter(1.8, 0.1));
        const lpv = Math.round(linkClicks * (c.lpv ? jitter(c.lpv, 0.08) : 0));
        const atc = sround(lpv * (c.atc ? jitter(c.atc, 0.3) : 0));
        const ck = sround(atc * (c.ck ? jitter(c.ck, 0.2) : 0));
        const pur = sround(ck * (c.pur ? jitter(c.pur, 0.2) : 0));
        const revenue = +(pur * (c.aov ? jitter(c.aov, 0.15) : 0)).toFixed(2);
        const leads = c.leadRate ? sround(linkClicks * jitter(c.leadRate, 0.3)) : 0;
        const msgs = c.msgRate ? sround(linkClicks * jitter(c.msgRate, 0.3)) : 0;
        const isVideo = /video|reel|ugc/i.test(adName);
        const plays = isVideo ? Math.round(impressions * jitter(adName.includes("Old Hook") ? 0.17 : 0.31, 0.1)) : 0;
        const thru = Math.round(plays * jitter(0.22, 0.2));
        const [indicator, results] =
          c.objective === "Leads"
            ? ["actions:lead", leads]
            : c.objective === "Engagement"
              ? ["actions:onsite_conversion.messaging_conversation_started_7d", msgs]
              : ["actions:offsite_conversion.fb_pixel_purchase", pur];
        rows.push([
          iso(start),
          iso(end),
          iso(date),
          c.name,
          s.name,
          adName,
          c.delivery,
          c.objective,
          c.budget,
          "Daily",
          indicator,
          results,
          results ? (spend / results).toFixed(2) : "",
          spend.toFixed(2),
          impressions,
          reach,
          (impressions / reach).toFixed(2),
          ((spend / impressions) * 1000).toFixed(2),
          clicks,
          linkClicks,
          ((linkClicks / impressions) * 100).toFixed(2),
          linkClicks ? (spend / linkClicks).toFixed(2) : "",
          lpv,
          leads,
          msgs,
          atc,
          ck,
          pur,
          revenue,
          revenue ? (revenue / spend).toFixed(2) : "",
          plays,
          thru,
          Math.round(clicks * jitter(1.4, 0.2)),
        ]);
      }
    }
  }
}

const esc = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n") + "\n";
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web/public/samples/meta-ads-sample.csv");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, csv);
console.log(`Wrote ${rows.length} rows to ${out}`);
