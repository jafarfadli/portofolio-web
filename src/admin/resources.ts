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

const BLANK_CV = "Leave empty to use the main fields.";

export const RESOURCES: Record<ListKey, Resource> = {
  projects: {
    key: "projects", title: "Projects", singular: "project", table: projects, cvItemType: "project",
    flags: ["showOnSite", "showInCv", "featured"],
    fields: [
      { name: "name", label: "Name", kind: "text", max: 60 },
      { name: "headline", label: "One-line pitch", kind: "text", max: 220, help: `What it does and for whom. ${BOLD} Bold the project name.` },
      { name: "period", label: "Year", kind: "text", max: 20, help: "Like 2025, or 2024 to 2025." },
      { name: "roleLine", label: "Your role", kind: "text", max: 80, help: "Like Solo build, or Front end in a team of 4." },
      { name: "tags", label: "Stack", kind: "tags", empty: "blank", help: "Comma separated, up to 12." },
      { name: "metricValue", label: "Result number", kind: "text", max: 24, help: "Short, like 16 or 1st of 40." },
      { name: "metricLabel", label: "Result in words", kind: "text", max: 90, help: "What the number means, like agents online at once." },
      { name: "screenshotId", label: "Screenshot", kind: "media", mediaKind: "screenshot", empty: "null", help: "A desktop capture, 16:10 works best." },
      { name: "features", label: "Features", kind: "lines", empty: "blank", rows: 4, maxItems: 4, max: 60, help: "Up to 4, one per line, short, like WhatsApp and Telegram in one inbox. Feature 1 goes with the screenshot above, feature 2 with screenshot 2, and so on." },
      { name: "shot2Id", label: "Screenshot 2", kind: "media", mediaKind: "screenshot", empty: "null", help: "The card flips through screenshots 1 to 4, a few seconds each." },
      { name: "shot3Id", label: "Screenshot 3", kind: "media", mediaKind: "screenshot", empty: "null" },
      { name: "shot4Id", label: "Screenshot 4", kind: "media", mediaKind: "screenshot", empty: "null" },
      { name: "phoneShotId", label: "Phone screenshot", kind: "media", mediaKind: "screenshot", empty: "null", help: "A tall capture of the mobile view. The hero shows it on the phone sticker." },
      { name: "liveUrl", label: "Live site", kind: "url", empty: "null" },
      { name: "codeUrl", label: "Code", kind: "url", empty: "null" },
      { name: "featured", label: "Feature in Selected work", kind: "bool", help: "Up to 4. They appear in this list's order." },
      ...FLAG_FIELDS,
      { name: "slug", label: "Slug", kind: "slug", empty: "blank", more: true, help: "Leave empty to make it from the name." },
      { name: "stickerCaption", label: "Hero sticker caption", kind: "text", max: 80, empty: "blank", more: true, help: "Shown when the hero sticker is hovered. Leave empty to show the name." },
      { name: "metricIsSample", label: "The result is sample data", kind: "bool", more: true, help: "Prints (sample) next to the result." },
      { name: "fieldColor", label: "Card colour", kind: "color", more: true, help: "Hex, like #0e2a22: the field behind the screenshot." },
      { name: "cardArt", label: "Card layout", kind: "cardArt", rows: 12, more: true, help: "Screenshot position, leader line and result tag, in percent of the card." },
      { name: "cvTitle", label: "CV title", kind: "text", max: 80, empty: "blank", more: true, help: "Follows the name on the CV, like invoicing for small shops." },
      { name: "cvLine", label: "CV line", kind: "text", max: 220, empty: "blank", more: true, help: `Leave empty to use the pitch. ${BOLD}` },
    ],
    defaults: { ...VISIBLE, tags: [], metricIsSample: false, fieldColor: "#0e2a22", cardArt: DEFAULT_CARD_ART, featured: false },
    hidden: { layout: "wide" },
    rowTitle: (r) => String(r.name),
    rowNote: (r) => String(r.period),
  },
  achievements: {
    key: "achievements", title: "Achievements", singular: "achievement", table: achievements, cvItemType: "achievement",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "rankLabel", label: "Award", kind: "text", max: 30, help: "Like Grand Award, 1st place or Finalist." },
      { name: "title", label: "Competition", kind: "text", max: 120 },
      { name: "organizer", label: "Organizer", kind: "text", max: 100, empty: "blank", help: "Like Chung-Ang University, Vietnam." },
      { name: "year", label: "Year", kind: "text", max: 12 },
      {
        name: "rank", label: "Tag shape", kind: "enum", options: ["winner", "finalist", "award"],
        optionLabels: { winner: "Winner: notched tag", finalist: "Finalist: outlined tag", award: "Other award: plain tag" },
      },
      { name: "story", label: "Short note", kind: "textarea", max: 300, rows: 2, empty: "blank", help: "One sentence on the card, like what you built or who you went with." },
      { name: "photoId", label: "Photo", kind: "media", mediaKind: "photo", empty: "null", help: "Cropped 4:3 on the card." },
      { name: "photo2Id", label: "Photo 2", kind: "media", mediaKind: "photo", empty: "null", help: "Photos 2 to 4 take turns with the first." },
      { name: "photo3Id", label: "Photo 3", kind: "media", mediaKind: "photo", empty: "null" },
      { name: "photo4Id", label: "Photo 4", kind: "media", mediaKind: "photo", empty: "null" },
      ...FLAG_FIELDS,
      { name: "sealText", label: "Hero seal text", kind: "text", max: 12, empty: "null", more: true, help: "Set it, like 1st, to give this achievement the round seal sticker in the hero." },
      { name: "sealCaption", label: "Seal small print", kind: "text", max: 30, empty: "null", more: true, help: "Under the seal text, like Vietnam 2026. The last word goes on its own line." },
      { name: "caption", label: "Seal hover text", kind: "text", max: 160, empty: "blank", more: true, help: "Leave empty to use award, competition, organizer and year." },
      { name: "cvLine", label: "CV line", kind: "text", max: 220, empty: "blank", more: true, help: `The CV prints the award, then this, then the year. Leave empty to use competition and organizer. ${BOLD}` },
    ],
    defaults: { ...VISIBLE, rank: "award" },
    hidden: { description: "", cvYear: "" },
    rowTitle: (r) => String(r.title),
    rowNote: (r) => `${String(r.rankLabel)}, ${String(r.year)}`,
  },
  activities: {
    key: "activities", title: "Activities", singular: "activity", table: activities, cvItemType: "activity",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "title", label: "Event", kind: "text", max: 100 },
      { name: "subtitle", label: "What you did", kind: "text", max: 140, help: "Like Talk: self-hosting Next.js." },
      {
        name: "role", label: "Role", kind: "enum", options: ["speaker", "organizer", "mentor", "volunteer"],
        optionLabels: { speaker: "Speaker", organizer: "Organizer", mentor: "Mentor", volunteer: "Volunteer" },
      },
      { name: "year", label: "Year", kind: "text", max: 12 },
      { name: "photoId", label: "Photo", kind: "media", mediaKind: "photo", empty: "null" },
      { name: "url", label: "Link", kind: "url", empty: "null" },
      ...FLAG_FIELDS,
      { name: "roleLabel", label: "Tag word", kind: "text", max: 20, empty: "blank", more: true, help: "A different word on the tag, like Host. Leave empty to print the role." },
      { name: "cvLine", label: "CV line", kind: "text", max: 220, empty: "blank", more: true, help: `Printed after the tag. Leave empty to use the event name. ${BOLD}` },
    ],
    defaults: { ...VISIBLE, role: "speaker" },
    hidden: {},
    rowTitle: (r) => String(r.title),
    rowNote: (r) => `${String(r.roleLabel || r.role)}, ${String(r.year)}`,
  },
  experiences: {
    key: "experiences", title: "Experience", singular: "role", table: experiences, cvItemType: "experience",
    flags: ["showOnSite", "showInCv"],
    fields: [
      { name: "role", label: "Job title", kind: "text", max: 80 },
      { name: "org", label: "Organisation", kind: "text", max: 80 },
      { name: "location", label: "Location", kind: "text", max: 60, empty: "blank" },
      { name: "period", label: "Period", kind: "text", max: 40, help: "Like Feb 2025 to now." },
      { name: "summary", label: "What you did", kind: "text", max: 240, help: `One line. ${BOLD} Bold the result.` },
      ...FLAG_FIELDS,
      { name: "cvPeriod", label: "Period on the CV", kind: "text", max: 40, empty: "blank", more: true, help: BLANK_CV },
      { name: "cvBullets", label: "CV bullets", kind: "lines", empty: "blank", rows: 4, more: true, help: `One per line. Leave empty to print the line above. ${BOLD}` },
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
      { name: "note", label: "Note", kind: "text", max: 240, help: `Like your GPA. ${BOLD}` },
      ...FLAG_FIELDS,
      { name: "cvNote", label: "Note on the CV", kind: "text", max: 240, empty: "blank", more: true, help: `${BLANK_CV} ${BOLD}` },
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
      { name: "groupName", label: "Group", kind: "text", max: 40, help: "Like Stack or AI integration. Skills in the same group print together on the CV." },
      ...FLAG_FIELDS,
      { name: "rot", label: "Tilt", kind: "number", min: -12, max: 12, more: true, help: "Degrees, for the chip on the About sticker sheet." },
    ],
    defaults: { ...VISIBLE, rot: 0 },
    hidden: {},
    rowTitle: (r) => String(r.name),
    rowNote: (r) => String(r.groupName),
  },
};

const ICONS = "browsers, database, cursor, pin, loading, team, rocket, wave";

export const PROFILE_FIELDS: readonly Field[] = [
  { name: "firstName", label: "First name", kind: "text", max: 40, section: "Badge" },
  { name: "lastName", label: "Last name", kind: "text", max: 40 },
  { name: "role", label: "Role", kind: "text", max: 60, help: "Like Full-stack Engineer." },
  { name: "stackLine", label: "Line under the role", kind: "text", max: 80, help: "Like Web, automation and AI integration." },
  { name: "photoId", label: "Badge photo", kind: "media", mediaKind: "photo", empty: "null", help: "Portrait, cropped 4:5." },
  { name: "location", label: "Location", kind: "text", max: 60 },
  { name: "openToWork", label: "Open to work", kind: "bool", help: "Shows the availability strip on the badge." },
  { name: "openToWorkLabel", label: "Availability label", kind: "text", max: 40, help: "Like Open to work." },
  { name: "availabilityNote", label: "Availability note", kind: "text", max: 80, help: "Like Internships and full time, from 2026." },
  { name: "statementLine1", label: "Headline, first part", kind: "text", max: 80, section: "Words", help: `Type a slash with a space on each side ( / ) to break the line, and :rocket: or similar for an icon: ${ICONS}.` },
  { name: "statementLine2", label: "Headline, second part", kind: "text", max: 80 },
  { name: "aboutText", label: "About", kind: "textarea", max: 900, rows: 5, help: `Wrap words in _underscores_ for the soft colour. Icons as above: ${ICONS}.` },
  { name: "closingLine", label: "Closing line", kind: "text", max: 120, help: "Above the contact buttons at the bottom of the page." },
  { name: "email", label: "Email", kind: "email", section: "Contact" },
  { name: "linkedinUrl", label: "LinkedIn", kind: "url" },
  { name: "githubUrl", label: "GitHub", kind: "url" },
  { name: "siteUrl", label: "Site address", kind: "url", help: "The public address, used for the QR code on the badge." },
  { name: "fullName", label: "Full name", kind: "text", max: 80, empty: "null", more: true, help: "On the CV and in page titles. Leave empty to use first and last name." },
  { name: "cvPhotoId", label: "CV photo", kind: "media", mediaKind: "photo", empty: "null", more: true, help: "Cut-out portrait with a clear background (PNG), at the top right of the CV." },
  { name: "cvSummary", label: "CV summary", kind: "textarea", max: 600, rows: 4, empty: "blank", more: true, help: "Leave empty to use the About text." },
  { name: "cvLocationLine", label: "CV location line", kind: "text", max: 80, empty: "blank", more: true, help: "Leave empty to use the location." },
];

export function getResource(key: string): Resource | undefined {
  return (LIST_KEYS as readonly string[]).includes(key) ? RESOURCES[key as ListKey] : undefined;
}
