import type { KanbanBoardState } from "@/types";
import { CONTACTS } from "./contacts";

function toCard(contactId: string) {
  const c = CONTACTS.find((x) => x.id === contactId)!;
  return {
    id: c.id,
    contactId: c.id,
    name: c.name,
    phone: c.phone,
    lastMessageAt: c.lastMessageAt,
    assignedAgentId: c.assignedAgentId,
    tagIds: c.tagIds,
    whatsAppStatus: c.whatsAppStatus,
    vehicleInterest: c.vehicleInterest,
  };
}

export const INITIAL_BOARD: KanbanBoardState = {
  columnOrder: [
    "nuevo_lead",
    "en_conversacion",
    "en_evaluacion",
    "no_califica",
    "agendado_visita",
    "cancelado",
  ],
  columns: {
    nuevo_lead: {
      id: "nuevo_lead",
      title: "Nuevo Lead",
      color: "border-blue-400",
      headerBg: "bg-blue-50",
      cards: ["c2", "c7", "c11"].map(toCard),
    },
    en_conversacion: {
      id: "en_conversacion",
      title: "En Conversación",
      color: "border-yellow-400",
      headerBg: "bg-yellow-50",
      cards: ["c1", "c8", "c12"].map(toCard),
    },
    en_evaluacion: {
      id: "en_evaluacion",
      title: "En Evaluación",
      color: "border-orange-400",
      headerBg: "bg-orange-50",
      cards: ["c3", "c9"].map(toCard),
    },
    no_califica: {
      id: "no_califica",
      title: "No Califica",
      color: "border-red-400",
      headerBg: "bg-red-50",
      cards: ["c5"].map(toCard),
    },
    agendado_visita: {
      id: "agendado_visita",
      title: "Agendado para Visita",
      color: "border-emerald-400",
      headerBg: "bg-emerald-50",
      cards: ["c4", "c10"].map(toCard),
    },
    cancelado: {
      id: "cancelado",
      title: "Cancelado",
      color: "border-slate-400",
      headerBg: "bg-slate-50",
      cards: ["c6"].map(toCard),
    },
  },
};
