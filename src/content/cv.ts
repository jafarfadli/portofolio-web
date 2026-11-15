import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  achievements, activities, cvProfileItems, cvProfiles, education, experiences, media, projects, skills,
} from "@/db/schema";
import { withoutLead } from "@/lib/without-lead";
import { fillAchievement, fillActivity, fillEducation, fillExperience, fillProfile, fillProject } from "./derive";
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
  const row = getProfile(db);
  if (!row) return null;
  const p = fillProfile(row);
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
    experiences: resolveCvSection(db.select().from(experiences).all(), "experience", picks).map(fillExperience),
    projects: resolveCvSection(db.select().from(projects).all(), "project", picks).map(fillProject),
    // Older rows repeat the rank, role or institution the CV already prints, so the CV drops that lead.
    achievements: resolveCvSection(db.select().from(achievements).all(), "achievement", picks).map(fillAchievement).map((a) => ({
      ...a, cvLine: withoutLead(a.cvLine, a.rankLabel),
    })),
    activities: resolveCvSection(db.select().from(activities).all(), "activity", picks).map(fillActivity).map((a) => ({
      ...a, cvLine: withoutLead(a.cvLine, a.roleLabel),
    })),
    education: resolveCvSection(db.select().from(education).all(), "education", picks).map(fillEducation).map((e) => ({
      ...e, cvNote: withoutLead(e.cvNote, e.institution),
    })),
    skillGroups: groupSkills(resolveCvSection(db.select().from(skills).all(), "skill", picks)),
  };
}
