import { NextRequest, NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await notificationsStore.init();
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  return NextResponse.json({
    notifications: notificationsStore.listForUser(userId),
    unread: notificationsStore.unreadCountForUser(userId),
  });
}
