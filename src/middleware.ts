import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — runs before any route. We can't validate the session
 * token against the DB here (Prisma doesn't run on Edge), but we can do
 * a cheap presence check on the cookie. The actual DB validation happens
 * server-side in each API route via requireAuth(), so this layer is just
 * about UX (redirect unauth'd users to /login instead of letting them see
 * a flash of the protected shell).
 */

const PUBLIC_PAGE_PREFIXES = ["/login", "/_next", "/favicon"];
const SESSION_COOKIE = "crm.session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public pages and Next internals
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip API routes — they handle auth themselves via requireAuth()
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where the user wanted to go
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
