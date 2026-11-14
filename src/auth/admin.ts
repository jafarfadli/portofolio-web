import "server-only";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ADMIN_LOGIN_HEADER, adminIdentityOk, sameOrigin } from "@/lib/admin-guard";
import { isAdminRole } from "@/lib/role";
import { readSession, type Session } from "./session";

export const SESSION_COOKIE = "pf_admin";

async function identityOk(): Promise<boolean> {
  const h = await headers();
  return adminIdentityOk({
    login: h.get(ADMIN_LOGIN_HEADER),
    expectedLogin: process.env.ADMIN_TAILSCALE_LOGIN,
    dev: process.env.NODE_ENV === "development",
  });
}

export async function currentSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? readSession(getDb(), token, new Date()) : null;
}

/** Sign in and setup pages: the admin role and the owner's tailnet identity, no session. Anything else is a 404. */
export async function requireAdminArea(): Promise<void> {
  if (!isAdminRole() || !(await identityOk())) notFound();
}

/** Every other editor page. Layouts do not re-run on client navigation, so each page calls this too. */
export async function requireAdminPage(): Promise<Session> {
  await requireAdminArea();
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * First line of every mutating server action. An action is a public POST endpoint whatever page renders it,
 * so this re-checks the role, the tailnet identity, the Origin header and (unless signing in) the session.
 */
export async function assertAdminAction({ needSession = true }: { needSession?: boolean } = {}): Promise<void> {
  if (!isAdminRole() || !(await identityOk())) throw new Error("Not found");
  const h = await headers();
  if (!sameOrigin(h.get("origin"), h.get("x-forwarded-host") ?? h.get("host"))) {
    throw new Error("Refused a cross-origin request.");
  }
  if (!needSession) return;
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  if (session.renewed) {
    const token = (await cookies()).get(SESSION_COOKIE)!.value;
    await setSessionCookie(token, session.expiresAt);
  }
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true, // tailscale serve terminates HTTPS; browsers also accept Secure cookies on 127.0.0.1
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

/** Removes the cookie and returns the token it held, so the caller can delete the session row. */
export async function clearSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  return token;
}
