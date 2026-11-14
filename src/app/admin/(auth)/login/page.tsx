import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession, requireAdminArea } from "@/auth/admin";
import { hasAdmin } from "@/auth/login";
import { LoginForm } from "@/components/admin/AuthForms";
import { getDb } from "@/db/client";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await requireAdminArea();
  if (!hasAdmin(getDb())) redirect("/admin/setup");
  if (await currentSession()) redirect("/admin");
  return (
    <main className="adm-auth">
      <div className="adm-sheet">
        <h1>Sign in</h1>
        <p className="adm-lead">The editor for your portfolio and CV.</p>
        <LoginForm />
      </div>
    </main>
  );
}
