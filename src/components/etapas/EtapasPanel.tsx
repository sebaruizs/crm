"use client";

import { useEffect, useState } from "react";
import type { PipelineStage, StageKind } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<StageKind, string> = {
  pending: "Pendiente (lead nuevo)",
  active: "Activa (en proceso)",
  won: "Ganada (éxito)",
  lost: "Perdida (terminal)",
};

const KIND_BADGE: Record<StageKind, string> = {
  pending: "bg-blue-100 text-blue-700",
  active: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

const COLOR_PRESETS = [
  { value: "border-blue-400 bg-blue-50",       label: "Azul",      preview: "bg-blue-400" },
  { value: "border-yellow-400 bg-yellow-50",   label: "Amarillo",  preview: "bg-yellow-400" },
  { value: "border-orange-400 bg-orange-50",   label: "Naranja",   preview: "bg-orange-400" },
  { value: "border-emerald-400 bg-emerald-50", label: "Verde",     preview: "bg-emerald-400" },
  { value: "border-red-400 bg-red-50",         label: "Rojo",      preview: "bg-red-400" },
  { value: "border-purple-400 bg-purple-50",   label: "Violeta",   preview: "bg-purple-400" },
  { value: "border-pink-400 bg-pink-50",       label: "Rosa",      preview: "bg-pink-400" },
  { value: "border-cyan-400 bg-cyan-50",       label: "Cian",      preview: "bg-cyan-400" },
  { value: "border-indigo-400 bg-indigo-50",   label: "Índigo",    preview: "bg-indigo-400" },
  { value: "border-slate-400 bg-slate-50",     label: "Gris",      preview: "bg-slate-400" },
];

export default function EtapasPanel() {
  const { isAdmin, currentUser } = useAgents();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PipelineStage | null>(null);
  const [confirmDel, setConfirmDel] = useState<PipelineStage | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const [kind, setKind] = useState<StageKind>("active");

  async function refresh() {
    const res = await fetch("/api/pipeline-stages", { cache: "no-store" });
    const data = await res.json();
    setStages(data.stages ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function openCreate() {
    setEditing(null);
    setKey(""); setLabel(""); setColor(COLOR_PRESETS[0].value); setKind("active");
    setError("");
    setModalOpen(true);
  }
  function openEdit(s: PipelineStage) {
    setEditing(s);
    setKey(s.key); setLabel(s.label); setColor(s.color); setKind(s.kind);
    setError("");
    setModalOpen(true);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return setError("Etiqueta requerida");
    if (!editing && !key.trim()) return setError("Key requerido");

    if (editing) {
      const res = await fetch(`/api/pipeline-stages/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color, kind }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar");
        return;
      }
    } else {
      const res = await fetch("/api/pipeline-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label, color, kind }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al crear");
        return;
      }
    }
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(s: PipelineStage) {
    const res = await fetch(`/api/pipeline-stages/${s.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error ?? "No se pudo eliminar");
      setConfirmDel(null);
      return;
    }
    setConfirmDel(null);
    refresh();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = stages.findIndex((s) => s.id === id);
    const swap = stages[idx + dir];
    if (!swap) return;
    const current = stages[idx];
    // Swap positions
    await Promise.all([
      fetch(`/api/pipeline-stages/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: swap.position }),
      }),
      fetch(`/api/pipeline-stages/${swap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: current.position }),
      }),
    ]);
    refresh();
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-600">
            Solo administradores. Estás conectado como <strong>{currentUser?.name}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-slate-500 flex-1">
          Etapas del pipeline (columnas del Kanban). Las podés renombrar, cambiar de color, reordenar o agregar nuevas según tu proceso.
        </p>
        <span className="text-xs text-slate-500">{stages.length} etapas</span>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva etapa
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
          <p className="text-sm">Sin etapas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(s.id, -1)}
                  disabled={i === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Subir"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => move(s.id, 1)}
                  disabled={i === stages.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Bajar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Color preview */}
              <div className={cn("w-1 h-10 rounded-full", s.color.split(" ")[0].replace("border-", "bg-"))} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", KIND_BADGE[s.kind])}>
                    {KIND_LABEL[s.kind]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">{s.key}</p>
              </div>

              {/* Actions */}
              <button
                onClick={() => openEdit(s)}
                className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDel(s)}
                className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  {editing ? "Editar etapa" : "Nueva etapa"}
                </h2>
              </div>
              <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Etiqueta visible</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="ej. Cotización enviada"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Key (identificador, solo letras/números/guión bajo)
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())}
                    placeholder="cotizacion_enviada"
                    disabled={!!editing}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-100"
                  />
                  {editing && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      El key no se puede cambiar para no romper contactos existentes.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Tipo de etapa</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(KIND_LABEL) as StageKind[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKind(k)}
                        className={cn(
                          "p-2 rounded-lg border-2 text-left transition-colors",
                          kind === k ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", KIND_BADGE[k])}>
                          {KIND_LABEL[k]}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    El tipo afecta las métricas: <strong>ganadas</strong> cuentan como conversión, <strong>perdidas</strong> como terminales, <strong>activas</strong> y <strong>pendientes</strong> son en proceso.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Color</label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        title={c.label}
                        className={cn(
                          "h-10 rounded-lg border-2 flex items-center justify-center transition-all",
                          c.value,
                          color === c.value ? "ring-2 ring-offset-1 ring-slate-900" : ""
                        )}
                      >
                        <span className={cn("w-3 h-3 rounded-full", c.preview)} />
                      </button>
                    ))}
                  </div>
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
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
                >
                  {editing ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDel(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-5">
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar etapa?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Se eliminará <strong>{confirmDel.label}</strong>. Si hay contactos en esta etapa, primero movélos a otra.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDel)} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
