import { expect, test } from "@playwright/test";

test("a short press turns the badge over and back; there is no flip button", async ({ page }) => {
  await page.goto("/");
  const badge = page.locator("[data-badge]");
  await expect(page.getByRole("button", { name: /flip/i })).toHaveCount(0);
  const name = page.locator(".badge-name");
  await name.click();
  await expect(badge).toHaveClass(/is-flipped/);
  await expect(page.locator('[data-face="back"]')).not.toHaveAttribute("inert");
  await expect(page.locator('[data-face="front"]')).toHaveAttribute("inert");
  await page.locator('[data-face="back"] h2').click();
  await expect(badge).not.toHaveClass(/is-flipped/);
});

test("achievements reel runs without a pause button, hover slows it and each pass turns its photos", async ({ page }) => {
  await page.goto("/");
  const reel = page.locator("[data-reel]");
  const track = page.locator("[data-reel-track]");
  await reel.scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /pause|play/i })).toHaveCount(0);
  await expect(track).toHaveCSS("animation-name", "reel");
  await expect(track).toHaveCSS("animation-play-state", "running");
  // The pace is measured by the island from the track's width: about 38px a second.
  await expect.poll(() => track.evaluate((el) => el.style.getPropertyValue("--reel-dur"))).toMatch(/^[1-9]\d*s$/);
  // Hover eases the running CSS animation down to a stroll (0.25) instead of stopping it; leaving brings it back to 1.
  const rate = () => track.evaluate((el) => el.getAnimations()[0]?.playbackRate);
  await reel.hover();
  await expect.poll(rate).toBeLessThan(0.5);
  await expect(track).toHaveCSS("animation-play-state", "running");
  await page.mouse.move(4, 4);
  await expect.poll(rate).toBe(1);
  // The first pass turns to its next photo 4.8s after load (a 1.2s offset, then every 3.6s).
  const onPhoto = page.locator(".ach:not(.is-clone)").first().locator(".ach-photo.is-on");
  await expect(onPhoto).toHaveCount(1);
  const first = await onPhoto.getAttribute("src");
  await expect.poll(() => onPhoto.getAttribute("src"), { timeout: 9000 }).not.toBe(first);
  // Its hidden copy in the loop turns with it.
  const cloneSrc = () => page.locator(".ach.is-clone").first().locator(".ach-photo.is-on").getAttribute("src");
  expect(await cloneSrc()).toBe(await onPhoto.getAttribute("src"));
});

test("hero stickers sit above the statement box, so each one can be hovered", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
  const slots = page.locator("[data-stickers] .slot-li");
  await expect(slots).toHaveCount(5);
  for (const slot of await slots.all()) {
    const hit = await slot.evaluate((li) => {
      const r = li.getBoundingClientRect();
      return li.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
    expect(hit, (await slot.getAttribute("class")) ?? "slot-li").toBe(true);
  }
});

test("entrance releases the pre-paint hold and ends with the hero visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
  await expect(page.locator(".lede .line > span").first()).toBeVisible();
  await expect(page.locator("[data-badge]")).toBeVisible();
  // GSAP settles on the identity matrix rather than "none".
  await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await expect(page.locator("[data-nav]")).toHaveCSS("opacity", "1");
});

test("the CV page never gets the entrance hold", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders final states without waiting for scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", "none");
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin").first()).toHaveCSS("opacity", "1");
    // The last of these only holds when the island ran: no Lenis under reduced motion, and the reel's tabindex is set by JS.
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await page.locator("#achievements").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-reel-track]")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".ach.is-clone")).toHaveCount(5);
    await expect(page.locator(".ach.is-clone:visible")).toHaveCount(0);
    await expect(page.locator("[data-reel]")).toHaveAttribute("tabindex", "0");
    // Each pass stands on its first photo: the dots are hidden.
    await expect(page.locator(".ach-dots").first()).toBeAttached();
    await expect(page.locator(".ach-dots:visible")).toHaveCount(0);
  });

  test("stickers hold still and the dust field is drawn once, still", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".float").first()).toHaveCSS("animation-name", "none");
    // Some speck has been painted: the canvas is not blank.
    const drawn = () =>
      page.locator(".hero-dust").evaluate((c: HTMLCanvasElement) => {
        if (!c.width || !c.height) return 0;
        const px = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let lit = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i] > 0) lit++;
        return lit;
      });
    await expect.poll(drawn).toBeGreaterThan(0);
  });
});
