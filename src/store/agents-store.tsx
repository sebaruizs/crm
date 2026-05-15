"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Agent, UserRole } from "@/types";

export type PublicAgent = Omit<Agent, "password">;

export interface AgentInput {
  name: string;
  email: string;
  color: string;
  role: UserRole;
  password?: string;
  avatarInitials?: string;
}

export type LoginResult = { ok: true; user: PublicAgent } | { ok: false; error: string };

interface AgentsContextValue {
  agents: PublicAgent[];
  currentUser: PublicAgent | null;
  isAdmin: boolean;
  hydrated: boolean;
  findAgent: (id: string | undefined) => PublicAgent | undefined;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  addAgent: (input: AgentInput) => Promise<PublicAgent | null>;
  updateAgent: (id: string, patch: Partial<AgentInput>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  refreshAgents: () => Promise<void>;
}

const AgentsContext = createContext<AgentsContextValue | null>(null);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [currentUser, setCurrentUser] = useState<PublicAgent | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refreshAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) {
        // 401: clear user list (we're logged out)
        if (res.status === 401) setAgents([]);
        return;
      }
      const data = await res.json();
      setAgents(data.users ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setCurrentUser(data.user ?? null);
      return data.user as PublicAgent | null;
    } catch {
      setCurrentUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const user = await refreshCurrentUser();
      if (user) await refreshAgents();
      setHydrated(true);
    })();
  }, [refreshCurrentUser, refreshAgents]);

  const isAdmin = currentUser?.role === "admin";

  const findAgent = useCallback(
    (id: string | undefined) => (id ? agents.find((a) => a.id === id) : undefined),
    [agents]
  );

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? "Error desconocido" };
      setCurrentUser(data.user);
      await refreshAgents();
      return { ok: true, user: data.user };
    } catch (err) {
      return { ok: false, error: `Error de red: ${String(err)}` };
    }
  }, [refreshAgents]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setCurrentUser(null);
    setAgents([]);
  }, []);

  const addAgent = useCallback(async (input: AgentInput): Promise<PublicAgent | null> => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return null;
    await refreshAgents();
    return data.user;
  }, [refreshAgents]);

  const updateAgent = useCallback(async (id: string, patch: Partial<AgentInput>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await refreshAgents();
  }, [refreshAgents]);

  const deleteAgent = useCallback(async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (currentUser?.id === id) {
        await logout();
      } else {
        await refreshAgents();
      }
    }
  }, [currentUser?.id, refreshAgents, logout]);

  const value = useMemo<AgentsContextValue>(
    () => ({
      agents, currentUser, isAdmin, hydrated, findAgent,
      login, logout, addAgent, updateAgent, deleteAgent, refreshAgents,
    }),
    [agents, currentUser, isAdmin, hydrated, findAgent, login, logout, addAgent, updateAgent, deleteAgent, refreshAgents]
  );

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
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
