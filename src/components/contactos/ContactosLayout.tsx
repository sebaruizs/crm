"use client";

import { useState, useMemo } from "react";
import type { ContactFilters } from "@/types";
import { CONTACTS } from "@/mock/contacts";
import { useAgents } from "@/store/agents-store";
import ContactsTable from "./ContactsTable";
import ContactInfoDrawer from "./ContactInfoDrawer";

const DEFAULT_FILTERS: ContactFilters = {
  search: "",
  source: "all",
  status: "all",
  agentId: "all",
};

export default function ContactosLayout() {
  const { agents: AGENTS } = useAgents();
  const [filters, setFilters] = useState<ContactFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return CONTACTS.filter((c) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
      }
      if (filters.source !== "all" && c.source !== filters.source) return false;
      if (filters.status !== "all" && c.status !== filters.status) return false;
      if (filters.agentId !== "all" && c.assignedAgentId !== filters.agentId) return false;
      return true;
    });
  }, [filters]);

  const selected = CONTACTS.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="relative h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-slate-200">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ContactFilters["status"] }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos los estados</option>
          <option value="nuevo_lead">Nuevo Lead</option>
          <option value="en_conversacion">En Conversación</option>
          <option value="en_evaluacion">En Evaluación</option>
          <option value="no_califica">No Califica</option>
          <option value="agendado_visita">Agendado Visita</option>
          <option value="cancelado">Cancelado</option>
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as ContactFilters["source"] }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todas las fuentes</option>
          <option value="facebook_ads">Facebook Ads</option>
          <option value="instagram">Instagram</option>
          <option value="whatsapp_link">Link WhatsApp</option>
          <option value="referido">Referido</option>
          <option value="organico">Orgánico</option>
        </select>

        <select
          value={filters.agentId}
          onChange={(e) => setFilters((f) => ({ ...f, agentId: e.target.value }))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos los agentes</option>
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <div className="flex-1" />

        <span className="text-xs text-slate-500">{filtered.length} de {CONTACTS.length} contactos</span>

        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar contacto
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <ContactsTable contacts={filtered} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Detail drawer */}
      {selected && <ContactInfoDrawer contact={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
