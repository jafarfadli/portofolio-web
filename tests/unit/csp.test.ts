import { describe, expect, it } from "vitest";
import { buildCsp, newNonce } from "@/lib/csp";

describe("buildCsp", () => {
  it("allows scripts only by nonce in production", () => {
    const csp = buildCsp("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp.split("script-src")[1].split(";")[0]).not.toContain("unsafe-inline");
  });
  it("adds unsafe-eval for next dev only", () => {
    expect(buildCsp("n", true)).toContain("'strict-dynamic' 'unsafe-eval'");
  });
});

describe("newNonce", () => {
  it("is fresh base64 every call", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(newNonce()).not.toBe(a);
  });
});
