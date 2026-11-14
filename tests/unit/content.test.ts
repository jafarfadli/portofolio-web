import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb, type Db } from "@/db/client";
import { seed } from "@/db/seed";
import { getHomeContent, mediaUrl } from "@/content/home";
import { getCvContent } from "@/content/cv";

let db: Db;
beforeAll(() => {
  db = openDb(":memory:");
  seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: fs.mkdtempSync(path.join(os.tmpdir(), "up-")) });
});

describe("mediaUrl", () => {
  it("encodes each segment", () => {
    expect(mediaUrl("photos/a b.jpg")).toBe("/media/photos/a%20b.jpg");
  });
});

describe("getHomeContent", () => {
  it("returns featured projects in order with screenshot refs", () => {
    const c = getHomeContent(db);
    expect(c.profile.firstName).toBe("Dimas");
    expect(c.projects.map((p) => p.slug)).toEqual(["ledgerly", "rute", "kanbo", "pantau"]);
    expect(c.projects[0].screenshot?.url).toMatch(/^\/media\/screens\/ledgerly-[0-9a-f]{10}\.png$/);
    expect(c.projects[1].screenshot?.height).toBe(1688);
  });

  it("keeps site order and site visibility", () => {
    const c = getHomeContent(db);
    expect(c.achievements.map((a) => a.title)[2]).toBe("Nusantara Code Cup");
    expect(c.activities).toHaveLength(6);
    expect(c.activities[0].photo?.url).toMatch(/^\/media\/photos\/act-talk-/);
    expect(c.skills.map((s) => s.name)).not.toContain("Python");
    expect(c.skills).toHaveLength(10);
  });
});

describe("getCvContent", () => {
  it("uses the default profile picks for achievements and falls back elsewhere", () => {
    const cv = getCvContent(db)!;
    expect(cv.achievements.map((a) => a.title)).toEqual([
      "Nusantara Code Cup", "AWS Certified Developer", "Hackathon Jakarta Pintar", "Regional Programming Contest", "Dean's List",
    ]);
    expect(cv.activities.map((a) => a.title)).toEqual([
      "JakWeb Meetup #42", "Ruang Kode Hackathon", "Campus Code Camp", "Open Source Saturday",
    ]);
    expect(cv.skillGroups[0]).toEqual({ group: "Languages", names: ["TypeScript", "Go", "SQL", "Python"] });
    expect(cv.summary).toBe(cv.profile.cvSummary);
  });

  it("returns null for an unknown profile slug", () => {
    expect(getCvContent(db, "nope")).toBeNull();
  });
});
