"use client";

import Link from "next/link";
import type { Contact } from "@/types";
import { useAgents } from "@/store/agents-store";
import { TAGS } from "@/mock/tags";
import { cn, formatRelativeTime } from "@/lib/utils";
import { SOURCE_LABELS, SOURCE_COLORS, STATUS_LABELS } from "@/lib/constants";

interface Props {
  contact: Contact;
  onClose: () => void;
}

export default function ContactInfoDrawer({ contact, onClose }: Props) {
  const { agents: AGENTS } = useAgents();
  const agent = AGENTS.find((a) => a.id === contact.assignedAgentId);
  const tags = TAGS.filter((t) => contact.tagIds.includes(t.id));
  const initials = contact.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 z-20" onClick={onClose} />

      {/* Drawer */}
      <aside className="absolute top-0 right-0 bottom-0 w-[480px] bg-white shadow-2xl z-30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Detalle del contacto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Identity card */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">{contact.name}</h3>
                <p className="text-sm text-slate-500 font-mono">{contact.phone}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SOURCE_COLORS[contact.source])}>
                    {SOURCE_LABELS[contact.source]}
                  </span>
                  {tags.map((t) => (
                    <span key={t.id} className={cn("text-xs px-2 py-0.5 rounded-full font-medium", t.color)}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick action */}
            <Link
              href="/conversaciones"
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Abrir conversación
            </Link>
          </div>

          {/* Info grid */}
          <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-slate-100">
            <Field label="Estado">
              <span className="text-sm font-medium text-slate-900">{STATUS_LABELS[contact.status]}</span>
            </Field>
            <Field label="Agente asignado">
              {agent ? (
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white", agent.color)}>
                    {agent.avatarInitials}
                  </div>
                  <span className="text-sm text-slate-900">{agent.name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Sin asignar</span>
              )}
            </Field>
            <Field label="Vehículo de interés">
              <span className="text-sm text-slate-900">{contact.vehicleInterest ?? "—"}</span>
            </Field>
            <Field label="Licencia">
              <span className={cn("inline-block text-xs px-2 py-0.5 rounded-full font-medium", contact.licenseVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                {contact.licenseVerified ? "Verificada" : "Pendiente"}
              </span>
            </Field>
            <Field label="Creado">
              <span className="text-sm text-slate-900">
                {new Date(contact.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </Field>
            <Field label="Último contacto">
              <span className="text-sm text-slate-900">{formatRelativeTime(contact.lastMessageAt)}</span>
            </Field>
            {contact.visitScheduledAt && (
              <Field label="Visita agendada" wide>
                <span className="text-sm text-slate-900">
                  {new Date(contact.visitScheduledAt).toLocaleString("es-MX", {
                    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
              </Field>
            )}
          </div>

          {/* Custom fields */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Campos personalizados
            </h4>
            {contact.customFields.length === 0 ? (
              <p className="text-sm text-slate-400">—</p>
            ) : (
              <div className="space-y-2">
                {contact.customFields.map((cf) => (
                  <div key={cf.key} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-sm text-slate-500">{cf.label}</span>
                    <span className="text-sm font-medium text-slate-900">{cf.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="px-6 py-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Notas internas ({contact.notes.length})
            </h4>
            {contact.notes.length === 0 ? (
              <p className="text-sm text-slate-400">Sin notas</p>
            ) : (
              <div className="space-y-3">
                {contact.notes.map((note) => {
                  const noteAgent = AGENTS.find((a) => a.id === note.authorId);
                  return (
                    <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-slate-800">{note.content}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                        {noteAgent && (
                          <>
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white", noteAgent.color)}>
                              {noteAgent.avatarInitials}
                            </div>
                            <span>{noteAgent.name}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>{formatRelativeTime(note.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      {children}
    </div>
  );
}
