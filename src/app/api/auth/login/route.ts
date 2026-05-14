import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  const { email, password } = body as { email?: string; password?: string };
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }
  const user = await usersStore.authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }
  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
}
