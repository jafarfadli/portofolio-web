import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("every agenda row is reachable by Tab and shows its focus state", async ({ page }) => {
  await page.goto("/");
  const rows = page.locator("[data-agenda] .row");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  // Start just before the list: the section heading, made focusable for the test only.
  await page.locator("#act-h").evaluate((el) => {
    el.setAttribute("tabindex", "-1");
    (el as HTMLElement).focus();
  });
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    await expect(rows.nth(i)).toBeFocused();
    const shift = await rows.nth(i).locator(".title").evaluate((el) => getComputedStyle(el).transform);
    expect(shift).not.toBe("none");
  }
});
