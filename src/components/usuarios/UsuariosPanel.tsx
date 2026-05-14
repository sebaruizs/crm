"use client";

import { useState, useMemo } from "react";
import type { Agent, UserRole } from "@/types";
import { useAgents, ROLE_LABEL, ROLE_BADGE } from "@/store/agents-store";
import { CONTACTS } from "@/mock/contacts";
import { cn } from "@/lib/utils";
import UserFormModal from "./UserFormModal";

export default function UsuariosPanel() {
  const { agents, isAdmin, currentUser, deleteAgent } = useAgents();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);

  const contactsByAgent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of CONTACTS) {
      if (c.assignedAgentId) map[c.assignedAgentId] = (map[c.assignedAgentId] ?? 0) + 1;
    }
    return map;
  }, []);

  const filtered = agents.filter((a) => {
    if (roleFilter !== "all" && a.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(agent: Agent) {
    setEditing(agent);
    setModalOpen(true);
  }
  function handleDelete(agent: Agent) {
    deleteAgent(agent.id);
    setConfirmDelete(null);
  }

  const assignedCount = (id: string) => contactsByAgent[id] ?? 0;

  // Permission gate: only admins can access this page
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-600">
            Solo los administradores pueden gestionar usuarios. Estás conectado como{" "}
            <strong>{currentUser?.name}</strong> (Agente).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="agente">Agentes</option>
        </select>

        <div className="flex-1" />
        <span className="text-xs text-slate-500">{agents.length} usuarios</span>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.874M9 20H4v-2a4 4 0 015-3.874m6 0A4 4 0 1015 8a4 4 0 000 7.126M9 20a4 4 0 110-8 4 4 0 010 8z" />
          </svg>
          <p className="text-sm">Sin resultados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const isCurrent = a.id === currentUser?.id;
            return (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0", a.color)}>
                    {a.avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{a.name}</h3>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700">Tú</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{a.email}</p>
                    <span className={cn("inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium", ROLE_BADGE[a.role])}>
                      {ROLE_LABEL[a.role]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3 border-y border-slate-100 mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Contactos</p>
                    <p className="text-lg font-bold text-slate-900">{assignedCount(a.id)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div>
                    <p className="text-xs text-slate-500">Estado</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-xs font-medium text-slate-700">En línea</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(a)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a)}
                    disabled={isCurrent}
                    title={isCurrent ? "No puedes eliminar tu propio usuario" : undefined}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UserFormModal open={modalOpen} agent={editing} onClose={() => setModalOpen(false)} />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">¿Eliminar usuario?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Se eliminará <strong>{confirmDelete.name}</strong>. Los contactos asignados ({assignedCount(confirmDelete.id)}) quedarán sin agente y podrán ser reasignados.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
