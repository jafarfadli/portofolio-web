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

test("achievement fan opens on the winner and steps with buttons and arrow keys", async ({ page }) => {
  await page.goto("/");
  await page.locator("#achievements").scrollIntoViewIfNeeded();
  const caption = page.locator("[data-fan-caption]");
  await expect(caption).toContainText("Winner, Nusantara Code Cup 2024");
  await page.getByRole("button", { name: "Next achievement" }).click();
  await expect(caption).toContainText("AWS Certified Developer");
  await page.keyboard.press("ArrowLeft");
  await expect(caption).toContainText("Winner, Nusantara Code Cup 2024");
});

test("stepping to the end of the fan keeps keyboard focus on a live button", async ({ page }) => {
  await page.goto("/");
  await page.locator("#achievements").scrollIntoViewIfNeeded();
  const next = page.getByRole("button", { name: "Next achievement" });
  await expect(page.locator("[data-fan-caption]")).toContainText("Winner, Nusantara Code Cup 2024");
  while (await next.isEnabled()) await next.click();
  await expect(next).toBeDisabled();
  await expect(page.getByRole("button", { name: "Previous achievement" })).toBeFocused();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders final states without waiting for scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", "none");
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin").first()).toHaveCSS("opacity", "1");
    // These only hold when the island ran: no Lenis under reduced motion, and the fan caption is set by JS.
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await page.locator("#achievements").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-fan-caption]")).toContainText("Winner, Nusantara Code Cup 2024");
    await expect(page.locator('.fan-item[aria-current="true"]')).toHaveCSS("opacity", "1");
  });
});
