import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signIn } from "./admin-helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const width of [1440, 390]) {
  test(`editor pages have no WCAG A or AA violations at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    await page.goto("/admin/projects");
    const ledgerly = await page.getByRole("link", { name: "Ledgerly", exact: true }).getAttribute("href");
    for (const path of ["/admin", "/admin/projects", ledgerly!, "/admin/achievements/new", "/admin/profile"]) {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations.map((v) => `${path} ${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    }
  });
}
