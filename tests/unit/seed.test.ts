import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "@/db/client";
import { achievements, activities, cvProfileItems, cvProfiles, media, profile, projects, skills } from "@/db/schema";
import { resetContent, seed } from "@/db/seed";

describe("seed", () => {
  it("seeds the mockup content and copies media with content-hashed names", () => {
    const db = openDb(":memory:");
    const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: uploads });

    expect(db.select().from(profile).get()!.firstName).toBe("Dimas");
    expect(db.select().from(projects).all()).toHaveLength(4);
    expect(db.select().from(achievements).all()).toHaveLength(5);
    expect(db.select().from(activities).all()).toHaveLength(6);
    expect(db.select().from(skills).all()).toHaveLength(12);

    const files = db.select().from(media).all();
    expect(files).toHaveLength(10);
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
