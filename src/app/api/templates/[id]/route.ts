import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const tpl = await crmStore.updateTemplate(params.id, body);
  if (!tpl) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  return NextResponse.json({ template: tpl });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const ok = await crmStore.deleteTemplate(params.id);
  if (!ok) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
