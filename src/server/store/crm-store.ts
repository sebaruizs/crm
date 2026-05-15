import "server-only";
import type {
  Contact,
  ContactStatus,
  CustomField,
  LeadSource,
  MessagePreview,
  MessageTemplate,
  Note,
  AutomationSettings,
  WhatsAppStatus,
} from "@/types";
import { CONTACTS as SEED_CONTACTS } from "@/mock/contacts";
import { prisma } from "@/lib/prisma";
import { notificationsStore } from "@/server/store/notifications-store";
import { importLegacyJsonOnce } from "./migrate-from-json";

const MAX_MESSAGES_PER_CONTACT = 200;

const DEFAULT_SETTINGS: AutomationSettings = {
  welcomeEnabled: false,
  welcomeTemplateId: null,
  inactivityHours: 4,
  autoAssignEnabled: false,
  autoAssignStrategy: "least_busy",
  autoAssignRoles: ["agente"],
  chatbotEnabled: false,
  chatbotQuestions: [],
  chatbotClosing: "¡Gracias! Un agente te va a atender en breve. 🙌",
};

const SEED_TEMPLATES: { id: string; label: string; body: string; shortcut: string }[] = [
  {
    id: "tpl-welcome",
    label: "Bienvenida",
    body: "¡Hola {{nombre}}! 👋 Gracias por contactarnos. Soy del equipo de AutoFlota y te voy a ayudar a encontrar el vehículo ideal para que arranques a trabajar. ¿Para qué plataforma vas a manejar?",
    shortcut: "bienvenida",
  },
  {
    id: "tpl-pricing",
    label: "Precios",
    body: "Manejamos tres planes:\n\n• Semanal: $1,800 (incluye seguro y GPS)\n• Mensual: $6,500 (1 semana de gracia para arranque)\n• Anual: $65,000 (mejor precio)\n\nTodos incluyen mantenimiento. ¿Cuál te interesa más?",
    shortcut: "precios",
  },
  {
    id: "tpl-visit",
    label: "Agendar visita",
    body: "Perfecto {{nombre}}, podemos agendar una visita para que conozcas las unidades. Estamos disponibles de lunes a sábado de 9 a 18hs. ¿Qué día te queda mejor?",
    shortcut: "visita",
  },
  {
    id: "tpl-license",
    label: "Solicitar licencia",
    body: "Para avanzar necesito que me envíes foto de tu licencia de conducir vigente (frente y dorso). Es solo para verificar antigüedad. 🪪",
    shortcut: "licencia",
  },
];

// Type helpers for Prisma rows → app types

type PrismaContactWith = {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  assignedAgentId: string | null;
  tagIds: string;
  whatsAppStatus: string;
  createdAt: Date;
  lastMessageAt: Date;
  vehicleInterest: string | null;
  licenseVerified: boolean;
  visitScheduledAt: Date | null;
  lineId: string | null;
  customFields: string;
  adId: string | null;
  adHeadline: string | null;
  adSourceUrl: string | null;
  adPlatform: string | null;
  adCtwaClid: string | null;
  messages: {
    id: string;
    direction: string;
    body: string;
    sentAt: Date;
    status: string;
    mediaType: string | null;
    mediaUrl: string | null;
    mediaName: string | null;
    mediaMime: string | null;
  }[];
  notes: { id: string; content: string; authorId: string; createdAt: Date }[];
};

function parseJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function rowToContact(row: PrismaContactWith): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    source: row.source as LeadSource,
    status: row.status as ContactStatus,
    assignedAgentId: row.assignedAgentId ?? undefined,
    tagIds: parseJson<string[]>(row.tagIds, []),
    whatsAppStatus: row.whatsAppStatus as WhatsAppStatus,
    createdAt: row.createdAt.toISOString(),
    lastMessageAt: row.lastMessageAt.toISOString(),
    vehicleInterest: row.vehicleInterest ?? undefined,
    licenseVerified: row.licenseVerified,
    visitScheduledAt: row.visitScheduledAt?.toISOString() ?? undefined,
    lineId: row.lineId ?? undefined,
    customFields: parseJson<CustomField[]>(row.customFields, []),
    adId: row.adId ?? undefined,
    adHeadline: row.adHeadline ?? undefined,
    adSourceUrl: row.adSourceUrl ?? undefined,
    adPlatform: (row.adPlatform as "facebook" | "instagram" | undefined) ?? undefined,
    adCtwaClid: row.adCtwaClid ?? undefined,
    messageHistory: row.messages
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime())
      .map((m) => ({
        id: m.id,
        direction: m.direction as "inbound" | "outbound",
        body: m.body,
        sentAt: m.sentAt.toISOString(),
        status: m.status as MessagePreview["status"],
        mediaType: (m.mediaType as MessagePreview["mediaType"]) ?? undefined,
        mediaUrl: m.mediaUrl ?? undefined,
        mediaName: m.mediaName ?? undefined,
        mediaMime: m.mediaMime ?? undefined,
      })),
    notes: row.notes
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((n) => ({
        id: n.id,
        content: n.content,
        authorId: n.authorId,
        createdAt: n.createdAt.toISOString(),
      })),
  };
}

class CrmStore {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await importLegacyJsonOnce();

    // Seed templates if none exist (after legacy import)
    const tplCount = await prisma.template.count();
    if (tplCount === 0) {
      await prisma.$transaction(
        SEED_TEMPLATES.map((t) =>
          prisma.template.create({
            data: { id: t.id, label: t.label, body: t.body, shortcut: t.shortcut },
          })
        )
      );
    }

    // Ensure singleton settings row exists
    const settingsExists = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settingsExists) {
      await prisma.settings.create({
        data: {
          id: 1,
          welcomeEnabled: DEFAULT_SETTINGS.welcomeEnabled,
          welcomeTemplateId: DEFAULT_SETTINGS.welcomeTemplateId,
          inactivityHours: DEFAULT_SETTINGS.inactivityHours,
          autoAssignEnabled: DEFAULT_SETTINGS.autoAssignEnabled,
          autoAssignStrategy: DEFAULT_SETTINGS.autoAssignStrategy,
          autoAssignRoles: JSON.stringify(DEFAULT_SETTINGS.autoAssignRoles),
        },
      });
    }

    // Seed contacts if empty
    const contactCount = await prisma.contact.count();
    if (contactCount === 0) {
      for (const c of SEED_CONTACTS) {
        await prisma.contact.create({
          data: {
            id: c.id,
            name: c.name,
            phone: c.phone,
            source: c.source,
            status: c.status,
            assignedAgentId: c.assignedAgentId ?? null,
            tagIds: JSON.stringify(c.tagIds),
            whatsAppStatus: c.whatsAppStatus,
            createdAt: new Date(c.createdAt),
            lastMessageAt: new Date(c.lastMessageAt),
            vehicleInterest: c.vehicleInterest ?? null,
            licenseVerified: c.licenseVerified,
            visitScheduledAt: c.visitScheduledAt ? new Date(c.visitScheduledAt) : null,
            customFields: JSON.stringify(c.customFields),
            messages: {
              create: c.messageHistory.map((m) => ({
                id: m.id,
                direction: m.direction,
                body: m.body,
                sentAt: new Date(m.sentAt),
                status: m.status,
              })),
            },
            notes: {
              create: c.notes.map((n) => ({
                id: n.id,
                content: n.content,
                authorId: n.authorId,
                createdAt: new Date(n.createdAt),
              })),
            },
          },
        });
      }
    }
  }

  // ─── Contacts ────────────────────────────────────────────────

  async list(): Promise<Contact[]> {
    const rows = await prisma.contact.findMany({
      include: { messages: true, notes: true },
      orderBy: { lastMessageAt: "desc" },
    });
    return rows.map(rowToContact);
  }

  async get(id: string): Promise<Contact | undefined> {
    const row = await prisma.contact.findUnique({
      where: { id },
      include: { messages: true, notes: true },
    });
    return row ? rowToContact(row) : undefined;
  }

  async findByPhone(phone: string): Promise<Contact | undefined> {
    const digits = phone.replace(/\D/g, "");
    // Match by normalized digits (suffix-based, since stored may have + prefix)
    const rows = await prisma.contact.findMany({
      include: { messages: true, notes: true },
    });
    const found = rows.find((r) => r.phone.replace(/\D/g, "") === digits);
    return found ? rowToContact(found) : undefined;
  }

  async upsertFromInbound(params: {
    lineId: string;
    fromNumber: string;
    fromName?: string;
    body: string;
    timestamp: number;
    messageId?: string;
    adMeta?: {
      adId?: string;
      adHeadline?: string;
      adSourceUrl?: string;
      adPlatform?: "facebook" | "instagram";
      adCtwaClid?: string;
    };
    mediaMeta?: {
      type: "image" | "video" | "audio" | "document";
      url: string;
      name?: string;
      mime?: string;
    };
  }): Promise<{ contact: Contact; isNew: boolean }> {
    const { lineId, fromNumber, fromName, body, timestamp, messageId, adMeta, mediaMeta } = params;
    const existing = await this.findByPhone(fromNumber);
    const isNew = !existing;
    let contactId: string;
    let contactName: string;
    let assignedAgentId: string | undefined;

    // Determine source: ad-sourced lead vs organic
    let resolvedSource: LeadSource = "organico";
    if (adMeta?.adPlatform === "instagram") resolvedSource = "instagram";
    else if (adMeta) resolvedSource = "facebook_ads";

    if (existing) {
      contactId = existing.id;
      contactName = fromName && existing.name.startsWith("+") ? fromName : existing.name;
      assignedAgentId = existing.assignedAgentId;
      const updates: Record<string, unknown> = { lastMessageAt: new Date(timestamp) };
      if (contactName !== existing.name) updates.name = contactName;
      if (!existing.lineId) updates.lineId = lineId;
      // If we just learned ad attribution for an existing contact, store it.
      // We never overwrite an existing ad attribution.
      if (adMeta && !existing.adId) {
        if (adMeta.adId) updates.adId = adMeta.adId;
        if (adMeta.adHeadline) updates.adHeadline = adMeta.adHeadline;
        if (adMeta.adSourceUrl) updates.adSourceUrl = adMeta.adSourceUrl;
        if (adMeta.adPlatform) updates.adPlatform = adMeta.adPlatform;
        if (adMeta.adCtwaClid) updates.adCtwaClid = adMeta.adCtwaClid;
        // Also upgrade the source if it was "organico" or "whatsapp_link"
        if (existing.source === "organico" || existing.source === "whatsapp_link") {
          updates.source = resolvedSource;
        }
      }
      await prisma.contact.update({ where: { id: contactId }, data: updates });
    } else {
      const created = await prisma.contact.create({
        data: {
          name: fromName || `+${fromNumber}`,
          phone: `+${fromNumber}`,
          source: resolvedSource,
          status: "nuevo_lead",
          tagIds: "[]",
          whatsAppStatus: "connected",
          lastMessageAt: new Date(timestamp),
          customFields: "[]",
          lineId,
          adId: adMeta?.adId,
          adHeadline: adMeta?.adHeadline,
          adSourceUrl: adMeta?.adSourceUrl,
          adPlatform: adMeta?.adPlatform,
          adCtwaClid: adMeta?.adCtwaClid,
        },
      });
      contactId = created.id;
      contactName = created.name;
    }

    // Append inbound message
    await prisma.message.create({
      data: {
        id: messageId,
        contactId,
        direction: "inbound",
        body,
        sentAt: new Date(timestamp),
        status: "delivered",
        mediaType: mediaMeta?.type ?? null,
        mediaUrl: mediaMeta?.url ?? null,
        mediaName: mediaMeta?.name ?? null,
        mediaMime: mediaMeta?.mime ?? null,
      },
    });

    // Trim to MAX_MESSAGES_PER_CONTACT (delete oldest)
    const total = await prisma.message.count({ where: { contactId } });
    if (total > MAX_MESSAGES_PER_CONTACT) {
      const toDelete = await prisma.message.findMany({
        where: { contactId },
        orderBy: { sentAt: "asc" },
        take: total - MAX_MESSAGES_PER_CONTACT,
        select: { id: true },
      });
      await prisma.message.deleteMany({ where: { id: { in: toDelete.map((m) => m.id) } } });
    }

    // Notify assigned agent (only for existing contacts)
    if (!isNew && assignedAgentId) {
      notificationsStore.push({
        recipientUserId: assignedAgentId,
        type: "new_message",
        contactId,
        contactName,
        body: body.length > 80 ? body.slice(0, 80) + "…" : body,
      }).catch(() => {});
    }

    const fresh = await this.get(contactId);
    return { contact: fresh!, isNew };
  }

  async appendOutbound(
    contactId: string,
    body: string,
    messageId?: string,
    media?: { type: "image" | "video" | "audio" | "document"; url: string; name?: string; mime?: string }
  ): Promise<MessagePreview | null> {
    const exists = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!exists) return null;
    const now = new Date();
    const msg = await prisma.message.create({
      data: {
        id: messageId,
        contactId,
        direction: "outbound",
        body,
        sentAt: now,
        status: "sent",
        mediaType: media?.type ?? null,
        mediaUrl: media?.url ?? null,
        mediaName: media?.name ?? null,
        mediaMime: media?.mime ?? null,
      },
    });
    await prisma.contact.update({
      where: { id: contactId },
      data: { lastMessageAt: now },
    });
    return {
      id: msg.id,
      direction: "outbound",
      body: msg.body,
      sentAt: msg.sentAt.toISOString(),
      status: msg.status as MessagePreview["status"],
      mediaType: (msg.mediaType as MessagePreview["mediaType"]) ?? undefined,
      mediaUrl: msg.mediaUrl ?? undefined,
      mediaName: msg.mediaName ?? undefined,
      mediaMime: msg.mediaMime ?? undefined,
    };
  }

  async patch(
    id: string,
    patch: Partial<Pick<Contact, "assignedAgentId" | "status" | "tagIds" | "vehicleInterest" | "licenseVerified" | "lineId">>
  ): Promise<Contact | undefined> {
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) return undefined;
    const prevAssignee = existing.assignedAgentId;

    const data: Record<string, unknown> = {};
    if (patch.assignedAgentId !== undefined) data.assignedAgentId = patch.assignedAgentId || null;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.tagIds !== undefined) data.tagIds = JSON.stringify(patch.tagIds);
    if (patch.vehicleInterest !== undefined) data.vehicleInterest = patch.vehicleInterest;
    if (patch.licenseVerified !== undefined) data.licenseVerified = patch.licenseVerified;
    if (patch.lineId !== undefined) data.lineId = patch.lineId;
    await prisma.contact.update({ where: { id }, data });

    // Notify on assignment change
    if (
      patch.assignedAgentId !== undefined &&
      patch.assignedAgentId &&
      patch.assignedAgentId !== prevAssignee
    ) {
      const fresh = await this.get(id);
      const lastMsg = fresh?.messageHistory[fresh.messageHistory.length - 1];
      const preview = lastMsg?.body ?? "Sin mensajes todavía";
      notificationsStore.push({
        recipientUserId: patch.assignedAgentId,
        type: "new_assignment",
        contactId: id,
        contactName: fresh?.name ?? "Contacto",
        body: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
      }).catch(() => {});
    }

    return this.get(id);
  }

  // ─── Auto-assignment ─────────────────────────────────────────

  async autoAssign(
    contactId: string,
    eligibleAgents: { id: string }[],
    strategy: "round_robin" | "least_busy" = "least_busy"
  ): Promise<string | null> {
    if (eligibleAgents.length === 0) return null;
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return null;
    if (contact.assignedAgentId) return contact.assignedAgentId;

    let chosen: string | null = null;
    if (strategy === "least_busy") {
      const counts = await Promise.all(
        eligibleAgents.map(async (a) => ({
          id: a.id,
          count: await prisma.contact.count({ where: { assignedAgentId: a.id } }),
        }))
      );
      counts.sort((a, b) => a.count - b.count);
      chosen = counts[0]?.id ?? null;
    } else {
      const recent = await prisma.contact.findFirst({
        where: { assignedAgentId: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      const lastAssignedId = recent?.assignedAgentId;
      const ids = eligibleAgents.map((a) => a.id);
      const lastIdx = lastAssignedId ? ids.indexOf(lastAssignedId) : -1;
      chosen = ids[(lastIdx + 1) % ids.length] ?? null;
    }

    if (chosen) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { assignedAgentId: chosen },
      });
      const fresh = await this.get(contactId);
      const lastMsg = fresh?.messageHistory[fresh.messageHistory.length - 1];
      const preview = lastMsg?.body ?? "Sin mensajes todavía";
      notificationsStore.push({
        recipientUserId: chosen,
        type: "auto_assignment",
        contactId,
        contactName: fresh?.name ?? "Contacto",
        body: preview.length > 80 ? preview.slice(0, 80) + "…" : preview,
      }).catch(() => {});
    }
    return chosen;
  }

  // ─── Settings ────────────────────────────────────────────────

  async getSettings(): Promise<AutomationSettings> {
    const row = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!row) return { ...DEFAULT_SETTINGS };
    return {
      welcomeEnabled: row.welcomeEnabled,
      welcomeTemplateId: row.welcomeTemplateId,
      inactivityHours: row.inactivityHours,
      autoAssignEnabled: row.autoAssignEnabled,
      autoAssignStrategy: row.autoAssignStrategy as AutomationSettings["autoAssignStrategy"],
      autoAssignRoles: parseJson<("admin" | "agente")[]>(row.autoAssignRoles, ["agente"]),
      chatbotEnabled: row.chatbotEnabled,
      chatbotQuestions: parseJson<AutomationSettings["chatbotQuestions"]>(row.chatbotQuestions, []),
      chatbotClosing: row.chatbotClosing,
    };
  }

  async updateSettings(patch: Partial<AutomationSettings>): Promise<AutomationSettings> {
    const data: Record<string, unknown> = {};
    if (patch.welcomeEnabled !== undefined) data.welcomeEnabled = patch.welcomeEnabled;
    if (patch.welcomeTemplateId !== undefined) data.welcomeTemplateId = patch.welcomeTemplateId;
    if (patch.inactivityHours !== undefined) data.inactivityHours = patch.inactivityHours;
    if (patch.autoAssignEnabled !== undefined) data.autoAssignEnabled = patch.autoAssignEnabled;
    if (patch.autoAssignStrategy !== undefined) data.autoAssignStrategy = patch.autoAssignStrategy;
    if (patch.autoAssignRoles !== undefined) data.autoAssignRoles = JSON.stringify(patch.autoAssignRoles);
    if (patch.chatbotEnabled !== undefined) data.chatbotEnabled = patch.chatbotEnabled;
    if (patch.chatbotQuestions !== undefined) data.chatbotQuestions = JSON.stringify(patch.chatbotQuestions);
    if (patch.chatbotClosing !== undefined) data.chatbotClosing = patch.chatbotClosing;
    await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        welcomeEnabled: DEFAULT_SETTINGS.welcomeEnabled,
        welcomeTemplateId: DEFAULT_SETTINGS.welcomeTemplateId,
        inactivityHours: DEFAULT_SETTINGS.inactivityHours,
        autoAssignEnabled: DEFAULT_SETTINGS.autoAssignEnabled,
        autoAssignStrategy: DEFAULT_SETTINGS.autoAssignStrategy,
        autoAssignRoles: JSON.stringify(DEFAULT_SETTINGS.autoAssignRoles),
        chatbotEnabled: DEFAULT_SETTINGS.chatbotEnabled,
        chatbotQuestions: JSON.stringify(DEFAULT_SETTINGS.chatbotQuestions),
        chatbotClosing: DEFAULT_SETTINGS.chatbotClosing,
        ...data,
      },
      update: data,
    });
    return this.getSettings();
  }

  // ─── Templates ───────────────────────────────────────────────

  async listTemplates(): Promise<MessageTemplate[]> {
    const rows = await prisma.template.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      body: r.body,
      shortcut: r.shortcut ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getTemplate(id: string): Promise<MessageTemplate | undefined> {
    const r = await prisma.template.findUnique({ where: { id } });
    if (!r) return undefined;
    return {
      id: r.id,
      label: r.label,
      body: r.body,
      shortcut: r.shortcut ?? undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async addTemplate(input: { label: string; body: string; shortcut?: string }): Promise<MessageTemplate> {
    const r = await prisma.template.create({
      data: {
        label: input.label.trim(),
        body: input.body,
        shortcut: input.shortcut?.trim() || null,
      },
    });
    return {
      id: r.id,
      label: r.label,
      body: r.body,
      shortcut: r.shortcut ?? undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async updateTemplate(
    id: string,
    patch: Partial<Pick<MessageTemplate, "label" | "body" | "shortcut">>
  ): Promise<MessageTemplate | undefined> {
    const data: Record<string, unknown> = {};
    if (patch.label !== undefined) data.label = patch.label.trim();
    if (patch.body !== undefined) data.body = patch.body;
    if (patch.shortcut !== undefined) data.shortcut = patch.shortcut?.trim() || null;
    try {
      const r = await prisma.template.update({ where: { id }, data });
      return {
        id: r.id,
        label: r.label,
        body: r.body,
        shortcut: r.shortcut ?? undefined,
        createdAt: r.createdAt.toISOString(),
      };
    } catch {
      return undefined;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await prisma.template.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Chatbot state ───────────────────────────────────────────

  async setChatbotState(contactId: string, state: "idle" | "asking" | "done", step: number, answers: Record<string, string>) {
    try {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          chatbotState: state,
          chatbotStep: step,
          chatbotAnswers: JSON.stringify(answers),
        },
      });
    } catch {
      /* ignore */
    }
  }

  // ─── Tags ────────────────────────────────────────────────────

  async listTags(): Promise<{ id: string; label: string; color: string }[]> {
    const rows = await prisma.tag.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((r) => ({ id: r.id, label: r.label, color: r.color }));
  }

  async addTag(input: { label: string; color: string }): Promise<{ id: string; label: string; color: string }> {
    const r = await prisma.tag.create({
      data: { label: input.label.trim(), color: input.color },
    });
    return { id: r.id, label: r.label, color: r.color };
  }

  async updateTag(id: string, patch: { label?: string; color?: string }) {
    const data: Record<string, string> = {};
    if (patch.label !== undefined) data.label = patch.label.trim();
    if (patch.color !== undefined) data.color = patch.color;
    try {
      const r = await prisma.tag.update({ where: { id }, data });
      return { id: r.id, label: r.label, color: r.color };
    } catch {
      return undefined;
    }
  }

  async deleteTag(id: string): Promise<boolean> {
    try {
      await prisma.tag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Notes ───────────────────────────────────────────────────

  async addNote(contactId: string, content: string, authorId: string): Promise<Note | null> {
    try {
      const n = await prisma.note.create({
        data: {
          contactId,
          content: content.trim(),
          authorId,
        },
      });
      return {
        id: n.id,
        content: n.content,
        authorId: n.authorId,
        createdAt: n.createdAt.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async deleteNote(_contactId: string, noteId: string): Promise<boolean> {
    try {
      await prisma.note.delete({ where: { id: noteId } });
      return true;
    } catch {
      return false;
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __crmStore: CrmStore | undefined;
}

export const crmStore: CrmStore =
  globalThis.__crmStore ?? (globalThis.__crmStore = new CrmStore());
