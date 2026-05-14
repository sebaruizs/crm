"use client";

import { useEffect, useState } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useAgents } from "@/store/agents-store";
import type { WhatsAppLine, InboundMessage } from "@/server/baileys/types";

const STATUS_META: Record<WhatsAppLine["status"], { label: string; color: string }> = {
  connecting: { label: "Conectando…", color: "bg-yellow-100 text-yellow-700" },
  qr: { label: "Esperando QR", color: "bg-blue-100 text-blue-700" },
  connected: { label: "Conectado", color: "bg-green-100 text-green-700" },
  disconnected: { label: "Desconectado", color: "bg-slate-100 text-slate-600" },
  error: { label: "Error", color: "bg-red-100 text-red-700" },
};

export default function LineasPanel() {
  const { agents: AGENTS } = useAgents();
  const [lines, setLines] = useState<WhatsAppLine[]>([]);
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  // Send-test form state
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("");
  const [sendStatus, setSendStatus] = useState<string>("");

  async function refresh() {
    try {
      const res = await fetch("/api/lines", { cache: "no-store" });
      const data = await res.json();
      setLines(data.lines ?? []);
    } catch {
      /* ignore */
    }
    try {
      const res2 = await fetch("/api/messages?limit=30", { cache: "no-store" });
      const data2 = await res2.json();
      setMessages(data2.messages ?? []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), agentId: agentId || undefined }),
      });
      const data = await res.json();
      if (data.line) setSelectedLineId(data.line.id);
      setName("");
      setAgentId("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta línea? Se borrarán las credenciales.")) return;
    await fetch(`/api/lines/${id}`, { method: "DELETE" });
    if (selectedLineId === id) setSelectedLineId(null);
    await refresh();
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLineId || !testTo || !testBody) return;
    setSendStatus("Enviando…");
    const res = await fetch(`/api/lines/${selectedLineId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo, text: testBody }),
    });
    const data = await res.json();
    if (data.ok) {
      setSendStatus("✓ Enviado");
      setTestBody("");
    } else {
      setSendStatus(`Error: ${data.error ?? "desconocido"}`);
    }
    setTimeout(() => setSendStatus(""), 4000);
  }

  const selected = lines.find((l) => l.id === selectedLineId) ?? null;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Warning banner */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex gap-3">
        <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="text-sm">
          <p className="font-semibold text-amber-900">Conexión vía Baileys (no oficial)</p>
          <p className="text-amber-800">
            Usa WhatsApp Web por debajo. Viola los términos de Meta y existe riesgo real de baneo del número.
            Solo apto para pruebas. Para producción, usa la WhatsApp Business API oficial.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: form + lines list */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Conectar nueva línea</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre (ej. Ventas CDMX)"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Sin agente asignado</option>
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating ? "Iniciando…" : "Generar QR"}
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Líneas configuradas</h3>
            </div>
            {lines.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400 text-center">Aún no hay líneas</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lines.map((line) => {
                  const agent = AGENTS.find((a) => a.id === line.agentId);
                  const meta = STATUS_META[line.status];
                  return (
                    <button
                      key={line.id}
                      onClick={() => setSelectedLineId(line.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors",
                        selectedLineId === line.id && "bg-green-50 border-r-2 border-green-500"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{line.name}</p>
                        <p className="text-xs text-slate-500">
                          {line.phoneNumber ? `+${line.phoneNumber}` : "Sin número"}
                          {agent && ` · ${agent.name}`}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", meta.color)}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: selected line detail / QR */}
        <div className="lg:col-span-2 space-y-4">
          {!selected && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-slate-400">
              <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6.364 1.636l-.707.707M20 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-sm">Selecciona o crea una línea para ver su estado</p>
            </div>
          )}

          {selected && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                    <p className="text-sm text-slate-500">
                      Creada {formatRelativeTime(selected.createdAt)}
                      {selected.connectedAt && ` · Conectada ${formatRelativeTime(selected.connectedAt)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Eliminar
                  </button>
                </div>

                {selected.status === "qr" && selected.qr && (
                  <div className="flex flex-col items-center gap-3 py-6 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 text-center max-w-sm">
                      Abre WhatsApp en tu celular → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected.qr} alt="QR de WhatsApp" className="w-72 h-72 rounded-lg border border-slate-200 bg-white" />
                    <p className="text-xs text-slate-400">El QR expira en 60 segundos</p>
                  </div>
                )}

                {selected.status === "connecting" && (
                  <div className="flex items-center gap-3 py-8 justify-center text-slate-500">
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Estableciendo conexión…</span>
                  </div>
                )}

                {selected.status === "connected" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-800">
                        Conectado como +{selected.phoneNumber}
                      </span>
                    </div>
                    <form onSubmit={handleSendTest} className="space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enviar mensaje de prueba</p>
                      <input
                        type="text"
                        value={testTo}
                        onChange={(e) => setTestTo(e.target.value)}
                        placeholder="Número destino (ej. 5219991234567)"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <textarea
                        value={testBody}
                        onChange={(e) => setTestBody(e.target.value)}
                        placeholder="Mensaje a enviar…"
                        rows={2}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={!testTo || !testBody}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Enviar
                        </button>
                        {sendStatus && <span className="text-xs text-slate-500">{sendStatus}</span>}
                      </div>
                    </form>
                  </div>
                )}

                {selected.status === "disconnected" && (
                  <p className="text-sm text-slate-500 py-4">Línea desconectada. Elimínala y vuelve a crearla para escanear un nuevo QR.</p>
                )}

                {selected.status === "error" && (
                  <p className="text-sm text-red-600 py-4">Error: {selected.lastError ?? "desconocido"}</p>
                )}
              </div>

              {/* Inbox */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Mensajes entrantes</h3>
                  <span className="text-xs text-slate-400">Auto-refresh cada 2s</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {messages.filter((m) => m.lineId === selected.id).length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-400 text-center">Sin mensajes recibidos aún</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {messages
                        .filter((m) => m.lineId === selected.id)
                        .map((m) => (
                          <li key={m.id} className="px-5 py-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-semibold text-slate-900">
                                {m.fromName ?? `+${m.fromNumber}`}
                                {m.isGroup && <span className="ml-1 text-xs text-slate-400">(grupo)</span>}
                              </span>
                              <span className="text-xs text-slate-400">{formatRelativeTime(new Date(m.timestamp).toISOString())}</span>
                            </div>
                            <p className="text-sm text-slate-700">{m.body}</p>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
