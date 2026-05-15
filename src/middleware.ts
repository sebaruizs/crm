import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware. Two responsibilities:
 *   1) Light auth gate: redirect to /login if no session cookie (UX only;
 *      real validation happens in each API route via requireAuth()).
 *   2) Security headers on every HTML response.
 */

const PUBLIC_PAGE_PREFIXES = ["/login", "/_next", "/favicon"];
const SESSION_COOKIE = "crm.session";

function applySecurityHeaders(res: NextResponse): NextResponse {
  // Prevent the page from being embedded in iframes (clickjacking)
  res.headers.set("X-Frame-Options", "DENY");
  // Force browsers to honor the declared MIME type
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Only send referrer to same origin
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Lock down browser features we don't use
  res.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
  );
  // HSTS only meaningful over HTTPS; harmless when stripped
  res.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes: auth is handled per-route. Don't redirect, but still add
  // security headers to the response.
  if (pathname.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Public assets and login page
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return applySecurityHeaders(NextResponse.next());
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
