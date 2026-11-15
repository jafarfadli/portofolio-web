import { asc, count, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { achievements, activities, education, experiences, media, profile, projects, skills } from "@/db/schema";
import { LIST_KEYS, PROFILE_FIELDS, RESOURCES } from "./resources";
import { listItems } from "./store";

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
  // Alt text is edited beside each image in its form, so the warning names the item to open.
  const noAlt = new Set(db.select({ id: media.id }).from(media).where(eq(media.alt, "")).all().map((m) => m.id));
  if (noAlt.size > 0) {
    const missing = (fields: readonly { name: string; kind: string }[], row: Record<string, unknown>) =>
      fields.some((f) => f.kind === "media" && noAlt.has(row[f.name] as number));
    const owner = db.select().from(profile).get();
    if (owner && missing(PROFILE_FIELDS, owner)) warnings.push({ text: "Profile has an image with no alt text.", href: "/admin/profile" });
    for (const key of LIST_KEYS) {
      const res = RESOURCES[key];
      for (const row of listItems(db, key)) {
        if (missing(res.fields, row)) warnings.push({ text: `${res.rowTitle(row)} has an image with no alt text.`, href: `/admin/${key}/${row.id}` });
      }
    }
  }
  return { counts, warnings };
}
