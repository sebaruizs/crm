import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAdmin(async (req, _ctx, actor) => {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "BORRAR-DATOS") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }
  const [contacts, notifications] = await Promise.all([
    prisma.contact.deleteMany({}),
    prisma.notification.deleteMany({}),
  ]);
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "data.wipe",
    metadata: { contactsDeleted: contacts.count, notificationsDeleted: notifications.count },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({
    ok: true,
    deleted: { contacts: contacts.count, notifications: notifications.count },
  });
});
