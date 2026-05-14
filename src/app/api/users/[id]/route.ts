import { NextRequest, NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  if (body.password && body.password.length < 6) {
    return NextResponse.json({ error: "password mínimo 6 caracteres" }, { status: 400 });
  }
  const user = usersStore.update(params.id, body);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await usersStore.init();
  const ok = usersStore.delete(params.id);
  if (!ok) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
