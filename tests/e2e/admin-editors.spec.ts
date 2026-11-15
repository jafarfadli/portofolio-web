import { expect, test } from "@playwright/test";
import { PUBLIC, signIn } from "./admin-helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("a saved project headline shows on the public site at once", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Ledgerly", exact: true }).click();
  const headline = page.getByLabel("One-line pitch");
  const original = await headline.inputValue();

  await headline.fill("**Ledgerly** gets small shops paid sooner, edited in e2e.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const pub = await page.context().newPage();
  await pub.goto(`${PUBLIC}/`);
  await expect(pub.getByRole("heading", { name: /edited in e2e/ })).toBeVisible();

  await headline.fill(original); // leave the shared e2e data as seeded
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await pub.reload();
  await expect(pub.getByRole("heading", { name: /edited in e2e/ })).toHaveCount(0);
  await expect(pub.getByRole("heading", { name: original.replaceAll("**", "") })).toBeVisible();
});

test("with no badge or CV photo the public pages fall back to the plain layouts", async ({ page }) => {
  await page.goto("/admin/profile");
  await page.locator(".adm-more > summary").click(); // the CV photo lives in the closed group
  const badge = page.locator("#f-photoId");
  const cvPhoto = page.locator("#f-cvPhotoId");
  const save = async () => {
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
  };

  try {
    // Removing an image nothing else uses deletes it, so the photos are uploaded again afterwards.
    await badge.selectOption("");
    await cvPhoto.selectOption("");
    await save();

    const pub = await page.context().newPage();
    await pub.goto(`${PUBLIC}/`);
    await expect(pub.locator(".badge-id.no-photo")).toHaveCount(1);
    await expect(pub.locator(".badge-photo")).toHaveCount(0);
    await pub.goto(`${PUBLIC}/cv`);
    await expect(pub.locator(".cv-head.cv-head-solo")).toHaveCount(1);
    await expect(pub.locator(".cv-photo")).toHaveCount(0);
    await expect(pub.locator(".cv-sheet img")).toHaveCount(0);
    await pub.close();
  } finally {
    // Leave the shared e2e data with both photos again.
    await page.getByLabel("Badge photo: upload an image").setInputFiles("mockup/assets/photos/owner-badge.jpg");
    await page.locator("#f-photoId-alt").fill("Portrait of Muhammad Jafar Fadli in a navy suit");
    await page.getByLabel("CV photo: upload an image").setInputFiles("mockup/assets/photos/owner-cutout.png");
    await page.locator("#f-cvPhotoId-alt").fill("Portrait of Muhammad Jafar Fadli");
    await save();
  }
  const back = await page.context().newPage();
  await back.goto(`${PUBLIC}/`);
  await expect(back.locator(".badge-photo")).toHaveCount(1);
  await back.goto(`${PUBLIC}/cv`);
  await expect(back.locator(".cv-photo img")).toHaveCount(1);
});

test("a changed select keeps its value after saving, and the next save does not revert it", async ({ page }) => {
  await page.goto("/admin/achievements");
  await page.locator(".adm-title").first().click();
  const rank = page.getByLabel("Tag shape");
  const ribbon = page.getByLabel("Award", { exact: true });
  const originalRank = await rank.inputValue();
  const originalRibbon = await ribbon.inputValue();
  const changed = originalRank === "finalist" ? "award" : "finalist";

  await rank.selectOption(changed);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await expect(rank).toHaveValue(changed);

  await ribbon.fill(`${originalRibbon} e2e`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.getByLabel("Tag shape")).toHaveValue(changed);

  // Leave the shared e2e data as seeded.
  await page.getByLabel("Tag shape").selectOption(originalRank);
  await page.getByLabel("Award", { exact: true }).fill(originalRibbon);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.getByLabel("Tag shape")).toHaveValue(originalRank);
  await expect(page.getByLabel("Award", { exact: true })).toHaveValue(originalRibbon);
});

test("invalid input is refused next to its field and kept for fixing", async ({ page }) => {
  await page.goto("/admin/achievements/new");
  const title = page.getByLabel("Competition", { exact: true });
  await title.fill("Best app \u2014 2026");
  await page.getByRole("button", { name: "Add achievement" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Fix \d+ fields? below\.$/);
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveValue("Best app \u2014 2026");
  await expect(page.locator("#f-title-error")).toHaveText("Use a comma, colon or full stop instead of a long dash.");
});

test("hiding an activity removes it from the public agenda; order buttons reorder", async ({ page }) => {
  const pub = await page.context().newPage();
  await pub.goto(`${PUBLIC}/`);
  const agendaRows = pub.locator("[data-agenda] .row");
  const before = await agendaRows.count();

  await page.goto("/admin/activities");
  const rows = page.locator("tbody tr");
  const onSite = () => rows.first().getByRole("button", { name: /^On site/ });
  await onSite().click();
  await expect(onSite()).toHaveAttribute("aria-pressed", "false");
  await pub.reload();
  await expect(agendaRows).toHaveCount(before - 1);
  await onSite().click();
  await expect(onSite()).toHaveAttribute("aria-pressed", "true");

  const titles = page.locator("tbody tr .adm-title");
  const [first, second] = await titles.allTextContents();
  await rows.nth(1).getByRole("button", { name: `Move ${second} up` }).click();
  await expect(titles.first()).toHaveText(second);
  await rows.first().getByRole("button", { name: `Move ${second} down` }).click();
  await expect(titles.first()).toHaveText(first);
});

test("the profile saves and the list pages link to every editor", async ({ page }) => {
  await page.goto("/admin/profile");
  await expect(page.getByLabel("First name")).toHaveValue("Jafar");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  for (const [href, heading] of [
    ["/admin/projects", "Projects"], ["/admin/achievements", "Achievements"], ["/admin/activities", "Activities"],
    ["/admin/experiences", "Experience"], ["/admin/education", "Education"], ["/admin/skills", "Skills"],
  ] as const) {
    await page.goto(href);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
  expect((await page.request.get("/admin/nonsense")).status()).toBe(404);
});

test("the session cookie rolls on page loads but not on a POST", async ({ page }) => {
  const cookieHeaders = async (res: { headersArray(): { name: string; value: string }[] }) =>
    res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("pf_admin=")).map((h) => h.value);
  const get = await cookieHeaders(await page.request.get("/admin"));
  expect(get).toHaveLength(1);
  expect(get[0]).toMatch(/HttpOnly/i);
  expect(get[0]).toMatch(/SameSite=strict/i);
  const expires = Date.parse(/Expires=([^;]+)/i.exec(get[0])![1]);
  expect(expires).toBeGreaterThan(Date.now() + 13 * 86_400_000);
  const post = await cookieHeaders(await page.request.post("/admin/nonsense"));
  expect(post).toHaveLength(0);
});
