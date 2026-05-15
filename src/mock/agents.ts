import type { Agent } from "@/types";

/**
 * Seed users loaded into the database on first boot.
 *
 * Only one admin is created so the app can be logged in on a fresh install.
 * Additional users (agents, more admins) should be created from the
 * Usuarios page once you log in.
 *
 * Default credentials:
 *   email:    admin@autoflota.mx
 *   password: admin1234
 *
 * Change the password immediately after the first login.
 */
export const AGENTS: Agent[] = [
  {
    id: "a-bootstrap",
    name: "Administrador",
    avatarInitials: "AD",
    color: "bg-violet-500",
    email: "admin@autoflota.mx",
    role: "admin",
    password: "admin1234",
  },
];
