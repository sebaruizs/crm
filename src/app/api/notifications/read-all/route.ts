import { NextRequest, NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await notificationsStore.init();
  const body = await req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  const updated = await notificationsStore.markAllRead(userId);
  return NextResponse.json({ updated });
}
