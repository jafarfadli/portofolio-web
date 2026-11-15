import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { signIn } from "./admin-helpers";

/** A phone-sized photo of noise, which JPEG cannot squeeze: about 7 MB, so four of them pass the server cap. */
async function bigPhoto(seed: number) {
  const w = 4032, h = 3024;
  const px = Buffer.alloc(w * h * 3);
  let x = seed * 2654435761;
  for (let i = 0; i < px.length; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    px[i] = x >>> 24;
  }
  return sharp(px, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

// Images are uploaded inside the forms that use them; there is no separate library page.

test("an image uploaded in a project form is stored with resized copies and its alt text", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Kanbo", exact: true }).click();
  await page.getByLabel("Screenshot 2: upload an image").setInputFiles("mockup/assets/screens/ledgerly-invoice.png");
  await expect(page.getByText(/^ledgerly-invoice\.png \(\d+ KB\) is uploaded when you save\.$/)).toBeVisible();
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

test("a new achievement with four phone photos saves: the browser scales each one down first", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await page.goto("/admin/achievements/new");
  await page.getByLabel("Award", { exact: true }).fill("Finalist");
  await page.getByLabel("Competition", { exact: true }).fill("Photo Heavy Cup");
  await page.getByLabel("Year", { exact: true }).fill("2026");
  const fields = ["Photo", "Photo 2", "Photo 3", "Photo 4"];
  let sent = 0;
  for (const [i, label] of fields.entries()) {
    const buffer = await bigPhoto(i + 1);
    sent += buffer.length;
    await page.getByLabel(`${label}: upload an image`).setInputFiles({ name: `IMG_000${i}.jpg`, mimeType: "image/jpeg", buffer });
    await expect(page.getByText(new RegExp(`^IMG_000${i}\\.jpg \\([\\d.]+ MB\\) is uploaded when you save\\.$`))).toBeVisible();
  }
  expect(sent).toBeGreaterThan(16 * 1024 * 1024); // more than the old cap that broke this save
  const total = await page.locator('input[type="file"]').evaluateAll((inputs) =>
    (inputs as HTMLInputElement[]).reduce((n, el) => n + [...(el.files ?? [])].reduce((m, f) => m + f.size, 0), 0));
  expect(total).toBeLessThan(sent / 2);

  await page.getByRole("button", { name: "Add achievement" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  for (const id of ["photoId", "photo2Id", "photo3Id", "photo4Id"]) {
    await expect(page.locator(".adm-image", { has: page.locator(`#f-${id}`) }).locator(".adm-image-preview img"))
      .toHaveAttribute("src", /^\/media\/photos\/[0-9a-f]{12}-480\.webp$/);
  }

  // Leave the shared e2e data as seeded: deleting it drops its photos too.
  await page.getByText(/^Delete this achievement/).click();
  await page.getByRole("button", { name: "Delete for good" }).click();
  await expect(page.getByRole("link", { name: "Photo Heavy Cup" })).toHaveCount(0);
});

test("a save too big to send is stopped in the browser with a message", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/achievements/new");
  // Small enough to skip scaling but the browser cannot read it, so it goes as picked: 37 MB of it.
  await page.getByLabel("Photo: upload an image").setInputFiles({ name: "huge.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(37 * 1024 * 1024) });
  await expect(page.getByText(/^huge\.jpg \(37\.0 MB\) is uploaded when you save\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Add achievement" }).click();
  await expect(page.getByRole("status")).toHaveText(/^The new images add up to 37\.0 MB, more than one save can carry/);
});
