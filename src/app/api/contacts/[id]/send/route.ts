import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { baileys } from "@/server/baileys/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  await baileys.init();

  const body = await req.json().catch(() => ({}));
  const text = (body?.text as string | undefined)?.trim();
  if (!text) return NextResponse.json({ error: "text requerido" }, { status: 400 });

  const contact = crmStore.get(params.id);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  // Pick the line: contact's assigned line, else first connected line
  let lineId = contact.lineId;
  if (!lineId) {
    const line = baileys.firstConnectedLine();
    if (!line) {
      // No connected line — record the message locally so the demo continues to work,
      // but flag it so the UI can warn the user.
      const msg = crmStore.appendOutbound(params.id, text);
      return NextResponse.json({
        ok: true,
        delivered: false,
        warning: "Sin línea de WhatsApp conectada. Mensaje guardado localmente, no enviado.",
        message: msg,
      });
    }
    lineId = line.id;
    crmStore.patch(params.id, { lineId });
  }

  const result = await baileys.send(lineId, contact.phone, text);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  const msg = crmStore.appendOutbound(params.id, text, result.id);
  return NextResponse.json({ ok: true, delivered: true, message: msg });
}
