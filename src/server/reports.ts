import "server-only";
import type { Contact, ContactStatus, LeadSource } from "@/types";
import { crmStore } from "@/server/store/crm-store";
import { usersStore } from "@/server/store/users-store";

const ACTIVE_STATUSES: ContactStatus[] = [
  "nuevo_lead",
  "en_conversacion",
  "en_evaluacion",
  "agendado_visita",
];

const TERMINAL_STATUSES: ContactStatus[] = ["agendado_visita", "no_califica", "cancelado"];

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

interface ResponseTimePairs {
  sumMs: number;
  count: number;
}

/**
 * For a contact's message history, returns sum and count of response gaps:
 * for each inbound message, find the next outbound and measure the delay.
 */
function responseGaps(contact: Contact): ResponseTimePairs {
  let sumMs = 0;
  let count = 0;
  const msgs = contact.messageHistory;
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].direction !== "inbound") continue;
    // Find next outbound after this inbound
    for (let j = i + 1; j < msgs.length; j++) {
      if (msgs[j].direction === "outbound") {
        sumMs += new Date(msgs[j].sentAt).getTime() - new Date(msgs[i].sentAt).getTime();
        count += 1;
        break;
      }
    }
  }
  return { sumMs, count };
}

export interface ReportsPayload {
  kpis: {
    activeConversations: number;
    activeConversationsDelta: number;
    conversionRate: number;
    conversionRateDelta: number;
    avgResponseTimeMinutes: number;
    avgResponseTimeMinutesDelta: number;
    newLeadsToday: number;
  };
  leadsBySource: { source: LeadSource; count: number }[];
  pipelineCounts: { status: ContactStatus; count: number }[];
  agentPerformance: {
    agentId: string;
    activeConversations: number;
    closedThisWeek: number;
    conversionRate: number;
    avgResponseTimeMinutes: number;
  }[];
  meta: {
    totalContacts: number;
    generatedAt: string;
  };
}

export async function computeReports(): Promise<ReportsPayload> {
  await crmStore.init();
  await usersStore.init();
  const contacts = crmStore.list();
  const users = usersStore.list();
  const now = Date.now();

  // ─── KPIs ────────────────────────────────────────────────────

  const activeConversations = contacts.filter((c) => ACTIVE_STATUSES.includes(c.status)).length;

  const terminalContacts = contacts.filter((c) => TERMINAL_STATUSES.includes(c.status));
  const wonContacts = contacts.filter((c) => c.status === "agendado_visita");
  const conversionRate = terminalContacts.length > 0 ? wonContacts.length / terminalContacts.length : 0;

  // Response time across all contacts
  const allGaps = contacts.reduce<ResponseTimePairs>(
    (acc, c) => {
      const g = responseGaps(c);
      return { sumMs: acc.sumMs + g.sumMs, count: acc.count + g.count };
    },
    { sumMs: 0, count: 0 }
  );
  const avgResponseTimeMinutes =
    allGaps.count > 0 ? Math.round(allGaps.sumMs / allGaps.count / 60000) : 0;

  // New leads today (since 00:00 local time)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newLeadsToday = contacts.filter(
    (c) => new Date(c.createdAt).getTime() >= todayStart.getTime()
  ).length;

  // ─── Deltas vs previous period (last 7 days vs 7-14 days ago) ────

  const lastWeekActive = contacts.filter((c) => {
    const created = new Date(c.createdAt).getTime();
    return created >= now - SEVEN_DAYS && ACTIVE_STATUSES.includes(c.status);
  }).length;
  const prevWeekActive = contacts.filter((c) => {
    const created = new Date(c.createdAt).getTime();
    return created < now - SEVEN_DAYS && created >= now - FOURTEEN_DAYS && ACTIVE_STATUSES.includes(c.status);
  }).length;
  const activeConversationsDelta = lastWeekActive - prevWeekActive;

  const lastWeekWon = contacts.filter((c) => {
    const t = new Date(c.lastMessageAt).getTime();
    return c.status === "agendado_visita" && t >= now - SEVEN_DAYS;
  }).length;
  const lastWeekTerminal = contacts.filter((c) => {
    const t = new Date(c.lastMessageAt).getTime();
    return TERMINAL_STATUSES.includes(c.status) && t >= now - SEVEN_DAYS;
  }).length;
  const lastWeekConversion = lastWeekTerminal > 0 ? lastWeekWon / lastWeekTerminal : 0;
  const conversionRateDelta = lastWeekConversion - conversionRate;

  // ─── Leads by source ─────────────────────────────────────────

  const sourceMap = new Map<LeadSource, number>();
  for (const c of contacts) sourceMap.set(c.source, (sourceMap.get(c.source) ?? 0) + 1);
  const leadsBySource = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // ─── Pipeline counts ─────────────────────────────────────────

  const pipelineMap = new Map<ContactStatus, number>();
  for (const c of contacts) pipelineMap.set(c.status, (pipelineMap.get(c.status) ?? 0) + 1);
  const pipelineCounts = Array.from(pipelineMap.entries()).map(([status, count]) => ({ status, count }));

  // ─── Agent performance ───────────────────────────────────────

  const agentPerformance = users.map((u) => {
    const assigned = contacts.filter((c) => c.assignedAgentId === u.id);
    const activeForAgent = assigned.filter((c) => ACTIVE_STATUSES.includes(c.status)).length;
    const closedThisWeek = assigned.filter((c) => {
      const t = new Date(c.lastMessageAt).getTime();
      return c.status === "agendado_visita" && t >= now - SEVEN_DAYS;
    }).length;
    const terminal = assigned.filter((c) => TERMINAL_STATUSES.includes(c.status));
    const won = assigned.filter((c) => c.status === "agendado_visita");
    const agentConversion = terminal.length > 0 ? won.length / terminal.length : 0;
    const agentGaps = assigned.reduce<ResponseTimePairs>(
      (acc, c) => {
        const g = responseGaps(c);
        return { sumMs: acc.sumMs + g.sumMs, count: acc.count + g.count };
      },
      { sumMs: 0, count: 0 }
    );
    const agentAvgRespMin = agentGaps.count > 0 ? Math.round(agentGaps.sumMs / agentGaps.count / 60000) : 0;

    return {
      agentId: u.id,
      activeConversations: activeForAgent,
      closedThisWeek,
      conversionRate: agentConversion,
      avgResponseTimeMinutes: agentAvgRespMin,
    };
  });

  return {
    kpis: {
      activeConversations,
      activeConversationsDelta,
      conversionRate,
      conversionRateDelta,
      avgResponseTimeMinutes,
      avgResponseTimeMinutesDelta: 0, // would need historical snapshots
      newLeadsToday,
    },
    leadsBySource,
    pipelineCounts,
    agentPerformance,
    meta: {
      totalContacts: contacts.length,
      generatedAt: new Date().toISOString(),
    },
  };
}
