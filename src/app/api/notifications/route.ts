import { NextRequest, NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await notificationsStore.init();
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  const [notifications, unread] = await Promise.all([
    notificationsStore.listForUser(userId),
    notificationsStore.unreadCountForUser(userId),
  ]);
  return NextResponse.json({ notifications, unread });
}
