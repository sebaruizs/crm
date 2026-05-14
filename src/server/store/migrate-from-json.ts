import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import type { Agent, Contact, MessageTemplate, AppNotification } from "@/types";
import type { WhatsAppLine } from "@/server/baileys/types";

/**
 * One-time auto-migration from the legacy JSON files (baileys-sessions/*.json)
 * into the Postgres database. Called once at boot from each store's init().
 *
 * The function is idempotent: it only imports tables that are currently empty
 * AND whose JSON source file exists. After successful import, the JSON file
 * is renamed with a .imported suffix so it's never imported twice.
 */

const SESSIONS_DIR = path.join(process.cwd(), "baileys-sessions");

async function readJson<T>(file: string): Promise<T | null> {
  if (!existsSync(file)) return null;
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function markImported(file: string) {
  try {
    await fs.rename(file, file + ".imported");
  } catch {
    /* ignore */
  }
}

let importPromise: Promise<void> | null = null;

export function importLegacyJsonOnce(): Promise<void> {
  if (importPromise) return importPromise;
  importPromise = (async () => {
    // Users
    try {
      const file = path.join(SESSIONS_DIR, "users.json");
      const parsed = await readJson<{ users: Agent[] }>(file);
      if (parsed?.users?.length) {
        const existing = await prisma.user.count();
        if (existing === 0) {
          await prisma.$transaction(
            parsed.users.map((u) =>
              prisma.user.create({
                data: {
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  password: u.password,
                  role: u.role,
                  color: u.color,
                  avatarInitials: u.avatarInitials,
                },
              })
            )
          );
          await markImported(file);
        }
      }
    } catch (err) {
      console.warn("[migrate-from-json] users import failed:", err);
    }

    // Contacts + messages + notes (single big CRM file)
    try {
      const file = path.join(SESSIONS_DIR, "crm.json");
      const parsed = await readJson<{
        contacts?: Contact[];
        templates?: MessageTemplate[];
        settings?: Record<string, unknown>;
      }>(file);
      if (parsed) {
        // Templates
        if (parsed.templates?.length) {
          const tplCount = await prisma.template.count();
          if (tplCount === 0) {
            // Clear seed if any inserted from default, then import legacy
            // (init runs first, so seed templates may already exist with fixed ids tpl-*)
          }
          for (const t of parsed.templates) {
            await prisma.template.upsert({
              where: { id: t.id },
              create: {
                id: t.id,
                label: t.label,
                body: t.body,
                shortcut: t.shortcut,
                createdAt: new Date(t.createdAt),
              },
              update: {},
            });
          }
        }

        // Contacts
        if (parsed.contacts?.length) {
          const contactCount = await prisma.contact.count();
          if (contactCount === 0 || contactCount <= 12) {
            // 12 = seed count; if user added more, we should import them too.
            // We upsert by id; existing seed contacts get refreshed with legacy data.
            for (const c of parsed.contacts) {
              await prisma.contact.upsert({
                where: { id: c.id },
                create: {
                  id: c.id,
                  name: c.name,
                  phone: c.phone,
                  source: c.source,
                  status: c.status,
                  assignedAgentId: c.assignedAgentId ?? null,
                  tagIds: JSON.stringify(c.tagIds ?? []),
                  whatsAppStatus: c.whatsAppStatus,
                  createdAt: new Date(c.createdAt),
                  lastMessageAt: new Date(c.lastMessageAt),
                  vehicleInterest: c.vehicleInterest ?? null,
                  licenseVerified: c.licenseVerified,
                  visitScheduledAt: c.visitScheduledAt ? new Date(c.visitScheduledAt) : null,
                  lineId: c.lineId ?? null,
                  customFields: JSON.stringify(c.customFields ?? []),
                  messages: {
                    create: (c.messageHistory ?? []).map((m) => ({
                      id: m.id,
                      direction: m.direction,
                      body: m.body,
                      sentAt: new Date(m.sentAt),
                      status: m.status,
                    })),
                  },
                  notes: {
                    create: (c.notes ?? []).map((n) => ({
                      id: n.id,
                      content: n.content,
                      authorId: n.authorId,
                      createdAt: new Date(n.createdAt),
                    })),
                  },
                },
                update: {},
              });
            }
          }
        }

        // Settings
        if (parsed.settings) {
          const s = parsed.settings as {
            welcomeEnabled?: boolean;
            welcomeTemplateId?: string | null;
            inactivityHours?: number;
            autoAssignEnabled?: boolean;
            autoAssignStrategy?: string;
            autoAssignRoles?: string[];
          };
          await prisma.settings.upsert({
            where: { id: 1 },
            create: {
              id: 1,
              welcomeEnabled: s.welcomeEnabled ?? false,
              welcomeTemplateId: s.welcomeTemplateId ?? null,
              inactivityHours: s.inactivityHours ?? 4,
              autoAssignEnabled: s.autoAssignEnabled ?? false,
              autoAssignStrategy: s.autoAssignStrategy ?? "least_busy",
              autoAssignRoles: JSON.stringify(s.autoAssignRoles ?? ["agente"]),
            },
            update: {
              welcomeEnabled: s.welcomeEnabled,
              welcomeTemplateId: s.welcomeTemplateId,
              inactivityHours: s.inactivityHours,
              autoAssignEnabled: s.autoAssignEnabled,
              autoAssignStrategy: s.autoAssignStrategy,
              autoAssignRoles: s.autoAssignRoles ? JSON.stringify(s.autoAssignRoles) : undefined,
            },
          });
        }

        await markImported(file);
      }
    } catch (err) {
      console.warn("[migrate-from-json] crm import failed:", err);
    }

    // Notifications
    try {
      const file = path.join(SESSIONS_DIR, "notifications.json");
      const parsed = await readJson<{ notifications: AppNotification[] }>(file);
      if (parsed?.notifications?.length) {
        const existing = await prisma.notification.count();
        if (existing === 0) {
          // Only import notifications whose contact+recipient still exist
          for (const n of parsed.notifications) {
            const contact = await prisma.contact.findUnique({ where: { id: n.contactId } });
            const recipient = await prisma.user.findUnique({ where: { id: n.recipientUserId } });
            if (!contact || !recipient) continue;
            await prisma.notification.create({
              data: {
                id: n.id,
                recipientUserId: n.recipientUserId,
                type: n.type,
                contactId: n.contactId,
                contactName: n.contactName,
                body: n.body,
                createdAt: new Date(n.createdAt),
                readAt: n.readAt ? new Date(n.readAt) : null,
              },
            });
          }
          await markImported(file);
        }
      }
    } catch (err) {
      console.warn("[migrate-from-json] notifications import failed:", err);
    }

    // Lines
    try {
      const file = path.join(SESSIONS_DIR, "lines.json");
      const parsed = await readJson<WhatsAppLine[]>(file);
      if (parsed?.length) {
        const existing = await prisma.line.count();
        if (existing === 0) {
          for (const l of parsed) {
            await prisma.line.create({
              data: {
                id: l.id,
                name: l.name,
                agentId: l.agentId,
                status: l.status,
                phoneNumber: l.phoneNumber,
                lastError: l.lastError,
                connectedAt: l.connectedAt ? new Date(l.connectedAt) : null,
                createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
              },
            });
          }
          await markImported(file);
        }
      }
    } catch (err) {
      console.warn("[migrate-from-json] lines import failed:", err);
    }
  })();
  return importPromise;
}
