import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAdmin<{ id: string }>(async (req, { params }, actor) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const stage = await crmStore.updateStage(params.id, body);
  if (!stage) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
  logAudit({
    actorId: actor.id, actorName: actor.name,
    action: "stage.update", targetType: "stage", targetId: params.id,
    metadata: { fields: Object.keys(body) }, ipAddress: clientIp(req),
  });
  return NextResponse.json({ stage });
});

export const DELETE = withAdmin<{ id: string }>(async (req, { params }, actor) => {
  await crmStore.init();
  const result = await crmStore.deleteStage(params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  logAudit({
    actorId: actor.id, actorName: actor.name,
    action: "stage.delete", targetType: "stage", targetId: params.id,
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
});
