import { describe, expect, it } from "vitest";
import { adminIdentityOk, guardAdminRequest, isAdminPath, sameOrigin } from "@/lib/admin-guard";

const base = { login: "Owner@Example.com", expectedLogin: "owner@example.com", dev: false };

describe("isAdminPath", () => {
  it("matches /admin and below only", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/projects/3")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/")).toBe(false);
  });
});

describe("adminIdentityOk", () => {
  it("accepts the owner's login, case-insensitively", () => {
    expect(adminIdentityOk(base)).toBe(true);
  });
  it("fails closed without a configured login or with a different one", () => {
    expect(adminIdentityOk({ ...base, expectedLogin: undefined })).toBe(false);
    expect(adminIdentityOk({ ...base, expectedLogin: " " })).toBe(false);
    expect(adminIdentityOk({ ...base, login: null })).toBe(false);
    expect(adminIdentityOk({ ...base, login: "someone@example.com" })).toBe(false);
  });
  it("skips the header check under next dev only", () => {
    expect(adminIdentityOk({ login: null, expectedLogin: undefined, dev: true })).toBe(true);
  });
});

describe("guardAdminRequest", () => {
  it("lets non-admin paths through in every role", () => {
    expect(guardAdminRequest({ ...base, pathname: "/cv", role: "public" })).toBe("pass");
  });
  it("hides the admin in the public role, even with the right identity", () => {
    expect(guardAdminRequest({ ...base, pathname: "/admin", role: "public" })).toBe("not-found");
    expect(guardAdminRequest({ ...base, pathname: "/admin/login", role: "public", dev: true })).toBe("not-found");
  });
  it("needs the owner's identity in the admin role", () => {
    expect(guardAdminRequest({ ...base, pathname: "/admin", role: "admin" })).toBe("pass");
    expect(guardAdminRequest({ ...base, pathname: "/admin", role: "admin", login: "x@y.z" })).toBe("not-found");
  });
});

describe("sameOrigin", () => {
  it("compares the Origin host to the request host", () => {
    expect(sameOrigin("https://mini.tail1234.ts.net:8443", "mini.tail1234.ts.net:8443")).toBe(true);
    expect(sameOrigin("http://127.0.0.1:3101", "127.0.0.1:3101")).toBe(true);
    expect(sameOrigin("https://evil.example", "mini.tail1234.ts.net:8443")).toBe(false);
  });
  it("refuses a missing or malformed Origin", () => {
    expect(sameOrigin(null, "127.0.0.1:3101")).toBe(false);
    expect(sameOrigin("not a url", "127.0.0.1:3101")).toBe(false);
    expect(sameOrigin("http://127.0.0.1:3101", null)).toBe(false);
  });
});
