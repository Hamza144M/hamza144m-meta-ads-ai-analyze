import { NextResponse } from "next/server";
import { authRequired, getUser } from "@/lib/server/auth";
import { CREEM_PRODUCTS, creemApiBase, creemKey, type PaidPlan } from "@/lib/server/creem";
import { errorResponse, handleError } from "@/lib/server/route";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts a Creem checkout for the signed-in user and returns its URL.
 * The user's id goes into the checkout metadata, so the webhook can unlock their plan.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { plan?: string };
    const plan = body.plan === "agency" ? "agency" : body.plan === "pro" ? "pro" : null;
    if (!plan) return errorResponse(400, "Unknown plan.", "bad_plan");

    const key = creemKey();
    const productId = CREEM_PRODUCTS[plan as PaidPlan];
    if (!key || !productId) return errorResponse(503, "Payments are not set up yet. Please try again later.", "billing_off");

    const user = await getUser(req);
    if (authRequired && !user) return errorResponse(401, "Please log in before upgrading.", "auth_required");

    const origin = SITE_URL.startsWith("http://localhost") ? new URL(req.url).origin : SITE_URL;
    const payload: Record<string, unknown> = {
      product_id: productId,
      success_url: `${origin}/billing/success`,
      metadata: { plan, ...(user ? { user_id: user.uid } : {}) },
    };
    if (user) payload.request_id = `${user.uid}:${plan}:${Date.now()}`;
    if (user?.email) payload.customer = { email: user.email, ...(user.name ? { name: user.name } : {}) };

    const res = await fetch(`${creemApiBase(key)}/checkouts`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { checkout_url?: string; message?: unknown };
    if (!res.ok || !data.checkout_url) {
      console.error("Creem checkout failed:", res.status, JSON.stringify(data).slice(0, 500));
      return errorResponse(502, "We couldn't open the payment page. Please try again in a minute.", "checkout_failed");
    }
    return NextResponse.json({ url: data.checkout_url });
  } catch (err) {
    return handleError(err);
  }
}
