import { NextRequest, NextResponse } from "next/server";
import { saveBuffer, classifyMime } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file requerido" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Archivo muy grande (max 20 MB)" }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await saveBuffer(buf, file.name, file.type || "application/octet-stream");
  return NextResponse.json({
    id: stored.id,
    url: `/api/files/${stored.id}`,
    name: stored.originalName,
    mime: stored.mime,
    size: stored.size,
    kind: classifyMime(stored.mime),
  });
}
