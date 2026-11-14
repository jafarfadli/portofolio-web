import { describe, expect, it } from "vitest";
import { ICON_STICKERS, iconCount, parseInline, toPlain } from "@/lib/inline";
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

  it("does not treat underscores inside identifiers as em markers", () => {
    expect(parseInline("built with snake_case_names")).toEqual([{ text: "built with snake_case_names" }]);
    expect(parseInline("my_var and other_var")).toEqual([{ text: "my_var and other_var" }]);
  });

  it("still applies em at word boundaries", () => {
    expect(parseInline("_start_ of line")).toEqual([{ text: "start", em: true }, { text: " of line" }]);
  });
});

describe("parseInline icons", () => {
  it("splits known :name: tokens into icon segments when icons is on", () => {
    expect(parseInline("Web products :browsers:, end", { icons: true })).toEqual([
      { text: "Web products\u00a0" },
      { icon: "browsers" },
      { text: ", end" },
    ]);
  });

  it("keeps tokens as plain text without the icons option", () => {
    expect(parseInline("Web products :browsers:, end")).toEqual([{ text: "Web products :browsers:, end" }]);
  });

  it("leaves unknown tokens as plain text", () => {
    expect(parseInline("hello :nope: there", { icons: true })).toEqual([{ text: "hello :nope: there" }]);
  });

  it("splits icons out of em text", () => {
    expect(parseInline("_small teams :team: that_", { icons: true })).toEqual([
      { text: "small teams\u00a0", em: true },
      { icon: "team" },
      { text: " that", em: true },
    ]);
  });

  it("splits adjacent tokens, with or without a space between them", () => {
    expect(parseInline(":pin::rocket:", { icons: true })).toEqual([{ icon: "pin" }, { icon: "rocket" }]);
    expect(parseInline(":pin: :rocket:", { icons: true })).toEqual([{ icon: "pin" }, { text: " " }, { icon: "rocket" }]);
  });

  it("splits a token at the very start, keeping the space after it", () => {
    expect(parseInline(":pin: start", { icons: true })).toEqual([{ icon: "pin" }, { text: " start" }]);
  });

  it("splits a token that is the whole of a strong run", () => {
    expect(parseInline("**:pin:** x", { icons: true })).toEqual([{ icon: "pin" }, { text: " x" }]);
  });

  it("counts the icon stickers a run sets, ignoring unknown tokens", () => {
    expect(iconCount("Web products :browsers:, end :nope: to :rocket::pin:")).toBe(3);
    expect(iconCount("no icons here")).toBe(0);
  });

  it("knows all eight stickers", () => {
    expect(ICON_STICKERS).toHaveLength(8);
  });
});

describe("toPlain", () => {
  it("drops icon tokens and line-break slashes", () => {
    expect(toPlain("Web products :browsers:, / end to end.")).toBe("Web products, end to end.");
  });

  it("drops strong and em markers", () => {
    expect(toPlain("**Winner**, _soft_ text")).toBe("Winner, soft text");
  });

  it("keeps unknown tokens and slashes inside words", () => {
    expect(toPlain("A/B :nope: test")).toBe("A/B :nope: test");
  });
});

describe("displayUrl", () => {
  it("drops the scheme and trailing slash", () => {
    expect(displayUrl("https://github.example/dimasarkana/")).toBe("github.example/dimasarkana");
    expect(displayUrl("http://dimasarkana.example")).toBe("dimasarkana.example");
  });
});
