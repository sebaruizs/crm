import "server-only";
import type { Agent, UserRole } from "@/types";
import { AGENTS as SEED_AGENTS } from "@/mock/agents";
import { prisma } from "@/lib/prisma";
import { importLegacyJsonOnce } from "./migrate-from-json";

function deriveInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

class UsersStore {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await importLegacyJsonOnce();
    // Seed if empty (after legacy import)
    const count = await prisma.user.count();
    if (count === 0) {
      await prisma.$transaction(
        SEED_AGENTS.map((u) =>
          prisma.user.create({
            data: {
              id: u.id,
              name: u.name,
              email: u.email,
              password: u.password,
              role: u.role,
              color: u.color,
              avatarInitials: u.avatarInitials,
            },
          })
        )
      );
    }
  }

  async list(): Promise<Agent[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role as UserRole,
      color: r.color,
      avatarInitials: r.avatarInitials,
    }));
  }

  async listPublic(): Promise<Omit<Agent, "password">[]> {
    const rows = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role as UserRole,
      color: r.color,
      avatarInitials: r.avatarInitials,
    }));
  }

  async get(id: string): Promise<Agent | undefined> {
    const r = await prisma.user.findUnique({ where: { id } });
    if (!r) return undefined;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role as UserRole,
      color: r.color,
      avatarInitials: r.avatarInitials,
    };
  }

  async authenticate(email: string, password: string): Promise<Agent | null> {
    const r = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });
    if (!r || r.password !== password) return null;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role as UserRole,
      color: r.color,
      avatarInitials: r.avatarInitials,
    };
  }

  async create(input: {
    name: string;
    email: string;
    color: string;
    role: UserRole;
    password: string;
    avatarInitials?: string;
  }): Promise<Agent> {
    const initials =
      input.avatarInitials?.slice(0, 2).toUpperCase() || deriveInitials(input.name);
    const r = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
        role: input.role,
        color: input.color,
        avatarInitials: initials,
      },
    });
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      password: r.password,
      role: r.role as UserRole,
      color: r.color,
      avatarInitials: r.avatarInitials,
    };
  }

  async update(
    id: string,
    patch: Partial<{
      name: string;
      email: string;
      color: string;
      role: UserRole;
      password: string;
      avatarInitials: string;
    }>
  ): Promise<Agent | undefined> {
    const data: Record<string, string> = {};
    if (patch.name !== undefined) {
      data.name = patch.name.trim();
      if (patch.avatarInitials === undefined) data.avatarInitials = deriveInitials(patch.name);
    }
    if (patch.email !== undefined) data.email = patch.email.trim();
    if (patch.color !== undefined) data.color = patch.color;
    if (patch.role !== undefined) data.role = patch.role;
    if (patch.password) data.password = patch.password;
    if (patch.avatarInitials !== undefined) {
      data.avatarInitials = patch.avatarInitials.slice(0, 2).toUpperCase();
    }
    try {
      const r = await prisma.user.update({ where: { id }, data });
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        password: r.password,
        role: r.role as UserRole,
        color: r.color,
        avatarInitials: r.avatarInitials,
      };
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __usersStore: UsersStore | undefined;
}

export const usersStore: UsersStore =
  globalThis.__usersStore ?? (globalThis.__usersStore = new UsersStore());
