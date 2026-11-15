/**
 * Fallbacks for the optional fields in the editor. Each record keeps one source of truth (title, year, summary...)
 * and the CV or caption variant is only stored when the owner wants different words. An empty override means
 * "build it from the main fields", so these run where content is read, never in the editor's own forms.
 */
import type { achievements, activities, education, experiences, profile, projects } from "@/db/schema";
import { parseInline } from "@/lib/inline";

type Achievement = typeof achievements.$inferSelect;
type Activity = typeof activities.$inferSelect;
type Education = typeof education.$inferSelect;
type Experience = typeof experiences.$inferSelect;
type Profile = typeof profile.$inferSelect;
type Project = typeof projects.$inferSelect;

const blank = (s: string | null | undefined) => !s || s.trim() === "";

/** Owner copy without its markup or icon stickers, for places that print plain text. */
export function plainText(src: string): string {
  return parseInline(src, { icons: true })
    .map((s) => ("text" in s ? s.text : ""))
    .join("")
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:!?])/g, "$1") // an icon removed before a full stop leaves its space behind
    .trim();
}

export function fillAchievement<T extends Achievement>(a: T): T {
  const where = [a.title, a.organizer].filter((s) => !blank(s)).join(", ");
  return {
    ...a,
    caption: blank(a.caption) ? `${a.rankLabel}, ${where} ${a.year}`.trim() : a.caption,
    cvLine: blank(a.cvLine) ? where : a.cvLine,
    // The CV prints the same year as the site. The cv_year column is no longer edited, so it is not read either.
    cvYear: a.year,
  };
}

export function fillActivity<T extends Activity>(a: T): T {
  return {
    ...a,
    roleLabel: blank(a.roleLabel) ? a.role.charAt(0).toUpperCase() + a.role.slice(1) : a.roleLabel,
    cvLine: blank(a.cvLine) ? a.title : a.cvLine,
  };
}

export function fillExperience<T extends Experience>(e: T): T {
  return {
    ...e,
    cvPeriod: blank(e.cvPeriod) ? e.period : e.cvPeriod,
    cvBullets: e.cvBullets.length > 0 ? e.cvBullets : blank(e.summary) ? [] : [e.summary],
  };
}

export function fillEducation<T extends Education>(e: T): T {
  return { ...e, cvNote: blank(e.cvNote) ? e.note : e.cvNote };
}

export function fillProject<T extends Project>(p: T): T {
  return {
    ...p,
    stickerCaption: blank(p.stickerCaption) ? p.name : p.stickerCaption,
    cvLine: blank(p.cvLine) ? p.headline : p.cvLine,
  };
}

export function fillProfile<T extends Profile>(p: T): T {
  return {
    ...p,
    cvSummary: blank(p.cvSummary) ? plainText(p.aboutText) : p.cvSummary,
    cvLocationLine: blank(p.cvLocationLine) ? p.location : p.cvLocationLine,
  };
}

/** Lowercase hyphenated address part from a project name: "Don't Call Me!" becomes "dont-call-me". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
