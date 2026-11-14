import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDashboard } from "@/admin/dashboard";
import { media, projects } from "@/db/schema";
import { seededDb, testDb } from "./helpers";

describe("getDashboard", () => {
  it("counts every list and flags sample metrics, missing screenshots and missing alt text", () => {
    const db = seededDb();
    const d = getDashboard(db);
    expect(d.counts.map((c) => c.label)).toEqual(["Projects", "Achievements", "Activities", "Experience", "Education", "Skills"]);
    expect(d.counts[0]).toMatchObject({ href: "/admin/projects", total: 4, onSite: 4 });
    expect(d.warnings.map((w) => w.text)).toContain("Ledgerly shows a sample metric.");

    db.update(media).set({ alt: "" }).run();
    db.update(projects).set({ screenshotId: null }).where(eq(projects.slug, "ledgerly")).run();
    const texts = getDashboard(db).warnings.map((w) => w.text);
    expect(texts).toContain("Ledgerly is featured but has no screenshot.");
    expect(texts.some((t) => /^\d+ images have no alt text\.$/.test(t))).toBe(true);
  });

  it("asks for a profile first on an empty database", () => {
    expect(getDashboard(testDb()).warnings[0]).toEqual({
      text: "The profile is empty, so the public site shows a placeholder page.",
      href: "/admin/profile",
    });
  });
});
