import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Agent, UserRole } from "@/types";

const SESSION_COOKIE = "crm.session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 10;

// ─── Password helpers ──────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function looksHashed(value: string): boolean {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

/**
 * Verifies a plaintext password against a stored value. If the stored value
 * is still in plaintext (legacy), accepts a direct match — this enables the
 * lazy upgrade path for users created before bcrypt was introduced.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (looksHashed(stored)) {
    try {
      return await bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }
  // Legacy plaintext
  return plain === stored;
}

// ─── Session helpers ───────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { token, userId, expiresAt },
  });
  return token;
}

export async function destroySessionByToken(token: string): Promise<void> {
  try {
    await prisma.session.delete({ where: { token } });
  } catch {
    /* already gone */
  }
}

export async function readSession(token: string): Promise<Agent | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // expired — clean up
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  const u = session.user;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password: u.password,
    role: u.role as UserRole,
    color: u.color,
    avatarInitials: u.avatarInitials,
  };
}

// ─── Cookie helpers (server side) ──────────────────────────────

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

// ─── Request-level helper ──────────────────────────────────────

export type PublicUser = Omit<Agent, "password">;

export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;
  const user = await readSession(token);
  if (!user) return null;
  const { password: _p, ...publicUser } = user;
  return publicUser;
}

/**
 * Returns the current user or throws a Response with 401.
 * Use inside an API route: `const user = await requireAuth();`
 */
export async function requireAuth(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "No autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Solo administradores" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

// ─── Rate limit (in-memory, per IP) ────────────────────────────

interface Bucket { count: number; resetAt: number; }
const loginBuckets = new Map<string, Bucket>();
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export function checkLoginRateLimit(ip: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const b = loginBuckets.get(ip);
  if (!b || b.resetAt < now) {
    loginBuckets.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= LOGIN_LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}
