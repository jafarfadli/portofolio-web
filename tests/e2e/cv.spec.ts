import { expect, test } from "@playwright/test";

test("CV lists sections in order, ranks achievements, and prints to one A4 page", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator(".cv-sec h2")).toHaveText([
    "Summary", "Experience", "Selected projects", "Achievements", "Activities", "Education", "Skills",
  ]);
  await expect(page.locator(".cv-sheet h1")).toHaveText("Dimas Arkana");
  const achievements = page.locator(".cv-sec", { has: page.locator("h2", { hasText: "Achievements" }) });
  await expect(achievements.locator("li").first()).toContainText("Winner, Nusantara Code Cup");
  await expect(page.locator(".cv-sheet")).not.toContainText("DevDays");

  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBe(1);
});
