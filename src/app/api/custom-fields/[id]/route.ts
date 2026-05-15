import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const field = await crmStore.updateCustomFieldDef(params.id, body);
  if (!field) return NextResponse.json({ error: "Campo no encontrado" }, { status: 404 });
  return NextResponse.json({ field });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const ok = await crmStore.deleteCustomFieldDef(params.id);
  if (!ok) return NextResponse.json({ error: "Campo no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
