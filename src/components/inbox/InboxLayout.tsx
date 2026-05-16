"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Contact, AutomationSettings } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";
import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import ContactDetailsSidebar from "./ContactDetailsSidebar";

const POLL_MS = 3000;

export default function InboxLayout() {
  const { currentUser, isAdmin } = useAgents();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [inactivityHours, setInactivityHours] = useState(4);
  const [deleteConfirm, setDeleteConfirm] = useState<Contact | null>(null);

  // Fetch automation settings once on mount
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: AutomationSettings }) => {
        if (d.settings?.inactivityHours) setInactivityHours(d.settings.inactivityHours);
      })
      .catch(() => {});
  }, []);

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

  // Deep-link from notification: /conversaciones?contact=X
  useEffect(() => {
    const target = searchParams.get("contact");
    if (!target || loading) return;
    if (visibleContacts.some((c) => c.id === target)) {
      setSelectedId(target);
      // Clear unread for that contact
      setUnreadMap((m) => {
        if (!m[target]) return m;
        const copy = { ...m };
        delete copy[target];
        return copy;
      });
    }
  }, [searchParams, visibleContacts, loading]);

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

  /**
   * Reads a fetch Response safely:
   * - If body is JSON, returns parsed
   * - If body is HTML/text (typical for Next.js error pages), returns
   *   {error: "<first line of HTML or truncated text>"} so we never crash
   *   on JSON.parse and the user sees what actually went wrong.
   */
  async function readResponse(res: Response): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
    const text = await res.text().catch(() => "");
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Non-JSON response — extract something useful from the body
      const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      data = { error: `Servidor: ${stripped.slice(0, 160) || `HTTP ${res.status}`}` };
    }
    return { ok: res.ok, status: res.status, data };
  }

  async function handleSendMessage(contactId: string, payload: { text: string; file?: File }) {
    const trimmed = payload.text.trim();
    if (!trimmed && !payload.file) return;
    try {
      let mediaPayload: { fileId: string; url: string; name?: string; mime?: string } | undefined;
      if (payload.file) {
        const form = new FormData();
        form.append("file", payload.file);
        const upRes = await fetch("/api/files/upload", { method: "POST", body: form });
        const up = await readResponse(upRes);
        if (!up.ok) {
          showToast(`Error al subir archivo: ${up.data.error ?? "desconocido"}`);
          return;
        }
        const d = up.data as { id: string; url: string; name?: string; mime?: string };
        mediaPayload = { fileId: d.id, url: d.url, name: d.name, mime: d.mime };
      }

      const res = await fetch(`/api/contacts/${contactId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, media: mediaPayload }),
      });
      const { ok, data } = await readResponse(res);
      if (!ok || data.ok === false) {
        showToast(`Error al enviar: ${data.error ?? "desconocido"}`);
        return;
      }
      if (data.warning) showToast(String(data.warning));
      await refreshContacts();
    } catch (err) {
      showToast(`Error de red: ${String(err)}`);
    }
  }

  async function handleChangeAgent(contactId: string, agentId: string | undefined) {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedAgentId: agentId ?? null }),
      });
      const { ok, data } = await readResponse(res);
      if (!ok) {
        showToast(`Error: ${data.error ?? "no se pudo actualizar el agente"}`);
        return;
      }
      await refreshContacts();
    } catch {
      showToast("Error al actualizar el agente");
    }
  }

  async function handleDeleteContact(contactId: string) {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      const { ok, data } = await readResponse(res);
      if (!ok) {
        showToast(`Error: ${data.error ?? "no se pudo eliminar"}`);
        return;
      }
      setDeleteConfirm(null);
      setSelectedId(null);
      await refreshContacts();
      showToast("Conversación eliminada");
    } catch {
      showToast("Error de red al eliminar");
    }
  }

  // Mobile UX: when a contact is selected, show the chat (full screen).
  // No selection → show the conversation list.
  const showListOnMobile = !selectedId;
  const showChatOnMobile = !!selectedId && !detailsOpen;
  const showDetailsOnMobile = !!selectedId && detailsOpen;

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className={cn(
        "lg:flex",
        showListOnMobile ? "flex w-full lg:w-auto" : "hidden lg:flex"
      )}>
        <ConversationList
          contacts={visibleContacts}
          selectedId={selectedId}
          onSelect={handleSelect}
          unreadMap={unreadMap}
          starredIds={starredIds}
          inactivityHours={inactivityHours}
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : selected ? (
        <div className={cn(
          "flex-1 min-w-0",
          showChatOnMobile ? "flex" : "hidden lg:flex"
        )}>
          <ChatThread
            contact={selected}
            starred={starredIds.has(selected.id)}
            onToggleStar={() => toggleStar(selected.id)}
            onSendMessage={(payload) => handleSendMessage(selected.id, payload)}
            onOpenDetails={() => setDetailsOpen(true)}
            onChangeAgent={(agentId) => handleChangeAgent(selected.id, agentId)}
            onBack={() => setSelectedId(null)}
            onDelete={() => setDeleteConfirm(selected)}
          />
        </div>
      ) : (
        <div className="flex-1 hidden lg:flex items-center justify-center text-slate-400 bg-slate-50">
          <p className="text-sm">
            {visibleContacts.length === 0
              ? "No tienes conversaciones asignadas ni libres por ahora"
              : "Selecciona una conversación"}
          </p>
        </div>
      )}

      {selected && detailsOpen && (
        <div className={cn(
          showDetailsOnMobile ? "flex w-full lg:w-auto" : "hidden lg:flex"
        )}>
          <ContactDetailsSidebar
            contact={selected}
            onClose={() => setDetailsOpen(false)}
            onChangeAgent={(agentId) => handleChangeAgent(selected.id, agentId)}
          />
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">¿Eliminar conversación?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Se eliminará <strong>{deleteConfirm.name}</strong> con todo su historial: {deleteConfirm.messageHistory.length} mensaje{deleteConfirm.messageHistory.length === 1 ? "" : "s"} y {deleteConfirm.notes.length} nota{deleteConfirm.notes.length === 1 ? "" : "s"}. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteContact(deleteConfirm.id)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
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
