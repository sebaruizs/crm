export type LineStatus = "connecting" | "qr" | "connected" | "disconnected" | "error";

export interface WhatsAppLine {
  id: string;
  name: string;
  agentId?: string;
  status: LineStatus;
  qr?: string;             // data URL of QR PNG when status === "qr"
  phoneNumber?: string;    // E.164 once connected
  lastError?: string;
  connectedAt?: string;
  createdAt: string;
}

export interface InboundMessage {
  id: string;
  lineId: string;
  from: string;            // remoteJid: "5219991234567@s.whatsapp.net"
  fromNumber: string;      // just the digits
  fromName?: string;
  body: string;
  timestamp: number;
  isGroup: boolean;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}
