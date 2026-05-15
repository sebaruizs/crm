"use client";

import { useState, useEffect, useRef } from "react";
import type { Contact } from "@/types";
import { cn } from "@/lib/utils";
import { useAgents } from "@/store/agents-store";
import TemplatePicker from "./TemplatePicker";

export interface SendPayload {
  text: string;
  file?: File;
}

interface Props {
  contact: Contact;
  starred: boolean;
  onToggleStar: () => void;
  onSendMessage: (payload: SendPayload) => void;
  onOpenDetails: () => void;
  onChangeAgent: (agentId: string | undefined) => void;
  onBack?: () => void;
  onDelete: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Hoy";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

export default function ChatThread({ contact, starred, onToggleStar, onSendMessage, onOpenDetails, onChangeAgent, onBack, onDelete }: Props) {
  const [composer, setComposer] = useState("");
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { agents, currentUser, isAdmin } = useAgents();
  const currentAgent = agents.find((a) => a.id === contact.assignedAgentId);
  const isUnassigned = !contact.assignedAgentId;
  const isMine = contact.assignedAgentId === currentUser?.id;

  // Agente can ONLY:
  //  - self-assign an unassigned conversation
  // Admin can reassign freely.
  const canReassign = isAdmin;
  const canSelfAssign = !isAdmin && isUnassigned;

  function handleSend() {
    if (!composer.trim() && !pendingFile) return;
    onSendMessage({ text: composer, file: pendingFile ?? undefined });
    setComposer("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [contact.messageHistory.length, contact.id]);

  const initials = contact.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const avatarColor = "bg-indigo-100 text-indigo-700";

  // Group messages by day
  const days: Record<string, typeof contact.messageHistory> = {};
  for (const m of contact.messageHistory) {
    const k = dayLabel(m.sentAt);
    if (!days[k]) days[k] = [];
    days[k].push(m);
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Volver a la lista"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0", avatarColor)}>
            {initials}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 leading-tight">{contact.name}</h2>
            <div className="relative mt-0.5">
              {/* Case 1: Agent can self-assign (unassigned conversation) */}
              {canSelfAssign && currentUser && (
                <button
                  onClick={() => onChangeAgent(currentUser.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Asignarme esta conversación
                </button>
              )}

              {/* Case 2: Admin sees full dropdown to reassign */}
              {canReassign && (
                <>
                  <button
                    onClick={() => setAgentMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 group"
                  >
                    {currentAgent ? (
                      <>
                        <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white", currentAgent.color)}>
                          {currentAgent.avatarInitials}
                        </span>
                        <span>Atendiendo: <span className="font-medium text-slate-700 group-hover:text-slate-900">{currentAgent.name}</span></span>
                      </>
                    ) : (
                      <span className="text-amber-600 font-medium">Sin asignar</span>
                    )}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {agentMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setAgentMenuOpen(false)} />
                      <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-40 py-1">
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                          Reasignar conversación
                        </p>
                        {currentAgent && (
                          <button
                            onClick={() => {
                              onChangeAgent(undefined);
                              setAgentMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 text-amber-700 border-b border-slate-100"
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </div>
                            <span>Liberar conversación</span>
                          </button>
                        )}
                        {agents.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => {
                              onChangeAgent(a.id);
                              setAgentMenuOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                              a.id === contact.assignedAgentId && "bg-blue-50"
                            )}
                          >
                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0", a.color)}>
                              {a.avatarInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-900 truncate">{a.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{a.email}</p>
                            </div>
                            {a.id === contact.assignedAgentId && (
                              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Case 3: Agent viewing their own conversation (read-only) */}
              {!canReassign && !canSelfAssign && isMine && currentAgent && (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white", currentAgent.color)}>
                    {currentAgent.avatarInitials}
                  </span>
                  <span>Atendiendo: <span className="font-medium text-slate-700">{currentAgent.name}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <button className="p-2 hover:bg-slate-100 rounded-lg" title="Chat IA">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg" title="Llamar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button onClick={onToggleStar} className="p-2 hover:bg-slate-100 rounded-lg" title="Destacar">
            <svg
              className={cn("w-4 h-4", starred && "text-amber-400 fill-amber-400")}
              fill={starred ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.05 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg" title="Marcar no leído">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-lg"
            title="Eliminar conversación"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages scroll */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {Object.entries(days).map(([day, msgs]) => (
          <div key={day} className="space-y-3">
            {/* Day separator */}
            <div className="flex justify-center my-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {day}
              </span>
            </div>

            {/* Opportunity banner (only after first day) */}
            {day === Object.keys(days)[0] && (
              <div className="flex justify-center my-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-900">
                  <svg className="w-3.5 h-3.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                  <span>
                    <strong>Oportunidad {contact.name} creada</strong> en{" "}
                    <span className="font-semibold">Seguimiento - Nuevo interesado</span>{" "}
                    <button className="underline text-purple-700">Detalles</button>
                  </span>
                  <span className="text-purple-500">hace 14 minutos</span>
                </div>
              </div>
            )}

            {msgs.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-xl group flex flex-col", msg.direction === "outbound" && "items-end")}>
                  <div
                    className={cn(
                      "rounded-2xl text-sm shadow-sm overflow-hidden",
                      msg.direction === "outbound"
                        ? "bg-slate-200 text-slate-900 rounded-br-md"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                    )}
                  >
                    {msg.mediaType === "image" && msg.mediaUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <img src={msg.mediaUrl} alt="" className="max-w-xs max-h-80 object-cover" />
                      </a>
                    )}
                    {msg.mediaType === "video" && msg.mediaUrl && (
                      <video src={msg.mediaUrl} controls className="max-w-xs max-h-80" />
                    )}
                    {msg.mediaType === "audio" && msg.mediaUrl && (
                      <audio src={msg.mediaUrl} controls className="px-3 py-2" />
                    )}
                    {msg.mediaType === "document" && msg.mediaUrl && (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 hover:bg-black/5"
                      >
                        <svg className="w-5 h-5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-medium truncate underline">
                          {msg.mediaName ?? "Documento"}
                        </span>
                      </a>
                    )}
                    {msg.body && (
                      <p className="whitespace-pre-wrap leading-relaxed px-4 py-2.5">{msg.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 px-1">
                    <span>{formatTime(msg.sentAt)}</span>
                    {msg.direction === "outbound" && (
                      <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 10l3 3 7-7-1.5-1.5L8 10 6.5 8.5 5 10z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white p-3 shrink-0">
        {pendingFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-100 rounded-lg">
            {pendingFile.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={URL.createObjectURL(pendingFile)} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{pendingFile.name}</p>
              <p className="text-[10px] text-slate-500">{(pendingFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Quitar archivo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPendingFile(f);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0"
            title="Adjuntar archivo"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
            rows={1}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <TemplatePicker
            contactName={contact.name}
            onInsert={(text) => setComposer((prev) => (prev ? prev + "\n" + text : text))}
          />
          <button
            disabled={!composer.trim() && !pendingFile}
            onClick={handleSend}
            className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
