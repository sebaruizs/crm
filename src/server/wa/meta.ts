import "server-only";

/**
 * WhatsApp Business Platform — Cloud API (Meta).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * A "line" using this provider is just a stored set of credentials:
 *   - phoneNumberId: identifies the WhatsApp business number in Meta
 *   - accessToken: long-lived token (or system-user token) to call Graph API
 *   - verifyToken: shared secret to validate incoming webhook subscription
 *
 * No persistent socket, no QR. Outbound = HTTP POST to Graph API.
 * Inbound = Meta posts to our webhook /api/wa-webhook/[lineId].
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface MetaVerifyResult {
  ok: boolean;
  displayPhoneNumber?: string;
  verifiedName?: string;
  error?: string;
}

/**
 * Validates that the accessToken + phoneNumberId combo works by reading
 * the number's profile from Graph API. Used at link time.
 */
export async function verifyMetaCredentials(
  phoneNumberId: string,
  accessToken: string
): Promise<MetaVerifyResult> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return {
      ok: true,
      displayPhoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
    };
  } catch (err) {
    return { ok: false, error: `Network: ${String(err)}` };
  }
}

export interface MetaSendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a plain text message via Meta Cloud API.
 */
export async function sendMetaText(
  phoneNumberId: string,
  accessToken: string,
  toNumber: string,
  text: string
): Promise<MetaSendResult> {
  try {
    const body = {
      messaging_product: "whatsapp",
      to: toNumber.replace(/\D/g, ""),
      type: "text",
      text: { body: text, preview_url: false },
    };
    const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: data?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: `Network: ${String(err)}` };
  }
}

// ─── Webhook parsing ───────────────────────────────────────────

export interface ParsedMetaMessage {
  id: string;
  from: string;       // e.g. "5219991234567"
  fromName?: string;
  body: string;
  timestamp: number;  // ms
  type: "text" | "image" | "video" | "audio" | "document" | "unsupported";
  mediaId?: string;
  mediaMime?: string;
  mediaFileName?: string;
}

interface MetaWebhookEntry {
  changes?: Array<{
    field: string;
    value: {
      contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
      messages?: Array<{
        id: string;
        from: string;
        timestamp: string;
        type: string;
        text?: { body?: string };
        image?: { id?: string; mime_type?: string; caption?: string };
        video?: { id?: string; mime_type?: string; caption?: string };
        audio?: { id?: string; mime_type?: string };
        document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
      }>;
    };
  }>;
}

interface MetaWebhookBody {
  object?: string;
  entry?: MetaWebhookEntry[];
}

/**
 * Extracts message events from a Meta webhook POST body.
 */
export function parseMetaWebhook(body: unknown): ParsedMetaMessage[] {
  const out: ParsedMetaMessage[] = [];
  const data = body as MetaWebhookBody;
  if (!data?.entry) return out;
  for (const entry of data.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const contactName = value.contacts?.[0]?.profile?.name;
      for (const m of value.messages ?? []) {
        const tsMs = Number(m.timestamp) * 1000 || Date.now();
        const base = {
          id: m.id,
          from: m.from,
          fromName: contactName,
          timestamp: tsMs,
        };
        if (m.type === "text") {
          out.push({ ...base, body: m.text?.body ?? "", type: "text" });
        } else if (m.type === "image") {
          out.push({
            ...base,
            body: m.image?.caption ?? "",
            type: "image",
            mediaId: m.image?.id,
            mediaMime: m.image?.mime_type,
          });
        } else if (m.type === "video") {
          out.push({
            ...base,
            body: m.video?.caption ?? "",
            type: "video",
            mediaId: m.video?.id,
            mediaMime: m.video?.mime_type,
          });
        } else if (m.type === "audio") {
          out.push({
            ...base,
            body: "",
            type: "audio",
            mediaId: m.audio?.id,
            mediaMime: m.audio?.mime_type,
          });
        } else if (m.type === "document") {
          out.push({
            ...base,
            body: m.document?.caption ?? "",
            type: "document",
            mediaId: m.document?.id,
            mediaMime: m.document?.mime_type,
            mediaFileName: m.document?.filename,
          });
        } else {
          out.push({ ...base, body: `(mensaje no soportado: ${m.type})`, type: "unsupported" });
        }
      }
    }
  }
  return out;
}

/**
 * Downloads a media item from Meta's storage. Returns the bytes + mime.
 * Meta requires a 2-step process: GET /{mediaId} to obtain the URL,
 * then GET the URL with the auth header.
 */
export async function downloadMetaMedia(
  mediaId: string,
  accessToken: string
): Promise<{ buf: Buffer; mime: string } | null> {
  try {
    const metaRes = await fetch(`${GRAPH_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metaData = await metaRes.json();
    if (!metaRes.ok || !metaData?.url) return null;
    const fileRes = await fetch(metaData.url as string, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) return null;
    const arr = await fileRes.arrayBuffer();
    return { buf: Buffer.from(arr), mime: metaData.mime_type ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
