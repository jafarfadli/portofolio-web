import { describe, expect, it } from "vitest";
import { statementLines } from "@/lib/statement";

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
