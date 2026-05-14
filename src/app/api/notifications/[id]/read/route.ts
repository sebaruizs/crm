import { NextRequest, NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await notificationsStore.init();
  const body = await req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  const n = notificationsStore.markRead(params.id, userId);
  if (!n) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  return NextResponse.json({ notification: n });
}
