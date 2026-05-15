import { NextResponse } from "next/server";
import { computeReports } from "@/server/reports";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  const payload = await computeReports();
  return NextResponse.json(payload);
});
