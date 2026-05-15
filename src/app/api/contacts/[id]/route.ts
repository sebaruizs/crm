import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  await crmStore.init();
  const contact = await crmStore.get(params.id);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ contact });
});

export const PATCH = withAuth<{ id: string }>(async (req, { params }) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const contact = await crmStore.patch(params.id, body);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ contact });
});

export const DELETE = withAuth<{ id: string }>(async (req, { params }, user) => {
  await crmStore.init();
  const contact = await crmStore.get(params.id);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  // Permission: admin can delete any contact. Agente can only delete contacts
  // that aren't assigned to someone else (their own or unassigned).
  if (user.role !== "admin") {
    if (contact.assignedAgentId && contact.assignedAgentId !== user.id) {
      return NextResponse.json(
        { error: "No tenés permiso para eliminar este contacto" },
        { status: 403 }
      );
    }
  }

  // Cascading FK constraints handle messages, notes, notifications.
  await prisma.contact.delete({ where: { id: params.id } });

  logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "contact.delete",
    targetType: "contact",
    targetId: params.id,
    metadata: {
      name: contact.name,
      phone: contact.phone,
      status: contact.status,
      messagesCount: contact.messageHistory.length,
    },
    ipAddress: clientIp(req),
  });

  return NextResponse.json({ ok: true });
});
