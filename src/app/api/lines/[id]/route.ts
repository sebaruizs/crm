import { NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";
import { withAuth, withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  await baileys.init();
  const line = baileys.getLine(params.id);
  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 });
  return NextResponse.json({ line });
});

export const DELETE = withAdmin<{ id: string }>(async (_req, { params }) => {
  await baileys.remove(params.id);
  return NextResponse.json({ ok: true });
});
