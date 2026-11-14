import { test } from "@playwright/test";

test.skip(!process.env.VISUAL, "Set VISUAL=1 to write comparison captures");
test.use({ reducedMotion: "reduce" });

test("desktop full page", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/visual/desktop-full.png", fullPage: true });
});

test("mobile full page", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await page.screenshot({ path: "test-results/visual/mobile-full.png", fullPage: true });
  await ctx.close();
});

test("cv", async ({ page }) => {
  await page.goto("/cv");
  await page.screenshot({ path: "test-results/visual/cv.png", fullPage: true });
});
