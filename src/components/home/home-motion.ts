import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

type Ticker = (time: number, deltaTime: number) => void;

/**
 * Port of mockup/main.js. Motion grammar is physical: the badge is a damped pendulum, stickers slap down,
 * leader lines draw to the result they explain. Under reduced motion everything renders in its final state.
 * Returns a cleanup that undoes every listener, ticker, timer, observer, frame loop, tween, ScrollTrigger, and Lenis.
 */
export function initHomeMotion(doc: Document): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const win = doc.defaultView!;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = win.matchMedia("(pointer: fine)").matches;

  const ac = new AbortController();
  // Created first and empty so handler-created tweens and ScrollTriggers (added via ctx.add) are reverted too.
  const ctx = gsap.context(() => {});
  const on = (el: EventTarget, type: string, fn: (e: Event) => void) =>
    el.addEventListener(type, (e) => { ctx.add(() => fn(e)); }, { signal: ac.signal });
  const tickers: Ticker[] = [];
  const addTicker = (fn: Ticker) => { gsap.ticker.add(fn); tickers.push(fn); };
  const timeouts: number[] = [];
  const intervals: number[] = [];
  let lenis: Lenis | null = null;

  const teardown = () => {
    ac.abort();
    tickers.forEach((fn) => gsap.ticker.remove(fn));
    timeouts.forEach((t) => win.clearTimeout(t));
    intervals.forEach((t) => win.clearInterval(t));
    lenis?.destroy();
    gsap.ticker.lagSmoothing(500, 33);
    ctx.revert();
  };

  const body = () => {
    /* ---------- Fit the name to the badge width (both lines share one size) ---------- */
    const fit = () =>
      doc.querySelectorAll<HTMLElement>("[data-fit]").forEach((el) => {
        el.style.fontSize = "";
        const over = el.scrollWidth / el.clientWidth;
        if (over > 1) el.style.fontSize = `${(parseFloat(win.getComputedStyle(el).fontSize) / over) * 0.98}px`;
      });
    fit();
    on(win, "resize", fit);
    // Archivo swaps in after first paint (display: swap); the fitted size must be measured with the real face.
    doc.fonts?.ready.then(() => { if (!ac.signal.aborted) fit(); });

    /* ---------- Smooth scroll + in-page anchors ---------- */
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
      lenis.on("scroll", ScrollTrigger.update);
      addTicker((t) => lenis?.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
      on(a, "click", (e) => {
        const id = a.getAttribute("href")!;
        if (id === "#") { e.preventDefault(); return; }
        const target = doc.querySelector<HTMLElement>(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -24, duration: 1.1 });
        else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }),
    );

    /* ---------- Nav: solid after the top, hides on the way down ---------- */
    const nav = doc.querySelector<HTMLElement>("[data-nav]")!;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle("is-solid", y > 40);
        nav.classList.toggle("is-hidden", self.direction === 1 && y > win.innerHeight * 0.8);
      },
    });
    const links = [...doc.querySelectorAll<HTMLAnchorElement>(".nav-links a")];
    links.forEach((l) => {
      const sec = doc.querySelector(l.getAttribute("href")!);
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: (self) => { if (self.isActive) links.forEach((x) => x.setAttribute("aria-current", String(x === l))); },
      });
    });

    /* ---------- The cord: draws with progress ---------- */
    const cord = doc.querySelector<HTMLElement>(".cord");
    if (cord) {
      gsap.to(".cord-fill", {
        scaleY: 1, ease: "none",
        scrollTrigger: {
          trigger: "#about", start: "top bottom", endTrigger: "#contact", end: "bottom bottom", scrub: reduce ? false : 0.4,
          onToggle: (self) => cord.classList.toggle("is-on", self.isActive || self.progress > 0),
        },
      });
    }

    /* ---------- Badge: damped pendulum + flip ---------- */
    const pendulum = doc.querySelector<HTMLElement>("[data-pendulum]")!;
    const badge = doc.querySelector<HTMLElement>("[data-badge]")!;
    const front = badge.querySelector<HTMLElement>('[data-face="front"]')!;
    const back = badge.querySelector<HTMLElement>('[data-face="back"]')!;
    const phys = { a: 0, v: 0, K: 36, C: 2.4, awake: false, dragging: false };
    const render = () => { pendulum.style.transform = `rotate(${phys.a.toFixed(3)}deg)`; };
    if (!reduce) {
      addTicker((_t, dtMs) => {
        if (phys.dragging || !phys.awake) return;
        const dt = Math.min(dtMs, 40) / 1000;
        phys.v += (-phys.K * phys.a - phys.C * phys.v) * dt;
        phys.a += phys.v * dt;
        if (Math.abs(phys.a) < 0.02 && Math.abs(phys.v) < 0.05) { phys.a = 0; phys.v = 0; phys.awake = false; }
        render();
      });
    }
    const kick = (dv: number) => { if (reduce) return; phys.v += dv; phys.awake = true; };
    // No flip button: a short press on the badge turns it over (the back repeats links found elsewhere on the page).
    const flip = () => {
      const toBack = !badge.classList.contains("is-flipped");
      badge.classList.toggle("is-flipped", toBack);
      front.inert = toBack;
      back.inert = !toBack;
      kick(toBack ? 34 : -34);
    };
    if (!finePointer) badge.style.touchAction = "pan-y";
    type Drag = { x: number; y: number; t: number; p: { x: number; y: number }; a0: number; pa0: number; lastA: number; lastT: number; moved: number };
    let drag: Drag | null = null;
    const pivot = () => { const r = pendulum.getBoundingClientRect(); return { x: r.left, y: r.top }; };
    const angleTo = (e: PointerEvent, p: { x: number; y: number }) => -Math.atan2(e.clientX - p.x, e.clientY - p.y) * (180 / Math.PI);
    on(badge, "pointerdown", (ev) => {
      const e = ev as PointerEvent;
      if ((e.target as Element).closest("a, button")) return;
      const p = pivot();
      const now = performance.now();
      drag = { x: e.clientX, y: e.clientY, t: now, p, a0: phys.a, pa0: angleTo(e, p), lastA: phys.a, lastT: now, moved: 0 };
      badge.setPointerCapture(e.pointerId);
      phys.dragging = true;
      phys.v = 0;
      badge.classList.add("is-dragging");
    });
    on(badge, "pointermove", (ev) => {
      const e = ev as PointerEvent;
      if (!drag) return;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
      if (reduce) return;
      const a = Math.max(-38, Math.min(38, drag.a0 + (angleTo(e, drag.p) - drag.pa0)));
      const now = performance.now();
      const dt = Math.max(now - drag.lastT, 1) / 1000;
      phys.v = phys.v * 0.6 + ((a - drag.lastA) / dt) * 0.4;
      drag.lastA = a;
      drag.lastT = now;
      phys.a = a;
      render();
    });
    const release = (ev: Event) => {
      if (!drag) return;
      const wasClick = drag.moved < 6 && performance.now() - drag.t < 350;
      badge.classList.remove("is-dragging");
      phys.dragging = false;
      phys.awake = !reduce;
      phys.v = Math.max(-260, Math.min(260, phys.v));
      drag = null;
      if (wasClick && ev.type === "pointerup") flip();
    };
    on(badge, "pointerup", release);
    on(badge, "pointercancel", release);

    if (lenis) {
      let heroVisible = true;
      ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: (s) => { heroVisible = s.isActive; } });
      lenis.on("scroll", (l: Lenis) => {
        if (!heroVisible || phys.dragging) return;
        phys.v += Math.max(-6, Math.min(6, l.velocity * 0.9));
        phys.awake = true;
      });
    }

    /* ---------- Stickers: peel one, the rest step back ---------- */
    const stickerList = doc.querySelector<HTMLElement>("[data-stickers]");
    stickerList?.querySelectorAll<HTMLElement>(".sticker").forEach((s) => {
      const peek = () => { stickerList.classList.add("is-peeking"); s.classList.add("is-peeled"); };
      const unpeek = () => { stickerList.classList.remove("is-peeking"); s.classList.remove("is-peeled"); };
      on(s, "pointerenter", peek);
      on(s, "pointerleave", unpeek);
      on(s, "focus", peek);
      on(s, "blur", unpeek);
    });

    /* ---------- First viewport: the one authored entrance ---------- */
    // Release the CSS start state (html.motion-pending) in this same task, before the from() tweens read their
    // end values from computed style: they must see the real resting state, and no frame paints in between.
    doc.documentElement.classList.remove("motion-pending");
    if (!reduce) {
      gsap
        .timeline({ delay: 0.12, defaults: { ease: "expo.out" } })
        .from(nav, { opacity: 0, duration: 0.6 }, 0)
        .from(
          pendulum,
          {
            y: () => -win.innerHeight * 0.95, duration: 0.78, ease: "power3.in",
            onComplete: () => { gsap.set(pendulum, { clearProps: "y" }); render(); kick(58); },
          },
          0.05,
        )
        .from(".stickers .slot-li", { opacity: 0, scale: 1.22, rotation: 9, duration: 0.5, ease: "back.out(1.5)", stagger: 0.075, clearProps: "transform" }, 0.62)
        .from(".lede .line > span", { yPercent: 108, duration: 0.9, stagger: 0.09 }, 0.78)
        .from(".statement .hero-actions .btn", { opacity: 0, y: 14, duration: 0.6, stagger: 0.07 }, 1.0);

      gsap.from("[data-chips] .chip", {
        opacity: 0, scale: 1.3, rotation: "+=10", duration: 0.45, ease: "back.out(1.6)", stagger: 0.045,
        scrollTrigger: { trigger: "[data-chips]", start: "top 82%", once: true },
      });
    }

    /* ---------- Hero: stickers lean with the mouse ---------- */
    // Each sticker sits at its own depth: the deeper it is, the further it leans toward the cursor. The depth goes
    // by slot, not by position in the list, since a project without a screenshot renders no sticker.
    const hero = doc.querySelector<HTMLElement>(".hero");
    if (!reduce && finePointer && hero && stickerList) {
      const DEPTH: [string, number][] = [["s-a", 1.3], ["s-b", 0.7], ["s-c", 1], ["s-d", 0.55], ["s-award", 1.6]];
      const items = [...stickerList.querySelectorAll<HTMLElement>(".slot-li")].map((el) => ({
        el, depth: DEPTH.find(([c]) => el.classList.contains(c))?.[1] ?? 1, x: 0, y: 0,
      }));
      const aim = { x: 0, y: 0 };
      let leaning = false;
      // Runs only while a sticker is still travelling; it takes itself off the ticker once they all rest.
      const lean: Ticker = () => {
        let still = true;
        items.forEach((it) => {
          const tx = aim.x * 16 * it.depth;
          const ty = aim.y * 11 * it.depth;
          it.x += (tx - it.x) * 0.08;
          it.y += (ty - it.y) * 0.08;
          if (Math.abs(tx - it.x) > 0.05 || Math.abs(ty - it.y) > 0.05) still = false;
          it.el.style.setProperty("--px", `${it.x.toFixed(2)}px`);
          it.el.style.setProperty("--py", `${it.y.toFixed(2)}px`);
        });
        if (still) { leaning = false; gsap.ticker.remove(lean); }
      };
      tickers.push(lean); // teardown takes it off the ticker if it is still running
      on(hero, "pointermove", (ev) => {
        const e = ev as PointerEvent;
        aim.x = (e.clientX / win.innerWidth) * 2 - 1;
        aim.y = (e.clientY / win.innerHeight) * 2 - 1;
        if (!leaning) { leaning = true; gsap.ticker.add(lean); }
      });
      // Leaving the hero eases every sticker home, even when the lean had come to rest and taken itself off the ticker.
      on(hero, "pointerleave", () => {
        aim.x = 0;
        aim.y = 0;
        if (!leaning) { leaning = true; gsap.ticker.add(lean); }
      });
      ac.signal.addEventListener("abort", () =>
        items.forEach(({ el }) => { el.style.removeProperty("--px"); el.style.removeProperty("--py"); }),
      );
    }

    /* ---------- Hero: a field of punched dust that leans toward the mouse ---------- */
    // Specks a hole punch leaves (stock dots, the odd slot-shaped chad) scattered over the hero ground. Each sits at its
    // own depth: it wanders slowly on its own, and the whole field leans toward the cursor, near specks further than far
    // ones. Under reduced motion the field is drawn once, still, and redrawn only when the hero resizes.
    const dust = doc.querySelector<HTMLCanvasElement>("[data-dust]");
    const pen = dust?.getContext("2d");
    if (dust && pen && hero) {
      const INK = ["242,242,238", "242,242,238", "229,228,223", "201,204,214"];
      const LEAN_X = 150; // px the nearest speck travels at the hero's edge
      const LEAN_Y = 90;
      const PAD_X = LEAN_X; // specks scatter past every edge by the most one can lean, so leaning never uncovers a bare strip
      const PAD_Y = LEAN_Y;
      type Speck = { x: number; y: number; z: number; chad: boolean; r: number; rot: number; spin: number; vx: number; vy: number; ink: string; alpha: number };
      let w = 0;
      let h = 0;
      let dpr = 1;
      let specks: Speck[] = [];
      const seed = () => {
        const n = Math.round(Math.min(300, ((w + 2 * PAD_X) * (h + 2 * PAD_Y)) / 7200)); // about one speck per 85px square
        specks = Array.from({ length: n }, () => {
          const z = 0.15 + Math.random() * 0.85; // depth: 1 is nearest
          const chad = Math.random() < 0.12;
          return {
            x: Math.random() * (w + 2 * PAD_X) - PAD_X, y: Math.random() * (h + 2 * PAD_Y) - PAD_Y, z, chad,
            r: 0.6 + z * 1.5, rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.4,
            vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, // px per second, a slow wander
            ink: chad ? INK[3] : INK[Math.floor(Math.random() * 3)], alpha: 0.18 + z * 0.42,
          };
        });
      };
      const lean = { x: 0, y: 0 };
      const aim = { x: 0, y: 0 };
      const draw = (dt: number) => {
        pen.setTransform(dpr, 0, 0, dpr, 0, 0);
        pen.clearRect(0, 0, w, h);
        lean.x += (aim.x - lean.x) * Math.min(1, dt * 2.2); // the field trails the cursor a little
        lean.y += (aim.y - lean.y) * Math.min(1, dt * 2.2);
        for (const s of specks) {
          s.x = ((s.x + PAD_X + s.vx * dt + w + 2 * PAD_X) % (w + 2 * PAD_X)) - PAD_X;
          s.y = ((s.y + PAD_Y + s.vy * dt + h + 2 * PAD_Y) % (h + 2 * PAD_Y)) - PAD_Y;
          s.rot += s.spin * dt;
          const x = s.x + lean.x * LEAN_X * s.z;
          const y = s.y + lean.y * LEAN_Y * s.z;
          pen.globalAlpha = s.alpha;
          pen.fillStyle = `rgb(${s.ink})`;
          if (s.chad) {
            pen.save();
            pen.translate(x, y);
            pen.rotate(s.rot);
            pen.beginPath();
            pen.roundRect(-3.2, -1, 6.4, 2, 1);
            pen.fill();
            pen.restore();
          } else {
            pen.beginPath();
            pen.arc(x, y, s.r, 0, Math.PI * 2);
            pen.fill();
          }
        }
      };
      const size = () => {
        const r = hero.getBoundingClientRect();
        dpr = Math.min(win.devicePixelRatio || 1, 2);
        const grew = Math.abs(r.width - w) > 40 || Math.abs(r.height - h) > 40;
        w = r.width;
        h = r.height;
        dust.width = Math.round(w * dpr);
        dust.height = Math.round(h * dpr);
        if (grew || !specks.length) seed();
        draw(0);
      };
      size();
      const ro = new ResizeObserver(size);
      ro.observe(hero);
      ac.signal.addEventListener("abort", () => ro.disconnect());
      if (!reduce) {
        // The field leans toward the cursor: -1..1 across the hero, eased in draw().
        if (finePointer) {
          on(hero, "pointermove", (ev) => {
            const e = ev as PointerEvent;
            const r = hero.getBoundingClientRect();
            aim.x = ((e.clientX - r.left) / r.width) * 2 - 1;
            aim.y = ((e.clientY - r.top) / r.height) * 2 - 1;
          });
          on(hero, "pointerleave", () => { aim.x = 0; aim.y = 0; });
        }
        // Its own frame loop. It schedules no frame at all while the hero is off screen or the tab is hidden: the hero
        // observer and visibilitychange start it again.
        let visible = true;
        let prev = 0;
        let frame = 0; // 0 while no frame is scheduled
        const tick = (now: number) => {
          frame = 0;
          if (!visible || doc.hidden) return;
          draw(Math.min((now - prev) / 1000, 0.05));
          prev = now;
          frame = win.requestAnimationFrame(tick);
        };
        const run = () => {
          if (frame || !visible || doc.hidden || ac.signal.aborted) return;
          prev = performance.now();
          frame = win.requestAnimationFrame(tick);
        };
        const io = new IntersectionObserver((entries) => { visible = entries.at(-1)!.isIntersecting; run(); });
        io.observe(hero);
        on(doc, "visibilitychange", run);
        run();
        ac.signal.addEventListener("abort", () => { io.disconnect(); win.cancelAnimationFrame(frame); frame = 0; });
      }
    }

    /* ---------- Work: leader lines draw to the result ---------- */
    if (!reduce) {
      doc.querySelectorAll<HTMLElement>(".project").forEach((card) => {
        const path = card.querySelector(".leader path");
        const dot = card.querySelector(".lead-dot");
        const pin = card.querySelector(".pin");
        if (!path || !dot || !pin) return;
        gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(dot, { opacity: 0 });
        gsap.set(pin, { opacity: 0, y: 10, scale: 0.96 });
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 72%", once: true } })
          .fromTo(dot, { scale: 0 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" })
          .to(path, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, 0.05)
          .to(pin, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, 0.62);
      });
    }

    /* ---------- Achievements: passes ride past on a strap ---------- */
    // The server renders the second, hidden copy of the list; CSS moves the track by half its width.
    const reel = doc.querySelector<HTMLElement>("[data-reel]");
    const track = reel?.querySelector<HTMLElement>("[data-reel-track]");
    if (reel && track) {
      // About 38px a second. Rewriting the same value on resize would restart the running loop, so write only a change.
      let paced = "";
      const pace = () => {
        const dur = `${Math.round(track.scrollWidth / 2 / 38)}s`;
        if (dur === paced) return;
        paced = dur;
        track.style.setProperty("--reel-dur", dur);
      };
      pace();
      on(win, "resize", pace);
      if (reduce) {
        // No motion: the row stands still and scrolls sideways, by keyboard too. The server already made it a focusable
        // region; only its name changes.
        const label = reel.getAttribute("aria-label");
        reel.setAttribute("aria-label", "Achievements, scroll sideways");
        ac.signal.addEventListener("abort", () => { if (label !== null) reel.setAttribute("aria-label", label); });
      }
      // Hover slows the strap to a stroll instead of stopping it (keyboard focus and leaving the screen still stop it,
      // in CSS). The rate is eased on the running CSS animation itself.
      if (!reduce && finePointer) {
        const speed = { r: 1 };
        const setRate = () => track.getAnimations().forEach((a) => { a.playbackRate = speed.r; });
        const ease = (to: number) => gsap.to(speed, { r: to, duration: 0.8, ease: "power2.out", overwrite: true, onUpdate: setRate });
        on(reel, "pointerenter", () => ease(0.25));
        on(reel, "pointerleave", () => ease(1));
        ac.signal.addEventListener("abort", () => { speed.r = 1; setRate(); });
      }
      // Each pass flips through its photos, a few seconds apart and out of step with its neighbours. A pass and its
      // clone turn together, so the loop's seam never shows two different photos. Nothing turns under reduced motion.
      if (!reduce) {
        const clones = [...track.querySelectorAll<HTMLElement>(".ach.is-clone [data-photos]")];
        [...track.querySelectorAll<HTMLElement>(".ach:not(.is-clone) [data-photos]")].forEach((stack, k) => {
          const pair = clones[k] ? [stack, clones[k]] : [stack];
          const count = stack.querySelectorAll(".ach-photo").length;
          if (count < 2) return;
          let at = 0;
          const turn = () => {
            if (reel.classList.contains("is-offscreen") || doc.hidden) return;
            at = (at + 1) % count;
            pair.forEach((st) => {
              st.querySelectorAll(".ach-photo").forEach((im, i) => im.classList.toggle("is-on", i === at));
              st.querySelectorAll(".ach-dots i").forEach((d, i) => d.classList.toggle("is-on", i === at));
            });
          };
          timeouts.push(win.setTimeout(() => { intervals.push(win.setInterval(turn, 3600)); }, 1200 + k * 750));
        });
      }
      // The latest entry wins: a jump to #achievements queues "out" and "in" in one batch.
      const io = new IntersectionObserver((entries) => reel.classList.toggle("is-offscreen", !entries.at(-1)!.isIntersecting));
      io.observe(reel);
      ac.signal.addEventListener("abort", () => io.disconnect());
    }

    /* ---------- Activities: the agenda, photo trails the cursor ---------- */
    const agenda = doc.querySelector<HTMLElement>("[data-agenda]");
    const preview = doc.querySelector<HTMLElement>("[data-preview]");
    if (agenda && preview) {
      const pimg = preview.querySelector("img")!;
      const rows = [...agenda.querySelectorAll<HTMLElement>(".row")];
      rows.forEach((r) => { if (r.dataset.photo) { const im = new Image(); im.src = r.dataset.photo; } });
      const xTo = gsap.quickTo(preview, "x", { duration: reduce ? 0 : 0.55, ease: "power3" });
      const yTo = gsap.quickTo(preview, "y", { duration: reduce ? 0 : 0.55, ease: "power3" });
      // Where the cursor is, known page-wide: after a reload the first row can arrive under a still cursor by scrolling,
      // before any move inside the agenda.
      let px = -1;
      let py = -1;
      on(win, "pointermove", (ev) => {
        const e = ev as PointerEvent;
        px = e.clientX;
        py = e.clientY;
      });
      const show = (row: HTMLElement, e?: PointerEvent) => {
        if (e) { px = e.clientX; py = e.clientY; }
        // A hidden preview appears at the cursor, not tweening in from wherever it last was (at first load: the top left).
        if (Number(gsap.getProperty(preview, "opacity")) < 0.05 && px >= 0) gsap.set(preview, { x: px + 28, y: py - preview.offsetHeight / 2 });
        rows.forEach((r) => r.classList.toggle("is-active", r === row));
        agenda.classList.add("is-hovering");
        const src = row.dataset.photo;
        if (!src) { gsap.to(preview, { opacity: 0, duration: reduce ? 0 : 0.2, overwrite: "auto" }); return; }
        if (pimg.getAttribute("src") !== src) pimg.src = src;
        gsap.to(preview, { opacity: 1, scale: 1, rotation: gsap.utils.random(-4, 4), duration: reduce ? 0 : 0.4, ease: "expo.out", overwrite: "auto" });
      };
      const hide = () => {
        rows.forEach((r) => r.classList.remove("is-active"));
        agenda.classList.remove("is-hovering");
        gsap.to(preview, { opacity: 0, scale: 0.85, duration: reduce ? 0 : 0.25, ease: "power2.in", overwrite: "auto" });
      };
      rows.forEach((r) => {
        on(r, "pointerenter", (e) => show(r, e as PointerEvent));
        on(r, "focus", () => {
          const b = r.getBoundingClientRect();
          xTo(Math.min(b.right - preview.offsetWidth - 180, win.innerWidth - preview.offsetWidth - 24));
          yTo(b.top + b.height / 2 - preview.offsetHeight / 2);
          show(r);
        });
        on(r, "blur", hide);
      });
      on(agenda, "pointermove", (ev) => {
        const e = ev as PointerEvent;
        xTo(e.clientX + 28);
        yTo(e.clientY - preview.offsetHeight / 2);
      });
      on(agenda, "pointerleave", hide);
      const recheck = () => {
        if (px < 0 || !finePointer) return;
        const row = doc.elementFromPoint(px, py)?.closest<HTMLElement>("[data-agenda] .row");
        if (row) { if (!row.classList.contains("is-active")) show(row); }
        else if (agenda.classList.contains("is-hovering")) hide();
      };
      ScrollTrigger.create({ trigger: agenda, start: "top bottom", end: "bottom top", onUpdate: recheck, onLeave: hide, onLeaveBack: hide });
    }
  };

  try {
    ctx.add(body);
  } catch (err) {
    doc.documentElement.classList.remove("motion-pending");
    teardown();
    throw err;
  }
  return teardown;
}
