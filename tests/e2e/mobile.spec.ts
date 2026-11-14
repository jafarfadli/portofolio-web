import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("menu opens with section links and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  const sheet = page.locator(".menu-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Work" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
});

test("section headings fit inside a 390px viewport", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Selected work", "Achievements", "Activities", "Experience and education"]) {
    const box = await page.getByRole("heading", { name }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.x + box!.width, name).toBeLessThanOrEqual(390);
  }
});
