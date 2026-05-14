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

const SESSIONS_DIR = path.join(process.cwd(), "baileys-sessions");
const META_FILE = path.join(SESSIONS_DIR, "lines.json");
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
    try {
      const raw = await fs.readFile(META_FILE, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async saveMeta() {
    const lines = Array.from(this.sessions.values()).map((s) => ({
      ...s.line,
      qr: undefined, // don't persist QR
    }));
    await fs.writeFile(META_FILE, JSON.stringify(lines, null, 2));
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
    await this.saveMeta();
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

    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) continue;
        const isGroup = remoteJid.endsWith("@g.us");
        const body =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          msg.message?.videoMessage?.caption ??
          "";
        if (!body) continue;
        const fromNumber = remoteJid.split("@")[0].split(":")[0];
        this.inbox.push({
          id: msg.key.id ?? randomUUID(),
          lineId: id,
          from: remoteJid,
          fromNumber,
          fromName: msg.pushName ?? undefined,
          body,
          timestamp: Number(msg.messageTimestamp) * 1000 || Date.now(),
          isGroup,
        });
        if (this.inbox.length > MAX_INBOX) this.inbox.shift();
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
