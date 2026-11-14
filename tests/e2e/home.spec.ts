import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("home renders every section from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Dimas\s*Arkana/);
  await expect(page.locator("[data-stickers] .slot-li")).toHaveCount(5);
  await expect(page.locator("article.project")).toHaveCount(4);
  await expect(page.locator("article.project").first()).toContainText("Ledgerly");
  await expect(page.locator(".pin").first()).toContainText("(sample)");
  await expect(page.locator(".fan-item")).toHaveCount(5);
  await expect(page.locator("[data-agenda] .row")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Experience and education" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's talk." })).toBeVisible();
  await expect(page.locator(".qr img")).toHaveAttribute("src", /^data:image\/svg\+xml/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "Person", name: "Dimas Arkana", jobTitle: "Full-stack Engineer" });
});

test("copy has no em or en dashes", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/[–—]/);
});
