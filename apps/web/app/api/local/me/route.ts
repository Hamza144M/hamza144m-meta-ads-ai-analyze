import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "@maa/server";
import { getUser } from "@/lib/server/auth";
import { getAccount } from "@/lib/server/quota";
import { handleError, parseBody, readJson } from "@/lib/server/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function signedIn(req: Request) {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "Please log in.", "unauthorized");
  return user;
}

/** The signed-in user's plan and today's usage. */
export async function GET(req: Request) {
  try {
    return NextResponse.json(await getAccount(await signedIn(req)));
  } catch (err) {
    return handleError(err);
  }
}

/** Create or update the profile after sign-up (stores the name the user entered). */
export async function POST(req: Request) {
  try {
    const user = await signedIn(req);
    const { name } = parseBody(z.object({ name: z.string().trim().max(100).optional() }), await readJson(req, 10_000));
    return NextResponse.json(await getAccount(user, name || null));
  } catch (err) {
    return handleError(err);
  }
}
