import { expect, test } from "@playwright/test";
import { signIn } from "./admin-helpers";

test("an uploaded screenshot gets resized copies and appears in the project picker", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/media");
  await page.getByLabel("Image", { exact: true }).setInputFiles("mockup/assets/screens/ledgerly-invoice.png");
  await page.getByLabel("Kind").selectOption("screenshot");
  await page.getByLabel("Alt text", { exact: true }).fill("Invoice detail uploaded in e2e");
  await page.getByRole("button", { name: "Upload" }).click();
  // A reused server already holds this image (same content hash), so the second run reports it instead.
  await expect(page.locator("#upload-status")).toHaveText(
    /^(Uploaded\.|That image is already in the library\. Edit its alt text below\.)$/,
  );

  const thumb = page.getByAltText("Invoice detail uploaded in e2e");
  await expect(thumb).toBeVisible();
  await expect(thumb).toHaveAttribute("src", /^\/media\/screens\/[0-9a-f]{12}-480\.webp$/);

  await page.goto("/admin/projects/new");
  await expect(page.getByLabel("Screenshot").locator("option", { hasText: "Invoice detail uploaded in e2e" })).toHaveCount(1);
});

test("a file that is not an image is refused, and the kind and alt text you chose stay", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/media");
  await page.getByLabel("Image", { exact: true }).setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await page.getByLabel("Kind").selectOption("photo");
  await page.getByLabel("Alt text", { exact: true }).fill("Kept after the error");
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.locator("#upload-status")).toHaveText("That file is not an image.");
  await expect(page.getByLabel("Kind")).toHaveValue("photo");
  await expect(page.getByLabel("Alt text", { exact: true })).toHaveValue("Kept after the error");
});

test("a refused alt text stays typed in the library row", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/media");
  const alt = page.locator('input[id^="alt-"]').first();
  const original = await alt.inputValue();
  const typed = "Too fancy \u2014 refused";
  await alt.fill(typed);
  await page.getByRole("button", { name: /^Save alt text/ }).first().click();
  await expect(page.getByRole("status").filter({ hasText: /long dash/ })).toHaveCount(1);
  await expect(page.locator('input[id^="alt-"]').first()).toHaveValue(typed);
  await page.reload();
  await expect(page.locator('input[id^="alt-"]').first()).toHaveValue(original);
});
