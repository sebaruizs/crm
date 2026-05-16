"use client";

import { useEffect, useState, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Contact, KanbanCard, PipelineStage } from "@/types";
import KanbanColumn from "./KanbanColumn";
import ContactDetailPanel from "@/components/contactos/ContactDetailPanel";

function contactToCard(c: Contact): KanbanCard {
  return {
    id: c.id,
    contactId: c.id,
    name: c.name,
    phone: c.phone,
    lastMessageAt: c.lastMessageAt,
    assignedAgentId: c.assignedAgentId ?? "",
    tagIds: c.tagIds,
    whatsAppStatus: c.whatsAppStatus,
    vehicleInterest: c.vehicleInterest,
  };
}

export default function KanbanBoard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  async function refreshContacts() {
    try {
      const res = await fetch("/api/contacts", { cache: "no-store" });
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch { /* ignore */ }
  }

  async function refreshStages() {
    try {
      const res = await fetch("/api/pipeline-stages", { cache: "no-store" });
      const data = await res.json();
      setStages(data.stages ?? []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refreshStages();
    refreshContacts();
    const t = setInterval(refreshContacts, 5000);
    return () => clearInterval(t);
  }, []);

  // Build columns dynamically from stages + group contacts
  const columns = useMemo(() => {
    const grouped: Record<string, KanbanCard[]> = {};
    for (const s of stages) grouped[s.key] = [];
    for (const c of contacts) {
      const cards = grouped[c.status];
      if (cards) cards.push(contactToCard(c));
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    }
    return stages.map((s) => ({
      id: s.key,
      title: s.label,
      color: s.color.split(" ").find((c) => c.startsWith("border-")) ?? "border-slate-400",
      headerBg: s.color.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-slate-50",
      cards: grouped[s.key],
    }));
  }, [stages, contacts]);

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const newStatus = destination.droppableId;

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, status: newStatus as Contact["status"] } : c))
    );

    try {
      await fetch(`/api/contacts/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      refreshContacts();
    }
  }

  function handleCardClick(card: KanbanCard) {
    setSelectedContactId(card.contactId);
  }

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;
  const totalCards = contacts.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{totalCards} leads en pipeline</span>
          <span className="w-px h-4 bg-slate-200" />
          <span>Arrastra las tarjetas para mover entre etapas</span>
          <span className="flex-1" />
          <a href="/etapas" className="text-xs text-blue-600 hover:underline">
            Configurar etapas
          </a>
        </div>

        {stages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <p className="text-sm mb-2">No hay etapas configuradas</p>
              <a href="/etapas" className="text-sm text-blue-600 hover:underline">
                Crear etapas →
              </a>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
              <div className="flex gap-4 h-full items-start">
                {columns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      {selectedContact && (
        <div className="w-96 shrink-0 border-l border-slate-200 overflow-hidden">
          <ContactDetailPanel
            contact={selectedContact}
            onClose={() => setSelectedContactId(null)}
          />
        </div>
      )}
    </div>
  );
}
