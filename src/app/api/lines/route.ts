import { NextRequest, NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await baileys.init();
  return NextResponse.json({ lines: baileys.listLines() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, agentId } = body as { name?: string; agentId?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }
  const line = await baileys.createLine(name.trim(), agentId);
  return NextResponse.json({ line });
}
