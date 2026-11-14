import { expect, type Page } from "@playwright/test";

export const PUBLIC = "http://127.0.0.1:3100";
export const PASSWORD = "e2e owner password 1";

export async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
