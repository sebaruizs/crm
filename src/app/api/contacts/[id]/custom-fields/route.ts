import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const fields = body.fields;
  if (!Array.isArray(fields)) {
    return NextResponse.json({ error: "fields debe ser un array" }, { status: 400 });
  }
  const ok = await crmStore.setContactCustomFields(params.id, fields);
  if (!ok) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
