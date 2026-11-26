# Launch guide: payments, accounts, Claude and Google

This guide follows on from the Vercel-only setup in [DEPLOYMENT.md](DEPLOYMENT.md).

## 1. Card payments with Lemon Squeezy

Lemon Squeezy accepts sellers from Pakistan and most other countries. Customers pay by card (Visa, Mastercard, Amex), PayPal and more. Lemon Squeezy collects VAT and sales tax for you, and pays you out by bank transfer or PayPal.

1. Sign up at lemonsqueezy.com, create a store, and complete **Settings → Store activation** (identity check and payout details).
2. **Products → New product**:
   - "Pro": pricing **Subscription**, $29, every 1 month.
   - "Agency": pricing **Subscription**, $99, every 1 month.
3. In each product, open **Confirmation modal / Redirect**. Set the redirect URL to `https://<your-domain>/billing/success`.
4. Publish the product, click **Share**, and copy the checkout link (it looks like `https://<store>.lemonsqueezy.com/buy/...`).
5. In Vercel, open **Project → Settings → Environment Variables** and add:

| Name                              | Value                                          |
| --------------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_CHECKOUT_URL_PRO`    | the Pro checkout link                          |
| `NEXT_PUBLIC_CHECKOUT_URL_AGENCY` | the Agency checkout link                       |
| `NEXT_PUBLIC_CONTACT_EMAIL`       | optional: used for paid plans with no link yet |

6. Redeploy (**Deployments → … → Redeploy**). These values are built into the page, so a redeploy is needed after every change.

Test first with Lemon Squeezy's **Test mode** (test card `4242 4242 4242 4242`, any future date, any CVC), then switch the store to live.

Other providers work the same way: any hosted checkout link (Paddle, Gumroad, Payoneer, …) can go into these variables.

### Make payments unlock the paid plan (webhook)

1. In Lemon Squeezy, open **Settings → Webhooks → +**.
2. Callback URL: `https://<your-domain>/api/billing/webhook`.
3. Signing secret: type a long random password and keep a copy.
4. Tick the events `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused` and `subscription_unpaused`, then save.
5. In Vercel, add `LEMONSQUEEZY_WEBHOOK_SECRET` with the same secret, and redeploy.

When a signed-in user pays, the checkout carries their account id, and the webhook marks them as Pro or Agency. A product whose name contains "Agency" gives the Agency plan; any other product gives Pro. If a subscription is cancelled, the user keeps the paid plan until the period they paid for ends. To change someone's plan by hand, edit the `plan` column of the `profiles` table in Supabase.

## 2. Accounts and the 3 free audits per day

Visitors must create a free account (name, email and password, or Google) before running an audit. Free accounts get **3 audits per day** (plus 6 AI analyses and 30 AI chat questions). The count resets at midnight UTC, which is 5 AM in Pakistan. When the limit is reached, the user is sent to the pricing page. Pro and Agency users have no daily limit. The limit is checked on the server, so it can't be bypassed from the browser.

You need two free services: **Firebase** for sign-in, and **Supabase** to store plans and usage.

### Firebase (sign-in)

1. Go to console.firebase.google.com → **Add project** (Google Analytics is optional).
2. **Build → Authentication → Get started**. Enable **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains → Add domain**: add your site domain, for example `web-zeta-peach-60.vercel.app` (and your own domain later).
4. Click the gear icon → **Project settings → General → Your apps → Web (`</>`)**. Register the app and copy the values from `firebaseConfig`.

### Supabase (plans and usage)

1. Go to supabase.com → **New project**.
2. Open **SQL Editor → New query**, paste the whole file `supabase/schema.sql` from the repository, and click **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **service_role** secret key.

### Keys to add in Vercel

In **Vercel → Project → Settings → Environment Variables**, add these and then redeploy:

| Name                               | Where to find it                                   |
| ---------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Firebase `firebaseConfig.apiKey`                   |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase `firebaseConfig.authDomain`               |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Firebase `firebaseConfig.projectId`                |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | Firebase `firebaseConfig.appId`                    |
| `SUPABASE_URL`                     | Supabase Project URL                               |
| `SUPABASE_SERVICE_ROLE_KEY`        | Supabase service_role key (secret: never share it) |
| `LEMONSQUEEZY_WEBHOOK_SECRET`      | The webhook signing secret from section 1          |
| `NEXT_PUBLIC_CHECKOUT_URL_PRO`     | Lemon Squeezy Pro checkout link                    |
| `NEXT_PUBLIC_CHECKOUT_URL_AGENCY`  | Lemon Squeezy Agency checkout link                 |
| `ANTHROPIC_API_KEY`                | Claude key from console.anthropic.com (section 3)  |

Without the Firebase keys the site stays open to everyone with no limit. With Firebase but without Supabase, the limit still works but is only remembered for a short time on each server, so always add Supabase for launch.

To change the free allowance, edit `FREE_LIMITS` in `apps/web/lib/server/quota.ts`.

## 3. Claude answers your customers

When `ANTHROPIC_API_KEY` is set, Claude writes every AI analysis and answers the "Ask AI" chat, streaming each reply as it is written.

1. Go to console.anthropic.com and sign up or log in.
2. Open **Settings → Billing** and add credit (pay as you go).
3. Open **Settings → API Keys → Create Key**, give it a name, and copy the key (it starts with `sk-ant-`). You can only see it once.
4. In Vercel, add the environment variable `ANTHROPIC_API_KEY` with that key, then redeploy.
5. Optional: add `ANTHROPIC_MODEL`. The default is `claude-opus-5-5`, the most capable. `claude-sonnet-5-5` costs about half as much, and `claude-haiku-5-5` is far cheaper per answer.
6. Optional: in **Settings → Limits**, set a monthly spend limit.

Rough cost with the default model: an analysis is 3 requests that each send about 5,000 tokens of report data, and each chat question sends the report again (cached after the first question, which makes follow-ups cheaper). The daily free limits from section 2 cap what free users can spend.

If you also keep an OpenAI-compatible key (`AI_API_KEY`), it is used automatically as a backup when Claude is busy or down.

## 4. SEO built into the site

- A page title, description and canonical URL on every public page. Private pages (reports, login, payment success) are marked `noindex`.
- Open Graph and Twitter cards with a generated 1200×630 preview image (`/opengraph-image`), so links look good on Facebook, WhatsApp, LinkedIn and X.
- `/sitemap.xml` and `/robots.txt`. Robots blocks `/api/`, `/reports/`, `/billing/` and `/login`.
- Structured data (JSON-LD) for Organization, WebSite, SoftwareApplication with plan prices, and FAQPage.
- One `h1` per page with an ordered `h2`/`h3` structure, alt text and labels on links and images, and no horizontal scroll on phones.
- Fast pages: the landing page is static, about 164 kB of JavaScript on first load, with self-hosted fonts and no external images.

Set `NEXT_PUBLIC_SITE_URL` to your final domain (for example `https://metaadsanalyzer.com`) so canonical links and the sitemap use it. On Vercel, the production domain is used automatically when this variable is empty.

## 5. Get listed on Google

1. Optional but recommended: buy a domain and add it in **Vercel → Project → Settings → Domains**. A real domain looks more trustworthy and is easier to rank than `*.vercel.app`.
2. Open search.google.com/search-console and click **Add property → URL prefix**. Enter your site URL exactly, for example `https://web-zeta-peach-60.vercel.app/`.
3. Choose **HTML tag**. Copy only the code inside `content="..."`.
4. In Vercel, add the environment variable `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` with that code, then redeploy.
5. Back in Search Console, click **Verify**.
6. Go to **Sitemaps**, enter `sitemap.xml`, and click **Submit**.
7. Go to **URL inspection**, paste your home page URL, and click **Request indexing**.

Google usually shows a new site within a few days to a few weeks. To rank higher over time:

- Get links from other sites (directories such as Product Hunt, marketing forums, your social profiles).
- Add helpful articles, for example "How to read a Facebook Ads report" or "What is a good ROAS".
- Check **Performance** and **Page experience** in Search Console every month.
