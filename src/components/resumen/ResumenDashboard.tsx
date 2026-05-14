"use client";

import { useEffect, useState } from "react";
import KpiCard from "./KpiCard";
import LeadsBySourceChart from "./LeadsBySourceChart";
import AgentPerformanceTable from "./AgentPerformanceTable";
import { formatPercent } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import type { ContactStatus, LeadSource, AgentPerformanceRow } from "@/types";

interface ReportsPayload {
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
  agentPerformance: AgentPerformanceRow[];
  meta: { totalContacts: number; generatedAt: string };
}

const PIPELINE_COLORS: Record<ContactStatus, string> = {
  nuevo_lead: "bg-blue-400",
  en_conversacion: "bg-yellow-400",
  en_evaluacion: "bg-orange-400",
  no_califica: "bg-red-400",
  agendado_visita: "bg-emerald-400",
  cancelado: "bg-slate-400",
};

const PIPELINE_ORDER: ContactStatus[] = [
  "nuevo_lead",
  "en_conversacion",
  "en_evaluacion",
  "agendado_visita",
  "no_califica",
  "cancelado",
];

export default function ResumenDashboard() {
  const [report, setReport] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reports", { cache: "no-store" });
        const data = await res.json();
        setReport(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 text-sm text-slate-500">
        No se pudieron cargar los reportes.
      </div>
    );
  }

  const k = report.kpis;
  const pipelineByStatus = new Map(report.pipelineCounts.map((p) => [p.status, p.count]));

  return (
    <div className="p-6 space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Conversaciones activas"
          value={String(k.activeConversations)}
          delta={k.activeConversationsDelta !== 0 ? `${Math.abs(k.activeConversationsDelta)}` : undefined}
          deltaPositive={k.activeConversationsDelta >= 0}
          accentClass="bg-green-100 text-green-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <KpiCard
          label="Tasa de conversión"
          value={formatPercent(k.conversionRate)}
          delta={Math.abs(k.conversionRateDelta) > 0.01 ? formatPercent(Math.abs(k.conversionRateDelta)) : undefined}
          deltaPositive={k.conversionRateDelta >= 0}
          accentClass="bg-blue-100 text-blue-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <KpiCard
          label="Tiempo de respuesta prom."
          value={k.avgResponseTimeMinutes > 0 ? `${k.avgResponseTimeMinutes} min` : "—"}
          accentClass="bg-amber-100 text-amber-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Nuevos leads hoy"
          value={String(k.newLeadsToday)}
          accentClass="bg-purple-100 text-purple-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {report.leadsBySource.length > 0 ? (
          <LeadsBySourceChart data={report.leadsBySource} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Leads por fuente</h3>
            <p className="text-sm text-slate-400">Aún no hay datos suficientes.</p>
          </div>
        )}

        {/* Pipeline summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Estado del pipeline</h3>
          {report.pipelineCounts.length === 0 ? (
            <p className="text-sm text-slate-400">Sin contactos todavía.</p>
          ) : (
            <div className="space-y-3">
              {PIPELINE_ORDER.map((status) => {
                const count = pipelineByStatus.get(status) ?? 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${PIPELINE_COLORS[status]} shrink-0`} />
                    <span className="text-sm text-slate-700 flex-1">{STATUS_LABELS[status]}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agent table */}
      {report.agentPerformance.length > 0 && (
        <AgentPerformanceTable rows={report.agentPerformance} />
      )}

      {/* Footer info */}
      <p className="text-xs text-slate-400 text-right">
        {report.meta.totalContacts} contactos en total · Última actualización: {new Date(report.meta.generatedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
