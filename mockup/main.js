/* Lanyard & Badge - mockup interactions
   Motion grammar: physical. The badge is a damped pendulum, stickers slap down,
   leader lines draw to the result they explain. Everything renders final under reduced motion. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const wide = () => window.matchMedia("(min-width: 861px)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  if (!hasGsap) return; // content is fully readable without scripts
  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#") { e.preventDefault(); return; }
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -24, duration: 1.1 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

  /* ---------------- Nav: solid after the top, hides on the way down ---------------- */
  const nav = document.querySelector("[data-nav]");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle("is-solid", y > 40);
      nav.classList.toggle("is-hidden", self.direction === 1 && y > window.innerHeight * 0.8);
    },
  });
  const links = [...document.querySelectorAll(".nav-links a")];
  links.forEach((l) => {
    const sec = document.querySelector(l.getAttribute("href"));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: "top 45%", end: "bottom 45%",
      onToggle: (self) => { if (self.isActive) links.forEach((x) => x.setAttribute("aria-current", String(x === l))); },
    });
  });

  /* ---------------- The cord: draws with progress, every section clips onto it ---------------- */
  const cord = document.querySelector(".cord");
  gsap.to(".cord-fill", {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: "#about", start: "top bottom", endTrigger: "#contact", end: "bottom bottom", scrub: reduce ? false : 0.4,
      onToggle: (self) => cord.classList.toggle("is-on", self.isActive || self.progress > 0) },
  });

  /* ---------------- Badge: damped pendulum + flip ---------------- */
  const pendulum = document.querySelector("[data-pendulum]");
  const badge = document.querySelector("[data-badge]");
  const faces = { front: badge.querySelector('[data-face="front"]'), back: badge.querySelector('[data-face="back"]') };
  const phys = { a: 0, v: 0, K: 36, C: 2.4, awake: false, dragging: false };
  const render = () => { pendulum.style.transform = `rotate(${phys.a.toFixed(3)}deg)`; };
  const step = (_t, dtMs) => {
    if (phys.dragging || !phys.awake) return;
    const dt = Math.min(dtMs, 40) / 1000;
    const acc = -phys.K * phys.a - phys.C * phys.v;
    phys.v += acc * dt;
    phys.a += phys.v * dt;
    if (Math.abs(phys.a) < 0.02 && Math.abs(phys.v) < 0.05) { phys.a = 0; phys.v = 0; phys.awake = false; }
    render();
  };
  if (!reduce) gsap.ticker.add(step);
  const kick = (dv) => { if (reduce) return; phys.v += dv; phys.awake = true; };

  const flip = (toBack) => {
    const back = toBack ?? !badge.classList.contains("is-flipped");
    badge.classList.toggle("is-flipped", back);
    faces.front.inert = back;
    faces.back.inert = !back;
    kick(back ? 34 : -34); // the flip nudges the strap
  };
  badge.querySelectorAll("[data-flip]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      flip();
      const next = (badge.classList.contains("is-flipped") ? faces.back : faces.front).querySelector("[data-flip]");
      setTimeout(() => next.focus({ preventScroll: true }), reduce ? 0 : 380);
    })
  );

  // drag to swing; a short press without travel flips
  if (!finePointer) badge.style.touchAction = "pan-y";
  let start = null;
  const pivot = () => { const r = pendulum.getBoundingClientRect(); return { x: r.left, y: r.top }; };
  const pointerAngle = (e, p) => -Math.atan2(e.clientX - p.x, e.clientY - p.y) * (180 / Math.PI);
  badge.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    const p = pivot();
    start = { x: e.clientX, y: e.clientY, t: performance.now(), p, a0: phys.a, pa0: pointerAngle(e, p), lastA: phys.a, lastT: performance.now(), moved: 0 };
    badge.setPointerCapture(e.pointerId);
    phys.dragging = true; phys.v = 0;
    badge.classList.add("is-dragging");
  });
  badge.addEventListener("pointermove", (e) => {
    if (!start) return;
    start.moved = Math.max(start.moved, Math.hypot(e.clientX - start.x, e.clientY - start.y));
    if (reduce) return;
    const a = Math.max(-38, Math.min(38, start.a0 + (pointerAngle(e, start.p) - start.pa0)));
    const now = performance.now();
    const dt = Math.max(now - start.lastT, 1) / 1000;
    phys.v = phys.v * 0.6 + ((a - start.lastA) / dt) * 0.4;
    start.lastA = a; start.lastT = now;
    phys.a = a; render();
  });
  const release = (e) => {
    if (!start) return;
    const wasClick = start.moved < 6 && performance.now() - start.t < 350;
    badge.classList.remove("is-dragging");
    phys.dragging = false; phys.awake = true;
    phys.v = Math.max(-260, Math.min(260, phys.v));
    start = null;
    if (wasClick && e.type === "pointerup") flip();
  };
  badge.addEventListener("pointerup", release);
  badge.addEventListener("pointercancel", release);

  // scrolling tugs the strap a little while the hero is on screen
  if (lenis) {
    let heroVisible = true;
    ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: (s) => (heroVisible = s.isActive) });
    lenis.on("scroll", ({ velocity }) => {
      if (!heroVisible || phys.dragging) return;
      phys.v += Math.max(-6, Math.min(6, velocity * 0.9));
      phys.awake = true;
    });
  }

  /* ---------------- Stickers: peel one, the rest step back ---------------- */
  const stickerList = document.querySelector("[data-stickers]");
  stickerList.querySelectorAll(".sticker").forEach((s) => {
    const on = () => { stickerList.classList.add("is-peeking"); s.classList.add("is-peeled"); };
    const off = () => { stickerList.classList.remove("is-peeking"); s.classList.remove("is-peeled"); };
    s.addEventListener("pointerenter", on);
    s.addEventListener("pointerleave", off);
    s.addEventListener("focus", on);
    s.addEventListener("blur", off);
  });

  /* ---------------- First viewport: the one authored entrance ---------------- */
  if (!reduce) {
    const tl = gsap.timeline({ delay: 0.12, defaults: { ease: "expo.out" } });
    tl.from(nav, { opacity: 0, duration: 0.6 }, 0)
      .from(pendulum, {
        y: () => -window.innerHeight * 0.95, duration: 0.78, ease: "power3.in",
        onComplete: () => { gsap.set(pendulum, { clearProps: "y" }); render(); kick(58); },
      }, 0.05)
      .from(".stickers .slot-li", { opacity: 0, scale: 1.22, rotation: 9, duration: 0.5, ease: "back.out(1.5)", stagger: 0.075, clearProps: "transform" }, 0.62)
      .from(".lede .line > span", { yPercent: 108, duration: 0.9, stagger: 0.09 }, 0.78)
      .from(".statement .hero-actions .btn", { opacity: 0, y: 14, duration: 0.6, stagger: 0.07 }, 1.0);
  }

  /* ---------------- About: stack stickers slap on, once ---------------- */
  if (!reduce) {
    gsap.from("[data-chips] .chip", {
      opacity: 0, scale: 1.3, rotation: "+=10", duration: 0.45, ease: "back.out(1.6)", stagger: 0.045,
      scrollTrigger: { trigger: "[data-chips]", start: "top 82%", once: true },
    });
  }

  /* ---------------- Work: leader lines draw to the result ---------------- */
  document.querySelectorAll(".project").forEach((card) => {
    const path = card.querySelector(".leader path");
    const dot = card.querySelector(".lead-dot");
    const pin = card.querySelector(".pin");
    if (!path || reduce) return;
    gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(dot, { opacity: 0 });
    gsap.set(pin, { opacity: 0, y: 10, scale: 0.96 });
    gsap.timeline({ scrollTrigger: { trigger: card, start: "top 72%", once: true } })
      .fromTo(dot, { scale: 0 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" })
      .to(path, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, 0.05)
      .to(pin, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, 0.62);
  });

  /* ---------------- Achievements: the badge collection fans out ---------------- */
  const fan = document.querySelector("[data-fan]");
  const items = [...fan.querySelectorAll(".fan-item")];
  const caption = document.querySelector("[data-fan-caption]");
  const prev = document.querySelector("[data-fan-prev]");
  const next = document.querySelector("[data-fan-next]");
  let active = 2;
  let fanned = false;
  const layout = (dur = 0.7) => {
    const spread = Math.min(Math.max(window.innerWidth * 0.135, 150), 220);
    items.forEach((el, i) => {
      const d = i - active, ad = Math.abs(d);
      gsap.to(el, {
        x: d * spread, y: ad * 26, rotation: d * 7.5, scale: 1 - ad * 0.075,
        opacity: ad > 2 ? 0 : 1, zIndex: 10 - ad,
        duration: reduce ? 0 : dur, ease: "expo.out", overwrite: "auto",
      });
      el.setAttribute("aria-current", d === 0 ? "true" : "false");
    });
    const cur = items[active];
    caption.innerHTML = `<b>${cur.dataset.title}.</b> ${cur.dataset.what}`;
    prev.disabled = active === 0;
    next.disabled = active === items.length - 1;
  };
  const go = (i) => { active = Math.max(0, Math.min(items.length - 1, i)); layout(); };
  const enableFan = () => {
    if (fanned || !wide()) return;
    fanned = true;
    fan.classList.add("is-fanned");
    gsap.set(items, { x: 0, y: 60, rotation: 0, scale: 0.9, opacity: 0 });
    ScrollTrigger.create({ trigger: fan, start: "top 78%", once: true, onEnter: () => layout(reduce ? 0 : 0.95) });
    ScrollTrigger.refresh();
  };
  enableFan();
  if (!fanned) { const w = items[active]; fan.scrollLeft = w.offsetLeft - fan.offsetLeft - (fan.clientWidth - w.offsetWidth) / 2; }
  window.addEventListener("resize", () => { enableFan(); if (fanned) layout(0); });
  prev.addEventListener("click", () => go(active - 1));
  next.addEventListener("click", () => go(active + 1));
  items.forEach((el, i) => el.addEventListener("click", () => { if (!fan.dataset.dragged) go(i); }));
  fan.parentElement.addEventListener("keydown", (e) => {
    if (!fanned) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
  });
  let fx = null;
  fan.addEventListener("pointerdown", (e) => { if (fanned) { fx = e.clientX; delete fan.dataset.dragged; } });
  window.addEventListener("pointerup", (e) => {
    if (fx === null) return;
    const dx = e.clientX - fx; fx = null;
    if (Math.abs(dx) > 48) { fan.dataset.dragged = "1"; go(active + (dx < 0 ? 1 : -1)); setTimeout(() => delete fan.dataset.dragged, 0); }
  });

  /* ---------------- Activities: the agenda, photo trails the cursor ---------------- */
  const agenda = document.querySelector("[data-agenda]");
  const preview = document.querySelector("[data-preview]");
  const pimg = preview.querySelector("img");
  const rows = [...agenda.querySelectorAll("a")];
  rows.forEach((r) => { const im = new Image(); im.src = r.dataset.photo; });
  const xTo = gsap.quickTo(preview, "x", { duration: reduce ? 0 : 0.55, ease: "power3" });
  const yTo = gsap.quickTo(preview, "y", { duration: reduce ? 0 : 0.55, ease: "power3" });
  const show = (row) => {
    rows.forEach((r) => r.classList.toggle("is-active", r === row));
    agenda.classList.add("is-hovering");
    if (pimg.getAttribute("src") !== row.dataset.photo) pimg.src = row.dataset.photo;
    gsap.to(preview, { opacity: 1, scale: 1, rotation: gsap.utils.random(-4, 4), duration: reduce ? 0 : 0.4, ease: "expo.out", overwrite: "auto" });
  };
  const hide = () => {
    rows.forEach((r) => r.classList.remove("is-active"));
    agenda.classList.remove("is-hovering");
    gsap.to(preview, { opacity: 0, scale: 0.85, duration: reduce ? 0 : 0.25, ease: "power2.in", overwrite: "auto" });
  };
  rows.forEach((r) => {
    r.addEventListener("pointerenter", () => show(r));
    r.addEventListener("focus", () => {
      const b = r.getBoundingClientRect();
      xTo(Math.min(b.right - preview.offsetWidth - 180, window.innerWidth - preview.offsetWidth - 24));
      yTo(b.top + b.height / 2 - preview.offsetHeight / 2);
      show(r);
    });
    r.addEventListener("blur", hide);
  });
  let px = -1, py = -1;
  agenda.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; xTo(px + 28); yTo(py - preview.offsetHeight / 2); });
  agenda.addEventListener("pointerleave", hide);
  // the page moves under a still cursor while scrolling: re-check what is under it
  const recheck = () => {
    if (px < 0 || !finePointer) return;
    const row = document.elementFromPoint(px, py)?.closest("[data-agenda] a");
    if (row) { if (!row.classList.contains("is-active")) show(row); } else if (agenda.classList.contains("is-hovering")) hide();
  };
  ScrollTrigger.create({ trigger: agenda, start: "top bottom", end: "bottom top", onUpdate: recheck, onLeave: hide, onLeaveBack: hide });
})();
