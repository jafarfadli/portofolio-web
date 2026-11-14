import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { eq } from "drizzle-orm";
import { achievements, activities, education, experiences, projects, skills } from "@/db/schema";
import { minimalProject, seededDb, testDb } from "./helpers";
import { getHomeContent, getProfile, mediaUrl } from "@/content/home";
import { getCvContent } from "@/content/cv";

let db: Db;
beforeAll(() => {
  db = seededDb();
});

describe("mediaUrl", () => {
  it("encodes each segment", () => {
    expect(mediaUrl("photos/a b.jpg")).toBe("/media/photos/a%20b.jpg");
  });
});

describe("getHomeContent", () => {
  it("returns featured projects in order with screenshot refs", () => {
    const c = getHomeContent(db)!;
    expect(c.profile.firstName).toBe("Jafar");
    expect(c.photo?.url).toMatch(/^\/media\/photos\/owner-badge-[0-9a-f]{10}\.jpg$/);
    expect(c.projects.map((p) => p.slug)).toEqual(["ledgerly", "rute", "kanbo", "pantau"]);
    expect(c.projects[0].screenshot?.url).toMatch(/^\/media\/screens\/ledgerly-[0-9a-f]{10}\.png$/);
    expect(c.projects[1].screenshot?.height).toBe(1688);
  });

  it("keeps site order and site visibility", () => {
    const c = getHomeContent(db)!;
    expect(c.achievements[0].title).toBe("Nusantara Code Cup");
    expect(c.achievements[0].photo?.url).toMatch(/^\/media\/photos\/act-stage-[0-9a-f]{10}\.jpg$/);
    expect(c.achievements.every((a) => a.photo !== null)).toBe(true);
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
    expect(cv.photo?.url).toMatch(/^\/media\/photos\/owner-cutout-[0-9a-f]{10}\.png$/);
  });

  it("returns null for an unknown profile slug", () => {
    expect(getCvContent(db, "nope")).toBeNull();
  });

  it("drops a rank, role or institution that an older line repeats", () => {
    const old = seededDb();
    const ach = old.select().from(achievements).where(eq(achievements.title, "Nusantara Code Cup")).get()!;
    old.update(achievements).set({ cvLine: "**Winner**, Nusantara Code Cup, software development" }).where(eq(achievements.id, ach.id)).run();
    const act = old.select().from(activities).where(eq(activities.title, "JakWeb Meetup #42")).get()!;
    old.update(activities).set({ cvLine: `${act.roleLabel}, JakWeb Meetup #42` }).where(eq(activities.id, act.id)).run();
    const edu = old.select().from(education).all()[0];
    old.update(education).set({ cvNote: `${edu.institution}, GPA 3.71 / 4.00` }).where(eq(education.id, edu.id)).run();

    const cv = getCvContent(old)!;
    expect(cv.achievements.find((a) => a.id === ach.id)!.cvLine).toBe("Nusantara Code Cup, software development");
    expect(cv.activities.find((a) => a.id === act.id)!.cvLine).toBe("JakWeb Meetup #42");
    expect(cv.education.find((e) => e.id === edu.id)!.cvNote).toBe("GPA 3.71 / 4.00");
    // The home page keeps the stored line as it is.
    expect(getHomeContent(old)!.achievements.some((a) => a.id === ach.id)).toBe(true);
  });
});

describe("first run", () => {
  it("has no profile, home or CV content before the owner saves a profile", () => {
    const empty = testDb();
    expect(getProfile(empty)).toBeNull();
    expect(getHomeContent(empty)).toBeNull();
    expect(getCvContent(empty)).toBeNull();
  });
});

describe("home lists", () => {
  it("shows at most four featured projects, in sort order", () => {
    const db = seededDb();
    db.insert(projects).values({ ...minimalProject("extra"), featured: true, sortOrder: -1 }).run();
    db.insert(projects).values({ ...minimalProject("not-featured"), featured: false, sortOrder: -2 }).run();
    const list = getHomeContent(db)!.projects;
    expect(list).toHaveLength(4);
    expect(list[0].slug).toBe("extra");
    expect(list.map((p) => p.slug)).not.toContain("not-featured");
  });

  it("leaves out rows hidden from the site, in every list", () => {
    const db = seededDb();
    const before = getHomeContent(db)!;
    const hidden = {
      project: before.projects[0].id,
      achievement: before.achievements[0].id,
      activity: before.activities[0].id,
      experience: before.experiences[0].id,
      education: before.education[0].id,
      skill: before.skills[0].id,
    };
    db.update(projects).set({ showOnSite: false }).where(eq(projects.id, hidden.project)).run();
    db.update(achievements).set({ showOnSite: false }).where(eq(achievements.id, hidden.achievement)).run();
    db.update(activities).set({ showOnSite: false }).where(eq(activities.id, hidden.activity)).run();
    db.update(experiences).set({ showOnSite: false }).where(eq(experiences.id, hidden.experience)).run();
    db.update(education).set({ showOnSite: false }).where(eq(education.id, hidden.education)).run();
    db.update(skills).set({ showOnSite: false }).where(eq(skills.id, hidden.skill)).run();

    const after = getHomeContent(db)!;
    expect(after.projects.map((r) => r.id)).not.toContain(hidden.project);
    expect(after.achievements.map((r) => r.id)).not.toContain(hidden.achievement);
    expect(after.activities.map((r) => r.id)).not.toContain(hidden.activity);
    expect(after.experiences.map((r) => r.id)).not.toContain(hidden.experience);
    expect(after.education.map((r) => r.id)).not.toContain(hidden.education);
    expect(after.skills.map((r) => r.id)).not.toContain(hidden.skill);
    expect(after.achievements).toHaveLength(before.achievements.length - 1);
  });
});
