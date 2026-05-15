import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";
import { checkLoginRateLimit, createSession, setSessionCookie } from "@/server/auth";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await usersStore.init();
  const ip = clientIp(req);

  const rl = checkLoginRateLimit(ip);
  if (!rl.ok) {
    logAudit({ action: "login.rate_limited", ipAddress: ip });
    return NextResponse.json(
      { error: `Demasiados intentos. Probá de nuevo en ${rl.retryAfterSec ?? 60}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  const user = await usersStore.authenticate(email, password);
  if (!user) {
    logAudit({
      action: "login.failure",
      ipAddress: ip,
      metadata: { email: email.toLowerCase() },
    });
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "login.success",
    ipAddress: ip,
  });

  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
}
