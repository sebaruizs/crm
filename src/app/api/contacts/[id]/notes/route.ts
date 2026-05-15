import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth<{ id: string }>(async (req, { params }, user) => {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const content = (body?.content as string | undefined)?.trim();
  if (!content) return NextResponse.json({ error: "content requerido" }, { status: 400 });
  const note = await crmStore.addNote(params.id, content, user.id);
  if (!note) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ note });
});
