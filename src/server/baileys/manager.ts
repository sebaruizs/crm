import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  type WASocket,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { saveBuffer, classifyMime } from "@/server/storage";
import { Boom } from "@hapi/boom";
import type { WhatsAppLine, InboundMessage, SendResult } from "./types";
import { crmStore } from "@/server/store/crm-store";
import { usersStore } from "@/server/store/users-store";
import { prisma } from "@/lib/prisma";
import { importLegacyJsonOnce } from "@/server/store/migrate-from-json";

const SESSIONS_DIR = path.join(process.cwd(), "baileys-sessions");
const MAX_INBOX = 200;

interface Session {
  line: WhatsAppLine;
  sock?: WASocket;
}

class BaileysManager {
  private sessions = new Map<string, Session>();
  private inbox: InboundMessage[] = [];
  private logger = pino({ level: "silent" });
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    await importLegacyJsonOnce();
    const lines = await this.loadMeta();
    for (const line of lines) {
      this.sessions.set(line.id, { line: { ...line, status: line.status, qr: undefined } });
      // Auto-reconnect Baileys lines that have credentials on disk
      if (line.provider === "baileys") {
        const authDir = path.join(SESSIONS_DIR, line.id);
        if (existsSync(path.join(authDir, "creds.json"))) {
          this.startSocket(line.id).catch(() => {});
        } else {
          this.sessions.get(line.id)!.line.status = "disconnected";
        }
      }
      // Meta lines: status persisted in DB ("connected" or "disconnected").
      // No socket to start, credentials are loaded on demand.
    }
  }

  private async loadMeta(): Promise<WhatsAppLine[]> {
    const rows = await prisma.line.findMany();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      agentId: r.agentId ?? undefined,
      provider: (r.provider as WhatsAppLine["provider"]) ?? "baileys",
      status: r.status as WhatsAppLine["status"],
      phoneNumber: r.phoneNumber ?? undefined,
      lastError: r.lastError ?? undefined,
      connectedAt: r.connectedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      phoneNumberId: r.phoneNumberId ?? undefined,
      verifyToken: r.verifyToken ?? undefined,
      wabaId: r.wabaId ?? undefined,
    }));
  }

  private async saveMeta() {
    const operations = Array.from(this.sessions.values()).map((s) => {
      const line = s.line;
      return prisma.line.upsert({
        where: { id: line.id },
        create: {
          id: line.id,
          name: line.name,
          agentId: line.agentId,
          provider: line.provider,
          status: line.status,
          phoneNumber: line.phoneNumber,
          lastError: line.lastError,
          connectedAt: line.connectedAt ? new Date(line.connectedAt) : null,
          createdAt: new Date(line.createdAt),
          phoneNumberId: line.phoneNumberId ?? null,
          verifyToken: line.verifyToken ?? null,
          wabaId: line.wabaId ?? null,
        },
        update: {
          name: line.name,
          agentId: line.agentId,
          provider: line.provider,
          status: line.status,
          phoneNumber: line.phoneNumber,
          lastError: line.lastError,
          connectedAt: line.connectedAt ? new Date(line.connectedAt) : null,
        },
      });
    });
    if (operations.length > 0) await prisma.$transaction(operations);
  }

  async createLine(name: string, agentId?: string): Promise<WhatsAppLine> {
    await this.init();
    const id = randomUUID();
    const line: WhatsAppLine = {
      id,
      name,
      agentId,
      provider: "baileys",
      status: "connecting",
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(id, { line });
    await this.saveMeta();
    this.startSocket(id).catch((err) => {
      const s = this.sessions.get(id);
      if (s) {
        s.line.status = "error";
        s.line.lastError = String(err);
      }
    });
    return line;
  }

  /**
   * Creates a Meta Cloud API line. Credentials are validated against Graph API
   * before persisting. If valid, the line is marked "connected" immediately
   * (no QR step). The verifyToken is auto-generated for webhook security.
   */
  async createMetaLine(input: {
    name: string;
    agentId?: string;
    phoneNumberId: string;
    accessToken: string;
    wabaId?: string;
  }): Promise<{ ok: true; line: WhatsAppLine } | { ok: false; error: string }> {
    await this.init();
    // Validate creds against Graph API
    const { verifyMetaCredentials } = await import("@/server/wa/meta");
    const verify = await verifyMetaCredentials(input.phoneNumberId, input.accessToken);
    if (!verify.ok) {
      return { ok: false, error: verify.error ?? "Credenciales inválidas" };
    }
    const id = randomUUID();
    const verifyToken = randomUUID().replace(/-/g, "");
    await prisma.line.create({
      data: {
        id,
        name: input.name,
        agentId: input.agentId,
        provider: "meta",
        status: "connected",
        phoneNumber: verify.displayPhoneNumber,
        connectedAt: new Date(),
        phoneNumberId: input.phoneNumberId,
        accessToken: input.accessToken,
        verifyToken,
        wabaId: input.wabaId ?? null,
      },
    });
    const line: WhatsAppLine = {
      id,
      name: input.name,
      agentId: input.agentId,
      provider: "meta",
      status: "connected",
      phoneNumber: verify.displayPhoneNumber,
      connectedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      phoneNumberId: input.phoneNumberId,
      verifyToken,
      wabaId: input.wabaId,
    };
    this.sessions.set(id, { line });
    return { ok: true, line };
  }

  /**
   * Returns server-side credentials for a Meta line. Never expose this
   * via API responses — only for internal send/webhook handlers.
   */
  async getMetaCredentials(lineId: string): Promise<{ phoneNumberId: string; accessToken: string; verifyToken: string } | null> {
    const row = await prisma.line.findUnique({ where: { id: lineId } });
    if (!row || row.provider !== "meta" || !row.phoneNumberId || !row.accessToken) return null;
    return {
      phoneNumberId: row.phoneNumberId,
      accessToken: row.accessToken,
      verifyToken: row.verifyToken ?? "",
    };
  }

  listLines(): WhatsAppLine[] {
    return Array.from(this.sessions.values()).map((s) => s.line);
  }

  getLine(id: string): WhatsAppLine | undefined {
    return this.sessions.get(id)?.line;
  }

  recentInbox(lineId?: string, limit = 50): InboundMessage[] {
    const msgs = lineId ? this.inbox.filter((m) => m.lineId === lineId) : this.inbox;
    return msgs.slice(-limit).reverse();
  }

  async disconnect(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;
    try {
      await session.sock?.logout();
    } catch {
      /* ignore */
    }
    session.sock = undefined;
    session.line.status = "disconnected";
    session.line.qr = undefined;
    await this.saveMeta();
  }

  async remove(id: string): Promise<void> {
    await this.disconnect(id);
    this.sessions.delete(id);
    const authDir = path.join(SESSIONS_DIR, id);
    await fs.rm(authDir, { recursive: true, force: true });
    await prisma.line.deleteMany({ where: { id } });
  }

  async send(lineId: string, toNumber: string, text: string): Promise<SendResult> {
    const session = this.sessions.get(lineId);
    if (!session) return { ok: false, error: "Línea no encontrada" };
    if (session.line.status !== "connected") {
      return { ok: false, error: "Línea no conectada" };
    }

    // Meta Cloud API path
    if (session.line.provider === "meta") {
      const creds = await this.getMetaCredentials(lineId);
      if (!creds) return { ok: false, error: "Credenciales Meta no disponibles" };
      const { sendMetaText } = await import("@/server/wa/meta");
      return sendMetaText(creds.phoneNumberId, creds.accessToken, toNumber, text);
    }

    // Baileys path
    if (!session.sock) return { ok: false, error: "Socket Baileys no inicializado" };
    const jid = toNumber.includes("@") ? toNumber : `${toNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    try {
      const result = await session.sock.sendMessage(jid, { text });
      return { ok: true, id: result?.key.id ?? undefined };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Public helper used by the Meta webhook to push an inbound message
   * into the same debug inbox that /lineas shows.
   */
  pushDebugInbox(msg: InboundMessage) {
    this.inbox.push(msg);
    if (this.inbox.length > MAX_INBOX) this.inbox.shift();
  }

  async sendMedia(
    lineId: string,
    toNumber: string,
    media: {
      kind: "image" | "video" | "audio" | "document";
      filePath: string; // local server path
      mime?: string;
      fileName?: string;
      caption?: string;
    }
  ): Promise<SendResult> {
    const session = this.sessions.get(lineId);
    if (!session?.sock || session.line.status !== "connected") {
      return { ok: false, error: "Línea no conectada" };
    }
    const jid = toNumber.includes("@") ? toNumber : `${toNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    try {
      let content: Parameters<WASocket["sendMessage"]>[1];
      if (media.kind === "image") {
        content = { image: { url: media.filePath }, caption: media.caption, mimetype: media.mime };
      } else if (media.kind === "video") {
        content = { video: { url: media.filePath }, caption: media.caption, mimetype: media.mime };
      } else if (media.kind === "audio") {
        content = { audio: { url: media.filePath }, mimetype: media.mime ?? "audio/mp4" };
      } else {
        content = {
          document: { url: media.filePath },
          mimetype: media.mime ?? "application/octet-stream",
          fileName: media.fileName ?? path.basename(media.filePath),
          caption: media.caption,
        };
      }
      const result = await session.sock.sendMessage(jid, content);
      return { ok: true, id: result?.key.id ?? undefined };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Walks a contact through the configured chatbot flow. Called on every
   * inbound message. Handles three cases:
   *  - First time: contact is "idle" → save the just-received inbound as the
   *    answer to nothing (it's their initial message), then send question[0]
   *    and move to step 1, state "asking".
   *  - Subsequent: contact is "asking", their inbound is the answer to
   *    questions[step-1]. Save it, advance step. If more questions remain,
   *    send the next one. Otherwise send the closing message, mark "done",
   *    and apply qualification rules.
   *  - Already done: skip.
   */
  private async runChatbotStep(lineId: string, contactId: string, toNumber: string, inboundBody: string) {
    const contact = await crmStore.get(contactId);
    if (!contact) return;
    const stateRaw = (contact as unknown as { chatbotState?: string }).chatbotState;
    const stepRaw = (contact as unknown as { chatbotStep?: number }).chatbotStep ?? 0;
    if (stateRaw === "done") return;
    const settings = await crmStore.getSettings();
    const questions = settings.chatbotQuestions;
    if (questions.length === 0) return;

    // Load current answers
    const answersRaw = (contact as unknown as { chatbotAnswers?: string }).chatbotAnswers ?? "{}";
    let answers: Record<string, string> = {};
    try { answers = JSON.parse(answersRaw); } catch { /* ignore */ }

    // If first interaction (idle), don't store body as answer — just ask Q1.
    if (stateRaw === "idle" || !stateRaw) {
      const q = questions[0];
      const text = q.text.replace(/\{\{nombre\}\}/g, contact.name.split(" ")[0].replace(/^\+/, ""));
      await this.sendChatbotText(lineId, contactId, toNumber, text);
      await crmStore.setChatbotState(contactId, "asking", 1, answers);
      return;
    }

    // state === "asking" — current body is the answer to questions[stepRaw - 1]
    const answeredQ = questions[stepRaw - 1];
    if (answeredQ) {
      answers[answeredQ.key] = inboundBody;
    }

    // Decide next question or close
    if (stepRaw >= questions.length) {
      // Finished — send closing + apply qualification
      await this.sendChatbotText(lineId, contactId, toNumber, settings.chatbotClosing);
      await crmStore.setChatbotState(contactId, "done", stepRaw, answers);

      // Qualification: if any failsIfNo question got a "no" answer, mark no_califica
      const failed = questions.some((q) => {
        if (q.type !== "yes_no" || !q.failsIfNo) return false;
        const a = (answers[q.key] ?? "").trim().toLowerCase();
        return a === "no" || a.startsWith("n");
      });
      if (failed) {
        await crmStore.patch(contactId, { status: "no_califica" });
      }
      return;
    }

    // Send next question
    const next = questions[stepRaw];
    const text = next.text.replace(/\{\{nombre\}\}/g, contact.name.split(" ")[0].replace(/^\+/, ""));
    await this.sendChatbotText(lineId, contactId, toNumber, text);
    await crmStore.setChatbotState(contactId, "asking", stepRaw + 1, answers);
  }

  private async sendChatbotText(lineId: string, contactId: string, toNumber: string, text: string) {
    const res = await this.send(lineId, toNumber, text);
    if (res.ok) {
      await crmStore.appendOutbound(contactId, text, res.id);
    }
  }

  /** Returns the first connected line, or null if none. */
  firstConnectedLine(): WhatsAppLine | null {
    const sessions = Array.from(this.sessions.values());
    for (const s of sessions) {
      if (s.line.status === "connected") return s.line;
    }
    return null;
  }

  private async startSocket(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    const authDir = path.join(SESSIONS_DIR, id);
    await fs.mkdir(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: this.logger,
      printQRInTerminal: false,
      browser: ["AutoFlota CRM", "Chrome", "1.0.0"],
    });

    session.sock = sock;
    session.line.status = "connecting";
    session.line.qr = undefined;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 300 });
          session.line.status = "qr";
          session.line.qr = dataUrl;
        } catch {
          /* ignore */
        }
      }
      if (connection === "open") {
        session.line.status = "connected";
        session.line.qr = undefined;
        session.line.connectedAt = new Date().toISOString();
        const me = sock.user?.id?.split(":")[0]?.split("@")[0];
        session.line.phoneNumber = me;
        await this.saveMeta();
      } else if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        if (loggedOut) {
          session.line.status = "disconnected";
          session.line.qr = undefined;
          session.sock = undefined;
          await fs.rm(authDir, { recursive: true, force: true });
          await this.saveMeta();
        } else {
          session.line.status = "connecting";
          setTimeout(() => this.startSocket(id).catch(() => {}), 2000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      await crmStore.init();
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;
        const isGroup = remoteJid.endsWith("@g.us");
        if (isGroup) continue; // skip group chats for CRM ingestion

        // Detect media on the message
        const imageMsg = msg.message?.imageMessage;
        const videoMsg = msg.message?.videoMessage;
        const audioMsg = msg.message?.audioMessage;
        const documentMsg = msg.message?.documentMessage ?? msg.message?.documentWithCaptionMessage?.message?.documentMessage;
        const hasMedia = !!(imageMsg || videoMsg || audioMsg || documentMsg);

        const body =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          imageMsg?.caption ??
          videoMsg?.caption ??
          documentMsg?.caption ??
          (hasMedia ? "" : "");
        if (!body && !hasMedia) continue;
        const fromNumber = remoteJid.split("@")[0].split(":")[0];
        const timestamp = Number(msg.messageTimestamp) * 1000 || Date.now();

        // Download media if present (skip audio for now — saves bandwidth)
        let mediaMeta: {
          type: "image" | "video" | "audio" | "document";
          url: string;
          name?: string;
          mime?: string;
        } | undefined;
        if (hasMedia) {
          try {
            const buf = (await downloadMediaMessage(
              msg as WAMessage,
              "buffer",
              {},
              { logger: this.logger as never, reuploadRequest: sock.updateMediaMessage }
            )) as Buffer;
            const mime =
              imageMsg?.mimetype ||
              videoMsg?.mimetype ||
              audioMsg?.mimetype ||
              documentMsg?.mimetype ||
              "application/octet-stream";
            const fileName = documentMsg?.fileName || `wa-${Date.now()}.${mime.split("/")[1] ?? "bin"}`;
            const stored = await saveBuffer(buf, fileName, mime);
            mediaMeta = {
              type: classifyMime(mime),
              url: `/api/files/${stored.id}`,
              name: documentMsg?.fileName ?? undefined,
              mime,
            };
          } catch (err) {
            console.warn("[baileys] media download failed:", err);
          }
        }

        // Extract click-to-WhatsApp ad metadata from Meta, if present.
        // Lives in extendedTextMessage.contextInfo.externalAdReply for ad-sourced messages.
        const adReply = msg.message?.extendedTextMessage?.contextInfo?.externalAdReply
          ?? msg.message?.imageMessage?.contextInfo?.externalAdReply
          ?? msg.message?.videoMessage?.contextInfo?.externalAdReply;
        let adMeta: {
          adId?: string;
          adHeadline?: string;
          adSourceUrl?: string;
          adPlatform?: "facebook" | "instagram";
          adCtwaClid?: string;
        } | undefined;
        if (adReply) {
          const sourceType = (adReply.sourceType ?? "").toLowerCase();
          const platform: "facebook" | "instagram" =
            sourceType.includes("ig") || (adReply.sourceUrl ?? "").includes("instagram.com")
              ? "instagram"
              : "facebook";
          adMeta = {
            adId: adReply.sourceId ?? undefined,
            adHeadline: adReply.title ?? adReply.body ?? undefined,
            adSourceUrl: adReply.sourceUrl ?? undefined,
            adPlatform: platform,
            adCtwaClid: adReply.ctwaClid ?? undefined,
          };
        }

        // Keep raw inbox for the /lineas page
        this.inbox.push({
          id: msg.key.id ?? randomUUID(),
          lineId: id,
          from: remoteJid,
          fromNumber,
          fromName: msg.pushName ?? undefined,
          body,
          timestamp,
          isGroup,
        });
        if (this.inbox.length > MAX_INBOX) this.inbox.shift();

        // Upsert into the CRM (creates contact if unknown, appends message)
        const { contact, isNew } = await crmStore.upsertFromInbound({
          lineId: id,
          fromNumber,
          fromName: msg.pushName ?? undefined,
          body,
          adMeta,
          mediaMeta,
          timestamp,
          messageId: msg.key.id ?? undefined,
        });

        // For brand-new contacts, run automations:
        if (isNew) {
          const settings = await crmStore.getSettings();

          if (settings.autoAssignEnabled) {
            await usersStore.init();
            const usersList = await usersStore.list();
            const eligible = usersList
              .filter((u) => settings.autoAssignRoles.includes(u.role))
              .map((u) => ({ id: u.id }));
            await crmStore.autoAssign(contact.id, eligible, settings.autoAssignStrategy);
          }

          if (settings.welcomeEnabled && settings.welcomeTemplateId) {
            const tpl = await crmStore.getTemplate(settings.welcomeTemplateId);
            if (tpl) {
              const firstName = contact.name.split(" ")[0].replace(/^\+/, "");
              const text = tpl.body.replace(/\{\{nombre\}\}/g, firstName);
              this.send(id, fromNumber, text).then(async (res) => {
                if (res.ok) {
                  await crmStore.appendOutbound(contact.id, text, res.id);
                }
              }).catch(() => {});
            }
          }
        }

        // Chatbot flow handling
        try {
          const settings = await crmStore.getSettings();
          if (settings.chatbotEnabled && settings.chatbotQuestions.length > 0) {
            await this.runChatbotStep(id, contact.id, fromNumber, body);
          }
        } catch (err) {
          console.warn("[chatbot] step failed:", err);
        }
      }
    });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __baileysManager: BaileysManager | undefined;
}

export const baileys: BaileysManager =
  globalThis.__baileysManager ?? (globalThis.__baileysManager = new BaileysManager());
