import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Agent, UserRole } from "@/types";
import { AGENTS as SEED_AGENTS } from "@/mock/agents";

const STORE_DIR = path.join(process.cwd(), "baileys-sessions");
const STORE_FILE = path.join(STORE_DIR, "users.json");

interface StoreShape {
  users: Agent[];
}

class UsersStore {
  private users: Agent[] = [];
  private initialized = false;
  private saveTimer: NodeJS.Timeout | null = null;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await fs.mkdir(STORE_DIR, { recursive: true });
    if (existsSync(STORE_FILE)) {
      try {
        const raw = await fs.readFile(STORE_FILE, "utf-8");
        const parsed = JSON.parse(raw) as StoreShape;
        this.users = parsed.users ?? [...SEED_AGENTS];
      } catch {
        this.users = [...SEED_AGENTS];
        await this.flush();
      }
    } else {
      this.users = [...SEED_AGENTS];
      await this.flush();
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush().catch(() => {}), 200);
  }

  private async flush() {
    const payload: StoreShape = { users: this.users };
    await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2));
  }

  list(): Agent[] {
    return this.users;
  }

  /** Returns user without password for API responses. */
  listPublic(): Omit<Agent, "password">[] {
    return this.users.map(({ password: _p, ...rest }) => rest);
  }

  get(id: string): Agent | undefined {
    return this.users.find((u) => u.id === id);
  }

  getPublic(id: string): Omit<Agent, "password"> | undefined {
    const u = this.get(id);
    if (!u) return undefined;
    const { password: _p, ...rest } = u;
    return rest;
  }

  authenticate(email: string, password: string): Agent | null {
    const u = this.users.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!u || u.password !== password) return null;
    return u;
  }

  create(input: {
    name: string;
    email: string;
    color: string;
    role: UserRole;
    password: string;
    avatarInitials?: string;
  }): Agent {
    const initials =
      input.avatarInitials?.slice(0, 2).toUpperCase() ||
      input.name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    const user: Agent = {
      id: `a-${randomUUID().slice(0, 8)}`,
      name: input.name.trim(),
      email: input.email.trim(),
      color: input.color,
      role: input.role,
      password: input.password,
      avatarInitials: initials,
    };
    this.users.push(user);
    this.scheduleSave();
    return user;
  }

  update(
    id: string,
    patch: Partial<{
      name: string;
      email: string;
      color: string;
      role: UserRole;
      password: string;
      avatarInitials: string;
    }>
  ): Agent | undefined {
    const u = this.get(id);
    if (!u) return undefined;
    if (patch.name !== undefined) {
      u.name = patch.name.trim();
      if (patch.avatarInitials === undefined) {
        u.avatarInitials = patch.name
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
      }
    }
    if (patch.email !== undefined) u.email = patch.email.trim();
    if (patch.color !== undefined) u.color = patch.color;
    if (patch.role !== undefined) u.role = patch.role;
    if (patch.password) u.password = patch.password;
    if (patch.avatarInitials !== undefined) {
      u.avatarInitials = patch.avatarInitials.slice(0, 2).toUpperCase();
    }
    this.scheduleSave();
    return u;
  }

  delete(id: string): boolean {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    this.scheduleSave();
    return true;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __usersStore: UsersStore | undefined;
}

export const usersStore: UsersStore =
  globalThis.__usersStore ?? (globalThis.__usersStore = new UsersStore());
