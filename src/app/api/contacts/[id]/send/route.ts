import path from "node:path";
import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { baileys } from "@/server/baileys/manager";
import { classifyMime } from "@/server/storage";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "baileys-sessions", "uploads");

interface SendBody {
  text?: string;
  media?: { fileId: string; url: string; name?: string; mime?: string };
}

export const POST = withAuth<{ id: string }>(async (req, { params }) => {
  await crmStore.init();
  await baileys.init();
  const body = (await req.json().catch(() => ({}))) as SendBody;
  const text = body?.text?.trim() ?? "";
  const media = body?.media;
  if (!text && !media) return NextResponse.json({ error: "text o media requerido" }, { status: 400 });

  const contact = await crmStore.get(params.id);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  let lineId = contact.lineId;
  if (!lineId) {
    const line = baileys.firstConnectedLine();
    if (!line) {
      const msg = await crmStore.appendOutbound(params.id, text, undefined,
        media ? { type: classifyMime(media.mime ?? "application/octet-stream"), url: media.url, name: media.name, mime: media.mime } : undefined
      );
      return NextResponse.json({
        ok: true,
        delivered: false,
        warning: "Sin línea de WhatsApp conectada. Mensaje guardado localmente, no enviado.",
        message: msg,
      });
    }
    lineId = line.id;
    await crmStore.patch(params.id, { lineId });
  }

  let result;
  let mediaForStore: { type: "image" | "video" | "audio" | "document"; url: string; name?: string; mime?: string } | undefined;
  if (media) {
    const kind = classifyMime(media.mime ?? "application/octet-stream");
    const filePath = path.join(UPLOAD_DIR, path.basename(media.fileId));
    result = await baileys.sendMedia(lineId, contact.phone, {
      kind, filePath, mime: media.mime, fileName: media.name, caption: text || undefined,
    });
    mediaForStore = { type: kind, url: media.url, name: media.name, mime: media.mime };
  } else {
    result = await baileys.send(lineId, contact.phone, text);
  }
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });

  const msg = await crmStore.appendOutbound(params.id, text, result.id, mediaForStore);
  return NextResponse.json({ ok: true, delivered: true, message: msg });
});
