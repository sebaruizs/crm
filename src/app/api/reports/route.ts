import { NextRequest, NextResponse } from "next/server";
import { computeReports } from "@/server/reports";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest) => {
  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  const payload = await computeReports({ from, to });
  return NextResponse.json(payload);
});
