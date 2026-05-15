import { NextResponse } from "next/server";
import { clearSessionCookie, destroySessionByToken, getSessionTokenFromCookie } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const token = await getSessionTokenFromCookie();
  if (token) await destroySessionByToken(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
