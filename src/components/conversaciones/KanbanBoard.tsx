"use client";

import { useEffect, useState, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Contact, KanbanBoardState, KanbanCard, KanbanColumnId } from "@/types";
import KanbanColumn from "./KanbanColumn";
import ContactDetailPanel from "@/components/contactos/ContactDetailPanel";

const COLUMN_META: Record<KanbanColumnId, { title: string; color: string; headerBg: string }> = {
  nuevo_lead:        { title: "Nuevo Lead",          color: "border-blue-400",    headerBg: "bg-blue-50"    },
  en_conversacion:   { title: "En Conversación",     color: "border-yellow-400",  headerBg: "bg-yellow-50"  },
  en_evaluacion:     { title: "En Evaluación",       color: "border-orange-400",  headerBg: "bg-orange-50"  },
  no_califica:       { title: "No Califica",         color: "border-red-400",     headerBg: "bg-red-50"     },
  agendado_visita:   { title: "Agendado para Visita",color: "border-emerald-400", headerBg: "bg-emerald-50" },
  cancelado:         { title: "Cancelado",            color: "border-slate-400",   headerBg: "bg-slate-50"   },
};

const COLUMN_ORDER: KanbanColumnId[] = [
  "nuevo_lead", "en_conversacion", "en_evaluacion",
  "no_califica", "agendado_visita", "cancelado",
];

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
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/contacts", { cache: "no-store" });
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const board: KanbanBoardState = useMemo(() => {
    const columns = Object.fromEntries(
      COLUMN_ORDER.map((id) => [id, { id, ...COLUMN_META[id], cards: [] as KanbanCard[] }])
    ) as KanbanBoardState["columns"];
    for (const c of contacts) {
      const col = columns[c.status];
      if (col) col.cards.push(contactToCard(c));
    }
    // Sort each column by lastMessageAt desc
    for (const id of COLUMN_ORDER) {
      columns[id].cards.sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    }
    return { columnOrder: COLUMN_ORDER, columns };
  }, [contacts]);

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const newStatus = destination.droppableId as KanbanColumnId;

    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.id === draggableId ? { ...c, status: newStatus } : c))
    );

    try {
      await fetch(`/api/contacts/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Roll back on error by refetching
      refresh();
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
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
            <div className="flex gap-4 h-full items-start">
              {board.columnOrder.map((colId) => (
                <KanbanColumn
                  key={colId}
                  column={board.columns[colId]}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
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
