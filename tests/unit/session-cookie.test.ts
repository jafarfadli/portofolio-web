import { describe, expect, it } from "vitest";
import { refreshedSessionCookie, SESSION_COOKIE, SESSION_DAYS, sessionCookieOptions } from "@/auth/cookie";

const now = new Date("2026-11-14T10:00:00Z");
const DAY = 86_400_000;

describe("sessionCookieOptions", () => {
  const expires = new Date(now.getTime() + SESSION_DAYS * DAY);
  it("is HttpOnly, SameSite strict, site-wide and Secure in production", () => {
    expect(sessionCookieOptions(expires, "production")).toEqual({
      httpOnly: true, secure: true, sameSite: "strict", path: "/", expires,
    });
  });
  it("drops Secure only under next dev", () => {
    expect(sessionCookieOptions(expires, "development").secure).toBe(false);
    expect(sessionCookieOptions(expires, "test").secure).toBe(true);
    expect(sessionCookieOptions(expires, undefined).secure).toBe(true);
  });
});

describe("refreshedSessionCookie", () => {
  it("re-sets the same token for 14 days from now on GET and HEAD", () => {
    for (const method of ["GET", "HEAD"]) {
      const c = refreshedSessionCookie({ method, token: "tok", now, nodeEnv: "production" });
      expect(c?.name).toBe(SESSION_COOKIE);
      expect(c?.value).toBe("tok");
      expect(c?.options.expires.getTime()).toBe(now.getTime() + 14 * DAY);
      expect(c?.options.secure).toBe(true);
    }
  });
  it("leaves POSTs alone, so sign-out's deletion is never overwritten", () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      expect(refreshedSessionCookie({ method, token: "tok", now })).toBeNull();
    }
  });
  it("does nothing without a cookie", () => {
    expect(refreshedSessionCookie({ method: "GET", token: undefined, now })).toBeNull();
    expect(refreshedSessionCookie({ method: "GET", token: "", now })).toBeNull();
  });
});
