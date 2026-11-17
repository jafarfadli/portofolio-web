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

test("the reel is its own stop: focusing it pauses the strip, blurring lets it run", async ({ page }) => {
  await page.goto("/");
  const reel = page.getByRole("region", { name: "Achievements, moving strip. Focus it to stop." });
  const track = page.locator("[data-reel-track]");
  await reel.scrollIntoViewIfNeeded();
  await expect(reel).toHaveAttribute("tabindex", "0");
  const state = () => track.evaluate((el) => el.getAnimations()[0]?.playState);
  await expect.poll(state).toBe("running");
  await reel.focus();
  await expect.poll(state).toBe("paused");
  await expect(reel).toHaveCSS("outline-style", "solid");
  await reel.blur();
  await expect.poll(state).toBe("running");
});

test("a focused reel holds its photos too; blurring lets them turn again", async ({ page }) => {
  await page.goto("/");
  const reel = page.locator("[data-reel]");
  await reel.scrollIntoViewIfNeeded();
  await expect(reel).not.toHaveClass(/is-offscreen/);
  await reel.focus();
  const onPhoto = page.locator(".ach:not(.is-clone)").first().locator(".ach-photo.is-on");
  await expect(onPhoto).toHaveCount(1);
  const first = await onPhoto.getAttribute("src");
  // The first turn is due 4.8s after load (a 1.2s offset, then every 3.6s): wait past it.
  await page.waitForTimeout(5500);
  expect(await onPhoto.getAttribute("src")).toBe(first);
  await reel.blur();
  await expect.poll(() => onPhoto.getAttribute("src"), { timeout: 6000 }).not.toBe(first);
});

test("hero stickers sit above the statement box, so each one can be hovered", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
  const slots = page.locator("[data-stickers] .slot-li");
  await expect(slots).toHaveCount(5);
  // On a first visit the stickers are still being carried in; they sit in place once the agents have gone.
  await expect(page.locator(".crew-cursor")).toHaveCount(0, { timeout: 6000 });
  for (const slot of await slots.all()) {
    const hit = await slot.evaluate((li) => {
      const r = li.getBoundingClientRect();
      return li.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
    expect(hit, (await slot.getAttribute("class")) ?? "slot-li").toBe(true);
  }
});

// The reverse of the test above: lifted over the statement, no sticker may cover the action row, which is sized in px
// while the phone and the seal are placed in lede ems. A narrow desktop and a short laptop are where the two meet.
for (const [width, height] of [[900, 800], [1366, 600]]) {
  test(`hero stickers never cover the action row at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
    await expect(page.locator("[data-stickers] .slot-li")).toHaveCount(5);
    // The entrance is over once every slot has dropped its inline transform and the buttons are fully shown.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            [...document.querySelectorAll<HTMLElement>(".stickers .slot-li")].every((li) => !li.style.transform) &&
            [...document.querySelectorAll(".statement .hero-actions .btn")].every((b) => getComputedStyle(b).opacity === "1"),
        ),
      )
      .toBe(true);
    const covered = () =>
      page.evaluate(() => {
        const row = [...document.querySelectorAll(".statement .hero-actions a, .statement .hero-actions button")].map((el) => el.getBoundingClientRect());
        return [...document.querySelectorAll(".slot-li .sticker")].flatMap((s) => {
          const r = s.getBoundingClientRect();
          return row.some((b) => r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom) ? [s.closest(".slot-li")!.className] : [];
        });
      });
    // The stickers keep floating: sample a stretch of the drift, not one frame.
    for (let i = 0; i < 6; i++) {
      expect(await covered()).toEqual([]);
      await page.waitForTimeout(300);
    }
  });
}

test("the agenda preview opens at the cursor on every pointer entry, not only the first", async ({ page }) => {
  await page.goto("/");
  const agenda = page.locator("[data-agenda]");
  await agenda.evaluate((el) => el.scrollIntoView({ block: "start" }));
  // Measure the rows only once the scroll has settled.
  let lastTop = NaN;
  await expect
    .poll(async () => { const top = await agenda.evaluate((el) => Math.round(el.getBoundingClientRect().top)); const still = top === lastTop; lastTop = top; return still; })
    .toBe(true);
  const rows = page.locator("[data-agenda] .row");
  const preview = page.locator("[data-preview]");
  const at = () => preview.evaluate((el: HTMLElement) => { const m = new DOMMatrix(getComputedStyle(el).transform); return { x: m.m41, y: m.m42, h: el.offsetHeight }; });
  const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const boxes = (await Promise.all((await rows.all()).map((r) => r.boundingBox()))).filter((b) => b !== null);
  const onScreen = boxes.filter((b) => b.y >= 0 && b.y + b.height <= page.viewportSize()!.height);
  // First hover after load, near the left end of the first row on screen.
  const a = onScreen[0];
  const ax = a.x + 160;
  const ay = a.y + a.height / 2;
  await page.mouse.move(ax, ay);
  await frames();
  let p = await at();
  expect(Math.abs(p.x - (ax + 28))).toBeLessThan(4);
  expect(Math.abs(p.y - (ay - p.h / 2))).toBeLessThan(4);
  // Leave the agenda, out past its left edge, and let the preview fade out.
  await page.mouse.move(a.x - 40, ay);
  await expect.poll(() => preview.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.05);
  // Come back on the last row on screen, far to the right, in one move: the preview starts at the cursor, not where
  // it was hidden.
  const d = onScreen.at(-1)!;
  expect(d.y - a.y).toBeGreaterThan(250);
  const dx = d.x + d.width * 0.75;
  const dy = d.y + d.height / 2;
  await page.mouse.move(dx, dy);
  await frames();
  p = await at();
  expect(Math.abs(p.x - (dx + 28))).toBeLessThan(4);
  expect(Math.abs(p.y - (dy - p.h / 2))).toBeLessThan(4);
});

test("the dust field drifts when motion is allowed", async ({ page }) => {
  await page.goto("/");
  const dust = page.locator(".hero-dust");
  await expect.poll(() => dust.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(0);
  const moved = await dust.evaluate(async (c: HTMLCanvasElement) => {
    const snap = () => c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    const a = snap();
    await new Promise((r) => setTimeout(r, 600));
    const b = snap();
    return a.length === b.length && a.some((v, i) => v !== b[i]);
  });
  expect(moved).toBe(true);
});

test("on a fine pointer the stickers lean toward the cursor, and ease home when it leaves the hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const slot = page.locator(".slot-li.s-a");
  const offset = (prop: string) => slot.evaluate((el, p) => el.style.getPropertyValue(p), prop);
  // The lean starts once the entrance is over: keep the pointer moving over the hero's lower right until it does.
  let n = 0;
  await expect
    .poll(async () => { await page.mouse.move(1360 + (n++ % 2) * 20, 840); return offset("--px"); }, { timeout: 8000 })
    .not.toBe("");
  // Toward the lower right, so this slot (depth 1.3) leans right and down.
  await expect.poll(async () => parseFloat(await offset("--px"))).toBeGreaterThan(5);
  expect(parseFloat(await offset("--py"))).toBeGreaterThan(0);
  // Onto the nav, out of the hero: the slot eases home, then drops both inline offsets.
  await page.mouse.move(720, 36);
  await expect.poll(() => offset("--px"), { timeout: 5000 }).toBe("");
  expect(await offset("--py")).toBe("");
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

test("on the first visit agents carry the stickers in and leave; a reload in the same tab skips them", async ({ page }) => {
  await page.goto("/");
  const slots = page.locator(".stickers .slot-li");
  const n = await slots.count();
  await expect(page.locator(".crew .crew-cursor")).toHaveCount(n);
  await expect(page.locator(".crew .crew-name").first()).toHaveText("agent-01");
  // Every agent clocks out, and each sticker ends on its own place with no leftover transform.
  await expect(page.locator(".crew .crew-cursor")).toHaveCount(0, { timeout: 6000 });
  for (let i = 0; i < n; i++) await expect(slots.nth(i)).not.toHaveAttribute("style", /transform/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
  await page.waitForTimeout(300);
  await expect(page.locator(".crew .crew-cursor")).toHaveCount(0);
});

test("agents can rebuild the page on request; Skip shows it all at once and Esc does too", async ({ page }) => {
  await page.goto("/");
  const go = page.getByRole("button", { name: "Watch AI agents rebuild this page" });
  await go.scrollIntoViewIfNeeded();
  await go.click();
  await expect(go).toBeDisabled();
  const status = page.getByRole("status").filter({ hasText: /agents rebuilding/ });
  await expect(status).toHaveText(/^\d+ agents rebuilding: \d+ of \d+$/);
  await expect(page.locator(".crew-wait").first()).toBeAttached();
  await expect(page.getByRole("button", { name: /^Sound (on|off)$/ })).toBeVisible();
  await expect.poll(() => page.locator(".crew .crew-cursor").count()).toBeGreaterThan(3);
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.locator(".crew-wait")).toHaveCount(0);
  await expect(page.locator(".crew-bar")).toHaveCount(0);
  await expect(page.locator(".crew-cursor")).toHaveCount(0);
  await expect(go).toBeEnabled();

  await go.click();
  await expect(page.locator(".crew-wait").first()).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(page.locator(".crew-wait")).toHaveCount(0);
  await expect(page.locator(".crew-bar")).toHaveCount(0);
});

test("the CV page never gets the entrance hold", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders final states without waiting for scroll", async ({ page }) => {
    await page.goto("/");
    // No agent crew at all: no carried stickers, and no rebuild button.
    await expect(page.locator(".crew")).toHaveCount(0);
    await expect(page.locator("[data-crew-go]")).toBeHidden();
    await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", "none");
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin").first()).toHaveCSS("opacity", "1");
    // The last of these only holds when the island ran: no Lenis under reduced motion, and the island renames the reel.
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await page.locator("#achievements").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-reel-track]")).toHaveCSS("animation-name", "none");
    await expect(page.locator(".ach.is-clone")).toHaveCount(5);
    await expect(page.locator(".ach.is-clone:visible")).toHaveCount(0);
    await expect(page.locator("[data-reel]")).toHaveAttribute("tabindex", "0");
    await expect(page.locator("[data-reel]")).toHaveAttribute("aria-label", "Achievements, scroll sideways");
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
    // And it stays still: two snapshots half a second apart are the same, pixel for pixel.
    const still = await page.locator(".hero-dust").evaluate(async (c: HTMLCanvasElement) => {
      const snap = () => c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      const a = snap();
      await new Promise((r) => setTimeout(r, 500));
      const b = snap();
      return a.length === b.length && a.every((v, i) => v === b[i]);
    });
    expect(still).toBe(true);
  });

  test("passes stand on their first photo and never turn", async ({ page }) => {
    await page.goto("/");
    const reel = page.locator("[data-reel]");
    await reel.scrollIntoViewIfNeeded();
    await expect(reel).not.toHaveClass(/is-offscreen/);
    const onPhoto = page.locator(".ach:not(.is-clone)").first().locator(".ach-photo.is-on");
    await expect(onPhoto).toHaveCount(1);
    const first = await onPhoto.getAttribute("src");
    // With motion the first turn comes 4.8s after load (a 1.2s offset, then every 3.6s): wait past it.
    await page.waitForTimeout(5500);
    await expect(onPhoto).toHaveCount(1);
    expect(await onPhoto.getAttribute("src")).toBe(first);
  });
});
