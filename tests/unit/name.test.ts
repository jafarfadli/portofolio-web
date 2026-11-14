import { describe, expect, it } from "vitest";
import { fullName } from "@/lib/name";

describe("fullName", () => {
  it("uses the full name when set", () => {
    expect(fullName({ fullName: "Muhammad Jafar Fadli", firstName: "Jafar", lastName: "Fadli" })).toBe("Muhammad Jafar Fadli");
  });
  it("falls back to first and last name when empty or blank", () => {
    expect(fullName({ fullName: null, firstName: "Jafar", lastName: "Fadli" })).toBe("Jafar Fadli");
    expect(fullName({ fullName: "  ", firstName: "Jafar", lastName: "Fadli" })).toBe("Jafar Fadli");
  });
});
