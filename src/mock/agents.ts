import type { Agent } from "@/types";

/**
 * Seed users loaded into the database on first boot.
 *
 * Only one admin is created so the app can be logged in on a fresh install.
 * Additional users (agents, more admins) should be created from the
 * Usuarios page once you log in.
 *
 * Default credentials:
 *   email:    admin@ridder.com.py
 *   password: admin1234
 *
 * Change the password immediately after the first login.
 */
export const AGENTS: Agent[] = [
  {
    id: "a-bootstrap",
    name: "Sebastian Ruiz",
    avatarInitials: "SR",
    color: "bg-violet-500",
    email: "admin@ridder.com.py",
    role: "admin",
    password: "admin1234",
  },
];
