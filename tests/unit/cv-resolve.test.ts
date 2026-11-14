import { describe, expect, it } from "vitest";
import { resolveCvSection, type CvPick } from "@/lib/cv-resolve";

const rows = [
  { id: 1, sortOrder: 2, showInCv: true, name: "b" },
  { id: 2, sortOrder: 1, showInCv: true, name: "a" },
  { id: 3, sortOrder: 3, showInCv: false, name: "hidden" },
];

describe("resolveCvSection", () => {
  it("falls back to showInCv items in sortOrder when there are no picks", () => {
    expect(resolveCvSection(rows, "skill", []).map((r) => r.name)).toEqual(["a", "b"]);
  });

  it("falls back per section when picks exist only for other types", () => {
    const picks: CvPick[] = [{ itemType: "project", itemId: 1, sortOrder: 0 }];
    expect(resolveCvSection(rows, "skill", picks).map((r) => r.name)).toEqual(["a", "b"]);
  });

  it("uses picks in pick order, includes picked hidden items, drops unknown ids", () => {
    const picks: CvPick[] = [
      { itemType: "skill", itemId: 3, sortOrder: 1 },
      { itemType: "skill", itemId: 99, sortOrder: 2 },
      { itemType: "skill", itemId: 1, sortOrder: 0 },
    ];
    expect(resolveCvSection(rows, "skill", picks).map((r) => r.name)).toEqual(["b", "hidden"]);
  });
});
