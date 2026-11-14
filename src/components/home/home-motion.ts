import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

type Ticker = (time: number, deltaTime: number) => void;

/**
 * Port of mockup/main.js. Motion grammar is physical: the badge is a damped pendulum, stickers slap down,
 * leader lines draw to the result they explain. Under reduced motion everything renders in its final state.
 * Returns a cleanup that undoes every listener, ticker, timeout, tween, ScrollTrigger, and Lenis.
 */
export function initHomeMotion(doc: Document): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const win = doc.defaultView!;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = win.matchMedia("(pointer: fine)").matches;
  const wide = () => win.matchMedia("(min-width: 861px)").matches;

  const ac = new AbortController();
  // Created first and empty so handler-created tweens and ScrollTriggers (added via ctx.add) are reverted too.
  const ctx = gsap.context(() => {});
  const on = (el: EventTarget, type: string, fn: (e: Event) => void) =>
    el.addEventListener(type, (e) => { ctx.add(() => fn(e)); }, { signal: ac.signal });
  const tickers: Ticker[] = [];
  const addTicker = (fn: Ticker) => { gsap.ticker.add(fn); tickers.push(fn); };
  const timeouts: number[] = [];
  let lenis: Lenis | null = null;

  const teardown = () => {
    ac.abort();
    tickers.forEach((fn) => gsap.ticker.remove(fn));
    timeouts.forEach((t) => win.clearTimeout(t));
    lenis?.destroy();
    gsap.ticker.lagSmoothing(500, 33);
    ctx.revert();
  };

  const body = () => {
    /* ---------- Fit the first name to the badge width ---------- */
    const fit = () =>
      doc.querySelectorAll<HTMLElement>("[data-fit]").forEach((el) => {
        el.style.fontSize = "";
        const over = el.scrollWidth / el.clientWidth;
        if (over > 1) el.style.fontSize = `${(parseFloat(win.getComputedStyle(el).fontSize) / over) * 0.98}px`;
      });
    fit();
    on(win, "resize", fit);

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
    const flip = (): boolean => {
      const toBack = !badge.classList.contains("is-flipped");
      badge.classList.toggle("is-flipped", toBack);
      front.inert = toBack;
      back.inert = !toBack;
      kick(toBack ? 34 : -34);
      return toBack;
    };
    badge.querySelectorAll<HTMLButtonElement>("[data-flip]").forEach((b) =>
      on(b, "click", (e) => {
        e.stopPropagation();
        const toBack = flip();
        const next = (toBack ? back : front).querySelector<HTMLButtonElement>("[data-flip]")!;
        timeouts.push(win.setTimeout(() => next.focus({ preventScroll: true }), reduce ? 0 : 380));
      }),
    );

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

    /* ---------- Achievements: the badge collection fans out ---------- */
    const fan = doc.querySelector<HTMLElement>("[data-fan]");
    if (fan) {
      const items = [...fan.querySelectorAll<HTMLElement>(".fan-item")];
      const caption = doc.querySelector<HTMLElement>("[data-fan-caption]")!;
      const prev = doc.querySelector<HTMLButtonElement>("[data-fan-prev]")!;
      const next = doc.querySelector<HTMLButtonElement>("[data-fan-next]")!;
      let active = Math.min(Number(fan.dataset.active ?? 0), items.length - 1);
      let fanned = false;
      const setCaption = () => {
        const cur = items[active];
        if (!cur) return;
        const b = doc.createElement("b");
        b.textContent = `${cur.dataset.title}.`;
        caption.replaceChildren(b, ` ${cur.dataset.what ?? ""}`);
        prev.disabled = active === 0;
        next.disabled = active === items.length - 1;
        // A button that just became disabled loses focus; hand it to the other one so keyboard users keep their place.
        if (doc.activeElement === next && next.disabled) prev.focus({ preventScroll: true });
        else if (doc.activeElement === prev && prev.disabled) next.focus({ preventScroll: true });
      };
      const layout = (dur = 0.7) => {
        const spread = Math.min(Math.max(win.innerWidth * 0.135, 150), 220);
        items.forEach((el, i) => {
          const d = i - active;
          const ad = Math.abs(d);
          gsap.to(el, {
            x: d * spread, y: ad * 26, rotation: d * 7.5, scale: 1 - ad * 0.075, opacity: ad > 2 ? 0 : 1, zIndex: 10 - ad,
            duration: reduce ? 0 : dur, ease: "expo.out", overwrite: "auto",
          });
          el.setAttribute("aria-current", d === 0 ? "true" : "false");
        });
        setCaption();
      };
      const go = (i: number) => { active = Math.max(0, Math.min(items.length - 1, i)); if (fanned) layout(); else setCaption(); };
      const enableFan = () => {
        if (fanned || !wide()) return;
        fanned = true;
        fan.classList.add("is-fanned");
        gsap.set(items, { x: 0, y: 60, rotation: 0, scale: 0.9, opacity: 0 });
        ScrollTrigger.create({ trigger: fan, start: "top 78%", once: true, onEnter: () => layout(reduce ? 0 : 0.95) });
        ScrollTrigger.refresh();
      };
      enableFan();
      if (!fanned && items[active]) {
        const w = items[active];
        fan.scrollLeft = w.offsetLeft - fan.offsetLeft - (fan.clientWidth - w.offsetWidth) / 2;
      }
      setCaption();
      on(win, "resize", () => { enableFan(); if (fanned) layout(0); });
      on(prev, "click", () => go(active - 1));
      on(next, "click", () => go(active + 1));
      items.forEach((el, i) => on(el, "click", () => { if (!fan.dataset.dragged) go(i); }));
      on(fan.parentElement!, "keydown", (ev) => {
        const e = ev as KeyboardEvent;
        if (!fanned) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
      });
      let fx: number | null = null;
      on(fan, "pointerdown", (ev) => { if (fanned) { fx = (ev as PointerEvent).clientX; delete fan.dataset.dragged; } });
      on(win, "pointerup", (ev) => {
        if (fx === null) return;
        const dx = (ev as PointerEvent).clientX - fx;
        fx = null;
        if (Math.abs(dx) > 48) {
          fan.dataset.dragged = "1";
          go(active + (dx < 0 ? 1 : -1));
          timeouts.push(win.setTimeout(() => { delete fan.dataset.dragged; }, 0));
        }
      });
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
      const show = (row: HTMLElement) => {
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
        on(r, "pointerenter", () => show(r));
        on(r, "focus", () => {
          const b = r.getBoundingClientRect();
          xTo(Math.min(b.right - preview.offsetWidth - 180, win.innerWidth - preview.offsetWidth - 24));
          yTo(b.top + b.height / 2 - preview.offsetHeight / 2);
          show(r);
        });
        on(r, "blur", hide);
      });
      let px = -1;
      let py = -1;
      on(agenda, "pointermove", (ev) => {
        const e = ev as PointerEvent;
        px = e.clientX;
        py = e.clientY;
        xTo(px + 28);
        yTo(py - preview.offsetHeight / 2);
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
    teardown();
    throw err;
  }
  return teardown;
}
