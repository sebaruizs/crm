import { NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth<{ id: string }>(async (req, { params }) => {
  const body = await req.json().catch(() => ({}));
  const { to, text } = body as { to?: string; text?: string };
  if (!to || !text) {
    return NextResponse.json({ error: "to y text requeridos" }, { status: 400 });
  }
  const result = await baileys.send(params.id, to, text);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
});
