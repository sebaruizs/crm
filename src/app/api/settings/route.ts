import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth, withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await crmStore.init();
  return NextResponse.json({ settings: await crmStore.getSettings() });
});

export const PATCH = withAdmin(async (req) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const next = await crmStore.updateSettings(body);
  return NextResponse.json({ settings: next });
});
