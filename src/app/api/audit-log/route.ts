import { NextRequest, NextResponse } from "next/server";
import { listAuditEntries } from "@/server/audit";
import { withAdmin } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAdmin(async (req: NextRequest) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "200");
  const entries = await listAuditEntries(limit);
  return NextResponse.json({ entries });
});
