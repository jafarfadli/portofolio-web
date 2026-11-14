import { expect, test } from "@playwright/test";

test("flip turns the badge to the CV side and back, moving focus", async ({ page }) => {
  await page.goto("/");
  const badge = page.locator("[data-badge]");
  await page.getByRole("button", { name: "Flip badge to see CV and contact" }).click();
  await expect(badge).toHaveClass(/is-flipped/);
  await expect(page.locator('[data-face="back"]')).not.toHaveAttribute("inert");
  await expect(page.locator('[data-face="front"]')).toHaveAttribute("inert");
  await expect(page.getByRole("button", { name: "Flip badge back to the front" })).toBeFocused();
  await page.getByRole("button", { name: "Flip badge back to the front" }).click();
  await expect(badge).not.toHaveClass(/is-flipped/);
});

test("achievements reel runs and the button pauses it", async ({ page }) => {
  await page.goto("/");
  const reel = page.locator("[data-reel]");
  const track = page.locator("[data-reel-track]");
  await reel.scrollIntoViewIfNeeded();
  await expect(track).toHaveCSS("animation-name", "reel");
  // The pace is measured by the island from the track's width: about 38px a second.
  await expect.poll(() => track.evaluate((el) => el.style.getPropertyValue("--reel-dur"))).toMatch(/^[1-9]\d*s$/);
  await page.getByRole("button", { name: "Pause the achievements" }).click();
  await expect(reel).toHaveClass(/is-paused/);
  await expect(track).toHaveCSS("animation-play-state", "paused");
  const play = page.getByRole("button", { name: "Play the achievements" });
  await expect(play).toBeVisible();
  await play.click();
  await expect(reel).not.toHaveClass(/is-paused/);
  await expect(track).toHaveCSS("animation-play-state", "running");
  await expect(page.getByRole("button", { name: "Pause the achievements" })).toBeVisible();
});

test("entrance releases the pre-paint hold and ends with the hero visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
  await expect(page.locator(".lede .line > span").first()).toBeVisible();
  await expect(page.locator("[data-badge]")).toBeVisible();
  // GSAP settles on the identity matrix rather than "none".
  await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await expect(page.locator("[data-nav]")).toHaveCSS("opacity", "1");
});

test("the CV page never gets the entrance hold", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders final states without waiting for scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", "none");
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin").first()).toHaveCSS("opacity", "1");
    // The last of these only holds when the island ran: no Lenis under reduced motion, and the reel's tabindex is set by JS.
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await page.locator("#achievements").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-reel-track]")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".ach.is-clone")).toHaveCount(5);
    await expect(page.locator(".ach.is-clone:visible")).toHaveCount(0);
    await expect(page.locator("[data-reel]")).toHaveAttribute("tabindex", "0");
  });
});
