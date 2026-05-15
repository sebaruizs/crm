import { NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";
import { withAuth, withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await usersStore.init();
  return NextResponse.json({ users: await usersStore.listPublic() });
});

export const POST = withAdmin(async (req) => {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  const { name, email, color, role, password, avatarInitials } = body as Record<string, string>;
  if (!name?.trim()) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  if (!email?.trim() || !/.+@.+\..+/.test(email)) return NextResponse.json({ error: "email inválido" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "password mínimo 6 caracteres" }, { status: 400 });
  if (role !== "admin" && role !== "agente") return NextResponse.json({ error: "rol inválido" }, { status: 400 });
  if (!color) return NextResponse.json({ error: "color requerido" }, { status: 400 });
  const user = await usersStore.create({ name, email, color, role, password, avatarInitials });
  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
});
