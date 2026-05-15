import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth, withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await crmStore.init();
  return NextResponse.json({ settings: await crmStore.getSettings() });
});

export const PATCH = withAdmin(async (req, _ctx, actor) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const next = await crmStore.updateSettings(body);
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "settings.update",
    metadata: { fields: Object.keys(body) },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ settings: next });
});
