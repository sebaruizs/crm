"use client";

import { useEffect, useState } from "react";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  label: string;
  color: string;
}

const COLOR_PRESETS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-orange-100 text-orange-700",
  "bg-slate-100 text-slate-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];

export default function EtiquetasPanel() {
  const { isAdmin, currentUser } = useAgents();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [confirmDel, setConfirmDel] = useState<Tag | null>(null);

  async function refresh() {
    const res = await fetch("/api/tags", { cache: "no-store" });
    const data = await res.json();
    setTags(data.tags ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function openCreate() {
    setEditing(null);
    setLabel("");
    setColor(COLOR_PRESETS[0]);
    setModalOpen(true);
  }
  function openEdit(t: Tag) {
    setEditing(t);
    setLabel(t.label);
    setColor(t.color);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    if (editing) {
      await fetch(`/api/tags/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color }),
      });
    } else {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color }),
      });
    }
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(t: Tag) {
    await fetch(`/api/tags/${t.id}`, { method: "DELETE" });
    setConfirmDel(null);
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
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-slate-500 flex-1">
          Etiquetas para clasificar contactos. Usalas para campañas, prioridad, características del lead, etc.
        </p>
        <span className="text-xs text-slate-500">{tags.length} etiquetas</span>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva etiqueta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
          <p className="text-sm">Sin etiquetas creadas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium", t.color)}>
                {t.label}
              </span>
              <span className="flex-1" />
              <button
                onClick={() => openEdit(t)}
                className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDel(t)}
                className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  {editing ? "Editar etiqueta" : "Nueva etiqueta"}
                </h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Etiqueta</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="ej. VIP, Frío, CDMX, ..."
                    required
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-full transition-all",
                          c,
                          color === c ? "ring-2 ring-offset-1 ring-slate-900" : ""
                        )}
                      >
                        {label || "Etiqueta"}
                      </button>
                    ))}
                  </div>
                </div>
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
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar etiqueta?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Se quitará <strong>{confirmDel.label}</strong> del catálogo. Los contactos que la tengan asignada perderán la etiqueta.
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
    </div>
  );
}
