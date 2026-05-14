"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppNotification, NotificationType } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn, formatRelativeTime } from "@/lib/utils";

const POLL_MS = 8000;
const DESKTOP_PREF_KEY = "crm.desktopNotifications.v1";

const TYPE_META: Record<NotificationType, { icon: React.ReactNode; tone: string; label: string }> = {
  new_message: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    tone: "bg-blue-100 text-blue-600",
    label: "Nuevo mensaje",
  },
  new_assignment: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    tone: "bg-purple-100 text-purple-600",
    label: "Te asignaron una conversación",
  },
  auto_assignment: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    tone: "bg-amber-100 text-amber-600",
    label: "Lead nuevo asignado automáticamente",
  },
};

export default function NotificationsBell() {
  const router = useRouter();
  const { currentUser } = useAgents();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Load desktop preference
  useEffect(() => {
    try {
      const v = localStorage.getItem(DESKTOP_PREF_KEY);
      setDesktopEnabled(v === "1" && typeof Notification !== "undefined" && Notification.permission === "granted");
    } catch {
      /* ignore */
    }
  }, []);

  async function refresh() {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`, { cache: "no-store" });
      const data = await res.json();
      const list: AppNotification[] = data.notifications ?? [];
      setNotifications(list);
      setUnread(data.unread ?? 0);

      // Desktop notification for new ones (skip first load)
      if (initializedRef.current && desktopEnabled && typeof Notification !== "undefined") {
        for (const n of list) {
          if (!lastSeenIdsRef.current.has(n.id) && !n.readAt) {
            try {
              new Notification(n.contactName, { body: n.body });
            } catch { /* ignore */ }
          }
        }
      }
      lastSeenIdsRef.current = new Set(list.map((n) => n.id));
      initializedRef.current = true;
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!currentUser) return;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, desktopEnabled]);

  async function toggleDesktop() {
    if (typeof Notification === "undefined") return;
    if (desktopEnabled) {
      localStorage.setItem(DESKTOP_PREF_KEY, "0");
      setDesktopEnabled(false);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem(DESKTOP_PREF_KEY, "1");
      setDesktopEnabled(true);
    }
  }

  async function handleClickNotification(n: AppNotification) {
    if (!currentUser) return;
    setOpen(false);
    // Mark as read
    fetch(`/api/notifications/${n.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    }).catch(() => {});
    router.push(`/conversaciones?contact=${n.contactId}`);
    setNotifications((list) =>
      list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
    );
    setUnread((u) => Math.max(0, u - (n.readAt ? 0 : 1)));
  }

  async function handleMarkAllRead() {
    if (!currentUser) return;
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        )}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 max-h-[36rem] bg-white border border-slate-200 rounded-lg shadow-2xl z-40 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDesktop}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
                    desktopEnabled
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                  title="Notificaciones del navegador"
                >
                  {desktopEnabled ? "🔔 Escritorio" : "🔕 Escritorio"}
                </button>
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm">No tenés notificaciones</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {notifications.map((n) => {
                    const meta = TYPE_META[n.type];
                    const isUnread = !n.readAt;
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => handleClickNotification(n)}
                          className={cn(
                            "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3",
                            isUnread && "bg-blue-50/40"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", meta.tone)}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(n.createdAt)}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 truncate">{n.contactName}</p>
                            <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>
                          </div>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
