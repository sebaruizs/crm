import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await crmStore.init();
  return NextResponse.json({ fields: await crmStore.listCustomFieldDefs() });
}

export async function POST(req: NextRequest) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const { key, label, type, options } = body as { key?: string; label?: string; type?: string; options?: string[] };
  if (!key?.trim()) return NextResponse.json({ error: "key requerido" }, { status: 400 });
  if (!label?.trim()) return NextResponse.json({ error: "label requerido" }, { status: 400 });
  if (!["text", "number", "date", "select"].includes(type ?? "")) {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  }
  try {
    const field = await crmStore.addCustomFieldDef({
      key,
      label,
      type: type as "text" | "number" | "date" | "select",
      options,
    });
    return NextResponse.json({ field });
  } catch (err) {
    return NextResponse.json({ error: "key duplicado o inválido" }, { status: 400 });
  }
}
