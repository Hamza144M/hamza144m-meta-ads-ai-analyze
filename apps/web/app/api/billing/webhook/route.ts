import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/server/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy webhook: keeps each user's plan in sync with their subscription.
 * In Lemon Squeezy → Settings → Webhooks, point to https://<your-domain>/api/billing/webhook,
 * pick the subscription_* events, and put the same signing secret in LEMONSQUEEZY_WEBHOOK_SECRET.
 */
interface SubscriptionEvent {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: {
    type?: string;
    id?: string;
    attributes?: {
      status?: string;
      customer_id?: number | string;
      user_email?: string;
      product_name?: string;
      variant_name?: string;
      renews_at?: string | null;
      ends_at?: string | null;
    };
  };
}

function validSignature(body: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  const db = supabase();
  if (!secret || !db) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });

  const body = await req.text();
  if (!validSignature(body, req.headers.get("x-signature") ?? "", secret))
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });

  let event: SubscriptionEvent;
  try {
    event = JSON.parse(body) as SubscriptionEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const name = event.meta?.event_name ?? "";
  const attrs = event.data?.attributes;
  if (!name.startsWith("subscription_") || event.data?.type !== "subscriptions" || !attrs) return NextResponse.json({ ignored: true });

  const productText = `${attrs.product_name ?? ""} ${attrs.variant_name ?? ""}`.toLowerCase();
  const update = {
    plan: productText.includes("agency") ? "agency" : "pro",
    plan_status: attrs.status ?? null,
    plan_renews_at: attrs.renews_at ?? null,
    plan_ends_at: attrs.ends_at ?? null,
    billing_customer_id: attrs.customer_id != null ? String(attrs.customer_id) : null,
    billing_subscription_id: event.data?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  // The pricing page passes the signed-in user's id as custom data; fall back to the email.
  const userId = event.meta?.custom_data?.user_id;
  const query = userId
    ? db.from("profiles").update(update).eq("id", userId)
    : attrs.user_email
      ? db.from("profiles").update(update).eq("email", attrs.user_email.toLowerCase())
      : null;
  if (!query) return NextResponse.json({ ignored: true, reason: "no user" });
  const { data, error } = await query.select("id");
  if (error) {
    console.error("Webhook update failed:", error.message);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
  if (!data?.length) console.warn(`Webhook ${name}: no matching user (${userId ?? attrs.user_email}).`);
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
