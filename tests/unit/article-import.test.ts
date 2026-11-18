import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { importArticle } from "@/article/import";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { media, projects } from "@/db/schema";
import { seededDb } from "./helpers";

// fileFor() puts its own `shots` after the spread, so the example's empty list is replaced.
const BODY = LEDGERLY_ARTICLE;
const made: string[] = [];
afterEach(() => {
  for (const d of made.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function repo(file: object | string, shots: { name: string; width: number; colour: string }[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "art-repo-"));
  made.push(dir);
  fs.writeFileSync(path.join(dir, "portfolio-article.json"), typeof file === "string" ? file : JSON.stringify(file));
  fs.mkdirSync(path.join(dir, "portfolio-article"));
  for (const s of shots) {
    await sharp({ create: { width: s.width, height: Math.round(s.width * 0.625), channels: 3, background: s.colour } })
      .png()
      .toFile(path.join(dir, "portfolio-article", s.name));
  }
  return dir;
}
const fileFor = (slug: string, shots: object[] = []) => ({ version: 1, slug, ...BODY, shots });
const rowOf = (db: ReturnType<typeof seededDb>, slug: string) => db.select().from(projects).where(eq(projects.slug, slug)).get()!;
const mediaCount = (db: ReturnType<typeof seededDb>) => db.select().from(media).all().length;

describe("importArticle", () => {
  it("stores a new article unpublished, with its screenshots as media", async () => {
    const db = seededDb();
    const dir = await repo(
      fileFor("rute", [{ file: "portfolio-article/map.png", alt: "The arrivals map", caption: "Arrivals on the map." }]),
      [{ name: "map.png", width: 1600, colour: "#224466" }],
    );
    const r = await importArticle(db, dir, { today: "2026-11-18" });
    expect(r).toEqual({ ok: true, slug: "rute", newShots: 1, replaced: false, published: false });
    const row = rowOf(db, "rute");
    expect(row.articlePublished).toBe(false);
    expect(row.article?.hook).toBe(BODY.hook);
    const shot = db.select().from(media).where(eq(media.id, row.article!.shots[0].mediaId)).get()!;
    expect(shot).toMatchObject({ kind: "screenshot", alt: "The arrivals map" });
  });

  it("writes nothing when the file is broken, wrong or names an unknown project", async () => {
    const db = seededDb();
    const before = mediaCount(db);
    const cases: [string | object, RegExp][] = [
      ["{ not json", /is not valid JSON/],
      [{ ...fileFor("rute"), hook: "too short" }, /^hook: Write at least 60 characters\./],
      [fileFor("nope"), /No project has the slug "nope"/],
    ];
    for (const [file, problem] of cases) {
      const r = await importArticle(db, await repo(file));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.problems[0]).toMatch(problem);
    }
    expect(rowOf(db, "rute").article).toBeNull();
    expect(mediaCount(db)).toBe(before);
  });

  it("refuses a screenshot narrower than 1440px and keeps nothing it stored", async () => {
    const db = seededDb();
    const before = mediaCount(db);
    const dir = await repo(
      fileFor("rute", [
        { file: "portfolio-article/ok.png", alt: "a", caption: "a" },
        { file: "portfolio-article/small.png", alt: "b", caption: "b" },
      ]),
      [{ name: "ok.png", width: 1600, colour: "#336699" }, { name: "small.png", width: 900, colour: "#663399" }],
    );
    const r = await importArticle(db, dir);
    expect(r).toEqual({ ok: false, problems: ["shots[1].file: portfolio-article/small.png is 900px wide; capture it at least 1440px wide."] });
    expect(mediaCount(db)).toBe(before);
    expect(rowOf(db, "rute").article).toBeNull();
  });

  it("replaces an article but keeps it published, and drops the screenshots it no longer uses", async () => {
    const db = seededDb();
    const first = await importArticle(
      db,
      await repo(fileFor("ledgerly", [{ file: "portfolio-article/a.png", alt: "a", caption: "a" }]), [{ name: "a.png", width: 1500, colour: "#111111" }]),
    );
    expect(first).toMatchObject({ ok: true, replaced: true, published: true });
    const oldShot = rowOf(db, "ledgerly").article!.shots[0].mediaId;
    const second = await importArticle(db, await repo({ ...fileFor("ledgerly"), hook: `${BODY.hook} Again.` }));
    expect(second).toMatchObject({ ok: true, published: true, newShots: 0 });
    expect(rowOf(db, "ledgerly").article!.hook.endsWith("Again.")).toBe(true);
    expect(db.select().from(media).where(eq(media.id, oldShot)).get()).toBeUndefined();
  });

  it("lets --slug override the slug in the file", async () => {
    const db = seededDb();
    const r = await importArticle(db, await repo(fileFor("whatever")), { slug: "pantau" });
    expect(r).toMatchObject({ ok: true, slug: "pantau" });
  });

  it("keeps a screenshot a re-import still uses, with the same row", async () => {
    const db = seededDb();
    const shot = { file: "portfolio-article/a.png", alt: "a", caption: "a" };
    const files = [{ name: "a.png", width: 1500, colour: "#222222" }];
    const first = await importArticle(db, await repo(fileFor("ledgerly", [shot]), files));
    expect(first).toMatchObject({ ok: true, newShots: 1 });
    const kept = rowOf(db, "ledgerly").article!.shots[0].mediaId;
    const second = await importArticle(db, await repo(fileFor("ledgerly", [{ ...shot, alt: "a, again", caption: "b" }]), files));
    expect(second).toMatchObject({ ok: true, newShots: 0 });
    const after = rowOf(db, "ledgerly").article!.shots;
    // the article carries its own alt; the reused row keeps the one it was created with
    expect(after).toEqual([{ mediaId: kept, alt: "a, again", caption: "b" }]);
    expect(db.select().from(media).where(eq(media.id, kept)).get()!.alt).toBe("a");
  });

  it("leaves the alt text of a reused screenshot alone when the import fails", async () => {
    const db = seededDb();
    const files = [{ name: "a.png", width: 1500, colour: "#444444" }];
    await importArticle(db, await repo(fileFor("rute", [{ file: "portfolio-article/a.png", alt: "first alt", caption: "a" }]), files));
    const id = rowOf(db, "rute").article!.shots[0].mediaId;
    const r = await importArticle(
      db,
      await repo(
        fileFor("pantau", [
          { file: "portfolio-article/a.png", alt: "changed alt", caption: "a" },
          { file: "portfolio-article/small.png", alt: "b", caption: "b" },
        ]),
        [...files, { name: "small.png", width: 900, colour: "#555555" }],
      ),
    );
    expect(r.ok).toBe(false);
    expect(db.select().from(media).where(eq(media.id, id)).get()!.alt).toBe("first alt");
    expect(rowOf(db, "pantau").article).toBeNull();
    expect(rowOf(db, "rute").article!.shots).toEqual([{ mediaId: id, alt: "first alt", caption: "a" }]);
  });

  it("refuses a portfolio-article folder or a portfolio-article.json that is a link", async () => {
    const db = seededDb();
    const shot = { file: "portfolio-article/a.png", alt: "a", caption: "a" };
    const dir = await repo(fileFor("rute", [shot]));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "art-outside-"));
    made.push(outside);
    await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#777777" } }).png().toFile(path.join(outside, "a.png"));
    fs.rmSync(path.join(dir, "portfolio-article"), { recursive: true });
    fs.symlinkSync(outside, path.join(dir, "portfolio-article"));
    const r = await importArticle(db, dir);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems).toEqual(["shots[0].file: portfolio-article/a.png must stay inside the repo, without links."]);
    expect(rowOf(db, "rute").article).toBeNull();

    const real = path.join(outside, "article.json");
    fs.writeFileSync(real, JSON.stringify(fileFor("rute")));
    const dir2 = await repo(fileFor("rute"));
    fs.rmSync(path.join(dir2, "portfolio-article.json"));
    fs.symlinkSync(real, path.join(dir2, "portfolio-article.json"));
    expect(await importArticle(db, dir2)).toEqual({ ok: false, problems: ["portfolio-article.json must be a plain file, not a link."] });
  });

  it("refuses a screenshot that is a link or not an image", async () => {
    const db = seededDb();
    const dir = await repo(
      fileFor("rute", [
        { file: "portfolio-article/link.png", alt: "a", caption: "a" },
        { file: "portfolio-article/bad.png", alt: "b", caption: "b" },
      ]),
      [{ name: "real.png", width: 1600, colour: "#666666" }],
    );
    fs.symlinkSync(path.join(dir, "portfolio-article", "real.png"), path.join(dir, "portfolio-article", "link.png"));
    fs.writeFileSync(path.join(dir, "portfolio-article", "bad.png"), "not an image");
    const r = await importArticle(db, dir);
    expect(r).toEqual({
      ok: false,
      problems: [
        "shots[0].file: portfolio-article/link.png must be a plain file, not a link.",
        "shots[1].file: portfolio-article/bad.png could not be read as an image.",
      ],
    });
  });
});
