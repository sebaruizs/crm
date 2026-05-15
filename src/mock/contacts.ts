import type { Contact } from "@/types";

/**
 * Seed contacts loaded into the database on first boot.
 *
 * Intentionally empty so a fresh install starts with zero contacts.
 * Real contacts come from inbound WhatsApp messages (Baileys → crmStore).
 */
export const CONTACTS: Contact[] = [];
