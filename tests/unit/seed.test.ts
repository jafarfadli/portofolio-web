import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { testDb } from "./helpers";
import { achievements, activities, cvProfileItems, cvProfiles, media, profile, projects, skills } from "@/db/schema";
import { resetContent, seed } from "@/db/seed";

describe("seed", () => {
  it("seeds the mockup content and copies media with content-hashed names", () => {
    const db = testDb();
    const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: uploads });

    const p = db.select().from(profile).get()!;
    expect(p.firstName).toBe("Jafar");
    expect(p.fullName).toBe("Muhammad Jafar Fadli");
    expect(p.photoId).not.toBeNull();
    expect(p.cvPhotoId).not.toBeNull();
    expect(db.select().from(projects).all()).toHaveLength(4);
    expect(db.select().from(achievements).all()).toHaveLength(5);
    expect(
      db.select().from(achievements).all().sort((a, b) => a.sortOrder - b.sortOrder).map((a) => a.title),
    ).toEqual(["Nusantara Code Cup", "AWS Certified Developer", "Hackathon Jakarta Pintar", "Regional Programming Contest", "Dean's List"]);
    expect(db.select().from(achievements).all().every((a) => a.photoId !== null)).toBe(true);
    expect(db.select().from(activities).all()).toHaveLength(6);
    expect(db.select().from(skills).all()).toHaveLength(12);

    const files = db.select().from(media).all();
    expect(files).toHaveLength(12);
    for (const f of files) {
      expect(f.path).toMatch(/^(screens|photos)\/[a-z-]+-[0-9a-f]{10}\.(png|jpg)$/);
      expect(fs.existsSync(path.join(uploads, f.path))).toBe(true);
    }

    const def = db.select().from(cvProfiles).get()!;
    expect(def.isDefault).toBe(true);
    expect(db.select().from(cvProfileItems).all()).toHaveLength(5);

    resetContent(db);
    expect(db.select().from(projects).all()).toHaveLength(0);
    expect(db.select().from(media).all()).toHaveLength(0);
  });
});
