import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Contact, MessagePreview, MessageTemplate, Note, AutomationSettings } from "@/types";
import { CONTACTS as SEED_CONTACTS } from "@/mock/contacts";

const STORE_DIR = path.join(process.cwd(), "baileys-sessions");
const STORE_FILE = path.join(STORE_DIR, "crm.json");
const MAX_MESSAGES_PER_CONTACT = 200;

const SEED_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-welcome",
    label: "Bienvenida",
    body: "¡Hola {{nombre}}! 👋 Gracias por contactarnos. Soy del equipo de AutoFlota y te voy a ayudar a encontrar el vehículo ideal para que arranques a trabajar. ¿Para qué plataforma vas a manejar?",
    shortcut: "bienvenida",
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-pricing",
    label: "Precios",
    body: "Manejamos tres planes:\n\n• Semanal: $1,800 (incluye seguro y GPS)\n• Mensual: $6,500 (1 semana de gracia para arranque)\n• Anual: $65,000 (mejor precio)\n\nTodos incluyen mantenimiento. ¿Cuál te interesa más?",
    shortcut: "precios",
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-visit",
    label: "Agendar visita",
    body: "Perfecto {{nombre}}, podemos agendar una visita para que conozcas las unidades. Estamos disponibles de lunes a sábado de 9 a 18hs. ¿Qué día te queda mejor?",
    shortcut: "visita",
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-license",
    label: "Solicitar licencia",
    body: "Para avanzar necesito que me envíes foto de tu licencia de conducir vigente (frente y dorso). Es solo para verificar antigüedad. 🪪",
    shortcut: "licencia",
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS: AutomationSettings = {
  welcomeEnabled: false,
  welcomeTemplateId: null,
  inactivityHours: 4,
  autoAssignEnabled: false,
  autoAssignStrategy: "least_busy",
  autoAssignRoles: ["agente"],
};

interface StoreShape {
  contacts: Contact[];
  templates?: MessageTemplate[];
  settings?: AutomationSettings;
}

class CrmStore {
  private contacts: Contact[] = [];
  private templates: MessageTemplate[] = [];
  private settings: AutomationSettings = { ...DEFAULT_SETTINGS };
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
        this.templates = parsed.templates ?? [...SEED_TEMPLATES];
        this.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };
      } catch {
        this.contacts = [...SEED_CONTACTS];
        this.templates = [...SEED_TEMPLATES];
        this.settings = { ...DEFAULT_SETTINGS };
        await this.flush();
      }
    } else {
      this.contacts = [...SEED_CONTACTS];
      this.templates = [...SEED_TEMPLATES];
      this.settings = { ...DEFAULT_SETTINGS };
      await this.flush();
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush().catch(() => {}), 300);
  }

  private async flush() {
    const payload: StoreShape = {
      contacts: this.contacts,
      templates: this.templates,
      settings: this.settings,
    };
    await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2));
  }

  // ─── Settings ────────────────────────────────────────────────

  getSettings(): AutomationSettings {
    return this.settings;
  }

  updateSettings(patch: Partial<AutomationSettings>): AutomationSettings {
    this.settings = { ...this.settings, ...patch };
    this.scheduleSave();
    return this.settings;
  }

  getTemplate(id: string): MessageTemplate | undefined {
    return this.templates.find((t) => t.id === id);
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
  }): { contact: Contact; isNew: boolean } {
    const { lineId, fromNumber, fromName, body, timestamp, messageId } = params;
    let contact = this.findByPhone(fromNumber);
    const isNew = !contact;

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
    return { contact, isNew };
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

  // ─── Templates ───────────────────────────────────────────────

  listTemplates(): MessageTemplate[] {
    return this.templates;
  }

  addTemplate(input: { label: string; body: string; shortcut?: string }): MessageTemplate {
    const tpl: MessageTemplate = {
      id: `tpl-${randomUUID().slice(0, 8)}`,
      label: input.label.trim(),
      body: input.body,
      shortcut: input.shortcut?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    this.templates.push(tpl);
    this.scheduleSave();
    return tpl;
  }

  updateTemplate(id: string, patch: Partial<Pick<MessageTemplate, "label" | "body" | "shortcut">>): MessageTemplate | undefined {
    const tpl = this.templates.find((t) => t.id === id);
    if (!tpl) return undefined;
    if (patch.label !== undefined) tpl.label = patch.label.trim();
    if (patch.body !== undefined) tpl.body = patch.body;
    if (patch.shortcut !== undefined) tpl.shortcut = patch.shortcut.trim() || undefined;
    this.scheduleSave();
    return tpl;
  }

  deleteTemplate(id: string): boolean {
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.templates.splice(idx, 1);
    this.scheduleSave();
    return true;
  }

  // ─── Notes ───────────────────────────────────────────────────

  addNote(contactId: string, content: string, authorId: string): Note | null {
    const contact = this.get(contactId);
    if (!contact) return null;
    const note: Note = {
      id: `n-${randomUUID().slice(0, 8)}`,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      authorId,
    };
    contact.notes.push(note);
    this.scheduleSave();
    return note;
  }

  deleteNote(contactId: string, noteId: string): boolean {
    const contact = this.get(contactId);
    if (!contact) return false;
    const idx = contact.notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return false;
    contact.notes.splice(idx, 1);
    this.scheduleSave();
    return true;
  }

  // ─── Auto-assignment ─────────────────────────────────────────

  /**
   * Picks the next agent to assign a contact to and writes the assignment.
   * Returns the assigned agentId, or null if no eligible agents.
   *
   * Strategies:
   *  - least_busy: agent with fewest currently-assigned contacts
   *  - round_robin: rotates through eligible agents in order
   */
  autoAssign(
    contactId: string,
    eligibleAgents: { id: string }[],
    strategy: "round_robin" | "least_busy" = "least_busy"
  ): string | null {
    if (eligibleAgents.length === 0) return null;
    const contact = this.get(contactId);
    if (!contact || contact.assignedAgentId) return contact?.assignedAgentId ?? null;

    let chosen: string | null = null;
    if (strategy === "least_busy") {
      const counts = eligibleAgents.map((a) => ({
        id: a.id,
        count: this.contacts.filter((c) => c.assignedAgentId === a.id).length,
      }));
      counts.sort((a, b) => a.count - b.count);
      chosen = counts[0]?.id ?? null;
    } else {
      // round_robin: find the agent who got the most recent assignment, pick the next
      const recent = [...this.contacts]
        .filter((c) => c.assignedAgentId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastAssignedId = recent[0]?.assignedAgentId;
      const ids = eligibleAgents.map((a) => a.id);
      const lastIdx = lastAssignedId ? ids.indexOf(lastAssignedId) : -1;
      chosen = ids[(lastIdx + 1) % ids.length] ?? null;
    }
    if (chosen) {
      contact.assignedAgentId = chosen;
      this.scheduleSave();
    }
    return chosen;
  }

  // ─── Contact patch (existing) ────────────────────────────────

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
