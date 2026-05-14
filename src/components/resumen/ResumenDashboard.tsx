import KpiCard from "./KpiCard";
import LeadsBySourceChart from "./LeadsBySourceChart";
import AgentPerformanceTable from "./AgentPerformanceTable";
import { KPI_SNAPSHOT, LEADS_BY_SOURCE, AGENT_PERFORMANCE } from "@/mock/kpis";
import { formatPercent } from "@/lib/utils";

export default function ResumenDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Conversaciones activas"
          value={String(KPI_SNAPSHOT.activeConversations)}
          delta="3 más"
          deltaPositive
          accentClass="bg-green-100 text-green-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
        <KpiCard
          label="Tasa de conversión"
          value={formatPercent(KPI_SNAPSHOT.conversionRate)}
          delta="2%"
          deltaPositive
          accentClass="bg-blue-100 text-blue-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <KpiCard
          label="Tiempo de respuesta prom."
          value={`${KPI_SNAPSHOT.avgResponseTimeMinutes} min`}
          delta="1 min"
          deltaPositive
          accentClass="bg-amber-100 text-amber-600"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Nuevos leads hoy"
          value={String(KPI_SNAPSHOT.newLeadsToday)}
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
        <LeadsBySourceChart data={LEADS_BY_SOURCE} />

        {/* Pipeline mini-summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Estado del pipeline</h3>
          <div className="space-y-3">
            {[
              { label: "Nuevo Lead", count: 3, color: "bg-blue-400" },
              { label: "En Conversación", count: 3, color: "bg-yellow-400" },
              { label: "En Evaluación", count: 2, color: "bg-orange-400" },
              { label: "Agendado para Visita", count: 2, color: "bg-emerald-400" },
              { label: "No Califica", count: 1, color: "bg-red-400" },
              { label: "Cancelado", count: 1, color: "bg-slate-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                <span className="text-sm font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent table */}
      <AgentPerformanceTable rows={AGENT_PERFORMANCE} />
    </div>
  );
}
