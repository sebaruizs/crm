import { NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";
import { withAuth, withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await baileys.init();
  return NextResponse.json({ lines: baileys.listLines() });
});

export const POST = withAdmin(async (req, _ctx, actor) => {
  const body = await req.json().catch(() => ({}));
  const provider = (body?.provider as string) || "baileys";
  const { name, agentId } = body as { name?: string; agentId?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }

  if (provider === "meta") {
    const { phoneNumberId, accessToken, wabaId } = body as {
      phoneNumberId?: string;
      accessToken?: string;
      wabaId?: string;
    };
    if (!phoneNumberId?.trim() || !accessToken?.trim()) {
      return NextResponse.json(
        { error: "phoneNumberId y accessToken requeridos" },
        { status: 400 }
      );
    }
    const result = await baileys.createMetaLine({
      name: name.trim(),
      agentId,
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken.trim(),
      wabaId: wabaId?.trim(),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    logAudit({
      actorId: actor.id,
      actorName: actor.name,
      action: "line.create",
      targetType: "line",
      targetId: result.line.id,
      metadata: { name: result.line.name, provider: "meta", agentId },
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ line: result.line });
  }

  // Default: baileys
  const line = await baileys.createLine(name.trim(), agentId);
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "line.create",
    targetType: "line",
    targetId: line.id,
    metadata: { name: line.name, provider: "baileys", agentId },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ line });
});
