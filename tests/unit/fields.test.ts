import { describe, expect, it } from "vitest";
import {
  echoValues, LONG_DASH_ERROR, parseCardArt, parseField, parseFields, toFormValues, type Field, type FieldKind,
} from "@/admin/fields";

const F = (kind: FieldKind, extra: Partial<Field> = {}): Field => ({ name: "x", label: "X", kind, ...extra });

describe("parseField", () => {
  it("requires a value unless the field allows empty", () => {
    expect(parseField(F("text"), "   ")).toEqual({ error: "Fill this in." });
    expect(parseField(F("text"), null)).toEqual({ error: "Fill this in." });
    expect(parseField(F("url", { empty: "null" }), "")).toEqual({ value: null });
    expect(parseField(F("text", { empty: "blank" }), "")).toEqual({ value: "" });
    expect(parseField(F("tags", { empty: "blank" }), "")).toEqual({ value: [] });
  });

  it("refuses long dashes in copy", () => {
    expect(parseField(F("text"), "Best app \u2014 2026")).toEqual({ error: LONG_DASH_ERROR });
    expect(parseField(F("textarea"), "2021 \u2013 2023")).toEqual({ error: LONG_DASH_ERROR });
    expect(parseField(F("tags"), "Go, Next.js \u2014 RSC")).toEqual({ error: LONG_DASH_ERROR });
    expect(parseField(F("text"), "Full-stack, 2021 to 2023")).toEqual({ value: "Full-stack, 2021 to 2023" });
  });

  it("trims text and enforces the maximum length", () => {
    expect(parseField(F("text"), "  Ledgerly  ")).toEqual({ value: "Ledgerly" });
    expect(parseField(F("text", { max: 5 }), "abcdef")).toEqual({ error: "Keep it under 5 characters." });
    expect(parseField(F("textarea"), "line one\r\nline two")).toEqual({ value: "line one\nline two" });
  });

  it("accepts only http and https addresses, normalised", () => {
    expect(parseField(F("url"), "HTTPS://Ledgerly.Example/")).toEqual({ value: "https://ledgerly.example" });
    expect(parseField(F("url"), "https://code.example//me//ledgerly")).toEqual({ value: "https://code.example/me/ledgerly" });
    expect(parseField(F("url"), "javascript:alert(1)")).toEqual({ error: "Use an http or https address." });
    expect(parseField(F("url"), "ledgerly.example")).toEqual({ error: "Enter a full address starting with https://" });
  });

  it("checks emails, slugs, colours, numbers and options", () => {
    expect(parseField(F("email"), "dimas@arkana.example")).toEqual({ value: "dimas@arkana.example" });
    expect(parseField(F("email"), "dimas")).toEqual({ error: "Enter an email address like name@example.com." });
    expect(parseField(F("slug"), "rute-2")).toEqual({ value: "rute-2" });
    expect(parseField(F("slug"), "Rute 2")).toEqual({ error: "Use lowercase letters, numbers and single hyphens, like my-project." });
    expect(parseField(F("color"), "#FF6A2B")).toEqual({ value: "#ff6a2b" });
    expect(parseField(F("color"), "orange")).toEqual({ error: "Use a hex colour like #ff6a2b." });
    expect(parseField(F("number", { min: -12, max: 12 }), "3.5")).toEqual({ value: 3.5 });
    expect(parseField(F("number", { min: -12, max: 12 }), "20")).toEqual({ error: "Use a number from -12 to 12." });
    expect(parseField(F("number"), "abc")).toEqual({ error: "Enter a number." });
    expect(parseField(F("number", { min: 5 }), "3")).toEqual({ error: "Use a number of at least 5." });
    expect(parseField(F("number", { max: 12 }), "20")).toEqual({ error: "Use a number of at most 12." });
    expect(parseField(F("enum", { options: ["winner", "finalist"] }), "winner")).toEqual({ value: "winner" });
    expect(parseField(F("enum", { options: ["winner", "finalist"] }), "champion")).toEqual({ error: "Pick one of the options." });
  });

  it("splits tags on commas and lines on newlines", () => {
    expect(parseField(F("tags"), "Go, , Redis ,PostgreSQL")).toEqual({ value: ["Go", "Redis", "PostgreSQL"] });
    expect(parseField(F("tags"), Array.from({ length: 13 }, (_, i) => `t${i}`).join(","))).toEqual({ error: "Use at most 12 tags." });
    expect(parseField(F("lines"), "first\n\n  second  ")).toEqual({ value: ["first", "second"] });
  });

  it("reads checkboxes as booleans and pickers as ids", () => {
    expect(parseField(F("bool"), "on")).toEqual({ value: true });
    expect(parseField(F("bool"), null)).toEqual({ value: false });
    expect(parseField(F("media", { empty: "null" }), "7")).toEqual({ value: 7 });
    expect(parseField(F("media"), "7; drop table")).toEqual({ error: "Pick an image from the list." });
  });
});

describe("parseCardArt", () => {
  const good = {
    print: { left: 7, top: 14, width: 58, height: 80, rot: -2.5 },
    leader: { d: "M 61.5 30 C 68 26, 70 40, 74 44", dot: { x: 61.5, y: 30 } },
    pin: { x: 74, y: 44, side: "l", big: true },
  };

  it("accepts the seed's card art and drops unknown keys", () => {
    expect(parseCardArt(JSON.stringify({ ...good, extra: 1 }))).toEqual({ value: good });
  });

  it("rejects malformed layouts with a reason", () => {
    expect(parseCardArt("{")).toEqual({ error: "This is not valid JSON." });
    expect(parseCardArt("[]")).toEqual({ error: "Card layout needs print, leader and pin." });
    expect(parseCardArt(JSON.stringify({ ...good, print: { ...good.print, left: "7" } }))).toEqual({
      error: "print needs numbers for left, top, width, height and rot.",
    });
    expect(parseCardArt(JSON.stringify({ ...good, leader: { ...good.leader, d: 'M 0 0"/><script>' } }))).toEqual({
      error: "leader.d must be SVG path commands and numbers, like M 10 20 L 30 40.",
    });
    expect(parseCardArt(JSON.stringify({ ...good, pin: { ...good.pin, side: "x" } }))).toEqual({
      error: 'pin needs numbers for x and y, and side "l" or "r".',
    });
  });
});

describe("parseFields, toFormValues, echoValues", () => {
  const fields: Field[] = [
    F("text", { name: "name" }),
    F("tags", { name: "tags", empty: "blank" }),
    F("bool", { name: "featured" }),
    F("lines", { name: "cvBullets", empty: "blank" }),
  ];

  it("collects values and per-field errors", () => {
    const form = new FormData();
    form.set("name", "");
    form.set("tags", "Go, , Redis");
    form.set("featured", "on");
    form.set("cvBullets", "a\n\nb");
    expect(parseFields(fields, form)).toEqual({
      values: { tags: ["Go", "Redis"], featured: true, cvBullets: ["a", "b"] },
      errors: { name: "Fill this in." },
    });
  });

  it("turns a row into form strings, and echoes raw input back", () => {
    expect(toFormValues(fields, { name: "Ledgerly", tags: ["Go", "Redis"], featured: false, cvBullets: ["a", "b"] })).toEqual({
      name: "Ledgerly", tags: "Go, Redis", featured: "", cvBullets: "a\nb",
    });
    expect(toFormValues(fields, undefined)).toEqual({ name: "", tags: "", featured: "", cvBullets: "" });
    const form = new FormData();
    form.set("name", "Best \u2014 app");
    form.set("featured", "on");
    expect(echoValues(fields, form)).toEqual({ name: "Best \u2014 app", tags: "", featured: "on", cvBullets: "" });
  });
});
