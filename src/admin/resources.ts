import { achievements, activities, education, experiences, projects, skills, type CardArt } from "@/db/schema";
import type { Field } from "./fields";

export const LIST_KEYS = ["projects", "achievements", "activities", "experiences", "education", "skills"] as const;
export type ListKey = (typeof LIST_KEYS)[number];
export type Flag = "showOnSite" | "showInCv" | "featured";
export type CvItemType = "project" | "achievement" | "activity" | "experience" | "education" | "skill";
type Row = Record<string, unknown>;

export type Resource = {
  key: ListKey;
  title: string;
  singular: string;
  table: typeof projects | typeof achievements | typeof activities | typeof experiences | typeof education | typeof skills;
  cvItemType: CvItemType;
  flags: readonly Flag[];
  fields: readonly Field[];
  /** What a new item's form starts with. */
  defaults: Row;
  /** Columns the editor never shows but a new row needs. */
  hidden: Row;
  rowTitle: (row: Row) => string;
  rowNote: (row: Row) => string;
};

export const FLAG_LABELS: Record<Flag, string> = { showOnSite: "On site", showInCv: "In CV", featured: "Featured" };

const BOLD = "Wrap words in **double asterisks** for bold.";
const FLAG_FIELDS: Field[] = [
  { name: "showOnSite", label: "Show on the site", kind: "bool" },
  { name: "showInCv", label: "Show in the CV", kind: "bool" },
];
const VISIBLE = { showOnSite: true, showInCv: true };

/** Ledgerly's layout from the seed: a sensible start that the owner then tunes. */
const DEFAULT_CARD_ART: CardArt = {
  print: { left: 7, top: 14, width: 58, height: 80, rot: -2.5 },
  leader: { d: "M 61.5 30 C 68 26, 70 40, 74 44", dot: { x: 61.5, y: 30 } },
  pin: { x: 74, y: 44, side: "l", big: true },
};

export const RESOURCES: Record<ListKey, Resource> = {
  projects: {
    key: "projects", title: "Projects", singular: "project", table: projects, cvItemType: "project",
    flags: ["showOnSite", "showInCv", "featured"],
    fields: [
      { name: "name", label: "Name", kind: "text", max: 60 },
      { name: "slug", label: "Slug", kind: "slug", help: "Lowercase, used in the address: /projects/your-slug." },
      { name: "headline", label: "Impact headline", kind: "text", max: 220, help: `One sentence on the outcome. ${BOLD} Bold the project name.` },
      { name: "period", label: "Year or years", kind: "text", max: 20 },
      { name: "roleLine", label: "Your role", kind: "text", max: 80 },
      { name: "tags", label: "Stack", kind: "tags", empty: "blank", help: "Comma separated, up to 12." },
      { name: "metricValue", label: "Metric value", kind: "text", max: 24, help: "Short, like 9.4 days." },
      { name: "metricLabel", label: "Metric label", kind: "text", max: 90 },
      { name: "metricIsSample", label: "This metric is sample data", kind: "bool", help: "Prints (sample) next to the metric until you clear it." },
      { name: "screenshotId", label: "Screenshot", kind: "media", mediaKind: "screenshot", empty: "null" },
      { name: "stickerCaption", label: "Sticker caption", kind: "text", max: 80, help: "Shown when a recruiter hovers the hero sticker." },
      { name: "fieldColor", label: "Card colour", kind: "color", help: "Hex, like #0e2a22: the field behind the screenshot." },
      { name: "cardArt", label: "Card layout", kind: "cardArt", rows: 12, help: "Screenshot position, leader line and metric pin, in percent of the card." },
      { name: "liveUrl", label: "Live site", kind: "url", empty: "null" },
      { name: "codeUrl", label: "Code", kind: "url", empty: "null" },
      { name: "cvTitle", label: "CV title", kind: "text", max: 80, help: "Follows the name on the CV, like invoicing for small shops." },
      { name: "cvLine", label: "CV line", kind: "text", max: 220, help: `${BOLD} Bold the metric.` },
      { name: "featured", label: "Feature in Selected work", kind: "bool", help: "Up to 4. They appear in this list's order." },
      ...FLAG_FIELDS,
    ],
    defaults: { ...VISIBLE, tags: [], metricIsSample: true, fieldColor: "#0e2a22", cardArt: DEFAULT_CARD_ART, featured: false },
    hidden: { layout: "wide" },
    rowTitle: (r) => String(r.name),
    rowNote: (r) => String(r.period),
  },
  achievements: {
    key: "achievements", title: "Achievements", singular: "achievement", table: achievements, cvItemType: "achievement",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "title", label: "Title", kind: "text", max: 120 },
      { name: "rank", label: "Rank", kind: "enum", options: ["winner", "finalist", "award"], help: "Sets the rank tag's cut: winner notched, finalist outlined, award plain." },
      { name: "rankLabel", label: "Rank word", kind: "text", max: 30, help: "Printed on the rank tag, like Winner or Certified." },
      { name: "year", label: "Year", kind: "text", max: 12 },
      { name: "description", label: "Description", kind: "textarea", max: 300, rows: 3, help: "Not shown on the site at the moment; keep it as your own note." },
      { name: "caption", label: "Seal sticker hover caption", kind: "text", max: 160, help: "The pill shown when the hero's seal sticker is hovered or focused, like Winner, Nusantara Code Cup 2024. Only used with seal text." },
      { name: "story", label: "Story", kind: "textarea", max: 300, rows: 3, help: "Printed on the pass in the achievements reel." },
      { name: "photoId", label: "Photo", kind: "media", mediaKind: "photo", empty: "null", help: "On the pass in the moving strap, cropped 4:3." },
      { name: "sealText", label: "Seal text", kind: "text", max: 12, empty: "null", help: "Set it, like 1st, to give this achievement the round seal sticker in the hero." },
      { name: "sealCaption", label: "Seal small print", kind: "text", max: 30, empty: "null", help: "Printed inside the seal under the rank, like Code Cup 2024. The last word goes on its own line." },
      { name: "cvLine", label: "CV line", kind: "text", max: 220, help: `Printed after the rank word, so leave the rank out. ${BOLD}` },
      { name: "cvYear", label: "CV year", kind: "text", max: 20 },
      ...FLAG_FIELDS,
    ],
    defaults: { ...VISIBLE, rank: "award" },
    hidden: {},
    rowTitle: (r) => String(r.title),
    rowNote: (r) => `${String(r.rankLabel)}, ${String(r.year)}`,
  },
  activities: {
    key: "activities", title: "Activities", singular: "activity", table: activities, cvItemType: "activity",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "title", label: "Title", kind: "text", max: 100 },
      { name: "subtitle", label: "Subtitle", kind: "text", max: 140 },
      { name: "role", label: "Role", kind: "enum", options: ["speaker", "organizer", "mentor", "volunteer"], help: "Sets the tag shape." },
      { name: "roleLabel", label: "Tag word", kind: "text", max: 20, help: "Printed on the tag, like Host on an organizer shape." },
      { name: "year", label: "Year", kind: "text", max: 12 },
      { name: "photoId", label: "Photo", kind: "media", mediaKind: "photo", empty: "null" },
      { name: "url", label: "Link", kind: "url", empty: "null" },
      { name: "cvLine", label: "CV line", kind: "text", max: 220, help: `Printed after the tag word, so leave the role out. ${BOLD}` },
      ...FLAG_FIELDS,
    ],
    defaults: { ...VISIBLE, role: "speaker" },
    hidden: {},
    rowTitle: (r) => String(r.title),
    rowNote: (r) => `${String(r.roleLabel)}, ${String(r.year)}`,
  },
  experiences: {
    key: "experiences", title: "Experience", singular: "role", table: experiences, cvItemType: "experience",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "role", label: "Job title", kind: "text", max: 80 },
      { name: "org", label: "Organisation", kind: "text", max: 80 },
      { name: "location", label: "Location", kind: "text", max: 60, empty: "blank" },
      { name: "period", label: "Period on the site", kind: "text", max: 40, help: "Like 2023 to now." },
      { name: "cvPeriod", label: "Period on the CV", kind: "text", max: 40 },
      { name: "summary", label: "Summary", kind: "text", max: 240, help: `One line. ${BOLD} Bold the metric.` },
      { name: "cvBullets", label: "CV bullets", kind: "lines", empty: "blank", rows: 4, help: `One per line. ${BOLD} Bold the metric.` },
      ...FLAG_FIELDS,
    ],
    defaults: { ...VISIBLE, cvBullets: [] },
    hidden: {},
    rowTitle: (r) => `${String(r.role)}, ${String(r.org)}`,
    rowNote: (r) => String(r.period),
  },
  education: {
    key: "education", title: "Education", singular: "entry", table: education, cvItemType: "education",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "degree", label: "Degree", kind: "text", max: 100 },
      { name: "institution", label: "Institution", kind: "text", max: 100 },
      { name: "period", label: "Period", kind: "text", max: 40 },
      { name: "note", label: "Note on the site", kind: "text", max: 240, help: BOLD },
      { name: "cvNote", label: "Note on the CV", kind: "text", max: 240, help: BOLD },
      ...FLAG_FIELDS,
    ],
    defaults: { ...VISIBLE },
    hidden: {},
    rowTitle: (r) => String(r.degree),
    rowNote: (r) => String(r.institution),
  },
  skills: {
    key: "skills", title: "Skills", singular: "skill", table: skills, cvItemType: "skill",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "name", label: "Skill", kind: "text", max: 40 },
      { name: "groupName", label: "Group", kind: "text", max: 40, help: "Like Languages, Web, or Data and infra. Skills with the same group print together on the CV." },
      { name: "rot", label: "Tilt", kind: "number", min: -12, max: 12, help: "Degrees, for the chip on the About sticker sheet." },
      ...FLAG_FIELDS,
    ],
    defaults: { ...VISIBLE, rot: 0 },
    hidden: {},
    rowTitle: (r) => String(r.name),
    rowNote: (r) => String(r.groupName),
  },
};

export const PROFILE_FIELDS: readonly Field[] = [
  { name: "firstName", label: "First name", kind: "text", max: 40 },
  { name: "lastName", label: "Last name", kind: "text", max: 40 },
  { name: "fullName", label: "Full name", kind: "text", max: 80, empty: "null", help: "On the CV and in page titles. Leave empty to use first and last name." },
  { name: "role", label: "Role", kind: "text", max: 60, help: "Like Full-stack Engineer." },
  { name: "stackLine", label: "Stack line", kind: "text", max: 80, help: "Under the role on the badge." },
  { name: "photoId", label: "Badge photo", kind: "media", mediaKind: "photo", empty: "null", help: "Portrait on the badge, cropped 4:5. A navy duotone fits the badge best." },
  { name: "cvPhotoId", label: "CV photo", kind: "media", mediaKind: "photo", empty: "null", help: "Cut-out portrait with a clear background (PNG), at the top right of the CV." },
  { name: "location", label: "Location", kind: "text", max: 60 },
  { name: "openToWork", label: "Open to work", kind: "bool", help: "Shows the availability strip on the badge." },
  { name: "openToWorkLabel", label: "Availability label", kind: "text", max: 40 },
  { name: "availabilityNote", label: "Availability note", kind: "text", max: 80 },
  { name: "email", label: "Email", kind: "email" },
  { name: "siteUrl", label: "Site address", kind: "url", help: "The public address, used for the QR code and links." },
  { name: "githubUrl", label: "GitHub", kind: "url" },
  { name: "linkedinUrl", label: "LinkedIn", kind: "url" },
  { name: "statementLine1", label: "Statement, first line", kind: "text", max: 80 },
  { name: "statementLine2", label: "Statement, second line", kind: "text", max: 80 },
  { name: "aboutText", label: "About", kind: "textarea", max: 900, rows: 5, help: "Wrap words in _underscores_ for the soft colour." },
  { name: "closingLine", label: "Closing line", kind: "text", max: 120 },
  { name: "cvSummary", label: "CV summary", kind: "textarea", max: 600, rows: 4 },
  { name: "cvLocationLine", label: "CV location line", kind: "text", max: 80 },
];

export function getResource(key: string): Resource | undefined {
  return (LIST_KEYS as readonly string[]).includes(key) ? RESOURCES[key as ListKey] : undefined;
}
