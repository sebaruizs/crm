"use client";

import { useEffect, useState } from "react";
import type { AutomationSettings, ChatbotQuestion, MessageTemplate } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";

const DEFAULTS: AutomationSettings = {
  welcomeEnabled: false,
  welcomeTemplateId: null,
  inactivityHours: 4,
  autoAssignEnabled: false,
  autoAssignStrategy: "least_busy",
  autoAssignRoles: ["agente"],
  chatbotEnabled: false,
  chatbotQuestions: [],
  chatbotClosing: "¡Gracias! Un agente te va a atender en breve. 🙌",
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
          {settings.welcomeEnabled && settings.chatbotEnabled && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-amber-900">
                <p className="font-semibold">Tenés activadas las dos automatizaciones de bienvenida</p>
                <p className="text-amber-800 mt-0.5">
                  El cliente va a recibir <strong>el mensaje de bienvenida</strong> y, en simultáneo, <strong>la primera pregunta del chatbot</strong>. Te recomendamos elegir solo una.
                </p>
              </div>
            </div>
          )}
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

          {/* Chatbot de calificación */}
          <Card title="Chatbot de calificación" subtitle="El bot le hace preguntas al cliente antes de derivar al agente">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Activar chatbot</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cuando un lead nuevo escribe, el bot le hace las preguntas en orden. Las respuestas quedan guardadas y, si una pregunta marcada como crítica recibe "no", el lead se marca automáticamente como "No Califica".
                </p>
              </div>
              <Toggle
                checked={settings.chatbotEnabled}
                onChange={(v) => save({ chatbotEnabled: v })}
                disabled={saving}
              />
            </div>

            {settings.chatbotEnabled && (
              <ChatbotQuestionsEditor
                questions={settings.chatbotQuestions}
                closing={settings.chatbotClosing}
                onChange={(questions) => save({ chatbotQuestions: questions })}
                onClosingChange={(closing) => save({ chatbotClosing: closing })}
              />
            )}
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

          <DangerZone onToast={showToast} />
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

function DangerZone({ onToast }: { onToast: (msg: string) => void }) {
  const { currentUser, refreshAgents } = useAgents();
  const [action, setAction] = useState<null | "wipe" | "reset">(null);
  const [confirmText, setConfirmText] = useState("");
  const [working, setWorking] = useState(false);

  const expectedConfirm = action === "wipe" ? "BORRAR-DATOS" : "RESET-COMPLETO";
  const endpoint = action === "wipe" ? "/api/admin/wipe" : "/api/admin/factory-reset";

  async function handleExecute() {
    if (!currentUser || !action) return;
    setWorking(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: expectedConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(`Error: ${data.error ?? "desconocido"}`);
      } else if (action === "wipe") {
        onToast(`Listo: ${data.deleted.contacts} contactos y ${data.deleted.notifications} notificaciones eliminadas`);
      } else {
        const d = data.deleted;
        onToast(`Reset completo: ${d.contacts} contactos, ${d.templates} plantillas, ${d.tags} etiquetas, ${d.customFields} campos, ${d.lines} líneas, ${d.otherUsers} usuarios`);
        await refreshAgents();
      }
      setAction(null);
      setConfirmText("");
    } catch {
      onToast("Error de red");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-red-900">Zona peligrosa</h3>
          <p className="text-xs text-red-800 mt-0.5">Dos opciones de limpieza, irreversibles.</p>
        </div>
      </div>

      {/* Option 1: Wipe data */}
      <div className="bg-white rounded-lg border border-red-200 p-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Eliminar conversaciones</p>
            <p className="text-xs text-slate-600">
              Borra contactos, mensajes, notas y notificaciones. Mantiene usuarios, plantillas, etiquetas, líneas y settings.
            </p>
          </div>
          {action !== "wipe" && (
            <button
              type="button"
              onClick={() => { setAction("wipe"); setConfirmText(""); }}
              className="text-xs font-medium text-red-700 bg-white border border-red-300 hover:bg-red-100 px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Eliminar datos
            </button>
          )}
        </div>
        {action === "wipe" && <ConfirmInline
          expected={expectedConfirm}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          onCancel={() => { setAction(null); setConfirmText(""); }}
          onConfirm={handleExecute}
          working={working}
          buttonLabel="Confirmar y borrar"
        />}
      </div>

      {/* Option 2: Factory reset */}
      <div className="bg-white rounded-lg border border-red-300 p-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Reset completo de fábrica</p>
            <p className="text-xs text-slate-600">
              Borra <strong>todo</strong>: contactos, mensajes, plantillas, etiquetas, campos personalizados, líneas, otros usuarios, settings reset. Solo queda tu usuario actual.
            </p>
          </div>
          {action !== "reset" && (
            <button
              type="button"
              onClick={() => { setAction("reset"); setConfirmText(""); }}
              className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Reset completo
            </button>
          )}
        </div>
        {action === "reset" && <ConfirmInline
          expected={expectedConfirm}
          confirmText={confirmText}
          setConfirmText={setConfirmText}
          onCancel={() => { setAction(null); setConfirmText(""); }}
          onConfirm={handleExecute}
          working={working}
          buttonLabel="Sí, resetear todo"
          variant="danger"
        />}
      </div>
    </div>
  );
}


function ChatbotQuestionsEditor({
  questions,
  closing,
  onChange,
  onClosingChange,
}: {
  questions: ChatbotQuestion[];
  closing: string;
  onChange: (q: ChatbotQuestion[]) => void;
  onClosingChange: (s: string) => void;
}) {
  function update(idx: number, patch: Partial<ChatbotQuestion>) {
    const next = questions.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onChange(next);
  }
  function remove(idx: number) {
    onChange(questions.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...questions,
      { key: `q${questions.length + 1}`, text: "", type: "text" },
    ]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-700">Preguntas (en orden)</p>
      {questions.length === 0 && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Aún no hay preguntas. Agregá la primera abajo.
        </p>
      )}
      {questions.map((q, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 w-6">{i + 1}.</span>
            <input
              type="text"
              value={q.key}
              onChange={(e) => update(i, { key: e.target.value.replace(/\s/g, "_") })}
              placeholder="clave (ej. plataforma)"
              className="w-32 text-xs font-mono border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={q.type}
              onChange={(e) => update(i, { type: e.target.value as ChatbotQuestion["type"] })}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
            >
              <option value="text">Texto libre</option>
              <option value="yes_no">Sí / No</option>
            </select>
            <span className="flex-1" />
            <button
              onClick={() => remove(i)}
              className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
            >
              Quitar
            </button>
          </div>
          <textarea
            value={q.text}
            onChange={(e) => update(i, { text: e.target.value })}
            placeholder="Pregunta para el cliente (podés usar {{nombre}})"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {q.type === "yes_no" && (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={!!q.failsIfNo}
                onChange={(e) => update(i, { failsIfNo: e.target.checked })}
                className="rounded border-slate-300"
              />
              Si responde "no", marcar lead como No Califica
            </label>
          )}
        </div>
      ))}
      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-dashed border-slate-300 hover:border-slate-400 rounded-lg"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Agregar pregunta
      </button>

      <div className="pt-3 border-t border-slate-200">
        <p className="text-xs font-medium text-slate-700 mb-1">Mensaje de cierre</p>
        <p className="text-xs text-slate-500 mb-2">Se envía cuando el cliente terminó de contestar todas las preguntas.</p>
        <textarea
          value={closing}
          onChange={(e) => onClosingChange(e.target.value)}
          rows={2}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>
    </div>
  );
}

function ConfirmInline({
  expected,
  confirmText,
  setConfirmText,
  onCancel,
  onConfirm,
  working,
  buttonLabel,
  variant = "danger",
}: {
  expected: string;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  working: boolean;
  buttonLabel: string;
  variant?: "danger";
}) {
  return (
    <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
      <p className="text-xs text-slate-700">
        Escribí <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-red-700">{expected}</code> para confirmar:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={expected}
        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmText !== expected || working}
          className={cn(
            "text-xs font-medium text-white px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed",
            variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-slate-600 hover:bg-slate-700"
          )}
        >
          {working ? "Procesando…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
