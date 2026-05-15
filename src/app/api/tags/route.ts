import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await crmStore.init();
  return NextResponse.json({ tags: await crmStore.listTags() });
}

export async function POST(req: NextRequest) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const { label, color } = body as { label?: string; color?: string };
  if (!label?.trim()) return NextResponse.json({ error: "label requerido" }, { status: 400 });
  if (!color) return NextResponse.json({ error: "color requerido" }, { status: 400 });
  const tag = await crmStore.addTag({ label, color });
  return NextResponse.json({ tag });
}
