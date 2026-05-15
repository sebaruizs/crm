import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth, withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await crmStore.init();
  return NextResponse.json({ templates: await crmStore.listTemplates() });
});

export const POST = withAdmin(async (req) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const { label, body: text, shortcut } = body as { label?: string; body?: string; shortcut?: string };
  if (!label?.trim() || !text?.trim()) return NextResponse.json({ error: "label y body requeridos" }, { status: 400 });
  const tpl = await crmStore.addTemplate({ label, body: text, shortcut });
  return NextResponse.json({ template: tpl });
});
