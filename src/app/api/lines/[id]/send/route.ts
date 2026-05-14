import { NextRequest, NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const { to, text } = body as { to?: string; text?: string };
  if (!to || !text) {
    return NextResponse.json({ error: "to y text requeridos" }, { status: 400 });
  }
  const result = await baileys.send(params.id, to, text);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
