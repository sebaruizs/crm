"use client";

import { useState } from "react";
import type { Contact } from "@/types";
import { cn } from "@/lib/utils";
import ConversationListItem from "./ConversationListItem";

type FilterTab = "ads" | "no_leido" | "todo" | "sin_asignar" | "pendientes" | "recientes" | "destacado";

interface Props {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  unreadMap: Record<string, number>;
  starredIds: Set<string>;
  inactivityHours: number;
}

function isPending(contact: Contact, hours: number): boolean {
  const last = contact.messageHistory[contact.messageHistory.length - 1];
  if (!last || last.direction !== "inbound") return false;
  const ageMs = Date.now() - new Date(last.sentAt).getTime();
  return ageMs > hours * 3600 * 1000;
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "ads", label: "Ads" },
  { id: "no_leido", label: "No leído" },
  { id: "todo", label: "Todo" },
  { id: "sin_asignar", label: "Sin asignar" },
  { id: "pendientes", label: "Pendientes" },
  { id: "recientes", label: "Recientes" },
  { id: "destacado", label: "Destacado" },
];

export default function ConversationList({ contacts, selectedId, onSelect, unreadMap, starredIds, inactivityHours }: Props) {
  const [tab, setTab] = useState<FilterTab>("ads");

  const filtered = contacts.filter((c) => {
    if (tab === "ads") return c.source === "facebook_ads" || c.source === "instagram";
    if (tab === "no_leido") return (unreadMap[c.id] ?? 0) > 0;
    if (tab === "destacado") return starredIds.has(c.id);
    if (tab === "sin_asignar") return !c.assignedAgentId;
    if (tab === "pendientes") return isPending(c, inactivityHours);
    return true;
  });

  const adsCount = contacts.filter((c) => c.source === "facebook_ads" || c.source === "instagram").length;
  const unassignedCount = contacts.filter((c) => !c.assignedAgentId).length;
  const pendingCount = contacts.filter((c) => isPending(c, inactivityHours)).length;

  if (tab === "recientes") {
    filtered.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  const unreadTotal = Object.values(unreadMap).reduce((s, n) => s + n, 0);

  return (
    <div className="flex flex-col w-full lg:w-[360px] shrink-0 border-r border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Bandeja de entrada del grupo</h2>
          <div className="flex items-center gap-1 text-slate-500">
            <button className="p-1 hover:bg-slate-100 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter tabs — scrollable horizontally when overflow */}
        <div className="flex items-center gap-3 text-xs overflow-x-auto -mx-4 px-4 pb-0.5 scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1 pb-2 border-b-2 font-medium transition-colors whitespace-nowrap shrink-0",
                tab === t.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.id === "ads" && (
                <>
                  {adsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold mr-1">
                      {adsCount}
                    </span>
                  )}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </>
              )}
              {t.id === "no_leido" && unreadTotal > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[10px] font-bold mr-1">
                  {unreadTotal}
                </span>
              )}
              {t.id === "no_leido" && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              {t.id === "todo" && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
              {t.id === "sin_asignar" && (
                <>
                  {unassignedCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold mr-1">
                      {unassignedCount}
                    </span>
                  )}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM18 8l4 0M20 6v4" />
                  </svg>
                </>
              )}
              {t.id === "pendientes" && (
                <>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold mr-1">
                      {pendingCount}
                    </span>
                  )}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </>
              )}
              {t.id === "recientes" && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t.id === "destacado" && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Select all */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
        <input type="checkbox" className="rounded border-slate-300" />
        <span className="text-xs text-slate-500">Seleccionar todo</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin conversaciones</p>
        ) : (
          filtered.map((c) => {
            const lastMsg = c.messageHistory[c.messageHistory.length - 1];
            const preview = lastMsg?.body ?? "—";
            return (
              <ConversationListItem
                key={c.id}
                contact={c}
                selected={c.id === selectedId}
                unreadCount={unreadMap[c.id]}
                preview={preview}
                starred={starredIds.has(c.id)}
                pending={isPending(c, inactivityHours)}
                onClick={() => onSelect(c.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
