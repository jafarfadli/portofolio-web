"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAdminAction, clearSessionCookie, setSessionCookie } from "@/auth/admin";
import { attemptLogin, setupAdmin } from "@/auth/login";
import { deleteSession } from "@/auth/session";
import { getDb } from "@/db/client";

export type AuthFormState = { error?: string };

const userAgent = async () => (await headers()).get("user-agent") ?? "";
const field = (form: FormData, name: string) => String(form.get(name) ?? "");

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  await assertAdminAction({ needSession: false });
  const result = await attemptLogin(getDb(), field(form, "password"), await userAgent(), new Date());
  if (!result.ok) {
    if (result.needsSetup) redirect("/admin/setup");
    return { error: result.error };
  }
  await setSessionCookie(result.token, result.expiresAt);
  redirect("/admin");
}

export async function setup(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  await assertAdminAction({ needSession: false });
  const result = await setupAdmin(getDb(), field(form, "password"), field(form, "confirm"), await userAgent(), new Date());
  if (!result.ok) return { error: result.error };
  await setSessionCookie(result.token, result.expiresAt);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await assertAdminAction({ needSession: false });
  const token = await clearSessionCookie();
  if (token) deleteSession(getDb(), token);
  redirect("/admin/login");
}
