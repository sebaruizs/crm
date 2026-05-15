import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usersStore } from "@/server/store/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Borra toda la data operativa para arrancar desde cero.
 *
 * Borra: contactos, mensajes, notas, notificaciones.
 * Mantiene: usuarios, plantillas, settings, líneas de WhatsApp.
 *
 * Requiere que el caller envíe el userId del admin que está disparando
 * la acción + la confirmación literal "BORRAR-DATOS".
 */
export async function POST(req: NextRequest) {
  await usersStore.init();
  const body = await req.json().catch(() => ({}));
  const { userId, confirm } = body as { userId?: string; confirm?: string };

  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  if (confirm !== "BORRAR-DATOS") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }

  const user = await usersStore.get(userId);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  // Cascading deletes via Prisma schema (FK ON DELETE CASCADE) wipe related
  // messages, notes, and notifications when contacts go.
  const [contacts, notifications] = await Promise.all([
    prisma.contact.deleteMany({}),
    prisma.notification.deleteMany({}),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: {
      contacts: contacts.count,
      notifications: notifications.count,
    },
  });
}
