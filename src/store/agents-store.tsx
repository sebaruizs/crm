"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Agent, UserRole } from "@/types";
import { AGENTS as SEED_AGENTS } from "@/mock/agents";

const STORAGE_KEY = "crm.agents.v3";
const SESSION_KEY = "crm.session.v1";

export interface AgentInput {
  name: string;
  email: string;
  color: string;
  role: UserRole;
  password?: string;
  avatarInitials?: string;
}

export type LoginResult = { ok: true; user: Agent } | { ok: false; error: string };

interface AgentsContextValue {
  agents: Agent[];
  currentUser: Agent | null;
  isAdmin: boolean;
  hydrated: boolean;
  findAgent: (id: string | undefined) => Agent | undefined;
  login: (email: string, password: string) => LoginResult;
  logout: () => void;
  addAgent: (input: AgentInput) => Agent;
  updateAgent: (id: string, patch: Partial<AgentInput>) => void;
  deleteAgent: (id: string) => void;
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

function deriveInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function nextId() {
  return `a-${Math.random().toString(36).slice(2, 9)}`;
}

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Agent[];
        if (Array.isArray(parsed) && parsed.length > 0) setAgents(parsed);
      }
      const savedUser = localStorage.getItem(SESSION_KEY);
      if (savedUser) setCurrentUserId(savedUser);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    } catch {
      /* ignore */
    }
  }, [agents, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (currentUserId) localStorage.setItem(SESSION_KEY, currentUserId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [currentUserId, hydrated]);

  const currentUser = useMemo(
    () => (currentUserId ? agents.find((a) => a.id === currentUserId) ?? null : null),
    [agents, currentUserId]
  );

  const isAdmin = currentUser?.role === "admin";

  const findAgent = useCallback(
    (id: string | undefined) => (id ? agents.find((a) => a.id === id) : undefined),
    [agents]
  );

  const login = useCallback(
    (email: string, password: string): LoginResult => {
      const normalized = email.trim().toLowerCase();
      const user = agents.find((a) => a.email.toLowerCase() === normalized);
      if (!user) return { ok: false, error: "Usuario no encontrado" };
      if (user.password !== password) return { ok: false, error: "Contraseña incorrecta" };
      setCurrentUserId(user.id);
      return { ok: true, user };
    },
    [agents]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
  }, []);

  const addAgent = useCallback((input: AgentInput): Agent => {
    const agent: Agent = {
      id: nextId(),
      name: input.name.trim(),
      email: input.email.trim(),
      color: input.color,
      role: input.role,
      password: input.password ?? "demo1234",
      avatarInitials: (input.avatarInitials || deriveInitials(input.name)).slice(0, 2).toUpperCase(),
    };
    setAgents((list) => [...list, agent]);
    return agent;
  }, []);

  const updateAgent = useCallback((id: string, patch: Partial<AgentInput>) => {
    setAgents((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a };
        if (patch.name !== undefined) next.name = patch.name.trim();
        if (patch.email !== undefined) next.email = patch.email.trim();
        if (patch.color !== undefined) next.color = patch.color;
        if (patch.role !== undefined) next.role = patch.role;
        if (patch.password) next.password = patch.password; // only overwrite if non-empty
        if (patch.avatarInitials !== undefined) {
          next.avatarInitials = patch.avatarInitials.slice(0, 2).toUpperCase();
        } else if (patch.name !== undefined) {
          next.avatarInitials = deriveInitials(patch.name);
        }
        return next;
      })
    );
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setAgents((list) => list.filter((a) => a.id !== id));
    // If you delete yourself, log out
    if (currentUserId === id) setCurrentUserId(null);
  }, [currentUserId]);

  return (
    <AgentsContext.Provider
      value={{
        agents,
        currentUser,
        isAdmin,
        hydrated,
        findAgent,
        login,
        logout,
        addAgent,
        updateAgent,
        deleteAgent,
      }}
    >
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgents(): AgentsContextValue {
  const ctx = useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents debe usarse dentro de <AgentsProvider>");
  return ctx;
}

export const AGENT_COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "bg-violet-500", label: "Violeta" },
  { value: "bg-blue-500", label: "Azul" },
  { value: "bg-emerald-500", label: "Verde" },
  { value: "bg-orange-500", label: "Naranja" },
  { value: "bg-rose-500", label: "Rosa" },
  { value: "bg-amber-500", label: "Ámbar" },
  { value: "bg-teal-500", label: "Turquesa" },
  { value: "bg-pink-500", label: "Magenta" },
  { value: "bg-indigo-500", label: "Índigo" },
  { value: "bg-cyan-500", label: "Cian" },
  { value: "bg-slate-500", label: "Pizarra" },
  { value: "bg-red-500", label: "Rojo" },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrador",
  agente: "Agente",
};

export const ROLE_BADGE: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  agente: "bg-slate-100 text-slate-700",
};
