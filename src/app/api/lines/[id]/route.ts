import { NextRequest, NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await baileys.init();
  const line = baileys.getLine(params.id);
  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
  return NextResponse.json({ line });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await baileys.remove(params.id);
  return NextResponse.json({ ok: true });
}
