"use client";

import { useState, useEffect } from "react";
import type { Contact, Note } from "@/types";
import { useAgents } from "@/store/agents-store";
import { cn } from "@/lib/utils";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/constants";

type Tab = "campos" | "dnd" | "acciones";

interface Props {
  contact: Contact;
  onClose: () => void;
  onChangeAgent: (agentId: string | undefined) => void;
}

interface DbTag { id: string; label: string; color: string; }

function FieldRow({
  label,
  children,
  collapsible,
}: {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-500">{label}</label>
        {collapsible && (
          <button className="text-slate-400 hover:text-slate-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-50"
      >
        {title}
        <svg
          className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export default function ContactDetailsSidebar({ contact, onClose, onChangeAgent }: Props) {
  const [tab, setTab] = useState<Tab>("campos");
  const [search, setSearch] = useState("");
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const { agents, currentUser, isAdmin } = useAgents();

  const agent = agents.find((a) => a.id === contact.assignedAgentId);
  const isUnassigned = !contact.assignedAgentId;
  const canReassign = isAdmin;
  const canSelfAssign = !isAdmin && isUnassigned;

  const [allTags, setAllTags] = useState<DbTag[]>([]);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [contactTagIds, setContactTagIds] = useState<string[]>(contact.tagIds);

  useEffect(() => { setContactTagIds(contact.tagIds); }, [contact.id, contact.tagIds]);
  useEffect(() => {
    fetch("/api/tags", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAllTags(d.tags ?? []))
      .catch(() => {});
  }, []);

  async function persistTags(next: string[]) {
    setContactTagIds(next);
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: next }),
    }).catch(() => {});
  }
  function toggleTag(tagId: string) {
    const next = contactTagIds.includes(tagId)
      ? contactTagIds.filter((id) => id !== tagId)
      : [...contactTagIds, tagId];
    persistTags(next);
  }

  const contactTags = allTags.filter((t) => contactTagIds.includes(t.id));

  const initials = contact.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const [first, ...rest] = contact.name.split(" ");
  const last = rest.join(" ");

  return (
    <aside className="flex flex-col w-full lg:w-[340px] shrink-0 bg-white border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900">Detalles del contacto</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar / name */}
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
            {initials}
          </div>
          <h2 className="flex-1 text-base font-bold text-slate-900 truncate">{contact.name}</h2>
          <button className="text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>

        {/* Propietario / Seguidores */}
        <div className="px-4 pb-3 grid grid-cols-2 gap-3">
          <div className="relative">
            <p className="text-xs text-slate-500 mb-1">Propietario</p>

            {/* Self-assign (agent on unassigned) */}
            {canSelfAssign && currentUser && (
              <button
                onClick={() => onChangeAgent(currentUser.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-medium transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Asignarme
              </button>
            )}

            {/* Admin: full dropdown */}
            {canReassign && (
              <>
                <button
                  onClick={() => setAgentMenuOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-medium hover:ring-2 hover:ring-blue-200 transition-shadow",
                    agent ? "bg-slate-100 text-slate-700" : "border border-dashed border-slate-300 text-slate-500"
                  )}
                >
                  {agent ? (
                    <>
                      <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white", agent.color)}>
                        {agent.avatarInitials}
                      </span>
                      <span className="truncate">{agent.name.split(" ")[0]}</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  ) : (
                    <span>+ Asignar agente</span>
                  )}
                </button>

                {agentMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setAgentMenuOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-40 py-1">
                      <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        Cambiar agente
                      </p>
                      {agent && (
                        <button
                          onClick={() => {
                            onChangeAgent(undefined);
                            setAgentMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 text-amber-700 border-b border-slate-100"
                        >
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <span>Liberar</span>
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
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", a.color)}>
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

            {/* Agent viewing their own (read-only) */}
            {!canReassign && !canSelfAssign && agent && (
              <div className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white", agent.color)}>
                  {agent.avatarInitials}
                </span>
                <span className="truncate">{agent.name.split(" ")[0]}</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Seguidores</p>
            <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar
            </button>
          </div>
        </div>

        {/* Etiquetas */}
        <div className="px-4 pb-3 relative">
          <p className="text-xs text-slate-500 mb-1">Etiquetas ({contactTags.length})</p>
          <div className="flex flex-wrap gap-1">
            {contactTags.map((t) => (
              <span key={t.id} className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", t.color)}>
                {t.label}
                <button onClick={() => toggleTag(t.id)} className="opacity-50 hover:opacity-100">×</button>
              </span>
            ))}
            <button
              onClick={() => setTagPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-xs text-slate-500 hover:bg-slate-50"
            >
              +
            </button>
          </div>
          {tagPickerOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setTagPickerOpen(false)} />
              <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto py-1">
                {allTags.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">No hay etiquetas. Crealas en /etiquetas.</p>
                ) : (
                  allTags.map((t) => {
                    const checked = contactTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50"
                      >
                        <input type="checkbox" checked={checked} readOnly className="rounded border-slate-300" />
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", t.color)}>{t.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-4">
          {(["campos", "dnd", "acciones"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                tab === t
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t === "campos" ? "Todos los campos" : t === "dnd" ? "DND" : "Acciones"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar campos y carpetas"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sections */}
        <Section title="Contacto">
          <FieldRow label="Nombre">
            <input type="text" defaultValue={first} className="w-full text-sm text-slate-900 focus:outline-none bg-transparent" />
          </FieldRow>
          <FieldRow label="Apellidos">
            <input type="text" defaultValue={last} className="w-full text-sm text-slate-900 focus:outline-none bg-transparent" />
          </FieldRow>
          <FieldRow label="Correo electrónico">
            <input type="email" placeholder="--" className="w-full text-sm text-slate-900 focus:outline-none bg-transparent" />
          </FieldRow>
          <FieldRow label="Teléfono">
            <div className="flex items-center gap-2">
              <span className="text-base">🇲🇽</span>
              <input type="tel" defaultValue={contact.phone} className="flex-1 text-sm text-slate-900 focus:outline-none bg-transparent" />
              <button className="text-xs text-slate-400 hover:text-slate-600">Seleccionar ⌄</button>
            </div>
          </FieldRow>
          <FieldRow label="Fecha de nacimiento">
            <input type="text" placeholder="--" className="w-full text-sm text-slate-900 focus:outline-none bg-transparent" />
          </FieldRow>
          <FieldRow label="Fuente del contacto">
            <p className="text-sm text-slate-900">{SOURCE_LABELS[contact.source]}</p>
          </FieldRow>
          <FieldRow label="Tipo de contacto" collapsible>
            <p className="text-sm text-slate-900">{STATUS_LABELS[contact.status]}</p>
          </FieldRow>
        </Section>

        {(contact.adId || contact.adHeadline || contact.adSourceUrl) && (
          <Section title="Atribución del anuncio" defaultOpen>
            {contact.adPlatform && (
              <FieldRow label="Plataforma">
                <p className="text-sm text-slate-900 capitalize">{contact.adPlatform}</p>
              </FieldRow>
            )}
            {contact.adHeadline && (
              <FieldRow label="Anuncio">
                <p className="text-sm text-slate-900">{contact.adHeadline}</p>
              </FieldRow>
            )}
            {contact.adId && (
              <FieldRow label="ID del anuncio">
                <p className="text-xs text-slate-500 font-mono break-all">{contact.adId}</p>
              </FieldRow>
            )}
            {contact.adSourceUrl && (
              <FieldRow label="URL">
                <a href={contact.adSourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline break-all">
                  {contact.adSourceUrl}
                </a>
              </FieldRow>
            )}
            {contact.adCtwaClid && (
              <FieldRow label="Click ID">
                <p className="text-xs text-slate-500 font-mono break-all">{contact.adCtwaClid}</p>
              </FieldRow>
            )}
          </Section>
        )}

        <CustomFieldsSection contact={contact} />

        <ChatbotAnswersSection contact={contact} />

        <NotesSection contactId={contact.id} initialNotes={contact.notes} />

        <Section title="Información adicional" defaultOpen={false}>
          <FieldRow label="ID del contacto">
            <p className="text-xs text-slate-500 font-mono">{contact.id}</p>
          </FieldRow>
          <FieldRow label="Creado">
            <p className="text-sm text-slate-900">{new Date(contact.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
          </FieldRow>
        </Section>
      </div>
    </aside>
  );
}

interface ChatbotQuestionDef {
  key: string;
  text: string;
  type: "text" | "yes_no";
}

interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  position: number;
}

function CustomFieldsSection({ contact }: { contact: Contact }) {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const cf of contact.customFields ?? []) v[cf.key] = cf.value;
    return v;
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/custom-fields", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDefs(d.fields ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const v: Record<string, string> = {};
    for (const cf of contact.customFields ?? []) v[cf.key] = cf.value;
    setValues(v);
  }, [contact.id, contact.customFields]);

  async function persist(key: string, value: string) {
    setSavingKey(key);
    const next = { ...values, [key]: value };
    setValues(next);
    const fields = defs.map((d) => ({
      key: d.key,
      label: d.label,
      value: next[d.key] ?? "",
    }));
    try {
      await fetch(`/api/contacts/${contact.id}/custom-fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
    } finally {
      setSavingKey(null);
    }
  }

  if (defs.length === 0) {
    return (
      <Section title="Campos personalizados" defaultOpen={false}>
        <p className="text-xs text-slate-400 py-2">
          No hay campos personalizados definidos.{" "}
          <a href="/campos-personalizados" className="text-blue-600 underline">
            Configurarlos
          </a>
        </p>
      </Section>
    );
  }

  return (
    <Section title="Campos personalizados" defaultOpen>
      <div className="space-y-3">
        {defs.map((def) => (
          <div key={def.id}>
            <label className="block text-xs text-slate-500 mb-1">
              {def.label}
              {savingKey === def.key && <span className="ml-2 text-slate-400">guardando…</span>}
            </label>
            {def.type === "text" && (
              <input
                type="text"
                value={values[def.key] ?? ""}
                onChange={(e) => setValues({ ...values, [def.key]: e.target.value })}
                onBlur={(e) => persist(def.key, e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}
            {def.type === "number" && (
              <input
                type="number"
                value={values[def.key] ?? ""}
                onChange={(e) => setValues({ ...values, [def.key]: e.target.value })}
                onBlur={(e) => persist(def.key, e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}
            {def.type === "date" && (
              <input
                type="date"
                value={values[def.key] ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [def.key]: e.target.value });
                  persist(def.key, e.target.value);
                }}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}
            {def.type === "select" && (
              <select
                value={values[def.key] ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [def.key]: e.target.value });
                  persist(def.key, e.target.value);
                }}
                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">— Seleccionar —</option>
                {(def.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

function ChatbotAnswersSection({ contact }: { contact: Contact }) {
  const [questions, setQuestions] = useState<ChatbotQuestionDef[]>([]);
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setQuestions(d.settings?.chatbotQuestions ?? []))
      .catch(() => {});
  }, []);

  const answers = contact.chatbotAnswers ?? {};
  const answerKeys = Object.keys(answers);
  if (answerKeys.length === 0) return null;

  return (
    <Section title="Respuestas del chatbot" defaultOpen>
      <div className="space-y-2">
        {answerKeys.map((key) => {
          const def = questions.find((q) => q.key === key);
          return (
            <div key={key} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                {def?.text ?? key}
              </p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{answers[key]}</p>
            </div>
          );
        })}
      </div>
      {contact.chatbotState === "done" && (
        <p className="text-[10px] text-slate-400 mt-2">
          ✓ Calificación completa
        </p>
      )}
      {contact.chatbotState === "asking" && (
        <p className="text-[10px] text-amber-600 mt-2">
          ⏳ Calificación en curso (paso {contact.chatbotStep ?? 0})
        </p>
      )}
    </Section>
  );
}

function NotesSection({ contactId, initialNotes }: { contactId: string; initialNotes: Note[] }) {
  const { agents, currentUser } = useAgents();
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-sync when the contact (and thus initialNotes) changes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes, contactId]);

  async function handleSave() {
    if (!newNote.trim() || !currentUser) return;
    setSaving(true);
    const optimistic: Note = {
      id: `tmp-${Date.now()}`,
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
    };
    setNotes((list) => [...list, optimistic]);
    setNewNote("");
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimistic.content, authorId: currentUser.id }),
      });
      const data = await res.json();
      if (data.note) {
        setNotes((list) => list.map((n) => (n.id === optimistic.id ? data.note : n)));
      }
    } catch {
      // rollback
      setNotes((list) => list.filter((n) => n.id !== optimistic.id));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title={`Notas internas (${notes.length})`} defaultOpen>
      <div className="space-y-2 mb-3">
        {notes.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">Aún no hay notas</p>
        ) : (
          notes.map((note) => {
            const author = agents.find((a) => a.id === note.authorId);
            return (
              <div key={note.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs text-slate-800 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
                  {author && (
                    <>
                      <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white", author.color)}>
                        {author.avatarInitials}
                      </div>
                      <span>{author.name}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{new Date(note.createdAt).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <textarea
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        placeholder="Añadir nota interna…"
        rows={2}
        className="w-full text-xs border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <button
        onClick={handleSave}
        disabled={!newNote.trim() || saving}
        className="mt-1.5 w-full px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors"
      >
        {saving ? "Guardando…" : "Guardar nota"}
      </button>
    </Section>
  );
}
