"use client";

import { Draggable } from "@hello-pangea/dnd";
import type { KanbanCard as KanbanCardType } from "@/types";
import { formatRelativeTime } from "@/lib/utils";
import AgentAvatar from "./AgentAvatar";
import TagBadge from "./TagBadge";
import WhatsAppStatusDot from "./WhatsAppStatusDot";
import { cn } from "@/lib/utils";

interface Props {
  card: KanbanCardType;
  index: number;
  onClick: (card: KanbanCardType) => void;
}

export default function KanbanCard({ card, index, onClick }: Props) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card)}
          className={cn(
            "bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-green-300 hover:shadow-md transition-all select-none",
            snapshot.isDragging && "shadow-lg border-green-400 rotate-1"
          )}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-semibold text-slate-900 leading-tight">{card.name}</p>
            <WhatsAppStatusDot status={card.whatsAppStatus} />
          </div>

          {/* Phone */}
          <p className="text-xs text-slate-500 mb-2">{card.phone}</p>

          {/* Vehicle interest */}
          {card.vehicleInterest && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 mb-2 flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-2h8zM13 10h4l3 6" />
              </svg>
              {card.vehicleInterest}
            </p>
          )}

          {/* Tags */}
          {card.tagIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.tagIds.slice(0, 3).map((tid) => (
                <TagBadge key={tid} tagId={tid} />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-400">{formatRelativeTime(card.lastMessageAt)}</span>
            <AgentAvatar agentId={card.assignedAgentId} />
          </div>
        </div>
      )}
    </Draggable>
  );
}
