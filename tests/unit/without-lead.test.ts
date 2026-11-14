import { describe, expect, it } from "vitest";
import { withoutLead } from "@/lib/without-lead";

describe("withoutLead", () => {
  it("strips a bold rank word and its comma", () => {
    expect(withoutLead("**Winner**, Nusantara Code Cup, software development", "Winner")).toBe("Nusantara Code Cup, software development");
  });
  it("strips a plain lead and comma", () => {
    expect(withoutLead("Speaker, JakWeb Meetup #42", "Speaker")).toBe("JakWeb Meetup #42");
  });
  it("strips a lead followed by a colon", () => {
    expect(withoutLead("Dean's List: five semesters", "Dean's List")).toBe("five semesters");
  });
  it("compares case-insensitively", () => {
    expect(withoutLead("winner, x", "Winner")).toBe("x");
  });
  it("ignores leading whitespace in the text", () => {
    expect(withoutLead("  Speaker , JakWeb", "Speaker")).toBe("JakWeb");
  });
  it("strips an institution lead from an education note", () => {
    expect(withoutLead("Institut Teknologi Nusantara, GPA 3.71 / 4.00", "Institut Teknologi Nusantara")).toBe("GPA 3.71 / 4.00");
  });
  it("returns an empty string when the lead is the whole text", () => {
    expect(withoutLead("Winner", "Winner")).toBe("");
    expect(withoutLead("**Winner**", "Winner")).toBe("");
  });
  it("leaves text without a , or : separator alone", () => {
    expect(withoutLead("Speaker at JakWeb", "Speaker")).toBe("Speaker at JakWeb");
  });
  it("does not match the start of a longer word", () => {
    expect(withoutLead("Hosting Open Source Saturday", "Host")).toBe("Hosting Open Source Saturday");
    expect(withoutLead("Hosting, x", "Host")).toBe("Hosting, x");
  });
  it("leaves text alone when it does not start with the lead", () => {
    expect(withoutLead("Nusantara Code Cup", "Winner")).toBe("Nusantara Code Cup");
  });
  it("escapes regex characters in the lead", () => {
    expect(withoutLead("C++ (beta), notes", "C++ (beta)")).toBe("notes");
  });
  it("handles empty text and an empty lead", () => {
    expect(withoutLead("", "Winner")).toBe("");
    expect(withoutLead("Winner, x", "")).toBe("Winner, x");
    expect(withoutLead("Winner, x", "   ")).toBe("Winner, x");
  });
});
