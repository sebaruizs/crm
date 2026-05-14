import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const contact = await crmStore.get(params.id);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const contact = await crmStore.patch(params.id, body);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ contact });
}
