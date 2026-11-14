import { asc, count, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { achievements, activities, education, experiences, media, profile, projects, skills } from "@/db/schema";

export type Warning = { text: string; href: string };
export type Count = { label: string; href: string; total: number; onSite: number };
export type Dashboard = { counts: Count[]; warnings: Warning[] };

const LISTS = [
  { label: "Projects", href: "/admin/projects", table: projects },
  { label: "Achievements", href: "/admin/achievements", table: achievements },
  { label: "Activities", href: "/admin/activities", table: activities },
  { label: "Experience", href: "/admin/experiences", table: experiences },
  { label: "Education", href: "/admin/education", table: education },
  { label: "Skills", href: "/admin/skills", table: skills },
] as const;

// drizzle's $count() is awaitable only, so this synchronous driver counts with select().get().
function countRows(db: Db, table: typeof projects | typeof media, where?: SQL): number {
  return db.select({ n: count() }).from(table).where(where).get()?.n ?? 0;
}

export function getDashboard(db: Db): Dashboard {
  const counts = LISTS.map(({ label, href, table }) => {
    // Every list table shares listCols() (src/db/schema.ts), so one representative type serves all six.
    const t = table as typeof projects;
    return { label, href, total: countRows(db, t), onSite: countRows(db, t, eq(t.showOnSite, true)) };
  });

  const warnings: Warning[] = [];
  if (!db.select({ id: profile.id }).from(profile).get()) {
    warnings.push({ text: "The profile is empty, so the public site shows a placeholder page.", href: "/admin/profile" });
  }
  const rows = db
    .select({ id: projects.id, name: projects.name, sample: projects.metricIsSample, shot: projects.screenshotId, featured: projects.featured })
    .from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.id))
    .all();
  for (const p of rows) {
    if (p.sample) warnings.push({ text: `${p.name} shows a sample metric.`, href: `/admin/projects/${p.id}` });
    if (p.featured && p.shot === null) warnings.push({ text: `${p.name} is featured but has no screenshot.`, href: `/admin/projects/${p.id}` });
  }
  const noAlt = countRows(db, media, eq(media.alt, ""));
  if (noAlt > 0) {
    warnings.push({ text: `${noAlt} ${noAlt === 1 ? "image has" : "images have"} no alt text.`, href: "/admin/media" });
  }
  return { counts, warnings };
}
