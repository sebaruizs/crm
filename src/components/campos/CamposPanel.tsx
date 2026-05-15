"use client";

import { useEffect, useState } from "react";
import type { CustomFieldDefinition, CustomFieldType } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  date: "Fecha",
  select: "Lista desplegable",
};

export default function CamposPanel() {
  const { isAdmin, currentUser } = useAgents();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [confirmDel, setConfirmDel] = useState<CustomFieldDefinition | null>(null);

  // Form state
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/custom-fields", { cache: "no-store" });
    const data = await res.json();
    setFields(data.fields ?? []);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function openCreate() {
    setEditing(null);
    setKey(""); setLabel(""); setType("text"); setOptions(""); setError("");
    setModalOpen(true);
  }
  function openEdit(f: CustomFieldDefinition) {
    setEditing(f);
    setKey(f.key); setLabel(f.label); setType(f.type);
    setOptions((f.options ?? []).join("\n"));
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return setError("Key requerida");
    if (!label.trim()) return setError("Etiqueta requerida");
    const opts = options.split("\n").map((s) => s.trim()).filter(Boolean);
    if (type === "select" && opts.length === 0) return setError("Agrega al menos una opción");

    const payload = { key, label, type, options: opts };
    let res: Response;
    if (editing) {
      res = await fetch(`/api/custom-fields/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al guardar");
      return;
    }
    setModalOpen(false);
    refresh();
  }

  async function handleDelete(f: CustomFieldDefinition) {
    await fetch(`/api/custom-fields/${f.id}`, { method: "DELETE" });
    setConfirmDel(null);
    refresh();
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-600">
            Solo admins. Estás conectado como <strong>{currentUser?.name}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-slate-500 flex-1">
          Campos extra que los agentes pueden completar en cada contacto. Útil para datos específicos de tu negocio (ciudad, plataforma, antigüedad, etc.).
        </p>
        <span className="text-xs text-slate-500">{fields.length} campos</span>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo campo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : fields.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
          <p className="text-sm">Sin campos personalizados</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{f.label}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {f.key} · {TYPE_LABELS[f.type]}
                  {f.type === "select" && f.options ? ` (${f.options.length} opciones)` : ""}
                </p>
              </div>
              <button
                onClick={() => openEdit(f)}
                className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDel(f)}
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
                  {editing ? "Editar campo" : "Nuevo campo personalizado"}
                </h2>
              </div>
              <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Etiqueta visible</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="ej. Ciudad, Plataforma, ..."
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Key (identificador interno, solo letras/números)
                  </label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())}
                    placeholder="ciudad"
                    disabled={!!editing}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(TYPE_LABELS) as CustomFieldType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                          "p-2 rounded-lg border-2 text-xs font-medium transition-colors",
                          type === t
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-slate-200 text-slate-700 hover:border-slate-300"
                        )}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                {type === "select" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Opciones (una por línea)
                    </label>
                    <textarea
                      value={options}
                      onChange={(e) => setOptions(e.target.value)}
                      rows={4}
                      placeholder={"Opción 1\nOpción 2\nOpción 3"}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
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
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar campo?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Se eliminará la definición de <strong>{confirmDel.label}</strong>. Los valores ya guardados en los contactos quedarán huérfanos.
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
