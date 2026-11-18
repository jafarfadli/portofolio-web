import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { sessionStorage.setItem("swarm-built", "1"); } catch { /* storage blocked */ }
  });
});

test("a published article opens with its question and shows its four parts in order", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  await expect(page).toHaveTitle(/^Ledgerly: What if a shop could send an invoice/);
  // the h1's text also holds the marquee's aria-hidden copies, so check the name it is read out with
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ledgerly");
  await expect(page.locator(".art-q")).toContainText("get paid before the week was out");
  await expect(page.locator(".art-q em")).toHaveText("get paid before the week was out?");
  await expect(page.locator("main h2")).toHaveText(["Problem (01)", "Approach (02)", "Architecture (03)", "Results (04)"]);
  await expect(page.locator(".art-facts")).toContainText("Solo, design to deploy");
  await expect(page.locator(".art-stats li").first()).toContainText("(sample)");
  await expect(page.getByRole("link", { name: "All work" })).toHaveAttribute("href", "/#work");
  // only one article is published in the seed, so there is no next project
  await expect(page.locator(".art-next")).toHaveCount(0);
});

test("a draft and an unknown slug are not found", async ({ page }) => {
  for (const path of ["/projects/kanbo", "/projects/nope"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
  }
});

test("a scenario step lights its parts and dims the rest", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  // the first step of the first scenario is on at load
  await expect(node(page, "customer")).toHaveClass(/is-lit/);
  await expect(node(page, "worker")).toHaveClass(/is-dim/);
  await page.getByRole("tab", { name: /A reminder goes out/ }).click();
  await expect(page.getByRole("tab", { name: /A reminder goes out/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /sends each one through the WhatsApp API/ }).click();
  await expect(node(page, "wa")).toHaveClass(/is-lit/);
  await expect(node(page, "customer")).toHaveClass(/is-dim/);
  // pressing the lit step again turns everything back on
  await page.getByRole("button", { name: /sends each one through the WhatsApp API/ }).click();
  await expect(node(page, "customer")).not.toHaveClass(/is-dim|is-lit/);
});

test("the scenario tabs move with the arrow keys", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(node(page, "worker")).toHaveClass(/is-lit/);
});

test("hovering a part lights its wires", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  await page.getByRole("button", { name: /The customer opens the link/ }).click(); // turn the step off
  await node(page, "db").hover();
  await expect(node(page, "worker")).toHaveClass(/is-lit/);
  await expect(node(page, "owner")).toHaveClass(/is-dim/);
  await expect(page.locator(".arch-wires path.is-lit")).toHaveCount(2); // api>db and worker>db
});

test("on a phone the article has no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects/ledgerly");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("only a card whose article is published says Read the story", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#p-ledgerly").getByRole("link", { name: "Read the story" })).toHaveAttribute("href", "/projects/ledgerly");
  await expect(page.locator("#p-kanbo").getByRole("link", { name: "Read the story" })).toHaveCount(0);
  await page.locator("#p-ledgerly").getByRole("link", { name: "Read the story" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ledgerly");
});

function node(page: import("@playwright/test").Page, id: string) {
  return page.locator(`.arch-node[data-node="${id}"]`);
}
