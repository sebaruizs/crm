"use client";

import { useState } from "react";
import type { AgentPerformanceRow } from "@/types";
import { formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAgents } from "@/store/agents-store";

interface Props {
  rows: AgentPerformanceRow[];
}

type SortKey = keyof Omit<AgentPerformanceRow, "agentId">;

export default function AgentPerformanceTable({ rows }: Props) {
  const { agents } = useAgents();
  const [sortKey, setSortKey] = useState<SortKey>("activeConversations");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...rows].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortAsc ? diff : -diff;
  });

  const headers: { key: SortKey; label: string }[] = [
    { key: "activeConversations", label: "Activas" },
    { key: "closedThisWeek", label: "Cerradas esta semana" },
    { key: "conversionRate", label: "Tasa conversión" },
    { key: "avgResponseTimeMinutes", label: "T. respuesta prom." },
  ];

  function getAgent(id: string) {
    return agents.find((a) => a.id === id);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Rendimiento por agente</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Agente
              </th>
              {headers.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                >
                  {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row) => {
              const agent = getAgent(row.agentId);
              return (
                <tr key={row.agentId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white", agent?.color ?? "bg-slate-400")}>
                        {agent?.avatarInitials}
                      </div>
                      <span className="font-medium text-slate-900">{agent?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{row.activeConversations}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{row.closedThisWeek}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("font-medium", row.conversionRate >= 0.35 ? "text-emerald-600" : "text-orange-500")}>
                      {formatPercent(row.conversionRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{row.avgResponseTimeMinutes} min</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
