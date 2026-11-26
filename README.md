# Meta Ads AI Analyzer

Upload a Meta Ads Manager export (CSV or XLSX) and get an instant performance dashboard, a consultant-grade AI audit, a 1–100 KPI scorecard and a 30-day action plan. No Meta login required.

## Features

- **Landing page**: hero, features, how it works, AI analysis preview, pricing, testimonials, FAQ, footer; light and dark mode; mobile-first
- **Upload**: drag-and-drop CSV / XLSX from Ads Manager, no Meta login; automatic column mapping; bundled sample report
- **Any currency**: auto-detected from headers like "Amount spent (PKR)", or picked from every ISO currency (PKR, INR, USD, AED, …) on upload or later from the dashboard
- **Dashboard**: 20 KPIs (spend, campaigns, ad sets, ads, impressions, reach, CPM, CPC, CTR, frequency, clicks, link clicks, LP views, leads, messages, purchases, ROAS, cost per result, revenue, conversion rate), trend chart, campaign comparison, spend share, conversion funnel, age / gender / location / placement breakdowns, sortable table
- **AI analysis**: executive summary; campaign, creative, audience, funnel and budget analysis; new hooks, headlines, primary text, CTAs and angles
- **KPI scorecard**: 11 metrics scored 1–100 with green / yellow / red status
- **Action plan**: top 10 problems and improvements, quick wins, scaling plan, creative and audience tests, budget strategy, 30-day roadmap
- **Ask AI**: chat that answers from the uploaded report (streamed)
- **Exports**: PDF report, Excel summary, Word report, print version, shareable link
- **Accounts** (optional): Firebase email / Google sign-in, "My reports", delete; Supabase persistence

## Stack

- **apps/web**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Recharts 3, next-themes, lucide-react, Firebase Auth
- **apps/api**: Node.js + Express 5, Multer, csv-parse, ExcelJS, PDFKit, docx, Zod, Helmet, rate limiting, Firebase Admin, Supabase JS
- **packages/core**: shared types, Meta column mapping, metric calculations, KPI scoring (used by API and web)
- **supabase/schema.sql**: database schema (used when `SUPABASE_URL` is set; otherwise reports are kept in memory)
- **AI**: any OpenAI-compatible Chat Completions endpoint, configured with `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`

```
meta-ads-ai-analyzer/
├── apps/
│   ├── api/                 Express API
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── config.ts, app.ts, index.ts
│   │       ├── routes/      reports, analysis, chat, export
│   │       ├── middleware/  auth (Firebase ID tokens)
│   │       └── lib/
│   │           ├── parseFile.ts   CSV / XLSX → table
│   │           ├── store/         memory + Supabase
│   │           ├── ai/            client, prompts, context, schema, analyze, chat, rule-based fallback
│   │           └── export/        content blocks → pdf, docx, xlsx
│   └── web/                 Next.js app
│       ├── app/             /, /upload, /login, /reports, /reports/[id], /reports/[id]/print, /privacy, /terms
│       ├── components/      landing/, upload/, dashboard/, analysis/, chat/, auth/, ui/
│       ├── lib/             api client, firebase, metric formatting
│       └── public/samples/meta-ads-sample.csv
├── packages/core/           analyzeTable(), column aliases, deriveMetrics(), computeScorecard(), types, tests
├── supabase/schema.sql
├── docs/                    DEPLOYMENT.md, ASSUMPTIONS.md
└── scripts/                 dev runner, sample data generator
```

## Run locally

Requires Node.js 20+ (22 recommended).

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run dev          # API on :4000, web on :3000
```

Open http://localhost:3000, then click **Try a sample report** or drop your own export on `/upload`.

Other scripts:

```bash
npm test             # core parser and metric tests
npm run typecheck    # all workspaces
npm run build        # production build of core, api and web
npm run format       # prettier
node scripts/generate-sample.mjs   # regenerate the fictional sample export
```

## API

| Method | Path                              | Description                                                                           |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/api/health`                     | Storage, AI and auth configuration status                                             |
| POST   | `/api/reports`                    | `multipart/form-data` with `file` (.csv/.xlsx, ≤ 15 MB). Returns `{ id, report }`     |
| GET    | `/api/reports/:id`                | Fetch a report (the random UUID is the share link)                                    |
| GET    | `/api/reports`                    | Signed-in user's reports                                                              |
| DELETE | `/api/reports/:id`                | Delete own report                                                                     |
| GET    | `/api/reports/:id/analysis`       | Latest analysis (or `null`) plus the deterministic scorecard                          |
| POST   | `/api/reports/:id/analysis`       | Generate or regenerate the AI analysis (20 per IP per hour)                           |
| POST   | `/api/reports/:id/chat`           | `{ messages: [{ role, content }] }`. Streams a plain-text answer grounded in the data |
| GET    | `/api/reports/:id/export/:format` | `pdf`, `xlsx` or `docx` download                                                      |

Send `Authorization: Bearer <Firebase ID token>` to associate uploads with a user. Errors are `{ "error": { "code", "message" } }`.

## AI analysis

`POST /api/reports/:id/analysis` builds a compact JSON view of the report (totals, scorecard, funnel, top 25 campaigns, 30 ad sets, 40 ads, weekly trend, breakdowns, and first-half vs second-half trends per entity) and sends three requests in parallel to the configured model:

1. Executive summary, campaign analysis, funnel bottlenecks, budget analysis, one note per score
2. Creative analysis (fatigue, hooks, thumbnails, video, CTR, engagement) with new hooks, headlines, primary text, CTAs and angles; audience analysis (interests, broad, lookalikes, retargeting, age, gender, locations)
3. Top 10 problems, top 10 improvements, quick wins, scaling plan, creative and audience tests, budget strategy, 30-day roadmap

Prompt templates are in `apps/api/src/lib/ai/prompts.ts`. Model replies are validated with lenient Zod schemas (`schema.ts`), so a partial answer still renders. The KPI scorecard is calculated in code (`packages/core/src/scoring.ts`), not by the model, so scores are consistent and explainable.

Any OpenAI-compatible provider works, for example:

| Provider       | `AI_BASE_URL`                    | `AI_MODEL` example                          |
| -------------- | -------------------------------- | ------------------------------------------- |
| OpenAI         | `https://api.openai.com/v1`      | `gpt-4o-mini`                               |
| OpenRouter     | `https://openrouter.ai/api/v1`   | any model id it lists                       |
| Groq           | `https://api.groq.com/openai/v1` | any model id it lists                       |
| Ollama (local) | `http://localhost:11434/v1`      | `llama3.1` (set any non-empty `AI_API_KEY`) |

Without `AI_API_KEY`, the API returns a **rule-based preview** built from the same data, clearly labeled in the UI, so the app is usable for local development and demos.

## Getting the best report from Ads Manager

1. Pick the level (Campaigns, Ad sets or Ads) and the date range.
2. Columns: _Performance and clicks_, or a custom set including Delivery, Results, Cost per result, Amount spent, Impressions, Reach, Frequency, Link clicks, Landing page views, Leads, Messaging conversations started, Adds to cart, Checkouts initiated, Purchases, Purchases conversion value.
3. Optional breakdowns: Day, Age, Gender, Region, Placement.
4. Export → Export table data → .csv or .xlsx.

See [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) for how columns are matched and calculated.

## Deploying

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Supabase, Firebase, AI provider, API (Docker) and Vercel setup, plus a launch checklist.

## Security notes

- Files are parsed in memory and never written to disk; only aggregated report data is stored.
- Upload size and type are validated client- and server-side; legacy `.xls` is rejected.
- Helmet headers, CORS allow-list (`CORS_ORIGIN`), and per-IP rate limiting are on by default.
- The Supabase service-role key, Firebase service account and AI key live only in the API's environment. Nothing secret is sent to the browser.
- Reports are unlisted: anyone with the report link can view it (that is how sharing works). Only the owner can list or delete it.
- AI prompts only contain aggregated metrics and names from the export, never the raw file.
