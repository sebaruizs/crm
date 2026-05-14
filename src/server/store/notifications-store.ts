import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { AppNotification, NotificationType } from "@/types";

const STORE_DIR = path.join(process.cwd(), "baileys-sessions");
const STORE_FILE = path.join(STORE_DIR, "notifications.json");
const MAX_PER_USER = 100;

interface StoreShape {
  notifications: AppNotification[];
}

class NotificationsStore {
  private notifications: AppNotification[] = [];
  private initialized = false;
  private saveTimer: NodeJS.Timeout | null = null;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await fs.mkdir(STORE_DIR, { recursive: true });
    if (existsSync(STORE_FILE)) {
      try {
        const raw = await fs.readFile(STORE_FILE, "utf-8");
        const parsed = JSON.parse(raw) as StoreShape;
        this.notifications = parsed.notifications ?? [];
      } catch {
        this.notifications = [];
      }
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush().catch(() => {}), 200);
  }

  private async flush() {
    const payload: StoreShape = { notifications: this.notifications };
    await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2));
  }

  /**
   * Lists notifications for one user, most recent first.
   */
  listForUser(userId: string, limit = 50): AppNotification[] {
    return this.notifications
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  unreadCountForUser(userId: string): number {
    return this.notifications.filter((n) => n.recipientUserId === userId && !n.readAt).length;
  }

  /**
   * Adds a notification, with light deduplication:
   * if the latest UNREAD notification for the same user+contact+type already exists,
   * we skip (to avoid spamming agents when a customer sends 5 messages in a row).
   */
  push(input: {
    recipientUserId: string;
    type: NotificationType;
    contactId: string;
    contactName: string;
    body: string;
  }): AppNotification | null {
    const exists = this.notifications.find(
      (n) =>
        n.recipientUserId === input.recipientUserId &&
        n.contactId === input.contactId &&
        n.type === input.type &&
        !n.readAt
    );
    if (exists) {
      // Update body & timestamp to keep it fresh
      exists.body = input.body;
      exists.createdAt = new Date().toISOString();
      this.scheduleSave();
      return exists;
    }
    const n: AppNotification = {
      id: `n-${randomUUID().slice(0, 8)}`,
      recipientUserId: input.recipientUserId,
      type: input.type,
      contactId: input.contactId,
      contactName: input.contactName,
      body: input.body,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    this.notifications.push(n);
    // Cap per-user history
    const forUser = this.notifications.filter((x) => x.recipientUserId === input.recipientUserId);
    if (forUser.length > MAX_PER_USER) {
      const toRemove = forUser.length - MAX_PER_USER;
      const oldest = [...forUser]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, toRemove);
      for (const old of oldest) {
        const idx = this.notifications.indexOf(old);
        if (idx !== -1) this.notifications.splice(idx, 1);
      }
    }
    this.scheduleSave();
    return n;
  }

  markRead(notificationId: string, userId: string): AppNotification | null {
    const n = this.notifications.find((x) => x.id === notificationId && x.recipientUserId === userId);
    if (!n) return null;
    if (!n.readAt) n.readAt = new Date().toISOString();
    this.scheduleSave();
    return n;
  }

  markAllRead(userId: string): number {
    let updated = 0;
    const now = new Date().toISOString();
    for (const n of this.notifications) {
      if (n.recipientUserId === userId && !n.readAt) {
        n.readAt = now;
        updated++;
      }
    }
    if (updated > 0) this.scheduleSave();
    return updated;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __notificationsStore: NotificationsStore | undefined;
}

export const notificationsStore: NotificationsStore =
  globalThis.__notificationsStore ?? (globalThis.__notificationsStore = new NotificationsStore());
