import { expect, test } from "@playwright/test";

test("pages carry a nonce CSP and security headers, and run with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  for (const path of ["/", "/cv"]) {
    const res = await page.goto(path);
    const h = res!.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-powered-by"]).toBeUndefined();
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});

test("the public role has no admin area", async ({ request }) => {
  for (const p of ["/admin", "/admin/login", "/admin/projects"]) {
    expect((await request.get(p)).status()).toBe(404);
  }
});

test("health reports the role", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true, role: "public" });
});
