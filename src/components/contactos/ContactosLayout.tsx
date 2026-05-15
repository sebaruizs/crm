"use client";

import { useState, useMemo, useEffect } from "react";
import type { Contact, ContactFilters } from "@/types";
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/contacts", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled) setContacts(data.contacts ?? []);
    }
    load();
    const t = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
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

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

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

        <span className="text-xs text-slate-500">{filtered.length} de {contacts.length} contactos</span>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
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

      {/* Create modal */}
      {createOpen && (
        <CreateContactModal
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCreateOpen(false);
            setContacts((list) => [c, ...list]);
            setSelectedId(c.id);
          }}
        />
      )}
    </div>
  );
}

function CreateContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Contact) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Nombre requerido");
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      return setError("Teléfono inválido");
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al crear");
        if (data.contact) onCreated(data.contact);
        return;
      }
      onCreated(data.contact);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Nuevo contacto</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Juan Pérez"
                autoFocus
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono (con código de país, sin espacios)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+5219991234567"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Para enviar mensajes vía WhatsApp, debe coincidir con el formato internacional.
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {submitting ? "Creando…" : "Crear contacto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
