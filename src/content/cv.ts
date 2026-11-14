import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  achievements, activities, cvProfileItems, cvProfiles, education, experiences, media, projects, skills,
} from "@/db/schema";
import { resolveCvSection, type CvPick } from "@/lib/cv-resolve";
import {
  getProfile, toMediaRef, type Achievement, type Activity, type Education, type Experience, type MediaRef, type Profile, type Project, type Skill,
} from "./home";

export type SkillGroup = { group: string; names: string[] };
export type CvContent = {
  profile: Profile;
  /** The cut-out portrait at the top of the CV. */
  photo: MediaRef | null;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  achievements: Achievement[];
  activities: Activity[];
  education: Education[];
  skillGroups: SkillGroup[];
};

export function groupSkills(rows: Skill[]): SkillGroup[] {
  const groups = new Map<string, string[]>();
  for (const s of rows) {
    const list = groups.get(s.groupName) ?? [];
    list.push(s.name);
    groups.set(s.groupName, list);
  }
  return [...groups].map(([group, names]) => ({ group, names }));
}

/** No slug: the default CV profile (or plain fallback if none exists). Unknown slug or no profile yet: null. */
export function getCvContent(db: Db, slug?: string): CvContent | null {
  const p = getProfile(db);
  if (!p) return null;
  const cvProfile = slug
    ? db.select().from(cvProfiles).where(eq(cvProfiles.slug, slug)).get()
    : db.select().from(cvProfiles).where(eq(cvProfiles.isDefault, true)).get();
  if (slug && !cvProfile) return null;

  const picks: CvPick[] = cvProfile
    ? db.select().from(cvProfileItems).where(eq(cvProfileItems.profileId, cvProfile.id)).all()
    : [];

  const photoRow = p.cvPhotoId == null ? undefined : db.select().from(media).where(eq(media.id, p.cvPhotoId)).get();

  return {
    profile: p,
    photo: photoRow ? toMediaRef(photoRow) : null,
    summary: cvProfile?.summaryOverride ?? p.cvSummary,
    experiences: resolveCvSection(db.select().from(experiences).all(), "experience", picks),
    projects: resolveCvSection(db.select().from(projects).all(), "project", picks),
    achievements: resolveCvSection(db.select().from(achievements).all(), "achievement", picks),
    activities: resolveCvSection(db.select().from(activities).all(), "activity", picks),
    education: resolveCvSection(db.select().from(education).all(), "education", picks),
    skillGroups: groupSkills(resolveCvSection(db.select().from(skills).all(), "skill", picks)),
  };
}
