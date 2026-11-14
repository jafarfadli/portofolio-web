import { expect, test } from "@playwright/test";

test("CV lists sections in order, ranks achievements, and prints to one A4 page", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator(".cv-sec h2")).toHaveText([
    "Summary", "Experience", "Selected projects", "Achievements", "Activities", "Education", "Skills",
  ]);
  await expect(page.locator(".cv-sheet h1")).toHaveText("Muhammad Jafar Fadli");
  const achievements = page.locator(".cv-sec", { has: page.locator("h2", { hasText: "Achievements" }) });
  await expect(achievements.locator("li").first()).toContainText(/Winner\s+Nusantara Code Cup/);
  await expect(page.locator(".cv-sheet")).not.toContainText("DevDays");

  // Global site.css rules (.role pill, .back badge face) must not leak into the CV.
  await expect(page.locator(".cv-head .cv-role")).toHaveCSS("text-transform", "none");
  await expect(page.locator(".cv-bar .cv-back")).toHaveCSS("transform", "none");

  await expect(page.locator(".cv-photo img")).toHaveAttribute("alt", "Portrait of Muhammad Jafar Fadli");
  // The cut-out is 31mm tall (117px at 96dpi); the owner rejected the larger 34mm version.
  const h = await page.locator(".cv-photo").evaluate((el) => el.getBoundingClientRect().height);
  expect(h).toBeGreaterThan(112);
  expect(h).toBeLessThan(122);
  await expect(page.locator(".cv-sheet .tag-cut").first()).toHaveText("Winner");
  // Literal spaces between chips keep the printed text readable for ATS.
  expect(await page.locator(".cv-sheet").innerText()).toContain("Next.js Go PostgreSQL Midtrans");

  // One fixed tag column: the text cell starts at the same x in Achievements and Activities.
  const textLeft = (name: string) =>
    page.locator(".cv-sec", { has: page.locator("h2", { hasText: name }) }).locator(".cv-lines li > span:nth-child(2)").first()
      .evaluate((el) => el.getBoundingClientRect().left);
  expect(Math.abs((await textLeft("Achievements")) - (await textLeft("Activities")))).toBeLessThanOrEqual(1);

  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBe(1);
});
