import type { Role } from "./role";

/** Header `tailscale serve` adds for tailnet users; Tailscale strips any copy a client sends. */
export const ADMIN_LOGIN_HEADER = "tailscale-user-login";

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Defense in depth behind `tailscale serve`: the identity header must name the owner (ADMIN_TAILSCALE_LOGIN).
 * Fails closed when the expected login is not configured. `next dev` skips it so the owner can work locally.
 */
export function adminIdentityOk(input: { login: string | null; expectedLogin: string | undefined; dev: boolean }): boolean {
  if (input.dev) return true;
  const want = input.expectedLogin?.trim().toLowerCase();
  if (!want) return false;
  return (input.login ?? "").trim().toLowerCase() === want;
}

export function guardAdminRequest(input: {
  pathname: string;
  role: Role;
  login: string | null;
  expectedLogin: string | undefined;
  dev: boolean;
}): "pass" | "not-found" {
  if (!isAdminPath(input.pathname)) return "pass";
  if (input.role !== "admin") return "not-found";
  return adminIdentityOk(input) ? "pass" : "not-found";
}

/**
 * CSRF check for server actions. Next lets a request with no Origin header through with only a warning,
 * so the editor requires one, and its host must equal the request host.
 */
export function sameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
