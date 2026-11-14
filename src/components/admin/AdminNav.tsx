"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/profile", "Profile"],
  ["/admin/projects", "Projects"],
  ["/admin/achievements", "Achievements"],
  ["/admin/activities", "Activities"],
  ["/admin/experiences", "Experience"],
  ["/admin/education", "Education"],
  ["/admin/skills", "Skills"],
  ["/admin/media", "Media"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Editor">
      <ul className="adm-nav">
        {LINKS.map(([href, label]) => {
          const current = href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link href={href} aria-current={current ? "page" : undefined}>{label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
