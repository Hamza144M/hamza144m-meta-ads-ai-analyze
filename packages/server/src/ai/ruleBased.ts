import {
  accountResultLabel,
  formatCurrency,
  formatPercent,
  type AnalysisResult,
  type Assessment,
  type BreakdownItem,
  type NamedInsight,
  type Rating,
  type ReportData,
  type Score,
} from "@maa/core";

/**
 * Deterministic analysis used when no AI provider is configured (local dev,
 * demos) or as a safety net. It is intentionally conservative and clearly
 * labeled "rule-based" in the UI.
 */
export function ruleBasedAnalysis(data: ReportData, scorecard: Score[]): AnalysisResult {
  const t = data.totals;
  const cur = data.currency;
  const money = (n: number | null | undefined) => formatCurrency(n, cur, n != null && Math.abs(n) >= 100 ? 0 : 2);
  const pct = (n: number | null | undefined, d = 2) => formatPercent(n, d);
  const resultLabel = accountResultLabel(data);
  const camps = data.campaigns.filter((c) => c.metrics.spend > 0);
  const hasRevenue = t.revenue > 0;

  // Rank by efficiency: ROAS for sales campaigns, otherwise cost per result relative to account.
  const efficiency = (c: BreakdownItem) =>
    c.metrics.roas != null
      ? c.metrics.roas
      : c.metrics.costPerResult != null && t.costPerResult
        ? t.costPerResult / c.metrics.costPerResult
        : 0;
  // With revenue in the file, rank sales campaigns by ROAS; lead/message campaigns can't be compared on the same scale.
  const isSales = (c: BreakdownItem) => c.metrics.revenue > 0 || /sales|conversion|purchase/i.test(c.objective ?? "");
  const rankPool = hasRevenue && camps.some(isSales) ? camps.filter(isSales) : camps;
  const ranked = [...rankPool].sort((a, b) => efficiency(b) - efficiency(a));
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  const describe = (c: BreakdownItem) =>
    `${money(c.metrics.spend)} spent, ${c.metrics.roas != null ? `${c.metrics.roas.toFixed(2)}x ROAS` : `${Math.round(c.metrics.results)} results at ${money(c.metrics.costPerResult)}`}, CTR ${pct(c.metrics.ctr)}.`;

  const waste: NamedInsight[] = camps
    .filter(
      (c) =>
        (c.metrics.results === 0 && c.metrics.spend > t.spend * 0.05) ||
        (c.metrics.roas != null && c.metrics.roas < 1 && c.metrics.spend > t.spend * 0.05),
    )
    .map((c) => ({
      name: c.key,
      reason: describe(c),
      action: "Cut budget by 50% or pause, and move spend to the best performer.",
      amount: money(c.metrics.spend),
    }));
  // Sales campaigns with spend but no tracked revenue
  for (const c of camps) {
    if (
      hasRevenue &&
      c.metrics.revenue === 0 &&
      c.metrics.purchases === 0 &&
      c.objective?.toLowerCase() === "sales" &&
      !waste.some((w) => w.name === c.key)
    ) {
      waste.push({
        name: c.key,
        reason: `${money(c.metrics.spend)} on a sales objective with no purchases recorded.`,
        action: "Pause or rebuild with new creative and audience.",
        amount: money(c.metrics.spend),
      });
    }
  }

  const scale = ranked
    .filter(
      (c) =>
        (c.metrics.roas != null ? c.metrics.roas >= Math.max(2, (t.roas ?? 0) * 1.2) : efficiency(c) > 1.3) &&
        (c.metrics.frequency ?? 0) < 3,
    )
    .slice(0, 3)
    .map((c) => ({ name: c.key, reason: describe(c), action: "Raise budget 20% every 48-72 hours while CPA holds.", amount: "+20%" }));

  const learning = camps
    .filter((c) => c.delivery?.toLowerCase().includes("learning limited"))
    .map((c) => ({
      name: c.key,
      reason: `Delivery is "${c.delivery}" with ${Math.round(c.metrics.results)} results.`,
      action: "Consolidate ad sets, broaden targeting or raise budget to reach ~50 conversions per week.",
    }));

  const fatigued = data.ads.filter((a) => a.trend?.ctr != null && a.trend.ctr < -25);
  const adLabel = (ad: BreakdownItem) => (ad.parent ? `"${ad.key}" in ${ad.parent}` : `"${ad.key}"`);
  const rate = (s: Score | undefined): Rating => (s ? s.status : "unknown");
  const sc = (k: string) => scorecard.find((s) => s.key === k);
  const a = (rating: Rating, assessment: string): Assessment => ({ rating, assessment });
  const nameHas = (re: RegExp) =>
    camps.filter((c) =>
      re.test(
        `${c.key} ${data.adSets
          .filter((s) => s.parent === c.key)
          .map((s) => s.key)
          .join(" ")}`,
      ),
    );
  const audienceGroup = (re: RegExp, label: string): Assessment => {
    const g = nameHas(re);
    if (!g.length) return a("unknown", `No campaigns or ad sets named like ${label} audiences were found.`);
    const s = g.map((c) => `${c.key}: ${describe(c)}`).join(" ");
    const avgEff = g.reduce((x, c) => x + efficiency(c), 0) / g.length;
    const avgAll = camps.reduce((x, c) => x + efficiency(c), 0) / Math.max(1, camps.length);
    return a(avgEff >= avgAll * 1.1 ? "good" : avgEff >= avgAll * 0.8 ? "warning" : "critical", `Inferred from names. ${s}`);
  };

  const weakSteps = data.funnel.filter((f) => f.rateFromPrevious != null).map((f) => ({ f, s: f.rateFromPrevious! }));
  const bottleneckRules: Record<string, [number, string]> = {
    linkClicks: [1, "Test new hooks and thumbnails; lead with the offer in the first line of copy."],
    landingPageViews: [75, "Speed up the landing page (under 2.5s LCP), check the pixel fires, and avoid redirects."],
    addsToCart: [6, "Tighten message match between ad and product page; add reviews, clear pricing and urgency."],
    checkouts: [40, "Show shipping costs early, add express checkout, and run cart-abandon retargeting."],
    purchases: [50, "Reduce checkout fields, add trust badges and more payment options."],
    leads: [8, "Shorten the form, add a stronger lead magnet, and pre-qualify in the ad copy."],
    messages: [10, "Use a clear prompt question in the ad and fast auto-replies."],
  };
  const bottlenecks = weakSteps
    .filter(({ f, s }) => bottleneckRules[f.key] && s < bottleneckRules[f.key][0])
    .map(({ f, s }) => ({
      stage: f.label,
      severity: (s < bottleneckRules[f.key][0] * 0.6 ? "critical" : "warning") as Rating,
      issue: `Only ${pct(s, 1)} of ${f.fromLabel} reach ${f.label.toLowerCase()} (rule of thumb: ${bottleneckRules[f.key][0]}%+).`,
      fix: bottleneckRules[f.key][1],
    }));

  const shares = camps.map((c) => ({ c, share: (c.metrics.spend / t.spend) * 100 }));
  const boost = new Set(scale.map((s) => s.name));
  const cut = new Set(waste.map((w) => w.name));
  const raw = shares.map(({ c, share }) => ({ c, share, rec: boost.has(c.key) ? share * 1.3 : cut.has(c.key) ? share * 0.5 : share }));
  const recTotal = raw.reduce((x, r) => x + r.rec, 0) || 1;

  const problems = [
    ...waste.map((w) => `${w.name}: ${w.reason}`),
    ...learning.map((l) => `${l.name} is learning limited. ${l.reason}`),
    ...fatigued.map(
      (f) =>
        `Creative fatigue on ${adLabel(f)}: CTR ${f.trend!.ctr!.toFixed(0)}% vs first half, frequency ${f.trend!.frequency != null ? `${f.trend!.frequency.toFixed(0)}%` : "n/a"} change.`,
    ),
    ...bottlenecks.map((b) => `${b.stage}: ${b.issue}`),
    ...scorecard
      .filter((s) => s.status === "critical" && s.key !== "overall")
      .map((s) => `${s.label} is weak (${s.score}/100). ${s.basis}`),
  ].slice(0, 10);

  return {
    executiveSummary: {
      headline: `${money(t.spend)} spent for ${Math.round(resultLabel === "purchases" ? t.purchases : resultLabel === "leads" ? t.leads : resultLabel === "messaging conversations" ? t.messages : t.results).toLocaleString("en-US")} ${resultLabel}${hasRevenue ? ` at ${t.roas?.toFixed(2)}x ROAS` : ""}. Overall score ${sc("overall")?.score ?? "n/a"}/100.`,
      overview:
        `Across ${data.counts.campaigns} campaigns, the account delivered ${t.impressions.toLocaleString("en-US")} impressions at a ${money(t.cpm)} CPM and ${pct(t.ctr)} link CTR. ${
          best ? `${best.key} is the strongest campaign (${describe(best)})` : ""
        } ${worst && worst !== best ? `${worst.key} is the weakest (${describe(worst)})` : ""} ${
          waste.length
            ? `About ${money(waste.reduce((x, w) => x + (Number(String(w.amount).replace(/[^\d.]/g, "")) || 0), 0))} went to campaigns with poor or no return.`
            : ""
        }`
          .replace(/\s+/g, " ")
          .trim(),
      keyFindings: [
        `Spend ${money(t.spend)}: ${[t.purchases && `${Math.round(t.purchases)} purchases`, t.leads && `${Math.round(t.leads)} leads`, t.messages && `${Math.round(t.messages)} conversations`].filter(Boolean).join(", ") || `${Math.round(t.results)} results`}.`,
        hasRevenue
          ? `Revenue ${money(t.revenue)} at ${t.roas?.toFixed(2)}x ROAS.`
          : "No conversion value in the export, so ROAS can't be judged.",
        `CTR ${pct(t.ctr)} and CPM ${money(t.cpm)}; frequency ${t.frequency?.toFixed(2) ?? "n/a"}.`,
        fatigued.length ? `${fatigued.length} ad(s) show creative fatigue (CTR down 25%+).` : "No strong creative fatigue signal.",
        learning.length ? `${learning.length} campaign(s) are learning limited.` : "No learning-limited campaigns flagged.",
      ],
    },
    campaignAnalysis: {
      bestCampaign: best ? { name: best.key, reason: describe(best), action: "Protect and scale gradually." } : null,
      worstCampaign:
        worst && worst !== best
          ? { name: worst.key, reason: describe(worst), action: "Cut budget and rework creative or audience." }
          : null,
      budgetWaste: waste,
      scalingOpportunities: scale,
      learningLimited: learning,
      notes: "Rule-based preview: add an AI provider key for a full consultant-style read.",
    },
    creativeAnalysis: {
      creativeFatigue: fatigued.length
        ? a(
            "critical",
            `${fatigued.map((f) => `${adLabel(f)} CTR ${f.trend!.ctr!.toFixed(0)}%`).join(", ")} between the first and second half of the period.`,
          )
        : a(
            data.daily.length ? "good" : "unknown",
            data.daily.length ? "No ad lost more than 25% of its CTR over the period." : "Add the Day breakdown to detect fatigue.",
          ),
      hookStrength:
        t.hookRate != null
          ? a(rate(sc("creative")), `Hook rate (3s plays ÷ impressions) is ${pct(t.hookRate, 1)}; 25-30%+ is strong.`)
          : a("unknown", "No video play columns in the export."),
      thumbnailQuality: a("unknown", "Thumbnails can't be seen in an export; judge them by CTR per ad in the table."),
      videoPerformance:
        t.videoPlays3s > 0
          ? a(
              t.thruPlays / t.videoPlays3s > 0.25 ? "good" : "warning",
              `${pct((t.thruPlays / t.videoPlays3s) * 100, 1)} of 3-second viewers reached ThruPlay.`,
            )
          : a("unknown", "No video metrics in the export."),
      ctrQuality: a(rate(sc("ctr")), sc("ctr")?.basis ?? `Link CTR ${pct(t.ctr)}.`),
      engagement:
        t.postEngagement > 0
          ? a(
              "unknown",
              `${t.postEngagement.toLocaleString("en-US")} post engagements (${pct((t.postEngagement / t.impressions) * 100)} of impressions).`,
            )
          : a("unknown", "No engagement column in the export."),
      suggestions: {
        hooks: [
          "Stop scrolling if you've ever…",
          "I tried 5 of these. Only one worked.",
          "Here's what nobody tells you about…",
          "3 mistakes I made before finding this",
        ],
        headlines: ["Loved by thousands. See why.", "Free shipping today only", "The easiest upgrade you'll make this year"],
        primaryText: ["Lead with the problem, show the product solving it in one line, add a review, then the offer."],
        ctas: ["Shop Now", "Get Offer", "Learn More", "Send Message"],
        creativeAngles: ["Problem → solution", "Customer testimonial / UGC", "Founder story", "Before / after", "Objection handling"],
      },
    },
    audienceAnalysis: {
      interests: audienceGroup(/interest/i, "interest"),
      broad: audienceGroup(/broad|advantage/i, "broad"),
      lookalikes: audienceGroup(/lookalike|lal/i, "lookalike"),
      retargeting: audienceGroup(/retarget|\brt\b|visitors|wv|engagers/i, "retargeting"),
      age:
        data.age.length > 1
          ? a("unknown", data.age.map((x) => `${x.key}: ${money(x.metrics.costPerResult)}/result`).join(", "))
          : a("unknown", "Export with the Age breakdown to analyze age."),
      gender:
        data.gender.length > 1
          ? a("unknown", data.gender.map((x) => `${x.key}: ${money(x.metrics.costPerResult)}/result`).join(", "))
          : a("unknown", "Export with the Gender breakdown to analyze gender."),
      locations:
        data.region.length > 1
          ? a(
              "unknown",
              data.region
                .slice(0, 5)
                .map((x) => `${x.key}: ${money(x.metrics.costPerResult)}/result`)
                .join(", "),
            )
          : a("unknown", "Export with the Region or Country breakdown to analyze locations."),
      recommendations: [
        "Shift budget from the weakest audience type to the strongest.",
        "Exclude recent purchasers from prospecting.",
        "Test Advantage+ audience against your best interest stack.",
      ],
    },
    funnelAnalysis: {
      summary: bottlenecks.length
        ? `${bottlenecks.length} funnel step(s) fall below common benchmarks.`
        : "No funnel step falls below common benchmarks.",
      bottlenecks,
    },
    budgetAnalysis: {
      increase: scale,
      decrease: waste.map((w) => ({ ...w, amount: "-50%" })),
      scaleStrategy:
        "Scale winners vertically by 15-20% every 48-72 hours; duplicate into a new ad set (horizontal) once CPA rises more than 20%.",
      allocation: raw.map((r) => ({
        name: r.c.key,
        currentShare: `${r.share.toFixed(0)}%`,
        recommendedShare: `${((r.rec / recTotal) * 100).toFixed(0)}%`,
        reason: boost.has(r.c.key) ? "Scale" : cut.has(r.c.key) ? "Reduce" : "Hold",
      })),
      priorities: ranked.map((c) => c.key),
    },
    scoreNotes: Object.fromEntries(scorecard.map((s) => [s.key, s.basis])),
    recommendations: {
      topProblems: problems,
      topImprovements: [
        ...scale.map((s) => `Scale ${s.name} by 20%.`),
        ...waste.map((w) => `Reduce or pause ${w.name}.`),
        ...fatigued.map((f) => `Replace ${adLabel(f)} with a fresh hook.`),
        ...bottlenecks.map((b) => b.fix),
      ].slice(0, 10),
      quickWins: [
        ...waste.slice(0, 2).map((w) => `Cut ${w.name} budget by 50%.`),
        ...fatigued.slice(0, 2).map((f) => `Turn off ${adLabel(f)}.`),
        "Check the pixel and Conversions API are firing on every funnel step.",
      ],
      scalingPlan: [
        "Week 1: +20% on winners every 48-72h.",
        "Week 2: duplicate winning ad sets into broad / Advantage+ audiences.",
        "Week 3-4: launch 3 new creatives per winner to fight fatigue.",
      ],
      creativeTestingIdeas: [
        "UGC vs studio video with the same hook.",
        "Three hooks on the best-performing video.",
        "Static with a review quote vs static with the offer.",
      ],
      audienceTestingIdeas: [
        "Advantage+ audience vs best interest stack.",
        "1% vs 3% lookalike of purchasers.",
        "Retargeting 7d vs 30d windows.",
      ],
      budgetStrategy: [
        "Fund the best campaign first.",
        "Keep 10-20% of budget for testing.",
        "Use cost caps on scaled campaigns once stable.",
      ],
      optimizationRoadmap: [
        { phase: "Stop the bleeding", timeframe: "Days 1-3", actions: waste.map((w) => `Reduce ${w.name}`).concat("Pause fatigued ads") },
        { phase: "Scale winners", timeframe: "Days 4-10", actions: scale.map((s) => `Scale ${s.name}`).concat("Monitor CPA daily") },
        { phase: "Creative refresh", timeframe: "Days 11-20", actions: ["Launch 3-5 new hooks", "Test one new angle per week"] },
        { phase: "Expand", timeframe: "Days 21-30", actions: ["Test new audiences", "Rebalance budget weekly"] },
      ],
    },
  };
}
