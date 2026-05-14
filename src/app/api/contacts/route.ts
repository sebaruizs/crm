import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await crmStore.init();
  return NextResponse.json({ contacts: await crmStore.list() });
}
