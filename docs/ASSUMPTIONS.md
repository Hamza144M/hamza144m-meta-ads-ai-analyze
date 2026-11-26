# Assumptions and open questions

Items marked **ASSUMPTION** in code are listed here so they can be confirmed or changed.

## Meta export columns

- Matching uses the English column names from Ads Manager's _Export table data_ (late 2026). Headers are lower-cased, currency suffixes like `(USD)` are removed, punctuation collapses to spaces, then matched against the alias lists in `packages/core/src/columns.ts`.
- Non-English Ads Manager exports are **not** matched yet. Adding aliases per language is straightforward.
- The header row is auto-detected within the first 15 rows (needs at least 3 recognized columns), so title lines above the table are fine.
- Rows with no campaign, ad set or ad name are treated as Meta summary rows and skipped.
- Legacy `.xls` is rejected with a message to export `.xlsx` or `.csv`. (SheetJS could read it, but the npm build has unpatched CVEs and the patched build is only on SheetJS's own CDN.)

## Calculations

| Metric          | Formula                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| CPM             | spend ÷ impressions × 1000                                                                          |
| CPC             | spend ÷ link clicks (falls back to all clicks)                                                      |
| CTR             | link clicks ÷ impressions × 100                                                                     |
| Frequency       | impressions ÷ reach                                                                                 |
| ROAS            | revenue ÷ spend. Revenue = _Purchases conversion value_; if missing, _Purchase ROAS × Amount spent_ |
| Results         | Meta's _Results_ column; if missing, purchases → leads → messaging conversations                    |
| Cost per result | spend ÷ results                                                                                     |
| CPA             | spend ÷ purchases (else leads, else messages)                                                       |
| Conversion rate | results ÷ link clicks × 100                                                                         |
| Budget          | sum of distinct ad set (or campaign) budgets, not summed per day                                    |

- Reach is **summed** across rows, so it overstates unique reach when a report has several campaigns or a day/age breakdown. The dashboard shows a note when this applies.
- When campaigns optimize for different result types, the account-level _Results_ total mixes them; a note says so.
- Funnel: leads and messages are measured against link clicks; add to cart against landing page views; checkout against add to cart; purchases against checkout. Dashboard bottleneck flags use rough benchmark thresholds (CTR < 0.9%, LPV < 70% of clicks, ATC < 5%, checkout < 35%, purchase < 40%). The AI analysis will judge these against objective and industry.

## KPI scorecard

- Scores are computed in code from broad, cross-industry Meta Ads benchmarks in USD (see `BENCHMARKS` in `packages/core/src/scoring.ts`). Green is 70+, yellow 45–69, red below 45.
- Other currencies are converted to USD before scoring CPM, CPC and lead/message CPA, using approximate rates in `packages/core/src/currency.ts` (e.g. 1 USD ≈ 280 PKR, ≈ 85 INR). These are **not live rates**; each report's rate can be edited in the dashboard's currency settings. A currency with no built-in rate isn't scored on those metrics until a rate is entered.
- Changing the currency relabels amounts; it never converts the numbers in the file.
- Purchase CPA is scored as a share of average order value, so it works for any price point.
- Creative = CTR and hook rate, minus a penalty for the share of spend on ads whose CTR fell 25%+ while frequency rose. Audience = frequency (double weight), CPM and conversion rate. Funnel = available step rates. Overall = weighted average (ROAS and CPA ×3; CTR, creative and funnel ×2; others ×1).
- Benchmarks differ a lot by industry and country. An industry selector would be a good follow-up.

## AI analysis

- Default model is `gpt-4o-mini` because it is cheap and fast for three parallel calls of ~5k input tokens each. Larger models give noticeably richer creative suggestions.
- Thumbnails, targeting settings and ad copy aren't in Ads Manager exports, so the AI infers audience type and format from names and rates those items "unknown" when there's no evidence.

## Product

- Pricing plans and testimonials on the landing page are **placeholders**. Replace before launch.
- Uploads work anonymously; signing in (when Firebase is configured) attaches them to the user's "My reports". The report's random UUID acts as an unlisted share link, so anyone with the link can view, analyze, chat with and export it.
- Chat history is kept in the viewer's browser session only, not in the database.
- Exports include the latest AI analysis when one exists; otherwise they contain the dashboard data and scorecard with a note to run the analysis.
- Without Supabase configured, reports are kept in memory (lost on API restart).
