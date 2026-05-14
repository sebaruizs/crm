import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  await crmStore.init();
  const ok = await crmStore.deleteNote(params.id, params.noteId);
  if (!ok) return NextResponse.json({ error: "Nota o contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
