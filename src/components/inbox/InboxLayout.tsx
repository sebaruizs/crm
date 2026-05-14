"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { Contact } from "@/types";
import { useAgents } from "@/store/agents-store";
import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import ContactDetailsSidebar from "./ContactDetailsSidebar";

const POLL_MS = 3000;

export default function InboxLayout() {
  const { currentUser, isAdmin } = useAgents();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Track which messages we've already counted as unread to avoid double-counting
  const seenMessageIds = useRef<Set<string>>(new Set());

  const refreshContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts", { cache: "no-store" });
      const data = await res.json();
      const fetched: Contact[] = data.contacts ?? [];

      // Detect new inbound messages and bump unread counters
      setContacts((prev) => {
        const prevById = new Map(prev.map((c) => [c.id, c]));
        for (const c of fetched) {
          const previous = prevById.get(c.id);
          for (const msg of c.messageHistory) {
            if (msg.direction !== "inbound") continue;
            if (seenMessageIds.current.has(msg.id)) continue;
            seenMessageIds.current.add(msg.id);
            // On first fetch we DON'T mark as unread (only seed)
            if (previous && c.id !== selectedIdRef.current) {
              setUnreadMap((m) => ({ ...m, [c.id]: (m[c.id] ?? 0) + 1 }));
            } else if (!previous) {
              // brand-new contact (first time we see them) — mark all inbound msgs as unread
              setUnreadMap((m) => ({ ...m, [c.id]: (m[c.id] ?? 0) + 1 }));
            }
          }
        }
        return fetched;
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep a ref to selectedId so polling can check without re-creating refresh
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // Initial fetch + polling
  useEffect(() => {
    refreshContacts();
    const t = setInterval(refreshContacts, POLL_MS);
    return () => clearInterval(t);
  }, [refreshContacts]);

  // Visibility filter (admin sees all, agent sees own + unassigned)
  const visibleContacts = useMemo(() => {
    if (isAdmin) return contacts;
    return contacts.filter(
      (c) => !c.assignedAgentId || c.assignedAgentId === currentUser?.id
    );
  }, [contacts, isAdmin, currentUser?.id]);

  // Auto-select first visible if nothing selected (or selection became invisible)
  useEffect(() => {
    if (loading) return;
    if (selectedId && !visibleContacts.some((c) => c.id === selectedId)) {
      setSelectedId(visibleContacts[0]?.id ?? null);
    } else if (!selectedId && visibleContacts.length > 0) {
      setSelectedId(visibleContacts[0].id);
    }
  }, [visibleContacts, selectedId, loading]);

  const selected = visibleContacts.find((c) => c.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    if (unreadMap[id]) {
      setUnreadMap((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
    }
  }

  function toggleStar(id: string) {
    setStarredIds((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSendMessage(contactId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/contacts/${contactId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        showToast(`Error al enviar: ${data.error ?? "desconocido"}`);
        return;
      }
      if (data.warning) showToast(data.warning);
      await refreshContacts();
    } catch (err) {
      showToast(`Error de red: ${String(err)}`);
    }
  }

  async function handleChangeAgent(contactId: string, agentId: string | undefined) {
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAgentId: agentId ?? null }),
      });
      await refreshContacts();
    } catch {
      showToast("Error al actualizar el agente");
    }
  }

  return (
    <div className="relative flex h-full overflow-hidden">
      <ConversationList
        contacts={visibleContacts}
        selectedId={selectedId}
        onSelect={handleSelect}
        unreadMap={unreadMap}
        starredIds={starredIds}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : selected ? (
        <ChatThread
          contact={selected}
          starred={starredIds.has(selected.id)}
          onToggleStar={() => toggleStar(selected.id)}
          onSendMessage={(body) => handleSendMessage(selected.id, body)}
          onOpenDetails={() => setDetailsOpen(true)}
          onChangeAgent={(agentId) => handleChangeAgent(selected.id, agentId)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50">
          <p className="text-sm">
            {visibleContacts.length === 0
              ? "No tienes conversaciones asignadas ni libres por ahora"
              : "Selecciona una conversación"}
          </p>
        </div>
      )}

      {selected && detailsOpen && (
        <ContactDetailsSidebar
          contact={selected}
          onClose={() => setDetailsOpen(false)}
          onChangeAgent={(agentId) => handleChangeAgent(selected.id, agentId)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 max-w-md">
          {toast}
        </div>
      )}
    </div>
  );
}
