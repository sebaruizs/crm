import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "baileys-sessions", "uploads");

export interface StoredFile {
  id: string;
  path: string;
  mime: string;
  originalName: string;
  size: number;
}

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveBuffer(buf: Buffer, originalName: string, mime: string): Promise<StoredFile> {
  await ensureDir();
  const id = randomUUID();
  const ext = path.extname(originalName) || "";
  const filename = `${id}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buf);
  return {
    id: filename, // includes ext so we can resolve mime on serve
    path: filePath,
    mime,
    originalName,
    size: buf.length,
  };
}

export async function readFileById(id: string): Promise<{ buf: Buffer; mime: string } | null> {
  const safeId = path.basename(id); // prevent traversal
  const filePath = path.join(UPLOAD_DIR, safeId);
  if (!existsSync(filePath)) return null;
  const buf = await fs.readFile(filePath);
  // Best-effort MIME from extension
  const ext = path.extname(safeId).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".webm": "video/webm",
  };
  return { buf, mime: mimeMap[ext] ?? "application/octet-stream" };
}

export function classifyMime(mime: string): "image" | "video" | "audio" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}
