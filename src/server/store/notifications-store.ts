import "server-only";
import type { AppNotification, NotificationType } from "@/types";
import { prisma } from "@/lib/prisma";
import { importLegacyJsonOnce } from "./migrate-from-json";

const MAX_PER_USER = 100;

function toApp(r: {
  id: string;
  recipientUserId: string;
  type: string;
  contactId: string;
  contactName: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
}): AppNotification {
  return {
    id: r.id,
    recipientUserId: r.recipientUserId,
    type: r.type as NotificationType,
    contactId: r.contactId,
    contactName: r.contactName,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    readAt: r.readAt?.toISOString() ?? null,
  };
}

class NotificationsStore {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await importLegacyJsonOnce();
  }

  async listForUser(userId: string, limit = 50): Promise<AppNotification[]> {
    const rows = await prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toApp);
  }

  async unreadCountForUser(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientUserId: userId, readAt: null },
    });
  }

  async push(input: {
    recipientUserId: string;
    type: NotificationType;
    contactId: string;
    contactName: string;
    body: string;
  }): Promise<AppNotification | null> {
    // Dedup: update existing unread of same (user, contact, type)
    const existing = await prisma.notification.findFirst({
      where: {
        recipientUserId: input.recipientUserId,
        contactId: input.contactId,
        type: input.type,
        readAt: null,
      },
    });
    if (existing) {
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: { body: input.body, createdAt: new Date() },
      });
      return toApp(updated);
    }

    const created = await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        type: input.type,
        contactId: input.contactId,
        contactName: input.contactName,
        body: input.body,
      },
    });

    // Cap per-user history
    const userCount = await prisma.notification.count({
      where: { recipientUserId: input.recipientUserId },
    });
    if (userCount > MAX_PER_USER) {
      const oldest = await prisma.notification.findMany({
        where: { recipientUserId: input.recipientUserId },
        orderBy: { createdAt: "asc" },
        take: userCount - MAX_PER_USER,
        select: { id: true },
      });
      await prisma.notification.deleteMany({
        where: { id: { in: oldest.map((o) => o.id) } },
      });
    }

    return toApp(created);
  }

  async markRead(notificationId: string, userId: string): Promise<AppNotification | null> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });
    if (!existing) return null;
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return toApp(updated);
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __notificationsStore: NotificationsStore | undefined;
}

export const notificationsStore: NotificationsStore =
  globalThis.__notificationsStore ?? (globalThis.__notificationsStore = new NotificationsStore());
