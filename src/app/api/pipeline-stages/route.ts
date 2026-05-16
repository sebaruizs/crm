import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth, withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await crmStore.init();
  return NextResponse.json({ stages: await crmStore.listStages() });
});

export const POST = withAdmin(async (req, _ctx, actor) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const { key, label, color, kind } = body as { key?: string; label?: string; color?: string; kind?: string };
  if (!key?.trim()) return NextResponse.json({ error: "key requerido" }, { status: 400 });
  if (!label?.trim()) return NextResponse.json({ error: "label requerido" }, { status: 400 });
  if (!color) return NextResponse.json({ error: "color requerido" }, { status: 400 });
  if (!["pending", "active", "won", "lost"].includes(kind ?? "")) {
    return NextResponse.json({ error: "kind inválido" }, { status: 400 });
  }
  try {
    const stage = await crmStore.addStage({
      key, label, color,
      kind: kind as "pending" | "active" | "won" | "lost",
    });
    logAudit({
      actorId: actor.id, actorName: actor.name,
      action: "stage.create", targetType: "stage", targetId: stage.id,
      metadata: { key: stage.key, label: stage.label, kind: stage.kind },
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ stage });
  } catch {
    return NextResponse.json({ error: "key duplicada o inválida" }, { status: 400 });
  }
});
