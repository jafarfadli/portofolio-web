/** Plain module (no server-only, no database) so the proxy and the server code share one definition. */
import { BASE_PATH } from "@/lib/base-path";

export const SESSION_COOKIE = "pf_admin";
export const SESSION_DAYS = 14;
const DAY = 86_400_000;

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_DAYS * DAY);
}

/**
 * Secure everywhere except `next dev`, so sign-in also works over http://localhost in Safari.
 * Production runs behind tailscale serve (HTTPS), and browsers accept Secure cookies on 127.0.0.1.
 */
export function sessionCookieOptions(expires: Date, nodeEnv: string | undefined = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    secure: nodeEnv !== "development",
    sameSite: "strict" as const,
    // Scoped to the mount path so the session is never sent to the other apps on this hostname.
    path: BASE_PATH || "/",
    expires,
  };
}

/**
 * Rolling cookie. A server component cannot set cookies, so the proxy re-sets the cookie (same value, a fresh
 * 14 days) on every GET or HEAD under /admin that carries one. POSTs are skipped so sign-out's deletion stands.
 * The database stays authoritative: a cookie with no session behind it still lands on the sign-in page.
 */
export function refreshedSessionCookie(input: {
  method: string;
  token: string | undefined;
  now: Date;
  nodeEnv?: string;
}): { name: string; value: string; options: ReturnType<typeof sessionCookieOptions> } | null {
  if (input.method !== "GET" && input.method !== "HEAD") return null;
  if (!input.token) return null;
  return {
    name: SESSION_COOKIE,
    value: input.token,
    options: sessionCookieOptions(sessionExpiry(input.now), input.nodeEnv),
  };
}
