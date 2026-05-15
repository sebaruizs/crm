import path from "node:path";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/server/api-helpers";
import { clientIp, logAudit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hard reset — leaves only the current admin and a clean settings row.
 * Wipes: contacts (+messages/notes/notifs), templates, tags, custom field
 * defs, lines (Baileys creds on disk too), audit log of others, settings
 * reset to defaults. Other users are removed. Sessions cleared.
 *
 * Requires confirmation literal "RESET-COMPLETO".
 */
export const POST = withAdmin(async (req, _ctx, actor) => {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "RESET-COMPLETO") {
    return NextResponse.json({ error: "Confirmación inválida" }, { status: 400 });
  }

  // Capture counts for audit/return before deleting
  const [contactsCount, templatesCount, tagsCount, fieldsCount, linesCount, otherUsersCount] = await Promise.all([
    prisma.contact.count(),
    prisma.template.count(),
    prisma.tag.count(),
    prisma.customFieldDef.count(),
    prisma.line.count(),
    prisma.user.count({ where: { id: { not: actor.id } } }),
  ]);

  // Delete in order respecting FK constraints
  await prisma.notification.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.template.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.customFieldDef.deleteMany({});

  // Lines: also remove the Baileys session files on disk
  const lines = await prisma.line.findMany();
  for (const line of lines) {
    if (line.provider === "baileys") {
      const dir = path.join(process.cwd(), "baileys-sessions", line.id);
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
  await prisma.line.deleteMany({});

  // Remove other users (keep current admin so they don't get locked out)
  await prisma.session.deleteMany({ where: { userId: { not: actor.id } } });
  await prisma.user.deleteMany({ where: { id: { not: actor.id } } });

  // Reset settings to defaults
  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      welcomeEnabled: false,
      welcomeTemplateId: null,
      inactivityHours: 4,
      autoAssignEnabled: false,
      autoAssignStrategy: "least_busy",
      autoAssignRoles: JSON.stringify(["agente"]),
      chatbotEnabled: false,
      chatbotQuestions: "[]",
      chatbotClosing: "¡Gracias! Un agente te va a atender en breve. 🙌",
    },
    update: {
      welcomeEnabled: false,
      welcomeTemplateId: null,
      inactivityHours: 4,
      autoAssignEnabled: false,
      autoAssignStrategy: "least_busy",
      autoAssignRoles: JSON.stringify(["agente"]),
      chatbotEnabled: false,
      chatbotQuestions: "[]",
      chatbotClosing: "¡Gracias! Un agente te va a atender en breve. 🙌",
    },
  });

  // Audit (this entry survives since we don't wipe the log)
  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: "data.factory_reset",
    metadata: {
      contactsDeleted: contactsCount,
      templatesDeleted: templatesCount,
      tagsDeleted: tagsCount,
      customFieldsDeleted: fieldsCount,
      linesDeleted: linesCount,
      otherUsersDeleted: otherUsersCount,
    },
    ipAddress: clientIp(req),
  });

  return NextResponse.json({
    ok: true,
    deleted: {
      contacts: contactsCount,
      templates: templatesCount,
      tags: tagsCount,
      customFields: fieldsCount,
      lines: linesCount,
      otherUsers: otherUsersCount,
    },
  });
});
