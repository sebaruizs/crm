import "server-only";
import type { Agent, UserRole } from "@/types";
import { AGENTS as SEED_AGENTS } from "@/mock/agents";
import { prisma } from "@/lib/prisma";
import { importLegacyJsonOnce } from "./migrate-from-json";
import { hashPassword, looksHashed, verifyPassword } from "@/server/auth";

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
    // Seed if empty (after legacy import). Hash the seed password.
    const count = await prisma.user.count();
    if (count === 0) {
      for (const u of SEED_AGENTS) {
        await prisma.user.create({
          data: {
            id: u.id,
            name: u.name,
            email: u.email,
            password: await hashPassword(u.password),
            role: u.role,
            color: u.color,
            avatarInitials: u.avatarInitials,
          },
        });
      }
    }

    // Safety net: ensure at least one admin exists. If the table has agents
    // but no admin (e.g. someone deleted all admin users), recreate the
    // bootstrap admin so the system stays accessible.
    const bootstrapEmail = SEED_AGENTS[0]?.email ?? "admin@example.com";
    const bootstrapName = SEED_AGENTS[0]?.name ?? "Administrador";
    const bootstrapInitials = SEED_AGENTS[0]?.avatarInitials ?? "AD";
    const bootstrapColor = SEED_AGENTS[0]?.color ?? "bg-violet-500";
    const bootstrapPassword = SEED_AGENTS[0]?.password ?? "admin1234";

    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount === 0) {
      const existing = await prisma.user.findUnique({ where: { email: bootstrapEmail } });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: "admin",
            name: bootstrapName,
            avatarInitials: bootstrapInitials,
            password: await hashPassword(bootstrapPassword),
          },
        });
      } else {
        await prisma.user.create({
          data: {
            id: "a-bootstrap",
            name: bootstrapName,
            email: bootstrapEmail,
            password: await hashPassword(bootstrapPassword),
            role: "admin",
            color: bootstrapColor,
            avatarInitials: bootstrapInitials,
          },
        });
      }
      console.warn(`[users-store] No admin found. Created/promoted bootstrap admin (${bootstrapEmail} / ${bootstrapPassword}). CHANGE THE PASSWORD IMMEDIATELY.`);
    }

    // Emergency password reset via env var. Useful when you're locked out
    // because nobody remembers a password. Set RESET_ADMIN_PASSWORD=true
    // in Easypanel env, restart, login, then UNSET the var.
    if (process.env.RESET_ADMIN_PASSWORD === "true") {
      await prisma.user.upsert({
        where: { email: bootstrapEmail },
        create: {
          id: "a-bootstrap",
          name: bootstrapName,
          email: bootstrapEmail,
          password: await hashPassword(bootstrapPassword),
          role: "admin",
          color: bootstrapColor,
          avatarInitials: bootstrapInitials,
        },
        update: {
          role: "admin",
          name: bootstrapName,
          avatarInitials: bootstrapInitials,
          password: await hashPassword(bootstrapPassword),
        },
      });
      // Also clear sessions so any active intruder is logged out
      await prisma.session.deleteMany({});
      console.warn(`[users-store] RESET_ADMIN_PASSWORD=true. Bootstrap admin password reset to default. UNSET THIS ENV VAR NOW.`);
    }

    // Upgrade any existing plaintext passwords to bcrypt in place.
    const plaintextUsers = await prisma.user.findMany();
    for (const u of plaintextUsers) {
      if (!looksHashed(u.password)) {
        await prisma.user.update({
          where: { id: u.id },
          data: { password: await hashPassword(u.password) },
        });
      }
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
    if (!r) return null;
    const ok = await verifyPassword(password, r.password);
    if (!ok) return null;
    // Lazy upgrade: if stored value was plaintext, hash it now
    if (!looksHashed(r.password)) {
      const hashed = await hashPassword(password);
      await prisma.user.update({ where: { id: r.id }, data: { password: hashed } });
      r.password = hashed;
    }
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
        password: await hashPassword(input.password),
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
    if (patch.password) data.password = await hashPassword(patch.password);
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
