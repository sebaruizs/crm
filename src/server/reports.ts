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
 * For a contact's message history, find the delay between the FIRST inbound
 * and the FIRST outbound that follows it. Returns null if no response yet.
 */
function firstResponseMs(contact: Contact): number | null {
  const firstInbound = contact.messageHistory.find((m) => m.direction === "inbound");
  if (!firstInbound) return null;
  const firstOutboundAfter = contact.messageHistory.find(
    (m) => m.direction === "outbound" && new Date(m.sentAt).getTime() > new Date(firstInbound.sentAt).getTime()
  );
  if (!firstOutboundAfter) return null;
  return new Date(firstOutboundAfter.sentAt).getTime() - new Date(firstInbound.sentAt).getTime();
}

function responseGaps(contact: Contact): ResponseTimePairs {
  let sumMs = 0;
  let count = 0;
  const msgs = contact.messageHistory;
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].direction !== "inbound") continue;
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
  range: { from: string; to: string };
  kpis: {
    activeConversations: number;
    activeConversationsDelta: number;
    conversionRate: number;
    conversionRateDelta: number;
    avgResponseTimeMinutes: number;
    avgResponseTimeMinutesDelta: number;
    newLeadsInRange: number;
    newLeadsToday: number;
  };
  sla: {
    buckets: { key: string; label: string; count: number; pct: number; color: string }[];
    medianMinutes: number;
    pendingCount: number;
  };
  funnelBySource: {
    source: LeadSource;
    total: number;
    engaged: number;       // had at least one outbound from agent
    won: number;           // agendado_visita
    lost: number;          // no_califica or cancelado
    conversionRate: number;
  }[];
  funnelByAd: {
    adId: string | null;
    adHeadline: string;
    platform: "facebook" | "instagram";
    total: number;
    won: number;
    conversionRate: number;
  }[];
  avgAgeByStage: { status: ContactStatus; avgDays: number; count: number }[];
  conversionFunnel: {
    step: string;
    count: number;
    pctOfPrev: number;
  }[];
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

interface ComputeOptions {
  from?: Date;
  to?: Date;
}

const SLA_BUCKET_DEFS = [
  { key: "lt5m",   label: "< 5 min",     maxMs: 5 * 60 * 1000,      color: "bg-emerald-500" },
  { key: "lt1h",   label: "< 1 hora",    maxMs: 60 * 60 * 1000,     color: "bg-green-500" },
  { key: "lt4h",   label: "< 4 horas",   maxMs: 4 * 60 * 60 * 1000, color: "bg-yellow-500" },
  { key: "lt24h",  label: "< 24 horas",  maxMs: 24 * 60 * 60 * 1000, color: "bg-orange-500" },
  { key: "gte24h", label: "> 24 horas",  maxMs: Infinity,           color: "bg-red-500" },
];

export async function computeReports(opts: ComputeOptions = {}): Promise<ReportsPayload> {
  await crmStore.init();
  await usersStore.init();
  const allContacts = await crmStore.list();
  const users = await usersStore.list();
  const now = Date.now();

  // Default range: last 30 days
  const to = opts.to ?? new Date();
  const from = opts.from ?? new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Range-scoped contacts: created within the window
  const inRange = allContacts.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });

  // ─── Current-state KPIs (not range-scoped) ────────────────────

  const activeConversations = allContacts.filter((c) => ACTIVE_STATUSES.includes(c.status)).length;

  // Pipeline state is always current
  const pipelineMap = new Map<ContactStatus, number>();
  for (const c of allContacts) pipelineMap.set(c.status, (pipelineMap.get(c.status) ?? 0) + 1);
  const pipelineCounts = Array.from(pipelineMap.entries()).map(([status, count]) => ({ status, count }));

  // ─── Range-scoped KPIs ────────────────────────────────────────

  const terminalInRange = inRange.filter((c) => TERMINAL_STATUSES.includes(c.status));
  const wonInRange = inRange.filter((c) => c.status === "agendado_visita");
  const conversionRate = terminalInRange.length > 0 ? wonInRange.length / terminalInRange.length : 0;

  const allGaps = inRange.reduce<ResponseTimePairs>(
    (acc, c) => {
      const g = responseGaps(c);
      return { sumMs: acc.sumMs + g.sumMs, count: acc.count + g.count };
    },
    { sumMs: 0, count: 0 }
  );
  const avgResponseTimeMinutes =
    allGaps.count > 0 ? Math.round(allGaps.sumMs / allGaps.count / 60000) : 0;

  // New leads
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const newLeadsToday = allContacts.filter(
    (c) => new Date(c.createdAt).getTime() >= todayStart.getTime()
  ).length;
  const newLeadsInRange = inRange.length;

  // Deltas vs previous period
  const lastWeekActive = allContacts.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t >= now - SEVEN_DAYS && ACTIVE_STATUSES.includes(c.status);
  }).length;
  const prevWeekActive = allContacts.filter((c) => {
    const t = new Date(c.createdAt).getTime();
    return t < now - SEVEN_DAYS && t >= now - FOURTEEN_DAYS && ACTIVE_STATUSES.includes(c.status);
  }).length;
  const activeConversationsDelta = lastWeekActive - prevWeekActive;

  const lastWeekWon = allContacts.filter((c) => {
    const t = new Date(c.lastMessageAt).getTime();
    return c.status === "agendado_visita" && t >= now - SEVEN_DAYS;
  }).length;
  const lastWeekTerminal = allContacts.filter((c) => {
    const t = new Date(c.lastMessageAt).getTime();
    return TERMINAL_STATUSES.includes(c.status) && t >= now - SEVEN_DAYS;
  }).length;
  const lastWeekConversion = lastWeekTerminal > 0 ? lastWeekWon / lastWeekTerminal : 0;
  const conversionRateDelta = lastWeekConversion - conversionRate;

  // ─── SLA breakdown (first-response time, range-scoped) ────────

  const firstResponses: number[] = [];
  let pendingCount = 0;
  for (const c of inRange) {
    const t = firstResponseMs(c);
    if (t === null) {
      const hasInbound = c.messageHistory.some((m) => m.direction === "inbound");
      if (hasInbound) pendingCount += 1;
    } else {
      firstResponses.push(t);
    }
  }
  const bucketCounts = SLA_BUCKET_DEFS.map((b) => ({ ...b, count: 0 }));
  for (const ms of firstResponses) {
    for (const b of bucketCounts) {
      if (ms < b.maxMs) {
        b.count += 1;
        break;
      }
    }
  }
  const totalResponses = firstResponses.length;
  const slaBuckets = bucketCounts.map((b) => ({
    key: b.key,
    label: b.label,
    count: b.count,
    pct: totalResponses > 0 ? b.count / totalResponses : 0,
    color: b.color,
  }));
  const sortedResponses = [...firstResponses].sort((a, b) => a - b);
  const medianMs = sortedResponses.length > 0 ? sortedResponses[Math.floor(sortedResponses.length / 2)] : 0;
  const medianMinutes = Math.round(medianMs / 60000);

  // ─── Funnel by source (range-scoped) ──────────────────────────

  const sourceMap = new Map<LeadSource, Contact[]>();
  for (const c of inRange) {
    const list = sourceMap.get(c.source) ?? [];
    list.push(c);
    sourceMap.set(c.source, list);
  }
  const funnelBySource = Array.from(sourceMap.entries())
    .map(([source, contacts]) => {
      const total = contacts.length;
      const engaged = contacts.filter((c) =>
        c.messageHistory.some((m) => m.direction === "outbound")
      ).length;
      const won = contacts.filter((c) => c.status === "agendado_visita").length;
      const lost = contacts.filter((c) => c.status === "no_califica" || c.status === "cancelado").length;
      const terminals = won + lost;
      const cr = terminals > 0 ? won / terminals : 0;
      return { source, total, engaged, won, lost, conversionRate: cr };
    })
    .sort((a, b) => b.total - a.total);

  // ─── Funnel by ad (only ad-sourced contacts) ──────────────────

  const adMap = new Map<string, Contact[]>(); // key = adId || adHeadline || "unknown"
  for (const c of inRange) {
    if (c.source !== "facebook_ads" && c.source !== "instagram") continue;
    const key = c.adId || c.adHeadline || "unknown";
    const list = adMap.get(key) ?? [];
    list.push(c);
    adMap.set(key, list);
  }
  const funnelByAd = Array.from(adMap.entries())
    .map(([_key, contacts]) => {
      const sample = contacts[0];
      const total = contacts.length;
      const won = contacts.filter((c) => c.status === "agendado_visita").length;
      const terminal = contacts.filter((c) => TERMINAL_STATUSES.includes(c.status)).length;
      const cr = terminal > 0 ? won / terminal : 0;
      return {
        adId: sample.adId ?? null,
        adHeadline: sample.adHeadline ?? "(sin título)",
        platform: (sample.adPlatform ?? (sample.source === "instagram" ? "instagram" : "facebook")) as "facebook" | "instagram",
        total,
        won,
        conversionRate: cr,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ─── Average age per stage (proxy for stuck time) ─────────────

  const ageBuckets = new Map<ContactStatus, number[]>();
  for (const c of allContacts) {
    const ageMs = now - new Date(c.createdAt).getTime();
    const arr = ageBuckets.get(c.status) ?? [];
    arr.push(ageMs);
    ageBuckets.set(c.status, arr);
  }
  const avgAgeByStage = Array.from(ageBuckets.entries()).map(([status, ages]) => {
    const avgMs = ages.reduce((s, v) => s + v, 0) / ages.length;
    return {
      status,
      avgDays: Math.round((avgMs / (24 * 60 * 60 * 1000)) * 10) / 10,
      count: ages.length,
    };
  });

  // ─── Conversion funnel (range-scoped) ─────────────────────────

  const totalLeads = inRange.length;
  const contactedLeads = inRange.filter((c) =>
    c.messageHistory.some((m) => m.direction === "outbound")
  ).length;
  const evaluatedLeads = inRange.filter((c) =>
    ["en_evaluacion", "agendado_visita"].includes(c.status)
  ).length;
  const wonLeads = inRange.filter((c) => c.status === "agendado_visita").length;

  const conversionFunnel = [
    { step: "Leads nuevos", count: totalLeads, pctOfPrev: 1 },
    {
      step: "Contactados",
      count: contactedLeads,
      pctOfPrev: totalLeads > 0 ? contactedLeads / totalLeads : 0,
    },
    {
      step: "En evaluación",
      count: evaluatedLeads,
      pctOfPrev: contactedLeads > 0 ? evaluatedLeads / contactedLeads : 0,
    },
    {
      step: "Visita agendada",
      count: wonLeads,
      pctOfPrev: evaluatedLeads > 0 ? wonLeads / evaluatedLeads : 0,
    },
  ];

  // ─── Leads by source (range-scoped) ───────────────────────────

  const leadsBySource = Array.from(sourceMap.entries())
    .map(([source, contacts]) => ({ source, count: contacts.length }))
    .sort((a, b) => b.count - a.count);

  // ─── Agent performance (range-scoped) ─────────────────────────

  const agentPerformance = users.map((u) => {
    const assigned = inRange.filter((c) => c.assignedAgentId === u.id);
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
    range: { from: from.toISOString(), to: to.toISOString() },
    kpis: {
      activeConversations,
      activeConversationsDelta,
      conversionRate,
      conversionRateDelta,
      avgResponseTimeMinutes,
      avgResponseTimeMinutesDelta: 0,
      newLeadsInRange,
      newLeadsToday,
    },
    sla: { buckets: slaBuckets, medianMinutes, pendingCount },
    funnelBySource,
    funnelByAd,
    avgAgeByStage,
    conversionFunnel,
    leadsBySource,
    pipelineCounts,
    agentPerformance,
    meta: {
      totalContacts: allContacts.length,
      generatedAt: new Date().toISOString(),
    },
  };
}
