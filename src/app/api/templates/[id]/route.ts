import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAdmin<{ id: string }>(async (req, { params }) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const tpl = await crmStore.updateTemplate(params.id, body);
  if (!tpl) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  return NextResponse.json({ template: tpl });
});

export const DELETE = withAdmin<{ id: string }>(async (_req, { params }) => {
  await crmStore.init();
  const ok = await crmStore.deleteTemplate(params.id);
  if (!ok) return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
