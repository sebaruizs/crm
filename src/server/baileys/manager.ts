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
  type WASocket,
} from "@whiskeysockets/baileys";
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
      this.sessions.set(line.id, { line: { ...line, status: "disconnected", qr: undefined } });
      // Auto-reconnect lines that have credentials on disk
      const authDir = path.join(SESSIONS_DIR, line.id);
      if (existsSync(path.join(authDir, "creds.json"))) {
        this.startSocket(line.id).catch(() => {});
      }
    }
  }

  private async loadMeta(): Promise<WhatsAppLine[]> {
    const rows = await prisma.line.findMany();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      agentId: r.agentId ?? undefined,
      status: r.status as WhatsAppLine["status"],
      phoneNumber: r.phoneNumber ?? undefined,
      lastError: r.lastError ?? undefined,
      connectedAt: r.connectedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  private async saveMeta() {
    // Upsert each line currently in memory
    const operations = Array.from(this.sessions.values()).map((s) => {
      const line = s.line;
      return prisma.line.upsert({
        where: { id: line.id },
        create: {
          id: line.id,
          name: line.name,
          agentId: line.agentId,
          status: line.status,
          phoneNumber: line.phoneNumber,
          lastError: line.lastError,
          connectedAt: line.connectedAt ? new Date(line.connectedAt) : null,
          createdAt: new Date(line.createdAt),
        },
        update: {
          name: line.name,
          agentId: line.agentId,
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
    if (!session?.sock || session.line.status !== "connected") {
      return { ok: false, error: "Línea no conectada" };
    }
    const jid = toNumber.includes("@") ? toNumber : `${toNumber.replace(/\D/g, "")}@s.whatsapp.net`;
    try {
      const result = await session.sock.sendMessage(jid, { text });
      return { ok: true, id: result?.key.id ?? undefined };
    } catch (err) {
      return { ok: false, error: String(err) };
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
        const body =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          msg.message?.videoMessage?.caption ??
          "";
        if (!body) continue;
        const fromNumber = remoteJid.split("@")[0].split(":")[0];
        const timestamp = Number(msg.messageTimestamp) * 1000 || Date.now();

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
