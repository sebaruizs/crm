import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Contact, MessagePreview } from "@/types";
import { CONTACTS as SEED_CONTACTS } from "@/mock/contacts";

const STORE_DIR = path.join(process.cwd(), "baileys-sessions");
const STORE_FILE = path.join(STORE_DIR, "crm.json");
const MAX_MESSAGES_PER_CONTACT = 200;

interface StoreShape {
  contacts: Contact[];
}

class CrmStore {
  private contacts: Contact[] = [];
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
        this.contacts = parsed.contacts ?? [];
      } catch {
        this.contacts = [...SEED_CONTACTS];
        await this.flush();
      }
    } else {
      // First boot — seed with mock data so the UI has something to show
      this.contacts = [...SEED_CONTACTS];
      await this.flush();
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush().catch(() => {}), 300);
  }

  private async flush() {
    const payload: StoreShape = { contacts: this.contacts };
    await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2));
  }

  list(): Contact[] {
    return this.contacts;
  }

  get(id: string): Contact | undefined {
    return this.contacts.find((c) => c.id === id);
  }

  findByPhone(phone: string): Contact | undefined {
    const digits = phone.replace(/\D/g, "");
    return this.contacts.find((c) => c.phone.replace(/\D/g, "") === digits);
  }

  /**
   * Called when an inbound WhatsApp message arrives.
   * Creates the contact if unknown, appends the message to history.
   */
  upsertFromInbound(params: {
    lineId: string;
    fromNumber: string;
    fromName?: string;
    body: string;
    timestamp: number;
    messageId?: string;
  }): Contact {
    const { lineId, fromNumber, fromName, body, timestamp, messageId } = params;
    let contact = this.findByPhone(fromNumber);

    if (!contact) {
      contact = {
        id: `c-${randomUUID().slice(0, 8)}`,
        name: fromName || `+${fromNumber}`,
        phone: `+${fromNumber}`,
        source: "whatsapp_link",
        status: "nuevo_lead",
        tagIds: [],
        whatsAppStatus: "connected",
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date(timestamp).toISOString(),
        notes: [],
        messageHistory: [],
        customFields: [],
        licenseVerified: false,
        lineId,
      };
      this.contacts.push(contact);
    } else {
      // Update name if we didn't have one (e.g., seed only had number)
      if (fromName && contact.name.startsWith("+")) contact.name = fromName;
      // Track the line if not already set
      if (!contact.lineId) contact.lineId = lineId;
    }

    const newMsg: MessagePreview = {
      id: messageId || `m-${randomUUID().slice(0, 8)}`,
      direction: "inbound",
      body,
      sentAt: new Date(timestamp).toISOString(),
      status: "delivered",
    };
    contact.messageHistory.push(newMsg);
    if (contact.messageHistory.length > MAX_MESSAGES_PER_CONTACT) {
      contact.messageHistory.splice(0, contact.messageHistory.length - MAX_MESSAGES_PER_CONTACT);
    }
    contact.lastMessageAt = newMsg.sentAt;
    this.scheduleSave();
    return contact;
  }

  appendOutbound(contactId: string, body: string, messageId?: string): MessagePreview | null {
    const contact = this.get(contactId);
    if (!contact) return null;
    const now = new Date().toISOString();
    const msg: MessagePreview = {
      id: messageId || `m-${randomUUID().slice(0, 8)}`,
      direction: "outbound",
      body,
      sentAt: now,
      status: "sent",
    };
    contact.messageHistory.push(msg);
    contact.lastMessageAt = now;
    this.scheduleSave();
    return msg;
  }

  patch(id: string, patch: Partial<Pick<Contact, "assignedAgentId" | "status" | "tagIds" | "vehicleInterest" | "licenseVerified" | "lineId">>): Contact | undefined {
    const contact = this.get(id);
    if (!contact) return undefined;
    if (patch.assignedAgentId !== undefined) contact.assignedAgentId = patch.assignedAgentId || undefined;
    if (patch.status !== undefined) contact.status = patch.status;
    if (patch.tagIds !== undefined) contact.tagIds = patch.tagIds;
    if (patch.vehicleInterest !== undefined) contact.vehicleInterest = patch.vehicleInterest;
    if (patch.licenseVerified !== undefined) contact.licenseVerified = patch.licenseVerified;
    if (patch.lineId !== undefined) contact.lineId = patch.lineId;
    this.scheduleSave();
    return contact;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __crmStore: CrmStore | undefined;
}

export const crmStore: CrmStore =
  globalThis.__crmStore ?? (globalThis.__crmStore = new CrmStore());
