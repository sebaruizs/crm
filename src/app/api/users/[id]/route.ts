import { NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";
import { withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAdmin<{ id: string }>(async (req, { params }) => {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  if (body.password && body.password.length < 6) {
    return NextResponse.json({ error: "password mínimo 6 caracteres" }, { status: 400 });
  }
  const user = await usersStore.update(params.id, body);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
});

export const DELETE = withAdmin<{ id: string }>(async (_req, { params }) => {
  await usersStore.init();
  const ok = await usersStore.delete(params.id);
  if (!ok) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
