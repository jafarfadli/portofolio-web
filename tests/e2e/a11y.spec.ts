import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
test.use({ reducedMotion: "reduce" });

for (const width of [1440, 390]) {
  for (const path of ["/", "/cv", "/projects/ledgerly"]) {
    test(`${path} has no WCAG A or AA violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      if (path.startsWith("/projects/")) {
        // The diagram dims the parts a step does not use, on purpose. Turn the lit step off so nothing is dimmed, then
        // check the whole page, the diagram included.
        await page.locator(".arch-steps button[aria-pressed='true']").click();
        await expect(page.locator(".arch-node.is-dim")).toHaveCount(0);
      }
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });
  }
}
