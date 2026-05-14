import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await usersStore.init();
  return NextResponse.json({ users: usersStore.listPublic() });
}

export async function POST(req: NextRequest) {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  const { name, email, color, role, password, avatarInitials } = body as Record<string, string>;
  if (!name?.trim()) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  if (!email?.trim() || !/.+@.+\..+/.test(email)) return NextResponse.json({ error: "email inválido" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "password mínimo 6 caracteres" }, { status: 400 });
  if (role !== "admin" && role !== "agente") return NextResponse.json({ error: "rol inválido" }, { status: 400 });
  if (!color) return NextResponse.json({ error: "color requerido" }, { status: 400 });
  const user = usersStore.create({ name, email, color, role, password, avatarInitials });
  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
}
