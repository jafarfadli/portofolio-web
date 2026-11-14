import "server-only";
import type { Db } from "@/db/client";
import { achievements, activities, education, experiences, media, profile, projects, skills } from "@/db/schema";

export type MediaRef = { url: string; width: number; height: number; alt: string; srcSet?: string };
export type Profile = typeof profile.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof education.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type HomeProject = Project & { screenshot: MediaRef | null };
export type HomeActivity = Activity & { photo: MediaRef | null };
export type HomeContent = {
  profile: Profile;
  projects: HomeProject[];
  achievements: Achievement[];
  activities: HomeActivity[];
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
};

export function mediaUrl(relPath: string): string {
  return `/media/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}

/** Uploads carry WebP variants; seeded media has none, so srcSet stays undefined and <img> uses src alone. */
export function toMediaRef(m: typeof media.$inferSelect): MediaRef {
  const srcSet = m.variants.length
    ? [...m.variants.map((v) => `${mediaUrl(v.path)} ${v.width}w`), `${mediaUrl(m.path)} ${m.width}w`].join(", ")
    : undefined;
  return { url: mediaUrl(m.path), width: m.width, height: m.height, alt: m.alt, srcSet };
}

const onSite = <T extends { showOnSite: boolean; sortOrder: number }>(rows: T[]): T[] =>
  rows.filter((r) => r.showOnSite).sort((a, b) => a.sortOrder - b.sortOrder);

export function getProfile(db: Db): Profile | null {
  return db.select().from(profile).get() ?? null;
}

/** null before the owner has saved a profile; the home page then shows the first-run placeholder. */
export function getHomeContent(db: Db): HomeContent | null {
  const p = getProfile(db);
  if (!p) return null;
  const refs = new Map<number, MediaRef>(
    db.select().from(media).all().map((m) => [m.id, toMediaRef(m)]),
  );
  const ref = (id: number | null) => (id == null ? null : (refs.get(id) ?? null));
  return {
    profile: p,
    projects: onSite(db.select().from(projects).all())
      .filter((p) => p.featured)
      .slice(0, 4)
      .map((p) => ({ ...p, screenshot: ref(p.screenshotId) })),
    achievements: onSite(db.select().from(achievements).all()),
    activities: onSite(db.select().from(activities).all()).map((a) => ({ ...a, photo: ref(a.photoId) })),
    experiences: onSite(db.select().from(experiences).all()),
    education: onSite(db.select().from(education).all()),
    skills: onSite(db.select().from(skills).all()),
  };
}
