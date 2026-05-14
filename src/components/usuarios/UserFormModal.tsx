"use client";

import { useEffect, useState } from "react";
import type { Agent, UserRole } from "@/types";
import { useAgents, AGENT_COLOR_PRESETS, ROLE_LABEL } from "@/store/agents-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
}

export default function UserFormModal({ open, agent, onClose }: Props) {
  const { addAgent, updateAgent } = useAgents();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(AGENT_COLOR_PRESETS[0].value);
  const [initials, setInitials] = useState("");
  const [role, setRole] = useState<UserRole>("agente");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(agent?.name ?? "");
      setEmail(agent?.email ?? "");
      setColor(agent?.color ?? AGENT_COLOR_PRESETS[0].value);
      setInitials(agent?.avatarInitials ?? "");
      setRole(agent?.role ?? "agente");
      setPassword("");
      setShowPassword(false);
      setError("");
    }
  }, [open, agent]);

  useEffect(() => {
    if (!agent) {
      const derived = name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      setInitials(derived);
    }
  }, [name, agent]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("El nombre es requerido");
    if (!email.trim() || !/.+@.+\..+/.test(email)) return setError("Email inválido");
    if (!agent && password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (agent && password && password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (agent) {
      updateAgent(agent.id, {
        name, email, color, role,
        avatarInitials: initials,
        ...(password ? { password } : {}),
      });
    } else {
      addAgent({ name, email, color, role, password, avatarInitials: initials });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              {agent ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white", color)}>
                {initials || "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{name || "Vista previa"}</p>
                <p className="text-xs text-slate-500">{email || "email@ejemplo.com"}</p>
                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700">
                  {ROLE_LABEL[role]}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sofía Ramírez"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@autoflota.mx"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contraseña {agent && <span className="text-slate-400 font-normal">(dejar vacío para no cambiar)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={agent ? "Nueva contraseña" : "Mínimo 6 caracteres"}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-colors",
                    role === "admin"
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900">Administrador</span>
                  </div>
                  <p className="text-xs text-slate-500">Acceso total y reasignación</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("agente")}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-colors",
                    role === "agente"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-900">Agente</span>
                  </div>
                  <p className="text-xs text-slate-500">Solo sus chats + libres</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Iniciales</label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="SR"
                className="w-24 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Color del avatar</label>
              <div className="flex flex-wrap gap-2">
                {AGENT_COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      c.value,
                      color === c.value ? "ring-2 ring-offset-2 ring-slate-900" : "hover:scale-110"
                    )}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {agent ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
