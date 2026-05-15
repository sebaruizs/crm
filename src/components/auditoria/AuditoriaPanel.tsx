"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn, formatRelativeTime } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; tone: string }> = {
  "login.success":     { label: "Login exitoso",     tone: "bg-green-100 text-green-700" },
  "login.failure":     { label: "Login fallido",     tone: "bg-red-100 text-red-700" },
  "login.rate_limited":{ label: "Rate limit login",  tone: "bg-amber-100 text-amber-700" },
  "logout":            { label: "Cerró sesión",      tone: "bg-slate-100 text-slate-700" },
  "user.create":       { label: "Creó usuario",      tone: "bg-blue-100 text-blue-700" },
  "user.update":       { label: "Editó usuario",     tone: "bg-blue-100 text-blue-700" },
  "user.delete":       { label: "Eliminó usuario",   tone: "bg-red-100 text-red-700" },
  "settings.update":   { label: "Cambió settings",   tone: "bg-purple-100 text-purple-700" },
  "data.wipe":         { label: "Borró datos",       tone: "bg-red-100 text-red-700" },
  "line.create":       { label: "Conectó línea",     tone: "bg-green-100 text-green-700" },
  "line.delete":       { label: "Desconectó línea",  tone: "bg-red-100 text-red-700" },
};

export default function AuditoriaPanel() {
  const { isAdmin, currentUser } = useAgents();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/audit-log?limit=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const filtered = entries.filter((e) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      (e.actorName ?? "").toLowerCase().includes(q) ||
      (e.ipAddress ?? "").includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-slate-500 flex-1">
          Registro de acciones sensibles: logins, cambios de usuarios, configuración, líneas, etc.
          Las últimas 200 acciones.
        </p>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar..."
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <span className="text-xs text-slate-500">{filtered.length} entradas</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
          <p className="text-sm">Sin registros todavía</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuándo</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quién</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acción</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalle</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const meta = ACTION_META[e.action] ?? { label: e.action, tone: "bg-slate-100 text-slate-700" };
                const metaStr = Object.keys(e.metadata).length > 0
                  ? Object.entries(e.metadata).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")
                  : "—";
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap" title={new Date(e.createdAt).toLocaleString("es-MX")}>
                      {formatRelativeTime(e.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-700">
                      {e.actorName ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", meta.tone)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500 max-w-md truncate" title={metaStr}>
                      {metaStr}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {e.ipAddress ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
