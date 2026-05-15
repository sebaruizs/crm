import { NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";
import { withAuth, withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  await baileys.init();
  const line = baileys.getLine(params.id);
  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
  return NextResponse.json({ line });
});

export const DELETE = withAdmin<{ id: string }>(async (req, { params }, actor) => {
  await baileys.remove(params.id);
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "line.delete",
    targetType: "line",
    targetId: params.id,
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
});
