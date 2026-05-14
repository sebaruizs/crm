import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/server/store/crm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await crmStore.init();
  const body = await req.json().catch(() => ({}));
  const { content, authorId } = body as { content?: string; authorId?: string };
  if (!content?.trim()) return NextResponse.json({ error: "content requerido" }, { status: 400 });
  if (!authorId) return NextResponse.json({ error: "authorId requerido" }, { status: 400 });
  const note = crmStore.addNote(params.id, content, authorId);
  if (!note) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  return NextResponse.json({ note });
}
