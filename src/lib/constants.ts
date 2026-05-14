import type { KanbanColumnId, LeadSource, ContactStatus } from "@/types";

export const COLUMN_ORDER: KanbanColumnId[] = [
  "nuevo_lead",
  "en_conversacion",
  "en_evaluacion",
  "no_califica",
  "agendado_visita",
  "cancelado",
];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  facebook_ads: "Facebook Ads",
  instagram: "Instagram",
  whatsapp_link: "Link WhatsApp",
  referido: "Referido",
  organico: "Orgánico",
  otro: "Otro",
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  nuevo_lead: "Nuevo Lead",
  en_conversacion: "En Conversación",
  en_evaluacion: "En Evaluación",
  no_califica: "No Califica",
  agendado_visita: "Agendado para Visita",
  cancelado: "Cancelado",
};

export const SOURCE_COLORS: Record<LeadSource, string> = {
  facebook_ads: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  whatsapp_link: "bg-green-100 text-green-700",
  referido: "bg-purple-100 text-purple-700",
  organico: "bg-amber-100 text-amber-700",
  otro: "bg-slate-100 text-slate-600",
};
