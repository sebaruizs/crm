import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await crmStore.init();
  return NextResponse.json({ settings: crmStore.getSettings() });
}

export async function PATCH(req: NextRequest) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const next = crmStore.updateSettings(body);
  return NextResponse.json({ settings: next });
}
