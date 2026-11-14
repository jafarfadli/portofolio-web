import { expect, test } from "@playwright/test";
import { PASSWORD } from "./admin-helpers";

test("the editor answers only to the owner's tailnet identity", async ({ playwright }) => {
  const stranger = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3101",
    extraHTTPHeaders: { "Tailscale-User-Login": "someone@else.test" },
  });
  // Plain fetch: Playwright's request contexts inherit the project's owner header, which would defeat the point.
  expect((await fetch("http://127.0.0.1:3101/admin/login")).status).toBe(404);
  expect((await stranger.get("/admin/login")).status()).toBe(404);
  await stranger.dispose();
});

test("first run sets the password; sign out and sign in work", async ({ page }) => {
  await page.goto("/admin");
  // A reused local server keeps the password from an earlier run; only a fresh database shows setup.
  if (page.url().endsWith("/admin/setup")) {
    await expect(page.getByRole("heading", { name: "Set a password" })).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Repeat password").fill(PASSWORD);
    await page.getByRole("button", { name: "Save password" }).click();
  } else {
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Ledgerly shows a sample metric.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);

  await page.getByLabel("Password", { exact: true }).fill("not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("#auth-error")).toHaveText("That password is not right.");

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("keyboard focus is drawn in ink on the stock sheet", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password", { exact: true }).focus();
  await page.keyboard.press("Tab");
  const button = page.getByRole("button", { name: "Sign in" });
  await expect(button).toBeFocused();
  const color = await button.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(color).toBe("rgb(17, 18, 22)");
});
