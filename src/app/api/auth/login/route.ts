import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";
import { checkLoginRateLimit, createSession, setSessionCookie } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  await usersStore.init();

  const ip = clientIp(req);
  const rl = checkLoginRateLimit(ip);
  if (!rl.ok) {
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
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
}
