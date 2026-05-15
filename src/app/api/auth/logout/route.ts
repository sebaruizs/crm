import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  destroySessionByToken,
  getCurrentUser,
  getSessionTokenFromCookie,
} from "@/server/auth";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const token = await getSessionTokenFromCookie();
  if (token) await destroySessionByToken(token);
  await clearSessionCookie();
  if (user) {
    logAudit({
      actorId: user.id,
      actorName: user.name,
      action: "logout",
      ipAddress: clientIp(req),
    });
  }
  return NextResponse.json({ ok: true });
}
