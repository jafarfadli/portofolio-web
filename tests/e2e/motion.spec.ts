import { expect, test, type Page } from "@playwright/test";

/** Skips the build (a flag only tests set), so the page shows at once. */
const returning = (page: Page) => page.addInitScript(() => { try { sessionStorage.setItem("swarm-built", "1"); } catch { /* blocked */ } });

test.describe("with the build skipped, the page shows at once", () => {
  test.beforeEach(({ page }) => returning(page));

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
    await expect(slots).toHaveCount(3);
    // The entrance is over once every slot has dropped its inline transform.
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".stickers .slot-li")].every((li) => !li.style.transform)))
      .toBe(true);
    for (const slot of await slots.all()) {
      const hit = await slot.evaluate((li) => {
        const r = li.getBoundingClientRect();
        return li.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      });
      expect(hit, (await slot.getAttribute("class")) ?? "slot-li").toBe(true);
    }
  });

  // The headline shrinks to end above the stickers, and the stickers keep left of the badge: check a short laptop and
  // a narrow desktop as well as the usual size.
  for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768]]) {
    test(`hero stickers clear the headline and the badge at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect
        .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".stickers .slot-li")].every((li) => !li.style.transform)))
        .toBe(true);
      await page.evaluate(() => document.fonts.ready);
      // the badge swings after its drop: measure it at rest
      await expect
        .poll(() => page.evaluate(() => {
          const m = /rotate\((-?[\d.]+)deg\)/.exec(document.querySelector<HTMLElement>("[data-pendulum]")!.style.transform);
          return !!m && Math.abs(Number(m[1])) < 0.05;
        }), { timeout: 15_000 })
        .toBe(true);
      const clash = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect();
        const lede = box(document.querySelector("[data-lede]")!);
        const badge = box(document.querySelector(".badge")!);
        return [...document.querySelectorAll(".slot-li")].flatMap((li) => {
          const r = box(li);
          const out: string[] = [];
          if (r.top < lede.bottom) out.push(`${li.className} under the headline`);
          if (r.right > badge.left) out.push(`${li.className} into the badge`);
          return out;
        });
      });
      expect(clash).toEqual([]);
    });
  }

  test("on a fine pointer the stickers lean toward the cursor, and ease home when it leaves the hero", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const slot = page.locator(".slot-li.s-1");
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

  test("the lead line's switch turns on after the entrance, and a click flips it", async ({ page }) => {
    await page.goto("/");
    const sw = page.locator("[data-switch]");
    await expect(sw).toHaveCount(1);
    await expect(sw).toHaveClass(/is-on/, { timeout: 5000 });
    await sw.click();
    await expect(sw).not.toHaveClass(/is-on/);
  });

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

  test("entrance releases the pre-paint hold and ends with the hero visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
    await expect(page.locator(".lede .line > span").first()).toBeVisible();
    await expect(page.locator("[data-badge]")).toBeVisible();
    // GSAP settles on the identity matrix rather than "none".
    await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await expect(page.locator("[data-nav]")).toHaveCSS("opacity", "1");
  });

});

test.describe("first visit: AI agents build the page", () => {
  test("the page is held for the swarm, built part by part, and Escape puts it all in place", async ({ page }) => {
    await page.goto("/");
    // The held page hands over to the swarm: its parts hidden in place, agents on the page wearing initials.
    await expect(page.locator("html")).not.toHaveClass(/swarm-pending/);
    await expect(page.locator(".sw-hide").first()).toBeAttached();
    // the crew comes in as its work opens, and the headline's lead line goes first, alone: give it time to come
    await expect.poll(() => page.locator(".sw-layer .sw-cur").count(), { timeout: 15_000 }).toBeGreaterThan(3);
    await expect(page.locator(".sw-cur .sw-name").first()).toHaveText(/^[A-Z]{2}$/);
    const names = await page.locator(".sw-cur .sw-name").allTextContents();
    expect(new Set(names).size).toBe(names.length);
    // The nav is not built: it is simply there. No rulers or guides either.
    await expect(page.locator("[data-nav] .sw-hide")).toHaveCount(0);
    await expect(page.locator("[data-nav] .brand")).toBeVisible();
    await expect(page.locator(".sw-ruler, .sw-guide")).toHaveCount(0);
    // The headline's lead line (the one about AI, else the first) is the first one built, alone: the others are
    // copies of it, made after.
    const all = await page.locator(".lede .line > span").allTextContents();
    const lead = all.find((t) => /\bAI\b/.test(t)) ?? all[0];
    const shown = () => page.locator(".lede .line > span").evaluateAll((els) => els.filter((el) => !el.classList.contains("sw-hide")).map((el) => el.textContent ?? ""));
    await expect.poll(async () => (await shown()).length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(await shown()).toEqual([lead]);
    // The headline is typed in: its first line shows, unclipped, within a few seconds.
    const line = page.locator(".lede .line > span").first();
    await expect(line).not.toHaveClass(/sw-hide/, { timeout: 15_000 });
    await expect.poll(() => line.evaluate((el) => el.style.clipPath), { timeout: 15_000 }).toBe("");
    // Escape: everything in place at once, nothing left of the work.
    await page.keyboard.press("Escape");
    await expect(page.locator(".sw-hide")).toHaveCount(0);
    await expect(page.locator(".sw-mute")).toHaveCount(0);
    await expect(page.locator(".sw-ghost")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/sw-building/);
    await expect(page.locator("[data-reel-track]")).not.toHaveClass(/sw-hold/);
    // Nobody stays: once the page is built every agent heads off the screen, and nothing is remembered.
    await expect.poll(() => page.locator(".sw-cur").count(), { timeout: 8000 }).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem("swarm-built"))).toBeNull();
  });

  test("on a phone the badge lands before the agents start on the headline", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Frame by frame from the first one: when the badge lands (the pendulum takes its first swing, an inline rotate)
    // and when the first headline line shows during the build.
    await page.addInitScript(() => {
      const w = window as unknown as { __land?: number; __line?: number };
      const tick = () => {
        const pend = document.querySelector<HTMLElement>("[data-pendulum]");
        if (w.__land === undefined && pend?.style.transform.includes("rotate")) w.__land = performance.now();
        const building = document.documentElement.classList.contains("sw-building");
        const shown = [...document.querySelectorAll(".lede .line > span")].some((el) => !el.classList.contains("sw-hide"));
        if (w.__line === undefined && building && shown) w.__line = performance.now();
        if (w.__land === undefined || w.__line === undefined) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto("/");
    const times = () => page.evaluate(() => { const w = window as unknown as { __land?: number; __line?: number }; return { __land: w.__land, __line: w.__line }; });
    await expect.poll(async () => { const t = await times(); return t.__land !== undefined && t.__line !== undefined; }, { timeout: 15_000 }).toBe(true);
    const { __land, __line } = await times();
    expect(__line!).toBeGreaterThanOrEqual(__land!);
  });

  test("a reload in the same tab builds the page again", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.locator(".sw-cur").count(), { timeout: 15_000 }).toBeGreaterThan(3);
    await page.keyboard.press("Escape");
    await expect(page.locator(".sw-hide")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/swarm-pending/);
    await expect(page.locator(".sw-hide").first()).toBeAttached();
    await expect.poll(() => page.locator(".sw-cur").count()).toBeGreaterThan(0);
  });

  test("the swarm has no controls and no sound", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-sound]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sound|skip|rebuild|hide|tour/i })).toHaveCount(0);
  });
});

test("the CV page never gets the entrance hold", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator("html")).not.toHaveClass(/motion-pending/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders final states without waiting for scroll", async ({ page }) => {
    await page.goto("/");
    // No agent swarm at all: nothing held or built, no agents.
    await expect(page.locator(".sw-layer")).toHaveCount(0);
    await expect(page.locator(".sw-hide")).toHaveCount(0);
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
