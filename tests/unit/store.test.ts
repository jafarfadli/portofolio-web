import { describe, expect, it } from "vitest";
import { and, eq, getTableColumns } from "drizzle-orm";
import { getResource, LIST_KEYS, PROFILE_FIELDS, RESOURCES } from "@/admin/resources";
import { checkMedia, deleteItem, getItem, listItems, moveItem, saveItem, saveProfile, setFlag } from "@/admin/store";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { achievements, cvProfileItems, media, profile, projects } from "@/db/schema";
import { minimalProject, seededDb, testDb } from "./helpers";

const newProject = (slug: string, extra: Record<string, unknown> = {}) => ({ ...minimalProject(slug), ...extra });
const skill = (name: string) => ({ groupName: "Web", name, rot: 0, showOnSite: true, showInCv: true });
const PROFILE = {
  firstName: "A", lastName: "B", role: "r", stackLine: "s", location: "l", availabilityNote: "a", openToWork: true,
  openToWorkLabel: "o", email: "e@x.example", siteUrl: "https://x.example", githubUrl: "https://g.example",
  linkedinUrl: "https://l.example", statementLine1: "1", statementLine2: "2", aboutText: "a", closingLine: "c",
  cvSummary: "s", cvLocationLine: "l",
};

describe("resources", () => {
  it("only name real columns", () => {
    for (const key of LIST_KEYS) {
      const columns = Object.keys(getTableColumns(RESOURCES[key].table));
      for (const f of RESOURCES[key].fields) expect(columns, `${key}.${f.name}`).toContain(f.name);
    }
    const profileColumns = Object.keys(getTableColumns(profile));
    for (const f of PROFILE_FIELDS) expect(profileColumns, `profile.${f.name}`).toContain(f.name);
  });
  it("are found by URL segment only", () => {
    expect(getResource("projects")?.title).toBe("Projects");
    expect(getResource("profile")).toBeUndefined();
    expect(getResource("constructor")).toBeUndefined();
  });
});

describe("store", () => {
  it("lists in sort order and appends new items at the end", () => {
    const db = seededDb();
    const before = listItems(db, "skills");
    const saved = saveItem(db, "skills", null, skill("Astro"));
    expect(saved.ok).toBe(true);
    const after = listItems(db, "skills");
    expect(after.at(-1)).toMatchObject({ name: "Astro", sortOrder: before.at(-1)!.sortOrder + 1 });
  });

  it("updates a row and reports one that no longer exists", () => {
    const db = seededDb();
    const { id } = listItems(db, "skills")[0];
    expect(saveItem(db, "skills", id, skill("Renamed"))).toEqual({ ok: true, id });
    expect(getItem(db, "skills", id)).toMatchObject({ name: "Renamed" });
    expect(saveItem(db, "skills", 99_999, skill("Ghost"))).toEqual({ ok: false, errors: { _form: "This item no longer exists." } });
  });

  it("keeps project slugs unique", () => {
    const db = seededDb();
    expect(saveItem(db, "projects", null, newProject("ledgerly"))).toEqual({
      ok: false,
      errors: { slug: "Another project already uses this slug." },
    });
    const ledgerly = db.select().from(projects).where(eq(projects.slug, "ledgerly")).get()!;
    expect(saveItem(db, "projects", ledgerly.id, { slug: "ledgerly", name: "Ledgerly" }).ok).toBe(true);
  });

  it("caps featured projects at four", () => {
    const db = seededDb(); // the seed features 4
    expect(saveItem(db, "projects", null, newProject("fifth", { featured: true }))).toEqual({
      ok: false,
      errors: { featured: "Only 4 projects can be featured. Unfeature another one first." },
    });
    const fifth = saveItem(db, "projects", null, newProject("fifth"));
    if (!fifth.ok) throw new Error("expected save");
    expect(setFlag(db, "projects", fifth.id, "featured", true)).toEqual({ ok: false, error: "featured-cap" });
    const ledgerly = db.select().from(projects).where(eq(projects.slug, "ledgerly")).get()!;
    expect(setFlag(db, "projects", ledgerly.id, "featured", false)).toEqual({ ok: true });
    expect(setFlag(db, "projects", fifth.id, "featured", true)).toEqual({ ok: true });
  });

  it("checks that a picked image exists, of any kind", () => {
    const db = seededDb();
    const photo = db.select().from(media).where(eq(media.kind, "photo")).get()!;
    const shot = db.select().from(media).where(eq(media.kind, "screenshot")).get()!;
    const ledgerly = db.select().from(projects).where(eq(projects.slug, "ledgerly")).get()!;
    const gone = { ok: false, errors: { screenshotId: "That image is gone. Upload it again or pick another." } };
    expect(saveItem(db, "projects", ledgerly.id, { screenshotId: 99_999 })).toEqual(gone);
    expect(saveItem(db, "projects", ledgerly.id, { screenshotId: photo.id }).ok).toBe(true);
    expect(saveItem(db, "projects", ledgerly.id, { screenshotId: shot.id }).ok).toBe(true);
  });

  it("checks the profile's picked images the same way", () => {
    const db = seededDb();
    const shot = db.select().from(media).where(eq(media.kind, "screenshot")).get()!;
    const msg = "That image is gone. Upload it again or pick another.";
    expect(checkMedia(db, PROFILE_FIELDS, { photoId: 99_999 })).toEqual({ photoId: msg });
    expect(checkMedia(db, PROFILE_FIELDS, { photoId: shot.id, cvPhotoId: null })).toEqual({});
  });

  it("moves rows up and down and stops at the ends", () => {
    const db = seededDb();
    const [a, b] = listItems(db, "skills");
    expect(moveItem(db, "skills", b.id, -1)).toBe(true);
    expect(listItems(db, "skills").slice(0, 2).map((r) => r.id)).toEqual([b.id, a.id]);
    expect(moveItem(db, "skills", b.id, -1)).toBe(false);
    const last = listItems(db, "skills").at(-1)!;
    expect(moveItem(db, "skills", last.id, 1)).toBe(false);
    expect(listItems(db, "skills").map((r) => r.sortOrder)).toEqual(listItems(db, "skills").map((_, i) => i + 1));
  });

  it("removes a deleted item from every CV profile", () => {
    const db = seededDb();
    const pick = db.select().from(cvProfileItems).where(eq(cvProfileItems.itemType, "achievement")).get()!;
    deleteItem(db, "achievements", pick.itemId);
    expect(db.select().from(achievements).where(eq(achievements.id, pick.itemId)).get()).toBeUndefined();
    const left = db
      .select()
      .from(cvProfileItems)
      .where(and(eq(cvProfileItems.itemType, "achievement"), eq(cvProfileItems.itemId, pick.itemId)))
      .all();
    expect(left).toEqual([]);
  });

  it("refuses flags a list does not have", () => {
    const db = seededDb();
    expect(setFlag(db, "skills", listItems(db, "skills")[0].id, "featured", true)).toEqual({ ok: false, error: "unknown-flag" });
  });

  it("creates the profile on first save, then updates it", () => {
    const db = testDb();
    saveProfile(db, PROFILE);
    saveProfile(db, { ...PROFILE, firstName: "Dimas" });
    const rows = db.select().from(profile).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, firstName: "Dimas" });
  });

  it("refuses to publish a project that has no article", () => {
    const db = seededDb();
    const rute = listItems(db, "projects").find((p) => p.slug === "rute")!;
    const r = saveItem(db, "projects", rute.id, { articlePublished: true, article: null });
    expect(r).toEqual({ ok: false, errors: { articlePublished: "Import or write the article before publishing it." } });
  });

  it("refuses to publish when the payload has no article key and the stored article is null", () => {
    const db = seededDb();
    const rute = listItems(db, "projects").find((p) => p.slug === "rute")!;
    const r = saveItem(db, "projects", rute.id, { articlePublished: true });
    expect(r).toEqual({ ok: false, errors: { articlePublished: "Import or write the article before publishing it." } });
  });

  it("publishes when the stored article exists and the payload has no article key", () => {
    const db = seededDb();
    const rute = listItems(db, "projects").find((p) => p.slug === "rute")!;
    db.update(projects).set({ article: LEDGERLY_ARTICLE }).where(eq(projects.id, rute.id)).run();
    expect(saveItem(db, "projects", rute.id, { articlePublished: true })).toEqual({ ok: true, id: rute.id });
    expect(getItem(db, "projects", rute.id)).toMatchObject({ articlePublished: true });
  });

  it("refuses an article screenshot that is not in the media list", () => {
    const db = seededDb();
    const rute = listItems(db, "projects").find((p) => p.slug === "rute")!;
    const r = saveItem(db, "projects", rute.id, { article: { ...LEDGERLY_ARTICLE, shots: [{ mediaId: 99999, alt: "a", caption: "c" }] } });
    expect(r).toEqual({ ok: false, errors: { article: "Screenshot 99999 is not in the media list. Pick another." } });
  });
});
