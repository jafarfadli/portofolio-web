import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/** Columns every ordered, toggleable content list shares. Fresh builders per table. */
const listCols = () => ({
  id: integer("id").primaryKey({ autoIncrement: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  showOnSite: integer("show_on_site", { mode: "boolean" }).notNull().default(true),
  showInCv: integer("show_in_cv", { mode: "boolean" }).notNull().default(true),
  ...timestamps(),
});

/** A smaller WebP written next to the master at upload (480, 960, 1600 px wide; only those narrower than it). */
export type MediaVariant = { width: number; height: number; path: string };

export const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Relative to DATA_DIR/uploads, content-hashed, e.g. "screens/ledgerly-3fa1c2d4e5.png". */
  path: text("path").notNull(),
  kind: text("kind", { enum: ["screenshot", "photo", "logo"] }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  alt: text("alt").notNull(),
  provenance: text("provenance").notNull(),
  variants: text("variants", { mode: "json" }).$type<MediaVariant[]>().notNull().default(sql`'[]'`),
  ...timestamps(),
});

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  /** Shown on the CV, in titles and in alt text. Null: first and last name. */
  fullName: text("full_name"),
  role: text("role").notNull(),
  stackLine: text("stack_line").notNull(),
  photoId: integer("photo_id").references(() => media.id),
  cvPhotoId: integer("cv_photo_id").references(() => media.id),
  location: text("location").notNull(),
  availabilityNote: text("availability_note").notNull(),
  openToWork: integer("open_to_work", { mode: "boolean" }).notNull().default(true),
  openToWorkLabel: text("open_to_work_label").notNull(),
  email: text("email").notNull(),
  siteUrl: text("site_url").notNull(),
  githubUrl: text("github_url").notNull(),
  linkedinUrl: text("linkedin_url").notNull(),
  statementLine1: text("statement_line1").notNull(),
  statementLine2: text("statement_line2").notNull(),
  /** Inline markup: _em_ renders in the soft on-ground colour. */
  aboutText: text("about_text").notNull(),
  closingLine: text("closing_line").notNull(),
  cvSummary: text("cv_summary").notNull(),
  cvLocationLine: text("cv_location_line").notNull(),
  ...timestamps(),
});

/** Per-project art direction for the Selected work card. All numbers are % of the card field. */
export type CardArt = {
  print: { left: number; top: number; width: number; height: number; rot: number; objectPosition?: string };
  leader: { d: string; dot: { x: number; y: number }; ink?: boolean };
  pin: { x: number; y: number; side: "l" | "r"; big?: boolean; ink?: boolean };
};

export const projects = sqliteTable("projects", {
  ...listCols(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Inline markup, e.g. "**Ledgerly** helps 1,200 small shops ..." */
  headline: text("headline").notNull(),
  period: text("period").notNull(),
  roleLine: text("role_line").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
  fieldColor: text("field_color").notNull(),
  screenshotId: integer("screenshot_id").references(() => media.id),
  /** Optional portrait capture of the mobile layout: the hero's phone sticker shows it. */
  phoneShotId: integer("phone_shot_id").references(() => media.id),
  /** Screenshots 2 to 4: the card's print flips through them after the main screenshot. */
  shot2Id: integer("shot2_id").references(() => media.id),
  shot3Id: integer("shot3_id").references(() => media.id),
  shot4Id: integer("shot4_id").references(() => media.id),
  /** Up to 4 short feature names. Feature n goes with screenshot n (the first with the main screenshot). */
  features: text("features", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  stickerCaption: text("sticker_caption").notNull(),
  cardArt: text("card_art", { mode: "json" }).$type<CardArt>().notNull(),
  layout: text("layout", { enum: ["wide", "half"] }).notNull(),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  metricValue: text("metric_value").notNull(),
  metricLabel: text("metric_label").notNull(),
  metricIsSample: integer("metric_is_sample", { mode: "boolean" }).notNull().default(false),
  liveUrl: text("live_url"),
  codeUrl: text("code_url"),
  caseStudyMd: text("case_study_md").notNull().default(""),
  cvTitle: text("cv_title").notNull(),
  cvLine: text("cv_line").notNull(),
});

export const achievements = sqliteTable("achievements", {
  ...listCols(),
  title: text("title").notNull(),
  rank: text("rank", { enum: ["winner", "finalist", "award"] }).notNull(),
  rankLabel: text("rank_label").notNull(),
  /** Who ran it, e.g. "Chung-Ang University, Vietnam". The seal caption and the CV line are built from it. */
  organizer: text("organizer").notNull().default(""),
  description: text("description").notNull(),
  year: text("year").notNull(),
  /** When set: the foil seal on the hero seal sticker. */
  sealText: text("seal_text"),
  sealCaption: text("seal_caption"),
  /** The seal sticker caption, e.g. "Winner, Nusantara Code Cup 2024, software development". */
  caption: text("caption").notNull(),
  /** Sentence after the caption. */
  story: text("story").notNull(),
  /** Inline markup for the CV line. */
  cvLine: text("cv_line").notNull(),
  cvYear: text("cv_year").notNull(),
  /** Photo on the pass in the moving strap, cropped 4:3. */
  photoId: integer("photo_id").references(() => media.id),
  /** Photos 2 to 4 take turns with the first on the pass. */
  photo2Id: integer("photo2_id").references(() => media.id),
  photo3Id: integer("photo3_id").references(() => media.id),
  photo4Id: integer("photo4_id").references(() => media.id),
});

export const activities = sqliteTable("activities", {
  ...listCols(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  /** Shape of the role tag (state by form): speaker | organizer | mentor | volunteer. */
  role: text("role", { enum: ["speaker", "organizer", "mentor", "volunteer"] }).notNull(),
  /** Printed word on the tag, e.g. "Host" uses the organizer shape. */
  roleLabel: text("role_label").notNull(),
  year: text("year").notNull(),
  photoId: integer("photo_id").references(() => media.id),
  url: text("url"),
  cvLine: text("cv_line").notNull(),
});

export const experiences = sqliteTable("experiences", {
  ...listCols(),
  role: text("role").notNull(),
  org: text("org").notNull(),
  location: text("location").notNull().default(""),
  period: text("period").notNull(),
  cvPeriod: text("cv_period").notNull(),
  /** Inline markup with **metrics**. */
  summary: text("summary").notNull(),
  cvBullets: text("cv_bullets", { mode: "json" }).$type<string[]>().notNull(),
});

export const education = sqliteTable("education", {
  ...listCols(),
  degree: text("degree").notNull(),
  institution: text("institution").notNull(),
  period: text("period").notNull(),
  /** Inline markup. */
  note: text("note").notNull(),
  cvNote: text("cv_note").notNull(),
});

export const skills = sqliteTable("skills", {
  ...listCols(),
  groupName: text("group_name").notNull(),
  name: text("name").notNull(),
  /** Chip tilt in degrees on the About sticker sheet. */
  rot: real("rot").notNull().default(0),
});

export const cvProfiles = sqliteTable("cv_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  summaryOverride: text("summary_override"),
  ...timestamps(),
});

export const cvProfileItems = sqliteTable("cv_profile_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => cvProfiles.id, { onDelete: "cascade" }),
  itemType: text("item_type", {
    enum: ["project", "achievement", "activity", "experience", "education", "skill"],
  }).notNull(),
  itemId: integer("item_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** The one owner. id is always 1, so a second insert fails on the primary key. */
export const adminUser = sqliteTable("admin_user", {
  id: integer("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps(),
});

export const sessions = sqliteTable("sessions", {
  /** sha256 of the cookie token, hex. The token itself is never stored. */
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  userAgent: text("user_agent").notNull().default(""),
});

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at", { mode: "timestamp" }).notNull(),
    ok: integer("ok", { mode: "boolean" }).notNull(),
  },
  (t) => [index("login_attempts_at").on(t.at)],
);
