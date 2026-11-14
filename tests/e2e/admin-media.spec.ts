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

test("a file that is not an image is refused", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/media");
  await page.getByLabel("Image", { exact: true }).setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.locator("#upload-status")).toHaveText("That file is not an image.");
});
