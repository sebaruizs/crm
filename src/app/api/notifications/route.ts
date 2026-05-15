import { NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, _ctx, user) => {
  await notificationsStore.init();
  const [notifications, unread] = await Promise.all([
    notificationsStore.listForUser(user.id),
    notificationsStore.unreadCountForUser(user.id),
  ]);
  return NextResponse.json({ notifications, unread });
});
