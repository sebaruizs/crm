import { NextResponse } from "next/server";
import { notificationsStore } from "@/server/store/notifications-store";
import { withAuth } from "@/server/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth<{ id: string }>(async (_req, { params }, user) => {
  await notificationsStore.init();
  const n = await notificationsStore.markRead(params.id, user.id);
  if (!n) return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
  return NextResponse.json({ notification: n });
});
