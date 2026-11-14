import { describe, expect, it } from "vitest";
import { parseInline } from "@/lib/inline";
import { displayUrl } from "@/lib/url";

describe("parseInline", () => {
  it("returns plain text as one segment", () => {
    expect(parseInline("Plain words.")).toEqual([{ text: "Plain words." }]);
  });

  it("splits strong runs", () => {
    expect(parseInline("**Ledgerly** helps shops.")).toEqual([
      { text: "Ledgerly", strong: true },
      { text: " helps shops." },
    ]);
  });

  it("splits em runs and mixes with strong", () => {
    expect(parseInline("Cut **840 ms**, _and more_.")).toEqual([
      { text: "Cut " },
      { text: "840 ms", strong: true },
      { text: ", " },
      { text: "and more", em: true },
      { text: "." },
    ]);
  });

  it("leaves unclosed markers literal", () => {
    expect(parseInline("**half open")).toEqual([{ text: "**half open" }]);
  });
});

describe("displayUrl", () => {
  it("drops the scheme and trailing slash", () => {
    expect(displayUrl("https://github.example/dimasarkana/")).toBe("github.example/dimasarkana");
    expect(displayUrl("http://dimasarkana.example")).toBe("dimasarkana.example");
  });
});
