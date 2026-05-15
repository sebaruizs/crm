import { NextResponse } from "next/server";
import { readFileById } from "@/server/storage";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  const result = await readFileById(params.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(new Uint8Array(result.buf), {
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "private, max-age=86400",
    },
  });
});
