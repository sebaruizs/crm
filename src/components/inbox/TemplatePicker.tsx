"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageTemplate } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  contactName: string;
  onInsert: (text: string) => void;
}

function substitute(body: string, contactName: string): string {
  const firstName = contactName.split(" ")[0];
  return body.replace(/\{\{nombre\}\}/g, firstName);
}

export default function TemplatePicker({ contactName, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const filtered = templates.filter((t) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      t.label.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      (t.shortcut?.toLowerCase().includes(q) ?? false)
    );
  });

  function handlePick(tpl: MessageTemplate) {
    onInsert(substitute(tpl.body, contactName));
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "p-2 rounded-lg transition-colors shrink-0",
          open ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
        )}
        title="Plantillas (respuestas rápidas)"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-slate-200 rounded-lg shadow-2xl z-40 flex flex-col max-h-96">
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar plantilla..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  {templates.length === 0 ? "Sin plantillas creadas" : "Sin resultados"}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filtered.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => handlePick(t)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                          {t.shortcut && (
                            <code className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded">
                              /{t.shortcut}
                            </code>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">
                          {substitute(t.body, contactName)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
