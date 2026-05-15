import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const tag = await crmStore.updateTag(params.id, body);
  if (!tag) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
  return NextResponse.json({ tag });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const ok = await crmStore.deleteTag(params.id);
  if (!ok) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
