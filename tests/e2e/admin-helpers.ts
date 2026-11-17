import { expect, type Page } from "@playwright/test";

export const PUBLIC = "http://127.0.0.1:3100";
export const PASSWORD = "e2e owner password 1";

export async function signIn(page: Page) {
  // Public pages these tests open check content, not the agent swarm: treat them as a visit after the first, which
  // shows the page at once instead of having the agents build it.
  await page.context().addInitScript(() => {
    try {
      sessionStorage.setItem("swarm-built", "1");
    } catch {
      /* storage blocked */
    }
  });
  await page.goto("/admin/login");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
