import { describe, expect, it } from "vitest";
import { MEDIA_TYPES, safeJoin } from "@/lib/safe-path";

describe("safeJoin", () => {
  const root = "/srv/uploads";

  it("joins normal segments inside the root", () => {
    expect(safeJoin(root, ["screens", "ledgerly-abc.png"])).toBe("/srv/uploads/screens/ledgerly-abc.png");
  });

  it.each([
    [[]],
    [[".."]],
    [["..", "etc", "passwd"]],
    [["screens", ".."]],
    [["screens", "."]],
    [["a/b.png"]],
    [["a\\b.png"]],
    [["ok", ""]],
    [["bad\0.png"]],
  ])("rejects %j", (segments) => {
    expect(safeJoin(root, segments as string[])).toBeNull();
  });
});

describe("MEDIA_TYPES", () => {
  it("serves raster images only", () => {
    expect(MEDIA_TYPES[".png"]).toBe("image/png");
    expect(MEDIA_TYPES[".jpg"]).toBe("image/jpeg");
    expect(MEDIA_TYPES[".svg"]).toBeUndefined();
  });
});
