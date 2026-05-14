"use client";

import { useReducer, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { KanbanBoardState, KanbanCard, KanbanColumnId } from "@/types";
import { INITIAL_BOARD } from "@/mock/board";
import KanbanColumn from "./KanbanColumn";
import ContactDetailPanel from "@/components/contactos/ContactDetailPanel";
import { CONTACTS } from "@/mock/contacts";

type Action =
  | { type: "MOVE_CARD"; cardId: string; from: KanbanColumnId; to: KanbanColumnId; fromIndex: number; toIndex: number };

function reducer(state: KanbanBoardState, action: Action): KanbanBoardState {
  if (action.type === "MOVE_CARD") {
    const { from, to, fromIndex, toIndex } = action;
    const fromCards = [...state.columns[from].cards];
    const [moved] = fromCards.splice(fromIndex, 1);

    if (from === to) {
      fromCards.splice(toIndex, 0, moved);
      return {
        ...state,
        columns: {
          ...state.columns,
          [from]: { ...state.columns[from], cards: fromCards },
        },
      };
    }

    const toCards = [...state.columns[to].cards];
    toCards.splice(toIndex, 0, moved);
    return {
      ...state,
      columns: {
        ...state.columns,
        [from]: { ...state.columns[from], cards: fromCards },
        [to]: { ...state.columns[to], cards: toCards },
      },
    };
  }
  return state;
}

export default function KanbanBoard() {
  const [board, dispatch] = useReducer(reducer, INITIAL_BOARD);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    dispatch({
      type: "MOVE_CARD",
      cardId: result.draggableId,
      from: source.droppableId as KanbanColumnId,
      to: destination.droppableId as KanbanColumnId,
      fromIndex: source.index,
      toIndex: destination.index,
    });
  }

  function handleCardClick(card: KanbanCard) {
    setSelectedContactId(card.contactId);
  }

  const selectedContact = CONTACTS.find((c) => c.id === selectedContactId) ?? null;

  const totalCards = board.columnOrder.reduce((sum, colId) => sum + board.columns[colId].cards.length, 0);

  return (
    <div className="flex h-full">
      {/* Board */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Board stats bar */}
        <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{totalCards} leads en pipeline</span>
          <span className="w-px h-4 bg-slate-200" />
          <span>Arrastra las tarjetas para mover entre etapas</span>
        </div>

        {/* Kanban scroll area */}
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

      {/* Detail panel */}
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
