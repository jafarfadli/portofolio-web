import Link from "next/link";
import { getDashboard } from "@/admin/dashboard";
import { requireAdminPage } from "@/auth/admin";
import { getDb } from "@/db/client";

export default async function DashboardPage() {
  await requireAdminPage();
  const d = getDashboard(getDb());
  return (
    <>
      <div className="adm-head"><h1>Dashboard</h1></div>
      <ul className="adm-counts">
        {d.counts.map((c) => (
          <li key={c.href}>
            <Link className="adm-count" href={c.href}>
              <b>{c.total}</b>
              {c.label}
              <small>{c.onSite} on the site</small>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="adm-h2">Needs attention</h2>
      {d.warnings.length > 0 ? (
        <ul className="adm-warnings">
          {d.warnings.map((w) => (
            <li key={w.text}>
              <span>{w.text}</span>
              <Link className="adm-mini" href={w.href} aria-label={`Fix: ${w.text}`}>Fix</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="adm-empty">Nothing needs attention.</p>
      )}
    </>
  );
}
