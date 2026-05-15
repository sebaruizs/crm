import { NextResponse } from "next/server";
import { usersStore } from "@/server/store/users-store";
import { withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAdmin<{ id: string }>(async (req, { params }, actor) => {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  if (body.password && body.password.length < 6) {
    return NextResponse.json({ error: "password mínimo 6 caracteres" }, { status: 400 });
  }
  const user = await usersStore.update(params.id, body);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  const changedKeys = Object.keys(body).filter((k) => k !== "password");
  if (body.password) changedKeys.push("password");
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "user.update",
    targetType: "user",
    targetId: user.id,
    metadata: { fields: changedKeys },
    ipAddress: clientIp(req),
  });
  const { password: _p, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
});

export const DELETE = withAdmin<{ id: string }>(async (req, { params }, actor) => {
  await usersStore.init();
  const target = await usersStore.get(params.id);
  const ok = await usersStore.delete(params.id);
  if (!ok) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "user.delete",
    targetType: "user",
    targetId: params.id,
    metadata: { email: target?.email, role: target?.role },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
});
