"use client";

import { useEffect, useMemo, useState } from "react";
import KpiCard from "./KpiCard";
import AgentPerformanceTable from "./AgentPerformanceTable";
import { formatPercent, cn } from "@/lib/utils";
import { SOURCE_LABELS, STATUS_LABELS, SOURCE_COLORS } from "@/lib/constants";
import type { ContactStatus, LeadSource, AgentPerformanceRow } from "@/types";

interface ReportsPayload {
  range: { from: string; to: string };
  kpis: {
    activeConversations: number;
    activeConversationsDelta: number;
    conversionRate: number;
    conversionRateDelta: number;
    avgResponseTimeMinutes: number;
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
    engaged: number;
    won: number;
    lost: number;
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
  conversionFunnel: { step: string; count: number; pctOfPrev: number }[];
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

const RANGE_PRESETS = [
  { id: "7d", label: "7 días", days: 7 },
  { id: "30d", label: "30 días", days: 30 },
  { id: "90d", label: "90 días", days: 90 },
  { id: "all", label: "Todo", days: 3650 },
];

function rangeFromPreset(presetId: string): { from: Date; to: Date } {
  const preset = RANGE_PRESETS.find((p) => p.id === presetId) ?? RANGE_PRESETS[1];
  const to = new Date();
  const from = new Date(to.getTime() - preset.days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default function ResumenDashboard() {
  const [report, setReport] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("30d");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { from, to } = rangeFromPreset(preset);
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      try {
        const res = await fetch(`/api/reports?${params}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setReport(data);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [preset]);

  const pipelineByStatus = useMemo(() => {
    const m = new Map<ContactStatus, number>();
    for (const p of report?.pipelineCounts ?? []) m.set(p.status, p.count);
    return m;
  }, [report]);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!report) {
    return <div className="p-6 text-sm text-slate-500">No se pudieron cargar los reportes.</div>;
  }

  const k = report.kpis;

  return (
    <div className="p-6 space-y-6">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-700 mr-2">Rango:</span>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              preset === p.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-400"
            )}
          >
            {p.label}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {new Date(report.range.from).toLocaleDateString("es-MX")} → {new Date(report.range.to).toLocaleDateString("es-MX")}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Conversaciones activas"
          value={String(k.activeConversations)}
          delta={k.activeConversationsDelta !== 0 ? String(Math.abs(k.activeConversationsDelta)) : undefined}
          deltaPositive={k.activeConversationsDelta >= 0}
          accentClass="bg-green-100 text-green-600"
          icon={<IconChat />}
        />
        <KpiCard
          label="Tasa de conversión"
          value={formatPercent(k.conversionRate)}
          delta={Math.abs(k.conversionRateDelta) > 0.01 ? formatPercent(Math.abs(k.conversionRateDelta)) : undefined}
          deltaPositive={k.conversionRateDelta >= 0}
          accentClass="bg-blue-100 text-blue-600"
          icon={<IconTrend />}
        />
        <KpiCard
          label="Resp. promedio"
          value={k.avgResponseTimeMinutes > 0 ? `${k.avgResponseTimeMinutes} min` : "—"}
          accentClass="bg-amber-100 text-amber-600"
          icon={<IconClock />}
        />
        <KpiCard
          label="Leads nuevos"
          value={String(k.newLeadsInRange)}
          accentClass="bg-purple-100 text-purple-600"
          icon={<IconUserPlus />}
        />
      </div>

      {/* SLA + Conversion funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Tiempo de primera respuesta" subtitle={`Mediana: ${report.sla.medianMinutes} min · ${report.sla.pendingCount} pendientes sin responder`}>
          {report.sla.buckets.every((b) => b.count === 0) ? (
            <p className="text-sm text-slate-400">Sin respuestas en el rango.</p>
          ) : (
            <div className="space-y-2">
              {report.sla.buckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-20 shrink-0">{b.label}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", b.color)}
                      style={{ width: `${Math.max(b.pct * 100, b.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-700 font-medium w-16 text-right shrink-0">
                    {b.count} · {(b.pct * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Funnel de conversión" subtitle="De lead nuevo a visita agendada">
          {report.conversionFunnel[0].count === 0 ? (
            <p className="text-sm text-slate-400">Sin leads en el rango.</p>
          ) : (
            <div className="space-y-2">
              {report.conversionFunnel.map((step, i) => {
                const total = report.conversionFunnel[0].count;
                const widthPct = total > 0 ? (step.count / total) * 100 : 0;
                return (
                  <div key={step.step}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-slate-700">{step.step}</span>
                      <span className="text-xs text-slate-500">
                        {step.count}
                        {i > 0 && (
                          <span className="ml-2 text-slate-400">
                            ({(step.pctOfPrev * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Funnel by source */}
      <Card title="Rendimiento por fuente" subtitle="Comparativa de leads, contactados y conversión por origen">
        {report.funnelBySource.length === 0 ? (
          <p className="text-sm text-slate-400">Sin leads en el rango.</p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-2 font-semibold">Fuente</th>
                  <th className="text-right px-3 py-2 font-semibold">Leads</th>
                  <th className="text-right px-3 py-2 font-semibold">Contactados</th>
                  <th className="text-right px-3 py-2 font-semibold">Ganados</th>
                  <th className="text-right px-3 py-2 font-semibold">Perdidos</th>
                  <th className="text-right px-5 py-2 font-semibold">Conversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.funnelBySource.map((s) => (
                  <tr key={s.source} className="hover:bg-slate-50">
                    <td className="px-5 py-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SOURCE_COLORS[s.source])}>
                        {SOURCE_LABELS[s.source]}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2 text-slate-900 font-medium">{s.total}</td>
                    <td className="text-right px-3 py-2 text-slate-700">{s.engaged}</td>
                    <td className="text-right px-3 py-2 text-emerald-700 font-medium">{s.won}</td>
                    <td className="text-right px-3 py-2 text-red-600">{s.lost}</td>
                    <td className="text-right px-5 py-2 text-slate-900 font-semibold">
                      {formatPercent(s.conversionRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Funnel by ad */}
      {report.funnelByAd.length > 0 && (
        <Card title="Top anuncios" subtitle="Performance individual de las pautas de Meta">
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-2 font-semibold">Anuncio</th>
                  <th className="text-right px-3 py-2 font-semibold">Leads</th>
                  <th className="text-right px-3 py-2 font-semibold">Ganados</th>
                  <th className="text-right px-5 py-2 font-semibold">Conversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.funnelByAd.map((ad, i) => (
                  <tr key={(ad.adId ?? ad.adHeadline) + i} className="hover:bg-slate-50">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                          ad.platform === "instagram" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {ad.platform === "instagram" ? "IG" : "FB"}
                        </span>
                        <span className="text-slate-900 truncate max-w-md" title={ad.adHeadline}>
                          {ad.adHeadline}
                        </span>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2 text-slate-900 font-medium">{ad.total}</td>
                    <td className="text-right px-3 py-2 text-emerald-700 font-medium">{ad.won}</td>
                    <td className="text-right px-5 py-2 text-slate-900 font-semibold">
                      {formatPercent(ad.conversionRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Time in stage + Pipeline current */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Antigüedad promedio por etapa" subtitle="Indica dónde se están estancando los leads">
          {report.avgAgeByStage.length === 0 ? (
            <p className="text-sm text-slate-400">Sin contactos.</p>
          ) : (
            <div className="space-y-2">
              {report.avgAgeByStage.map((s) => (
                <div key={s.status} className="flex items-center gap-3">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", PIPELINE_COLORS[s.status])} />
                  <span className="text-sm text-slate-700 flex-1">{STATUS_LABELS[s.status]}</span>
                  <span className="text-xs text-slate-400">{s.count} contactos</span>
                  <span className="text-sm font-semibold text-slate-900 w-20 text-right">
                    {s.avgDays} día{s.avgDays === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Estado del pipeline" subtitle="Distribución actual de todos los contactos">
          {report.pipelineCounts.length === 0 ? (
            <p className="text-sm text-slate-400">Sin contactos.</p>
          ) : (
            <div className="space-y-3">
              {(["nuevo_lead", "en_conversacion", "en_evaluacion", "agendado_visita", "no_califica", "cancelado"] as ContactStatus[]).map((status) => {
                const count = pipelineByStatus.get(status) ?? 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", PIPELINE_COLORS[status])} />
                    <span className="text-sm text-slate-700 flex-1">{STATUS_LABELS[status]}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Agent performance */}
      {report.agentPerformance.length > 0 && (
        <AgentPerformanceTable rows={report.agentPerformance} />
      )}

      <p className="text-xs text-slate-400 text-right">
        {report.meta.totalContacts} contactos en total · Actualizado: {new Date(report.meta.generatedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function IconChat() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}
