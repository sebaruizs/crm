import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "BORRAR-DATOS") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }
  const [contacts, notifications] = await Promise.all([
    prisma.contact.deleteMany({}),
    prisma.notification.deleteMany({}),
  ]);
  return NextResponse.json({
    ok: true,
    deleted: { contacts: contacts.count, notifications: notifications.count },
  });
});
