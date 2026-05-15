import { NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req, _ctx, user) => {
  await notificationsStore.init();
  const updated = await notificationsStore.markAllRead(user.id);
  return NextResponse.json({ updated });
});
