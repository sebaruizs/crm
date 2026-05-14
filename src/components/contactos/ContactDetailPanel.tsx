"use client";

import { useState } from "react";
import type { Contact } from "@/types";
import { useAgents } from "@/store/agents-store";
import { TAGS } from "@/mock/tags";
import { cn, formatRelativeTime } from "@/lib/utils";
import { SOURCE_LABELS, STATUS_LABELS, SOURCE_COLORS } from "@/lib/constants";

interface Props {
  contact: Contact;
  onClose: () => void;
}

type TabId = "historial" | "notas" | "datos";

export default function ContactDetailPanel({ contact, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("historial");
  const [newNote, setNewNote] = useState("");
  const { agents: AGENTS } = useAgents();

  const agent = AGENTS.find((a) => a.id === contact.assignedAgentId);
  const tags = TAGS.filter((t) => contact.tagIds.includes(t.id));

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-start gap-4 px-6 py-5 border-b border-slate-200">
        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
          {contact.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">{contact.name}</h2>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SOURCE_COLORS[contact.source])}>
              {SOURCE_LABELS[contact.source]}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{contact.phone}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((t) => (
              <span key={t.id} className={cn("text-xs px-2 py-0.5 rounded-full font-medium", t.color)}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-6 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-slate-700">{STATUS_LABELS[contact.status]}</span>
        </div>
        {agent && (
          <div className="flex items-center gap-1.5">
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white", agent.color)}>
              {agent.avatarInitials}
            </div>
            <span>{agent.name}</span>
          </div>
        )}
        <div className="ml-auto">
          Último mensaje: {formatRelativeTime(contact.lastMessageAt)}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6">
        {(["historial", "notas", "datos"] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t
                ? "border-green-500 text-green-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "historial" ? "Historial" : t === "notas" ? "Notas" : "Datos"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "historial" && (
          <div className="p-4 space-y-3">
            {contact.messageHistory.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">Sin mensajes</p>
            )}
            {contact.messageHistory.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-xs rounded-2xl px-3.5 py-2.5 text-sm",
                    msg.direction === "outbound"
                      ? "bg-green-500 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  )}
                >
                  <p>{msg.body}</p>
                  <p className={cn("text-[10px] mt-1 text-right", msg.direction === "outbound" ? "text-green-100" : "text-slate-400")}>
                    {new Date(msg.sentAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    {msg.direction === "outbound" && (
                      <span className="ml-1">
                        {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "notas" && (
          <div className="p-4 space-y-4">
            {contact.notes.map((note) => {
              const noteAgent = AGENTS.find((a) => a.id === note.authorId);
              return (
                <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-slate-800">{note.content}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                    <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white", noteAgent?.color)}>
                      {noteAgent?.avatarInitials}
                    </div>
                    <span>{noteAgent?.name}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(note.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            <div className="mt-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Añadir nota interna..."
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={() => setNewNote("")}
                disabled={!newNote.trim()}
                className="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Guardar nota
              </button>
            </div>
          </div>
        )}

        {tab === "datos" && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Vehículo de interés</p>
                <p className="text-sm font-medium text-slate-900">{contact.vehicleInterest ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Licencia verificada</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", contact.licenseVerified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {contact.licenseVerified ? "Verificada" : "Pendiente"}
                </span>
              </div>
              {contact.visitScheduledAt && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-0.5">Visita agendada</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(contact.visitScheduledAt).toLocaleString("es-MX", {
                      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
              )}
            </div>
            <hr className="border-slate-200" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Campos personalizados</p>
              <div className="space-y-2">
                {contact.customFields.map((cf) => (
                  <div key={cf.key} className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-sm text-slate-500">{cf.label}</span>
                    <span className="text-sm font-medium text-slate-900">{cf.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="px-6 py-4 border-t border-slate-200 flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Abrir en WhatsApp
        </button>
        <button className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-lg transition-colors">
          Editar
        </button>
      </div>
    </div>
  );
}
