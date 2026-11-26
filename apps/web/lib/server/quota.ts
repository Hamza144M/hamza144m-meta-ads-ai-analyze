import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@maa/server";
import type { AuthUser } from "./auth";

/** Daily allowance for free accounts. Paid plans have no daily limit. */
export const FREE_LIMITS = { audits: 3, analyses: 6, chats: 30 } as const;
export type UsageKind = keyof typeof FREE_LIMITS;
export type Plan = "starter" | "pro" | "agency";

const PAID_STATUSES = new Set(["active", "on_trial", "past_due", "cancelled"]);

let client: SupabaseClient | null | undefined;
export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  if (!client) console.warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: usage limits are kept in memory only.");
  return client;
}

const today = () => new Date().toISOString().slice(0, 10); // UTC day

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: Plan;
  plan_status: string | null;
  plan_ends_at: string | null;
  plan_renews_at: string | null;
}

/** A plan counts as paid while the subscription is active (or cancelled but not yet ended). */
export function effectivePlan(p: Pick<ProfileRow, "plan" | "plan_status" | "plan_ends_at"> | null): Plan {
  if (!p || p.plan === "starter") return "starter";
  if (p.plan_status && !PAID_STATUSES.has(p.plan_status)) return "starter";
  if (p.plan_status === "cancelled" && p.plan_ends_at && new Date(p.plan_ends_at) < new Date()) return "starter";
  return p.plan;
}

export async function ensureProfile(user: AuthUser, name?: string | null): Promise<ProfileRow | null> {
  const db = supabase();
  if (!db) return null;
  const { error: insertError } = await db
    .from("profiles")
    .upsert(
      { id: user.uid, email: user.email?.toLowerCase() ?? null, display_name: name || user.name },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (insertError) throw dbError(insertError);
  if (name)
    await db
      .from("profiles")
      .update({ display_name: name.slice(0, 100), updated_at: new Date().toISOString() })
      .eq("id", user.uid);
  const { data, error } = await db
    .from("profiles")
    .select("id,email,display_name,plan,plan_status,plan_ends_at,plan_renews_at")
    .eq("id", user.uid)
    .single();
  if (error) throw dbError(error);
  return data as ProfileRow;
}

function dbError(err: { message: string }): HttpError {
  console.error("Supabase error:", err.message);
  return new HttpError(503, "Our account service is temporarily unavailable. Please try again in a minute.", "db_error");
}

// In-memory fallback (per server instance) when Supabase isn't configured.
const memory = new Map<string, number>();

/**
 * Count one use of `kind` for the user. Throws 402 limit_reached when a free
 * account has used today's allowance. Anonymous use (sign-in not configured) is not counted.
 */
export async function consumeUsage(user: AuthUser | null, kind: UsageKind): Promise<void> {
  if (!user) return;
  const db = supabase();
  const profile = await ensureProfile(user);
  const paid = effectivePlan(profile) !== "starter";
  const limit = paid ? -1 : FREE_LIMITS[kind];

  let count: number;
  if (db) {
    const { data, error } = await db.rpc("consume_usage", { p_user: user.uid, p_day: today(), p_kind: kind, p_limit: limit });
    if (error) throw dbError(error);
    count = data as number;
  } else {
    const key = `${user.uid}:${today()}:${kind}`;
    const used = memory.get(key) ?? 0;
    count = limit >= 0 && used >= limit ? -1 : used + 1;
    if (count > 0) memory.set(key, count);
  }
  if (count === -1) throw new HttpError(402, limitMessage(kind), "limit_reached");
}

function limitMessage(kind: UsageKind): string {
  if (kind === "audits") return `You've used your ${FREE_LIMITS.audits} free audits for today. Upgrade to Pro for unlimited audits.`;
  if (kind === "analyses") return "You've reached today's free AI analysis limit. Upgrade to Pro for unlimited analyses.";
  return "You've reached today's free AI chat limit. Upgrade to Pro for unlimited questions.";
}

export async function getAccount(user: AuthUser, name?: string | null) {
  const profile = await ensureProfile(user, name);
  const plan = effectivePlan(profile);
  let used = { audits: 0, analyses: 0, chats: 0 };
  const db = supabase();
  if (db) {
    const { data } = await db.from("usage_daily").select("audits,analyses,chats").eq("user_id", user.uid).eq("day", today()).maybeSingle();
    if (data) used = data as typeof used;
  } else {
    for (const k of Object.keys(used) as UsageKind[]) used[k] = memory.get(`${user.uid}:${today()}:${k}`) ?? 0;
  }
  return {
    user: { id: user.uid, email: user.email, name: profile?.display_name ?? user.name },
    plan,
    planStatus: profile?.plan_status ?? null,
    renewsAt: profile?.plan_renews_at ?? null,
    endsAt: profile?.plan_ends_at ?? null,
    limits: plan === "starter" ? FREE_LIMITS : null,
    used,
  };
}
