"use client";

import type { Contact } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { SOURCE_LABELS, SOURCE_COLORS, STATUS_LABELS } from "@/lib/constants";
import { useAgents } from "@/store/agents-store";

const STATUS_DOT: Record<string, string> = {
  nuevo_lead: "bg-blue-400",
  en_conversacion: "bg-yellow-400",
  en_evaluacion: "bg-orange-400",
  no_califica: "bg-red-400",
  agendado_visita: "bg-emerald-400",
  cancelado: "bg-slate-400",
};

interface Props {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ContactsTable({ contacts, selectedId, onSelect }: Props) {
  const { agents: AGENTS } = useAgents();
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm">Sin resultados con los filtros aplicados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <tr>
            <th className="w-10 px-3 py-3">
              <input type="checkbox" className="rounded border-slate-300" />
            </th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Teléfono</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fuente</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Agente</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vehículo</th>
            <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Licencia</th>
            <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Último contacto</th>
            <th className="w-10 px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {contacts.map((c) => {
            const agent = AGENTS.find((a) => a.id === c.assignedAgentId);
            const initials = c.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
            const isSelected = c.id === selectedId;
            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn("cursor-pointer transition-colors", isSelected ? "bg-blue-50" : "hover:bg-slate-50")}
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="rounded border-slate-300" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {initials}
                    </div>
                    <span className="font-medium text-slate-900">{c.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700 font-mono text-xs">{c.phone}</td>
                <td className="px-3 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SOURCE_COLORS[c.source])}>
                    {SOURCE_LABELS[c.source]}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[c.status])} />
                    <span className="text-xs text-slate-700">{STATUS_LABELS[c.status]}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {agent ? (
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", agent.color)}>
                        {agent.avatarInitials}
                      </div>
                      <span className="text-xs text-slate-700">{agent.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-700">{c.vehicleInterest ?? "—"}</td>
                <td className="px-3 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", c.licenseVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {c.licenseVerified ? "Verificada" : "Pendiente"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                  {formatRelativeTime(c.lastMessageAt)}
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <button className="text-slate-400 hover:text-slate-600 p-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
