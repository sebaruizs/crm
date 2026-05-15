import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  await crmStore.init();
  const contact = await crmStore.get(params.id);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ contact });
});

export const PATCH = withAuth<{ id: string }>(async (req, { params }) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const contact = await crmStore.patch(params.id, body);
  if (!contact) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ contact });
});
