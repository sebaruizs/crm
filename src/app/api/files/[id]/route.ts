import { NextRequest } from "next/server";
import { readFileById } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await readFileById(params.id);
  if (!result) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(result.buf), {
    headers: {
      "Content-Type": result.mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
