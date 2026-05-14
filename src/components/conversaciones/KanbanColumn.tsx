import { Droppable } from "@hello-pangea/dnd";
import type { KanbanColumnData, KanbanCard as KanbanCardType } from "@/types";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

interface Props {
  column: KanbanColumnData;
  onCardClick: (card: KanbanCardType) => void;
}

export default function KanbanColumn({ column, onCardClick }: Props) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-lg border-t-4 mb-1", column.headerBg, column.color)}>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide leading-tight">{column.title}</span>
        <span className="w-5 h-5 rounded-full bg-white text-[10px] font-bold text-slate-600 flex items-center justify-center shadow-sm">
          {column.cards.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 min-h-20 rounded-b-lg p-2 space-y-2 transition-colors",
              snapshot.isDraggingOver ? "bg-green-50 border-2 border-dashed border-green-300" : "bg-slate-100/50"
            )}
          >
            {column.cards.map((card, i) => (
              <KanbanCard key={card.id} card={card} index={i} onClick={onCardClick} />
            ))}
            {provided.placeholder}
            {column.cards.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-16 text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                Sin leads
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
