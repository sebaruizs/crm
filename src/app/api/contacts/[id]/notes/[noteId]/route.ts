import { NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = withAuth<{ id: string; noteId: string }>(async (_req, { params }) => {
  await crmStore.init();
  const ok = await crmStore.deleteNote(params.id, params.noteId);
  if (!ok) return NextResponse.json({ error: "Nota o contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
});
