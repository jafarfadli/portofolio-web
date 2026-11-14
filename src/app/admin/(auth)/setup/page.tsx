import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminArea } from "@/auth/admin";
import { hasAdmin } from "@/auth/login";
import { SetupForm } from "@/components/admin/AuthForms";
import { getDb } from "@/db/client";

export const metadata: Metadata = { title: "Set a password" };

export default async function SetupPage() {
  await requireAdminArea();
  if (hasAdmin(getDb())) redirect("/admin/login");
  return (
    <main className="adm-auth">
      <div className="adm-sheet">
        <h1>Set a password</h1>
        <p className="adm-lead">First run. This password protects the editor; there is no email reset (see README).</p>
        <SetupForm />
      </div>
    </main>
  );
}
