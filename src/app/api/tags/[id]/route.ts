import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAdmin<{ id: string }>(async (req, { params }) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const tag = await crmStore.updateTag(params.id, body);
  if (!tag) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
  return NextResponse.json({ tag });
});

export const DELETE = withAdmin<{ id: string }>(async (_req, { params }) => {
  await crmStore.init();
  const ok = await crmStore.deleteTag(params.id);
  if (!ok) return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
