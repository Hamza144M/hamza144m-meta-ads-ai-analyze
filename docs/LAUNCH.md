# Launch guide: card payments and Google

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

**Not included yet:** the app does not lock features by plan. Anyone can use every feature for free. Enforcing plans needs user accounts (Firebase), a database (Supabase) and a webhook from the payment provider that marks a user as paid.

## 2. SEO built into the site

- A page title, description and canonical URL on every public page. Private pages (reports, login, payment success) are marked `noindex`.
- Open Graph and Twitter cards with a generated 1200×630 preview image (`/opengraph-image`), so links look good on Facebook, WhatsApp, LinkedIn and X.
- `/sitemap.xml` and `/robots.txt`. Robots blocks `/api/`, `/reports/`, `/billing/` and `/login`.
- Structured data (JSON-LD) for Organization, WebSite, SoftwareApplication with plan prices, and FAQPage.
- One `h1` per page with an ordered `h2`/`h3` structure, alt text and labels on links and images, and no horizontal scroll on phones.
- Fast pages: the landing page is static, about 164 kB of JavaScript on first load, with self-hosted fonts and no external images.

Set `NEXT_PUBLIC_SITE_URL` to your final domain (for example `https://metaadsanalyzer.com`) so canonical links and the sitemap use it. On Vercel, the production domain is used automatically when this variable is empty.

## 3. Get listed on Google

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
