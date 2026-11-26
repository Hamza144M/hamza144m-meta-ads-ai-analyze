# Deployment guide

## Quick start: Vercel only

The website works on its own, with no separate API server:

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `apps/web` and keep the Next.js framework preset.
3. Leave `NEXT_PUBLIC_API_URL` **unset** (delete it if you added it earlier).
4. Optional: add `ANTHROPIC_API_KEY` so Claude writes the analysis and answers the chat (or `AI_API_KEY`, with `AI_BASE_URL` and `AI_MODEL`, for an OpenAI-compatible provider). Without a key you get the built-in rule-based analysis.
5. Deploy.

In this mode, uploads are parsed by the web app's own `/api/local/*` routes, nothing is stored on the server, and each visitor's reports are kept in their browser (latest 20). Limits: files up to 4 MB (Vercel's request size limit), no shareable links, and reports don't follow a user to another device. AI analysis must finish within the function time limit (60 seconds is requested; the Hobby plan allows up to 60).

To require sign-up and give free users 3 audits per day (with paid plans unlocked by Lemon Squeezy), add the Firebase, Supabase and Lemon Squeezy keys listed in [LAUNCH.md](LAUNCH.md).

For saved reports and share links, deploy the API as well (below) and set `NEXT_PUBLIC_API_URL`.

## Full setup: web + API

The app has two deployable parts:

| Part       | What it is                         | Suggested host                              |
| ---------- | ---------------------------------- | ------------------------------------------- |
| `apps/web` | Next.js front end                  | Vercel (or any Node host)                   |
| `apps/api` | Express API (parsing, AI, exports) | Render, Railway, Fly.io, or any Docker host |

Supabase (database) and Firebase (authentication) are optional. Without them the app works anonymously and keeps reports in memory, which is fine for a demo but not for production.

## 1. Supabase (database)

1. Create a project at supabase.com.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it. It creates `profiles`, `reports` and `analyses` with Row Level Security on and no public policies, so only the API (service role) can read or write.
3. In **Project Settings → API**, copy the **Project URL** and the **service_role** key. These go into the API's environment only. Never put the service-role key in the web app.

## 2. Firebase (authentication)

1. Create a project at console.firebase.google.com.
2. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains**: add your web domain (e.g. `app.example.com` and your `*.vercel.app` preview domain).
4. **Project settings → General → Your apps → Web app**: copy `apiKey`, `authDomain`, `projectId`, `appId` for the web env vars. These are public identifiers, not secrets.
5. **Project settings → Service accounts → Generate new private key**: download the JSON. Put it into the API's `FIREBASE_SERVICE_ACCOUNT` env var, either as one-line JSON or base64 (`base64 -w0 service-account.json`).

## 3. AI provider

Recommended: Claude. Create a key at console.anthropic.com and set:

```
ANTHROPIC_API_KEY=<your key>
ANTHROPIC_MODEL=claude-opus-5-5   # optional; claude-sonnet-5-5 or claude-haiku-5-5 cost less
```

Or any OpenAI-compatible provider (also used as a backup when both are set):

```
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=<your key>
AI_MODEL=gpt-4o-mini
```

Each analysis makes 3 parallel requests of roughly 5k input tokens and up to ~4.5k output tokens each; each chat message sends roughly 5k tokens of report context. Set a monthly spend limit with your provider.

## 4. Deploy the API

### Docker (Render, Railway, Fly.io, ECS, …)

From the repository root:

```bash
docker build -f apps/api/Dockerfile -t meta-ads-api .
docker run -p 4000:4000 --env-file apps/api/.env meta-ads-api
```

On Render, the quickest path is **New → Blueprint** with this repo: `render.yaml` sets everything up and asks for the secret values. Or manually: New → Web Service → your repo → Runtime **Docker**, Dockerfile path `apps/api/Dockerfile`, Docker context `.`. Health check path `/api/health`.

### Without Docker

```bash
npm ci
npm run build -w @maa/api
node apps/api/dist/index.js
```

### API environment variables

| Variable                                    | Required        | Notes                                                                                       |
| ------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------- |
| `PORT`                                      | no              | Defaults to 4000                                                                            |
| `NODE_ENV`                                  | yes in prod     | `production`                                                                                |
| `CORS_ORIGIN`                               | yes             | Comma-separated web origins, e.g. `https://app.example.com,https://your-app.vercel.app`     |
| `MAX_UPLOAD_MB`                             | no              | Default 15                                                                                  |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | for persistence | From step 1                                                                                 |
| `FIREBASE_SERVICE_ACCOUNT`                  | for accounts    | From step 2                                                                                 |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`      | for AI          | From step 3 (Claude, recommended)                                                           |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`     | optional        | OpenAI-compatible alternative or backup. With no AI key the app uses the rule-based preview |

Check `GET https://<api-host>/api/health`. It reports which storage, AI model and auth mode are active.

Note: Render's free plan sleeps after inactivity (first request takes ~30-60 s) and restarts wipe in-memory reports. Set the Supabase variables to keep reports.

## 5. Deploy the web app (Vercel or Netlify)

On **Netlify**: base directory `apps/web`, build command `npm run build`, and add the same environment variables below under Site configuration → Environment variables. After changing `NEXT_PUBLIC_API_URL`, run **Clear cache and deploy**, because it is baked in at build time.

On **Vercel**:

1. Import the repository in Vercel.
2. **Root Directory**: `apps/web`. Leave "Include source files outside of the Root Directory" on (the app uses `packages/core` and `packages/server`).
3. Framework preset: Next.js. The default install and build commands work: `prebuild` compiles `packages/core` and `packages/server` first.
4. Environment variables:

| Variable                                                                                                                             | Value                                               |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                                                                                                                | `https://<api-host>`, or unset for Vercel-only mode |
| `NEXT_PUBLIC_SITE_URL`                                                                                                               | `https://<your web domain>`                         |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` | From step 2 (optional)                              |

5. Deploy, then add the Vercel domain to the API's `CORS_ORIGIN` and to Firebase's authorized domains.

## 6. Launch checklist

- [ ] `GET /api/health` shows `storage: "supabase"`, your model, and `auth: true`
- [ ] Upload the sample report, run the AI analysis, ask a chat question, download PDF / Excel / Word
- [ ] Sign up, upload, and check the report appears under **My reports**
- [ ] Replace placeholder pricing, testimonials, Privacy and Terms pages
- [ ] Set a spend limit with the AI provider and monitor API logs for `AI provider error`
- [ ] Put the API behind HTTPS (all suggested hosts do this by default)

## Scaling notes

- Uploads are parsed in memory; 15 MB covers ~100k rows. For larger files, raise `MAX_UPLOAD_MB` and give the API more memory.
- Rate limits are per IP in process memory. With several API instances, switch `express-rate-limit` to a shared store (e.g. Redis).
- The in-memory report store is single-instance only. Use Supabase in production.
