"use client";

import { useEffect, useState } from "react";
import type { AutomationSettings, MessageTemplate } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";

const DEFAULTS: AutomationSettings = {
  welcomeEnabled: false,
  welcomeTemplateId: null,
  inactivityHours: 4,
  autoAssignEnabled: false,
  autoAssignStrategy: "least_busy",
  autoAssignRoles: ["agente"],
};

export default function AutomatizacionesPanel() {
  const { isAdmin, currentUser } = useAgents();
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULTS);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/templates", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, t]) => {
        setSettings(s.settings ?? DEFAULTS);
        setTemplates(t.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(patch: Partial<AutomationSettings>) {
    setSaving(true);
    const optimistic = { ...settings, ...patch };
    setSettings(optimistic);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      showToast("Cambios guardados");
    } catch {
      showToast("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Acceso restringido</h2>
          <p className="text-sm text-slate-600">
            Solo los administradores pueden configurar las automatizaciones. Estás conectado como <strong>{currentUser?.name}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-5 relative">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">
          Reglas que se ejecutan automáticamente sobre las conversaciones.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Welcome message */}
          <Card title="Mensaje de bienvenida automático" subtitle="Se envía la primera vez que un número desconocido te escribe">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Activar bienvenida automática</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cuando un lead nuevo escribe a tu WhatsApp, se le responde con la plantilla seleccionada
                </p>
              </div>
              <Toggle
                checked={settings.welcomeEnabled}
                onChange={(v) => save({ welcomeEnabled: v })}
                disabled={saving}
              />
            </div>

            {settings.welcomeEnabled && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plantilla a usar</label>
                {templates.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No hay plantillas creadas todavía. Ve a <a href="/plantillas" className="underline font-medium">Plantillas</a> para crear una.
                  </p>
                ) : (
                  <>
                    <select
                      value={settings.welcomeTemplateId ?? ""}
                      onChange={(e) => save({ welcomeTemplateId: e.target.value || null })}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">— Selecciona una plantilla —</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>

                    {settings.welcomeTemplateId && (() => {
                      const tpl = templates.find((t) => t.id === settings.welcomeTemplateId);
                      if (!tpl) return null;
                      return (
                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Vista previa</p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">
                            {tpl.body.replace(/\{\{nombre\}\}/g, "Juan")}
                          </p>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Auto-assignment */}
          <Card title="Asignación automática" subtitle="Asigna cada lead nuevo a un usuario apenas entra">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Activar asignación automática</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cuando entra una conversación nueva, se asigna automáticamente al usuario que mejor encaje según la estrategia elegida
                </p>
              </div>
              <Toggle
                checked={settings.autoAssignEnabled}
                onChange={(v) => save({ autoAssignEnabled: v })}
                disabled={saving}
              />
            </div>

            {settings.autoAssignEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Estrategia</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => save({ autoAssignStrategy: "least_busy" })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-colors",
                        settings.autoAssignStrategy === "least_busy"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-900">Menos ocupado</p>
                      <p className="text-xs text-slate-500 mt-0.5">Asigna al usuario con menos contactos asignados</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => save({ autoAssignStrategy: "round_robin" })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-colors",
                        settings.autoAssignStrategy === "round_robin"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-900">Rotación</p>
                      <p className="text-xs text-slate-500 mt-0.5">Round-robin: rota entre los usuarios elegibles</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Roles elegibles para recibir asignaciones</label>
                  <div className="flex flex-wrap gap-2">
                    {(["admin", "agente"] as const).map((role) => {
                      const checked = settings.autoAssignRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            const next = checked
                              ? settings.autoAssignRoles.filter((r) => r !== role)
                              : [...settings.autoAssignRoles, role];
                            if (next.length === 0) return; // require at least one
                            save({ autoAssignRoles: next });
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
                            checked
                              ? role === "admin"
                                ? "bg-purple-100 text-purple-700 ring-2 ring-purple-300"
                                : "bg-slate-200 text-slate-900 ring-2 ring-slate-400"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          )}
                        >
                          {checked && (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {role === "admin" ? "Administradores" : "Agentes"}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Al menos un rol debe estar seleccionado.</p>
                </div>
              </div>
            )}
          </Card>

          {/* Inactivity */}
          <Card title="Alerta de inactividad" subtitle="Resalta las conversaciones que llevan tiempo sin respuesta del equipo">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-700">Marcar como pendiente después de</label>
              <input
                type="number"
                min={1}
                max={72}
                value={settings.inactivityHours}
                onChange={(e) => save({ inactivityHours: Math.max(1, Math.min(72, parseInt(e.target.value || "1", 10))) })}
                disabled={saving}
                className="w-20 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm text-slate-700">horas sin respuesta del agente</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Las conversaciones donde el último mensaje fue del cliente y pasó más de este tiempo, aparecen con ⚠️ en la bandeja.
            </p>
          </Card>

          {/* Coming soon (visible roadmap) */}
          <Card title="Próximamente" subtitle="Estas automatizaciones están en desarrollo" muted>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                Asignación por campaña o por horario
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                Chatbot de calificación de leads (preguntas pre-agente)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                Recordatorios programados de seguimiento
              </li>
            </ul>
          </Card>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  muted,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-5",
      muted ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 shadow-sm"
    )}>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-green-500" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
