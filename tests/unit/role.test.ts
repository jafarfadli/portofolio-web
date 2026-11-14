import { afterEach, describe, expect, it } from "vitest";
import { isAdminRole, role } from "@/lib/role";

const saved = process.env.ROLE;
afterEach(() => {
  if (saved === undefined) delete process.env.ROLE;
  else process.env.ROLE = saved;
});

describe("role", () => {
  it("is admin only for exactly ROLE=admin", () => {
    process.env.ROLE = "admin";
    expect(role()).toBe("admin");
    expect(isAdminRole()).toBe(true);
  });
  it("fails closed to public for anything else", () => {
    for (const v of [undefined, "", "Admin", "public", "admin "]) {
      if (v === undefined) delete process.env.ROLE;
      else process.env.ROLE = v;
      expect(role()).toBe("public");
    }
  });
});
