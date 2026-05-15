import { NextRequest, NextResponse } from "next/server";
import { baileys } from "@/server/baileys/manager";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest) => {
  await baileys.init();
  const lineId = req.nextUrl.searchParams.get("lineId") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  return NextResponse.json({ messages: baileys.recentInbox(lineId, limit) });
});
