import { NextResponse } from "next/server";
import { computeReports } from "@/server/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await computeReports();
  return NextResponse.json(payload);
}
