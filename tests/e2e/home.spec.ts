import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("home renders every section from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Jafar\s+Fadli/);
  // the hero: the headline, three project stickers and the badge; no buttons (owner, 2026-11-18)
  await expect(page.locator("[data-stickers] .slot-li")).toHaveCount(3);
  await expect(page.locator(".hero .hero-actions")).toHaveCount(0);
  await expect(page.locator("[data-hero-log]")).toContainText("Built live by AI agents");
  await expect(page.locator("article.project")).toHaveCount(4);
  await expect(page.locator("article.project").first()).toContainText("Ledgerly");
  await expect(page.locator(".pin").first()).toContainText("(sample)");
  await expect(page.locator(".reel .ach:not(.is-clone)")).toHaveCount(5);
  await expect(page.locator(".reel .ach.is-clone")).toHaveCount(5);
  await expect(page.locator(".reel .ach.is-clone").first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".reel .ach:not(.is-clone) h3").first()).toHaveText("Nusantara Code Cup");
  await expect(page.locator(".badge-photo")).toHaveAttribute("alt", "Portrait of Muhammad Jafar Fadli in a navy suit");
  await expect(page.locator(".badge-head")).toContainText("jafarfadli.example");
  await expect(page.locator("section.theme-dark, section.theme-light")).toHaveCount(7);
  await expect(page.locator(".hw-ring, .hw-tab, .hw-clasp")).toHaveCount(3);
  await expect(page.locator("[data-agenda] .row")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Experience and education" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's talk." })).toBeVisible();
  await expect(page.locator(".qr img")).toHaveAttribute("src", /^data:image\/svg\+xml/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "Person", name: "Muhammad Jafar Fadli", jobTitle: "Full-stack Engineer" });
});

test("owner copy renders icon stickers, statement lines and the closing wave", async ({ page }) => {
  await page.goto("/");
  const lede = page.locator("[data-lede]");
  await expect(lede.locator(".line")).toHaveCount(4);
  await expect(lede.locator(".line > span")).toHaveCount(4);
  await expect(lede.locator(".ico-stk")).toHaveCount(3);
  // one turn of tilts runs across the whole statement, as in the mockup: it does not restart on each line
  const tilts = await lede.locator(".ico-stk").evaluateAll((els) => els.map((e) => (e as HTMLElement).style.getPropertyValue("--r")));
  expect(tilts).toEqual(["-7deg", "5deg", "-4deg"]);
  // textContent, untrimmed: the no-break space before each icon must be there (the icon itself has no text), so each
  // icon reads as a gap before its punctuation, and a lost one fails here.
  const lines = (await lede.locator(".line").allTextContents()).map((t) => t.replace(/\u00a0/g, " "));
  expect(lines).toEqual(["Web products ,", "end to end.", "From schema ", "to pixel ."]);
  for (const svg of await page.locator(".ico-stk svg").all()) {
    await expect(svg).toHaveAttribute("aria-hidden", "true");
  }
  await expect(page.locator(".about-text .ico-stk")).toHaveCount(4);
  await expect(page.locator("#contact-h .ico-stk.is-wave")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Let's talk.", exact: true })).toHaveCount(1);
});

test("the headline is a poster: tall, black, outline and black lines, each set to the column's width", async ({ page }) => {
  await page.goto("/");
  const lede = page.locator("[data-lede]");
  await expect(lede.locator(".line").nth(0)).toHaveClass(/is-tall/);
  await expect(lede.locator(".line").nth(2)).toHaveClass(/is-outline/);
  await page.evaluate(() => document.fonts.ready);
  // no line runs past the column (it would be clipped), and none is left at the size it had before the fit
  const fit = await lede.evaluate((p) => ({ w: p.clientWidth, lines: [...p.querySelectorAll<HTMLElement>("[data-fit-line]")].map((l) => [l.offsetWidth, l.style.fontSize]) }));
  for (const [w, size] of fit.lines) {
    expect(w as number).toBeLessThanOrEqual(fit.w + 1);
    expect(w as number).toBeGreaterThan(fit.w * 0.5);
    expect(size).toMatch(/px$/);
  }
});

test("the skill chips are set in mixed print, no two alike side by side", async ({ page }) => {
  await page.goto("/");
  const chips = page.locator("[data-chips] .chip");
  const looks = await chips.evaluateAll((els) => els.map((e) => [...e.classList].find((c) => /^is-(ink|line|dot|navy|thin|caps|sticker)$/.test(c))));
  expect(looks.every(Boolean)).toBe(true);
  for (let i = 1; i < looks.length; i++) expect(looks[i]).not.toBe(looks[i - 1]);
});

test("copy has no em or en dashes", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/[–—]/);
});
