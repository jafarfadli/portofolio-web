import { NextResponse, type NextRequest } from "next/server";
import { refreshedSessionCookie, SESSION_COOKIE } from "@/auth/cookie";
import { ADMIN_LOGIN_HEADER, guardAdminRequest, isAdminPath } from "@/lib/admin-guard";
import { buildCsp, newNonce } from "@/lib/csp";
import { role } from "@/lib/role";

/**
 * 1. /admin is a 404 unless ROLE=admin and Tailscale's identity header names the owner.
 * 2. A GET or HEAD under /admin that carries the session cookie re-sets it for another 14 days (rolling expiry).
 * 3. Every rendered page gets a fresh CSP nonce (request header x-nonce + the CSP header on both sides).
 */
export function proxy(request: NextRequest) {
  const dev = process.env.NODE_ENV === "development";
  const verdict = guardAdminRequest({
    pathname: request.nextUrl.pathname,
    role: role(),
    login: request.headers.get(ADMIN_LOGIN_HEADER),
    expectedLogin: process.env.ADMIN_TAILSCALE_LOGIN,
    dev,
  });
  if (verdict === "not-found") {
    return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const nonce = newNonce();
  const csp = buildCsp(nonce, dev);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  if (isAdminPath(request.nextUrl.pathname)) {
    const roll = refreshedSessionCookie({
      method: request.method,
      token: request.cookies.get(SESSION_COOKIE)?.value,
      now: new Date(),
    });
    if (roll) response.cookies.set(roll.name, roll.value, roll.options);
  }
  return response;
}

export const config = {
  matcher: [
    // The admin guard must see every /admin request, prefetches included.
    "/admin",
    "/admin/:path*",
    // Nonces for every rendered page. Static files, uploads and API routes skip the proxy.
    {
      source: "/((?!_next/static|_next/image|media/|api/|icon.svg|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
