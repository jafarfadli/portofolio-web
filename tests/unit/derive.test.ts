import { describe, expect, it } from "vitest";
import {
  fillAchievement, fillActivity, fillEducation, fillExperience, fillProfile, fillProject, plainText, slugify,
} from "@/content/derive";

// Only the columns each fill reads matter here; the rest of the row passes through untouched.
const ach = (over: Record<string, unknown>) =>
  ({ title: "Code Cup", organizer: "", rankLabel: "Winner", year: "2024", caption: "", cvLine: "", cvYear: "2019", ...over }) as never;

describe("fillAchievement", () => {
  it("builds the seal caption and CV line from award, competition, organizer and year", () => {
    const a = fillAchievement(ach({ organizer: "Chung-Ang University, Vietnam" })) as Record<string, string>;
    expect(a.caption).toBe("Winner, Code Cup, Chung-Ang University, Vietnam 2024");
    expect(a.cvLine).toBe("Code Cup, Chung-Ang University, Vietnam");
  });
  it("leaves out an empty organizer", () => {
    const a = fillAchievement(ach({})) as Record<string, string>;
    expect(a.caption).toBe("Winner, Code Cup 2024");
    expect(a.cvLine).toBe("Code Cup");
  });
  it("keeps words the owner typed", () => {
    const a = fillAchievement(ach({ caption: "Mine", cvLine: "**1st of 40**" })) as Record<string, string>;
    expect(a.caption).toBe("Mine");
    expect(a.cvLine).toBe("**1st of 40**");
  });
  it("prints the main year on the CV, never the old CV year", () => {
    expect((fillAchievement(ach({})) as Record<string, string>).cvYear).toBe("2024");
  });
});

describe("other fills", () => {
  it("activity: role word and event name stand in for empty overrides", () => {
    const a = fillActivity({ role: "mentor", roleLabel: " ", title: "Code Camp", cvLine: "" } as never) as Record<string, string>;
    expect(a.roleLabel).toBe("Mentor");
    expect(a.cvLine).toBe("Code Camp");
  });
  it("experience: the summary becomes the one CV bullet", () => {
    const e = fillExperience({ period: "2024", cvPeriod: "", summary: "Did **x**.", cvBullets: [] } as never) as Record<string, unknown>;
    expect(e.cvPeriod).toBe("2024");
    expect(e.cvBullets).toEqual(["Did **x**."]);
    const kept = fillExperience({ period: "2024", cvPeriod: "", summary: "s", cvBullets: ["a", "b"] } as never) as Record<string, unknown>;
    expect(kept.cvBullets).toEqual(["a", "b"]);
  });
  it("education, project and profile fall back to their main fields", () => {
    expect((fillEducation({ note: "GPA 3.9", cvNote: "" } as never) as Record<string, string>).cvNote).toBe("GPA 3.9");
    const p = fillProject({ name: "Rute", stickerCaption: "", headline: "**Rute** helps.", cvLine: "" } as never) as Record<string, string>;
    expect(p.stickerCaption).toBe("Rute");
    expect(p.cvLine).toBe("**Rute** helps.");
    const pr = fillProfile({ aboutText: "I build _sites_ :rocket:. Fast.", cvSummary: "", location: "Bandung", cvLocationLine: "" } as never) as Record<string, string>;
    expect(pr.cvSummary).toBe("I build sites. Fast.");
    expect(pr.cvLocationLine).toBe("Bandung");
  });
});

describe("plainText and slugify", () => {
  it("drops markup and icon stickers", () => {
    expect(plainText("**Bold** and _soft_ :browsers: text")).toBe("Bold and soft text");
  });
  it("makes an address part from a name", () => {
    expect(slugify("Don't Call Me!")).toBe("dont-call-me");
    expect(slugify("  Café Ledger 2 ")).toBe("cafe-ledger-2");
    expect(slugify("!!!")).toBe("");
  });
});
