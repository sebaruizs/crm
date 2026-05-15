import { NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";
import { withAuth, withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  await baileys.init();
  return NextResponse.json({ lines: baileys.listLines() });
});

export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => ({}));
  const { name, agentId } = body as { name?: string; agentId?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }
  const line = await baileys.createLine(name.trim(), agentId);
  return NextResponse.json({ line });
});
