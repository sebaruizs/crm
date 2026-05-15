import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await crmStore.init();
  return NextResponse.json({ contacts: await crmStore.list() });
}

export async function POST(req: NextRequest) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const { name, phone, source } = body as { name?: string; phone?: string; source?: string };
  if (!name?.trim()) return NextResponse.json({ error: "name requerido" }, { status: 400 });
  if (!phone?.trim()) return NextResponse.json({ error: "phone requerido" }, { status: 400 });
  const normalizedPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.replace(/\D/g, "")}`;

  // Avoid duplicates by normalized digits
  const existing = await crmStore.findByPhone(normalizedPhone);
  if (existing) {
    return NextResponse.json({ error: "Ya existe un contacto con ese teléfono", contact: existing }, { status: 409 });
  }

  const created = await prisma.contact.create({
    data: {
      name: name.trim(),
      phone: normalizedPhone,
      source: source ?? "manual",
      status: "nuevo_lead",
      tagIds: "[]",
      whatsAppStatus: "connected",
      customFields: "[]",
    },
  });
  const contact = await crmStore.get(created.id);
  return NextResponse.json({ contact });
}
