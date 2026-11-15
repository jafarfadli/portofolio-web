import "server-only";
import type { Db } from "@/db/client";
import { BASE_PATH } from "@/lib/base-path";
import { fillAchievement, fillActivity, fillProfile, fillProject } from "./derive";
import { achievements, activities, education, experiences, media, profile, projects, skills } from "@/db/schema";

export type MediaRef = { url: string; width: number; height: number; alt: string; srcSet?: string };
export type Profile = typeof profile.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof education.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type HomeProject = Project & { screenshot: MediaRef | null; phoneShot: MediaRef | null };
export type HomeAchievement = Achievement & {
  /** The photos that are set, in column order. Empty when there are none. */
  photos: MediaRef[];
};
export type HomeActivity = Activity & { photo: MediaRef | null };
export type HomeContent = {
  profile: Profile;
  /** The badge photo. */
  photo: MediaRef | null;
  projects: HomeProject[];
  achievements: HomeAchievement[];
  activities: HomeActivity[];
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
};

export function mediaUrl(relPath: string): string {
  return `${BASE_PATH}/media/${relPath.split("/").map(encodeURIComponent).join("/")}`;
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
    profile: fillProfile(p),
    photo: ref(p.photoId),
    projects: onSite(db.select().from(projects).all())
      .filter((p) => p.featured)
      .slice(0, 4)
      .map((p) => ({ ...fillProject(p), screenshot: ref(p.screenshotId), phoneShot: ref(p.phoneShotId) })),
    achievements: onSite(db.select().from(achievements).all()).map((a) => ({
      ...fillAchievement(a),
      photos: [a.photoId, a.photo2Id, a.photo3Id, a.photo4Id].map(ref).filter((p): p is MediaRef => p !== null),
    })),
    activities: onSite(db.select().from(activities).all()).map((a) => ({ ...fillActivity(a), photo: ref(a.photoId) })),
    experiences: onSite(db.select().from(experiences).all()),
    education: onSite(db.select().from(education).all()),
    skills: onSite(db.select().from(skills).all()),
  };
}
