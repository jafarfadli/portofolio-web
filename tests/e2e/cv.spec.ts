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

test("on a phone the whole CV sheet fits the screen, with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cv");
  const sheet = page.locator(".cv-sheet");
  await expect.poll(() => sheet.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(390 - 20);
  const box = await sheet.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; });
  expect(box.left).toBeGreaterThanOrEqual(8);
  expect(box.right).toBeLessThanOrEqual(390 - 8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // the sheet keeps its print layout, only smaller: still one A4 page when printed
  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(1);
});
