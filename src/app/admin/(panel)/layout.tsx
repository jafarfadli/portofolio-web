import { logout } from "@/admin/auth-actions";
import { requireAdminPage } from "@/auth/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const p = getProfile(getDb());
  return (
    <div className="adm">
      <a className="skip" href="#adm-main">Skip to content</a>
      <aside className="adm-side">
        <p className="adm-brand">{p ? `${p.firstName} ${p.lastName}` : "Portfolio"}<small>Editor</small></p>
        <AdminNav />
        <div className="adm-side-actions">
          {p ? <a className="btn btn-line" href={p.siteUrl}>Open public site</a> : null}
          <form action={logout}>
            <button className="btn btn-line" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="adm-sheet" id="adm-main">{children}</main>
    </div>
  );
}
