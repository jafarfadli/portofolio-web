import { describe, expect, it } from "vitest";
import { statementLines, switchAt } from "@/lib/statement";

describe("statementLines", () => {
  it("splits each line on ' / ' into display lines", () => {
    expect(
      statementLines("Web products :browsers:, / end to end.", "From schema :database: / to pixel :cursor:."),
    ).toEqual(["Web products :browsers:,", "end to end.", "From schema :database:", "to pixel :cursor:."]);
  });

  it("does not split a slash inside a word", () => {
    expect(statementLines("A/B testing", "x")).toEqual(["A/B testing", "x"]);
  });

  it("drops empty parts", () => {
    expect(statementLines("one / ", "  ", "two")).toEqual(["one", "two"]);
  });
});

describe("switchAt", () => {
  it("finds the last inner o of the longest plain word", () => {
    const line = "AI integrations,";
    const k = switchAt(line);
    expect(line[k]).toBe("o");
    expect(line.slice(0, k)).toBe("AI integrati");
  });

  it("passes over icon tokens", () => {
    const line = "Web products :browsers:,";
    expect(line.slice(0, switchAt(line))).toBe("Web pr");
    expect(switchAt(":browsers: only")).toBe(-1);
  });

  it("finds none in short words, at a word's edge, or in a line with markup", () => {
    expect(switchAt("to launch")).toBe(-1);
    expect(switchAt("Ontario")).toBe(-1);
    expect(switchAt("**AI** integrations")).toBe(-1);
  });
});
