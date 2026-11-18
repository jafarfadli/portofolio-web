import { expect, test } from "@playwright/test";
import { PUBLIC, signIn } from "./admin-helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("an edited article word shows on the public page, and a draft goes live when published", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Ledgerly", exact: true }).click();
  const hook = page.getByLabel("Opening question");
  const original = await hook.inputValue();
  await hook.fill(`${original} Edited in e2e.`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const pub = await page.context().newPage();
  await pub.goto(`${PUBLIC}/projects/ledgerly`);
  await expect(pub.locator(".art-q")).toContainText("Edited in e2e.");

  await hook.fill(original); // leave the shared e2e data as seeded
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  // Kanbo's article is a draft: the preview shows it, the public page does not, until it is published
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Kanbo", exact: true }).click();
  const preview = await page.context().newPage();
  await preview.goto(await page.getByRole("link", { name: "Preview article" }).getAttribute("href") as string);
  await expect(preview.locator(".art-q")).toContainText("see each other think");
  expect((await pub.goto(`${PUBLIC}/projects/kanbo`))!.status()).toBe(404);

  await page.getByLabel("Publish the article").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  expect((await pub.goto(`${PUBLIC}/projects/kanbo`))!.status()).toBe(200);
  await pub.goto(`${PUBLIC}/projects/ledgerly`);
  await expect(pub.locator(".art-next")).toHaveAttribute("href", "/projects/kanbo");

  await page.getByLabel("Publish the article").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
});

test("publishing a project without an article is refused", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Rute", exact: true }).click();
  await page.getByLabel("Publish the article").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Import or write the article before publishing it.")).toBeVisible();
});
