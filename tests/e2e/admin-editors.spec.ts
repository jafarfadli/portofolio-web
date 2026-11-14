import { expect, test } from "@playwright/test";
import { PUBLIC, signIn } from "./admin-helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("a saved project headline shows on the public site at once", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Ledgerly", exact: true }).click();
  const headline = page.getByLabel("Impact headline");
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
});

test("invalid input is refused next to its field and kept for fixing", async ({ page }) => {
  await page.goto("/admin/achievements/new");
  const title = page.getByLabel("Title", { exact: true });
  await title.fill("Best app — 2026");
  await page.getByRole("button", { name: "Add achievement" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Fix \d+ fields? below\.$/);
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveValue("Best app — 2026");
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
  await expect(page.getByLabel("First name")).toHaveValue("Dimas");
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
