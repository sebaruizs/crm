export type LeadSource =
  | "facebook_ads"
  | "instagram"
  | "whatsapp_link"
  | "referido"
  | "organico"
  | "otro";

export type ContactStatus =
  | "nuevo_lead"
  | "en_conversacion"
  | "en_evaluacion"
  | "no_califica"
  | "agendado_visita"
  | "cancelado";

export type WhatsAppStatus = "connected" | "disconnected" | "pending";

export type UserRole = "admin" | "agente";

export interface MessageTemplate {
  id: string;
  label: string;
  body: string;
  shortcut?: string;
  createdAt: string;
}

export interface AutomationSettings {
  welcomeEnabled: boolean;
  welcomeTemplateId: string | null;
  inactivityHours: number;
}

export interface Agent {
  id: string;
  name: string;
  avatarInitials: string;
  color: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface CustomField {
  key: string;
  label: string;
  value: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
}

export interface MessagePreview {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  sentAt: string;
  status: "sent" | "delivered" | "read" | "failed";
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  status: ContactStatus;
  assignedAgentId?: string;
  tagIds: string[];
  whatsAppStatus: WhatsAppStatus;
  createdAt: string;
  lastMessageAt: string;
  notes: Note[];
  messageHistory: MessagePreview[];
  customFields: CustomField[];
  vehicleInterest?: string;
  licenseVerified: boolean;
  visitScheduledAt?: string;
  lineId?: string; // which WhatsApp line this contact talks through
}

export type KanbanColumnId =
  | "nuevo_lead"
  | "en_conversacion"
  | "en_evaluacion"
  | "no_califica"
  | "agendado_visita"
  | "cancelado";

export interface KanbanCard {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  lastMessageAt: string;
  assignedAgentId?: string;
  tagIds: string[];
  whatsAppStatus: WhatsAppStatus;
  vehicleInterest?: string;
}

export interface KanbanColumnData {
  id: KanbanColumnId;
  title: string;
  color: string;
  headerBg: string;
  cards: KanbanCard[];
}

export interface KanbanBoardState {
  columns: Record<KanbanColumnId, KanbanColumnData>;
  columnOrder: KanbanColumnId[];
}

export interface KpiSnapshot {
  activeConversations: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
  newLeadsToday: number;
}

export interface LeadsBySourceEntry {
  source: LeadSource;
  count: number;
}

export interface AgentPerformanceRow {
  agentId: string;
  activeConversations: number;
  closedThisWeek: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
}

export interface ContactFilters {
  search: string;
  source: LeadSource | "all";
  status: ContactStatus | "all";
  agentId: string | "all";
}
