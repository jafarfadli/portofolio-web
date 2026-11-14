import { describe, expect, it } from "vitest";
import { openDb } from "@/db/client";
import { profile, projects } from "@/db/schema";

describe("openDb", () => {
  it("migrates an in-memory database and round-trips json and boolean columns", () => {
    const db = openDb(":memory:");
    db.insert(profile)
      .values({
        id: 1, firstName: "A", lastName: "B", role: "r", stackLine: "s", location: "l",
        availabilityNote: "a", openToWorkLabel: "o", email: "e@x.example", siteUrl: "https://x.example",
        githubUrl: "https://g.example", linkedinUrl: "https://l.example", statementLine1: "1",
        statementLine2: "2", aboutText: "a", closingLine: "c", cvSummary: "s", cvLocationLine: "l",
      })
      .run();
    db.insert(projects)
      .values({
        slug: "p", name: "P", headline: "**P** does x", period: "2025", roleLine: "solo", tags: ["Go"],
        fieldColor: "#000000", stickerCaption: "c", layout: "wide", metricValue: "1", metricLabel: "x",
        cvTitle: "t", cvLine: "l",
        cardArt: { print: { left: 1, top: 2, width: 3, height: 4, rot: 0 }, leader: { d: "M 0 0", dot: { x: 0, y: 0 } }, pin: { x: 1, y: 1, side: "l" } },
      })
      .run();

    const row = db.select().from(projects).get()!;
    expect(row.tags).toEqual(["Go"]);
    expect(row.cardArt.pin.side).toBe("l");
    expect(row.showOnSite).toBe(true);
    expect(row.featured).toBe(false);
    expect(db.select().from(profile).get()!.openToWork).toBe(true);
  });
});
