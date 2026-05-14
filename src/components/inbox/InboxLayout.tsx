"use client";

import { useState, useMemo, useEffect } from "react";
import type { Contact, MessagePreview } from "@/types";
import { CONTACTS } from "@/mock/contacts";
import { useAgents } from "@/store/agents-store";
import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import ContactDetailsSidebar from "./ContactDetailsSidebar";

const INITIAL_UNREAD: Record<string, number> = {
  c1: 3, c2: 3, c3: 3, c4: 1, c7: 2, c8: 3, c10: 3, c11: 15, c12: 1, c5: 3,
};

export default function InboxLayout() {
  const { currentUser, isAdmin } = useAgents();
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>(INITIAL_UNREAD);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set(["c3"]));
  const [detailsOpen, setDetailsOpen] = useState(true);

  // Visible conversations depend on role:
  // - admin: sees all
  // - agente: sees own + unassigned
  const visibleContacts = useMemo(() => {
    if (isAdmin) return contacts;
    return contacts.filter(
      (c) => !c.assignedAgentId || c.assignedAgentId === currentUser?.id
    );
  }, [contacts, isAdmin, currentUser?.id]);

  // If selected contact is no longer visible (e.g., switched user), clear selection
  useEffect(() => {
    if (selectedId && !visibleContacts.some((c) => c.id === selectedId)) {
      setSelectedId(visibleContacts[0]?.id ?? null);
    } else if (!selectedId && visibleContacts.length > 0) {
      setSelectedId(visibleContacts[0].id);
    }
  }, [visibleContacts, selectedId]);

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

  function handleSendMessage(contactId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const newMsg: MessagePreview = {
      id: `m-${Date.now()}`,
      direction: "outbound",
      body: trimmed,
      sentAt: now,
      status: "sent",
    };
    setContacts((list) =>
      list.map((c) =>
        c.id === contactId
          ? { ...c, lastMessageAt: now, messageHistory: [...c.messageHistory, newMsg] }
          : c
      )
    );
  }

  function handleChangeAgent(contactId: string, agentId: string | undefined) {
    setContacts((list) =>
      list.map((c) => (c.id === contactId ? { ...c, assignedAgentId: agentId } : c))
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList
        contacts={visibleContacts}
        selectedId={selectedId}
        onSelect={handleSelect}
        unreadMap={unreadMap}
        starredIds={starredIds}
      />

      {selected ? (
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
    </div>
  );
}
