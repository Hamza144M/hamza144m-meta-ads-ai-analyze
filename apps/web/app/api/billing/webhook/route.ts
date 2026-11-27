import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/server/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Payment webhook: keeps each user's plan in sync with their subscription.
 *
 * Creem (recommended): Developers → Webhooks, URL https://<your-domain>/api/billing/webhook,
 * secret in CREEM_WEBHOOK_SECRET. Signed with the "creem-signature" header.
 * Lemon Squeezy (older stores): Settings → Webhooks, subscription_* events,
 * secret in LEMONSQUEEZY_WEBHOOK_SECRET. Signed with the "x-signature" header.
 */

interface PlanUpdate {
  plan: "pro" | "agency";
  plan_status: string | null;
  plan_renews_at: string | null;
  plan_ends_at: string | null;
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
}

interface Target {
  userId?: string;
  email?: string;
}

function validSignature(body: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  const given = Buffer.from(signature.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const pickPlan = (hint: unknown, productText: string): "pro" | "agency" =>
  hint === "agency" || hint === "pro" ? hint : productText.toLowerCase().includes("agency") ? "agency" : "pro";

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const idOf = (v: unknown): string | null =>
  typeof v === "string" ? v : v && typeof v === "object" && "id" in v ? String((v as { id: unknown }).id) : null;

// ---------- Creem ----------

type Obj = Record<string, unknown>;

/** Creem subscription status → the status names used by effectivePlan() in quota.ts. */
function creemStatus(status: string | undefined): string | null {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "on_trial";
    case "past_due":
      return "past_due";
    case "scheduled_cancel":
      return "cancelled"; // still paid until the period ends
    case "canceled":
    case "expired":
      return "expired";
    default:
      return status ?? null;
  }
}

function parseCreem(event: Obj): { update: PlanUpdate; target: Target } | null {
  const type = str(event.eventType) ?? "";
  const obj = (event.object ?? {}) as Obj;
  let sub: Obj | undefined;
  let metadata: Obj = {};
  let productName = "";
  let customer: Obj = {};

  if (type === "checkout.completed") {
    sub = obj.subscription as Obj | undefined;
    if (!sub || typeof sub !== "object") return null; // one-off purchase: nothing to unlock
    metadata = { ...((sub.metadata as Obj) ?? {}), ...((obj.metadata as Obj) ?? {}) };
    productName = str((obj.product as Obj)?.name) ?? "";
    customer = (obj.customer as Obj) ?? {};
    if (!sub.status) sub = { ...sub, status: "active" };
  } else if (type.startsWith("subscription.")) {
    sub = obj;
    metadata = (obj.metadata as Obj) ?? {};
    productName = str((obj.product as Obj)?.name) ?? "";
    customer = (obj.customer as Obj) ?? {};
  } else return null;

  const status = creemStatus(str(sub.status));
  const periodEnd = str(sub.current_period_end_date) ?? null;
  return {
    update: {
      plan: pickPlan(metadata.plan, productName),
      plan_status: status,
      plan_renews_at: status === "active" || status === "on_trial" ? periodEnd : null,
      plan_ends_at: status === "cancelled" ? periodEnd : status === "expired" ? (periodEnd ?? new Date().toISOString()) : null,
      billing_customer_id: idOf(sub.customer) ?? idOf(customer),
      billing_subscription_id: str(sub.id) ?? null,
    },
    target: { userId: str(metadata.user_id), email: str(customer.email) },
  };
}

// ---------- Lemon Squeezy ----------

function parseLemon(event: Obj): { update: PlanUpdate; target: Target } | null {
  const meta = (event.meta ?? {}) as Obj;
  const data = (event.data ?? {}) as Obj;
  const attrs = data.attributes as Obj | undefined;
  const name = str(meta.event_name) ?? "";
  if (!name.startsWith("subscription_") || data.type !== "subscriptions" || !attrs) return null;
  const custom = (meta.custom_data ?? {}) as Obj;
  return {
    update: {
      plan: pickPlan(custom.plan, `${str(attrs.product_name) ?? ""} ${str(attrs.variant_name) ?? ""}`),
      plan_status: str(attrs.status) ?? null,
      plan_renews_at: str(attrs.renews_at) ?? null,
      plan_ends_at: str(attrs.ends_at) ?? null,
      billing_customer_id: attrs.customer_id != null ? String(attrs.customer_id) : null,
      billing_subscription_id: str(data.id) ?? null,
    },
    target: { userId: str(custom.user_id), email: str(attrs.user_email) },
  };
}

export async function POST(req: Request) {
  const db = supabase();
  const creemSig = req.headers.get("creem-signature");
  const lemonSig = req.headers.get("x-signature");
  const secret = (creemSig != null ? process.env.CREEM_WEBHOOK_SECRET : process.env.LEMONSQUEEZY_WEBHOOK_SECRET)?.trim();
  if (!secret || !db) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });

  const body = await req.text();
  if (!validSignature(body, creemSig ?? lemonSig ?? "", secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let event: Obj;
  try {
    event = JSON.parse(body) as Obj;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = creemSig != null ? parseCreem(event) : parseLemon(event);
  if (!parsed) return NextResponse.json({ ignored: true });
  const { update, target } = parsed;
  const row = { ...update, updated_at: new Date().toISOString() };

  // The checkout carries the signed-in user's id; fall back to the email.
  const query = target.userId
    ? db.from("profiles").update(row).eq("id", target.userId)
    : target.email
      ? db.from("profiles").update(row).eq("email", target.email.toLowerCase())
      : null;
  if (!query) return NextResponse.json({ ignored: true, reason: "no user" });
  const { data, error } = await query.select("id");
  if (error) {
    console.error("Webhook update failed:", error.message);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
  if (!data?.length) console.warn(`Billing webhook: no matching user (${target.userId ?? target.email}).`);
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
