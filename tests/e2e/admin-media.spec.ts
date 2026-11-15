import { expect, test } from "@playwright/test";
import { signIn } from "./admin-helpers";

// Images are uploaded inside the forms that use them; there is no separate library page.

test("an image uploaded in a project form is stored with resized copies and its alt text", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Kanbo", exact: true }).click();
  await page.getByLabel("Screenshot 2: upload an image").setInputFiles("mockup/assets/screens/ledgerly-invoice.png");
  await expect(page.getByText("ledgerly-invoice.png is uploaded when you save.")).toBeVisible();
  await page.locator("#f-shot2Id-alt").fill("Invoice detail uploaded in e2e");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const preview = page.locator(".adm-image", { has: page.locator("#f-shot2Id") }).locator(".adm-image-preview img");
  await expect(preview).toHaveAttribute("src", /^\/media\/screens\/[0-9a-f]{12}-480\.webp$/);
  await expect(page.locator("#f-shot2Id-alt")).toHaveValue("Invoice detail uploaded in e2e");

  // Any form can reuse it.
  await page.goto("/admin/achievements/new");
  await expect(page.locator("#f-photoId").locator("option", { hasText: "Invoice detail uploaded in e2e" })).toHaveCount(1);

  // Removing it from the project drops the unused image again, leaving the shared e2e data as seeded.
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Kanbo", exact: true }).click();
  await page.locator(".adm-image", { has: page.locator("#f-shot2Id") }).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.goto("/admin/achievements/new");
  await expect(page.locator("#f-photoId").locator("option", { hasText: "Invoice detail uploaded in e2e" })).toHaveCount(0);
});

test("a file that is not an image is refused next to its field", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Kanbo", exact: true }).click();
  await page.getByLabel("Screenshot 3: upload an image").setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("#f-shot3Id-error")).toHaveText("That file is not an image.");
});
