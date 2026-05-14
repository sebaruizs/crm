import type { KpiSnapshot, LeadsBySourceEntry, AgentPerformanceRow } from "@/types";

export const KPI_SNAPSHOT: KpiSnapshot = {
  activeConversations: 18,
  conversionRate: 0.34,
  avgResponseTimeMinutes: 7,
  newLeadsToday: 5,
};

export const LEADS_BY_SOURCE: LeadsBySourceEntry[] = [
  { source: "facebook_ads", count: 42 },
  { source: "instagram", count: 28 },
  { source: "whatsapp_link", count: 19 },
  { source: "referido", count: 11 },
  { source: "organico", count: 7 },
  { source: "otro", count: 3 },
];

export const AGENT_PERFORMANCE: AgentPerformanceRow[] = [
  { agentId: "a1", activeConversations: 8, closedThisWeek: 5, conversionRate: 0.41, avgResponseTimeMinutes: 5 },
  { agentId: "a2", activeConversations: 6, closedThisWeek: 4, conversionRate: 0.33, avgResponseTimeMinutes: 9 },
  { agentId: "a3", activeConversations: 4, closedThisWeek: 3, conversionRate: 0.28, avgResponseTimeMinutes: 8 },
  { agentId: "a4", activeConversations: 2, closedThisWeek: 2, conversionRate: 0.22, avgResponseTimeMinutes: 12 },
];
