import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_LOGIN_HEADER, guardAdminRequest } from "@/lib/admin-guard";
import { buildCsp, newNonce } from "@/lib/csp";
import { role } from "@/lib/role";

/**
 * 1. /admin is a 404 unless ROLE=admin and Tailscale's identity header names the owner.
 * 2. Every rendered page gets a fresh CSP nonce (request header x-nonce + the CSP header on both sides).
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
