import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { migrateDb, openDb } from "@/db/client";
import { adminUser, loginAttempts, media, profile, projects, sessions, skills } from "@/db/schema";
import { minimalProject, testDb } from "./helpers";

describe("openDb", () => {
  it("round-trips json and boolean columns after migrateDb", () => {
    const db = testDb();
    db.insert(profile)
      .values({
        id: 1, firstName: "A", lastName: "B", role: "r", stackLine: "s", location: "l",
        availabilityNote: "a", openToWorkLabel: "o", email: "e@x.example", siteUrl: "https://x.example",
        githubUrl: "https://g.example", linkedinUrl: "https://l.example", statementLine1: "1",
        statementLine2: "2", aboutText: "a", closingLine: "c", cvSummary: "s", cvLocationLine: "l",
      })
      .run();
    db.insert(projects).values(minimalProject("p")).run();

    const row = db.select().from(projects).get()!;
    expect(row.tags).toEqual(["Go"]);
    expect(row.cardArt.pin.side).toBe("l");
    expect(row.showOnSite).toBe(true);
    expect(row.featured).toBe(false);
    expect(db.select().from(profile).get()!.openToWork).toBe(true);
  });

  it("does not migrate on its own", () => {
    const db = openDb(":memory:");
    expect(() => db.select().from(profile).all()).toThrow(/no such table/);
  });

  it("opens an existing file query-only for the public role", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "db-")), "portfolio.db");
    migrateDb(openDb(file));
    const ro = openDb(file, { mustExist: true, queryOnly: true });
    expect(ro.select().from(profile).all()).toEqual([]);
    expect(() => ro.insert(skills).values({ groupName: "g", name: "n" }).run()).toThrow(/readonly/i);
  });

  it("refuses to create a missing file when mustExist is set", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "db-")), "nope", "portfolio.db");
    expect(() => openDb(file, { mustExist: true })).toThrow();
    expect(fs.existsSync(path.dirname(file))).toBe(false);
  });
});

describe("schema additions", () => {
  it("defaults media.variants to an empty list and stores the auth tables", () => {
    const db = testDb();
    const m = db
      .insert(media)
      .values({ path: "screens/a.webp", kind: "screenshot", width: 1, height: 1, alt: "", provenance: "p" })
      .returning()
      .get();
    expect(m.variants).toEqual([]);

    db.insert(adminUser).values({ id: 1, passwordHash: "h" }).run();
    expect(() => db.insert(adminUser).values({ id: 1, passwordHash: "again" }).run()).toThrow(/UNIQUE|PRIMARY/);

    const now = new Date("2026-11-14T10:00:00Z");
    db.insert(sessions).values({ id: "digest", expiresAt: now, createdAt: now }).run();
    expect(db.select().from(sessions).get()).toMatchObject({ id: "digest", userAgent: "", expiresAt: now });

    db.insert(loginAttempts).values({ at: now, ok: false }).run();
    expect(db.select().from(loginAttempts).get()).toMatchObject({ ok: false, at: now });
  });
});
