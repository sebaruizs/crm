import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface LogInput {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Records an audit log entry. Fire-and-forget — failures are swallowed
 * so they never block the original request.
 */
export function logAudit(input: LogInput): void {
  prisma.auditLog
    .create({
      data: {
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: JSON.stringify(input.metadata ?? {}),
        ipAddress: input.ipAddress ?? null,
      },
    })
    .catch((err) => {
      console.warn("[audit] failed to log:", err);
    });
}

export async function listAuditEntries(limit = 200) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
  });
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorName: r.actorName,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    metadata: safeJson(r.metadata),
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
  }));
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
