import "server-only";
import { NextRequest } from "next/server";
import type { PublicUser } from "@/server/auth";
import { requireAuth, requireAdmin } from "@/server/auth";

type Ctx<P> = { params: P };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>, user: PublicUser) => Promise<Response>;

/**
 * Wraps an API handler that requires an authenticated user.
 * Catches Response throws from requireAuth and returns them cleanly.
 */
export function withAuth<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    try {
      const user = await requireAuth();
      return await handler(req, ctx, user);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error("[withAuth] handler error:", err);
      return new Response(JSON.stringify({ error: "Error interno" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

export function withAdmin<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>): Promise<Response> => {
    try {
      const user = await requireAdmin();
      return await handler(req, ctx, user);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error("[withAdmin] handler error:", err);
      return new Response(JSON.stringify({ error: "Error interno" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
