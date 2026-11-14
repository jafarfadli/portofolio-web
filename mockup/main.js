/* Lanyard & Badge - mockup interactions
   Motion grammar: physical. The badge is a damped pendulum, stickers slap down,
   leader lines draw to the result they explain. Everything renders final under reduced motion. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
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
  // drag to swing; a short press without travel turns the badge over (no button: the back is a small find)
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

  /* ---------------- Hero: stickers lean with the mouse ---------------- */
  // each sticker sits at its own depth: the deeper it is, the further it leans toward the cursor
  if (!reduce && finePointer) {
    const hero = document.querySelector(".hero");
    const items = [...stickerList.querySelectorAll(".slot-li")].map((el, i) => ({ el, depth: [1.3, 0.7, 1, 0.55, 1.6][i] ?? 1, x: 0, y: 0 }));
    const aim = { x: 0, y: 0 };
    let leaning = false;
    hero.addEventListener("pointermove", (e) => {
      aim.x = (e.clientX / window.innerWidth) * 2 - 1;
      aim.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!leaning) { leaning = true; gsap.ticker.add(lean); }
    });
    hero.addEventListener("pointerleave", () => { aim.x = 0; aim.y = 0; });
    function lean() {
      let still = true;
      items.forEach((it) => {
        it.x += (aim.x * 16 * it.depth - it.x) * 0.08;
        it.y += (aim.y * 11 * it.depth - it.y) * 0.08;
        if (Math.abs(aim.x * 16 * it.depth - it.x) > 0.05 || Math.abs(aim.y * 11 * it.depth - it.y) > 0.05) still = false;
        it.el.style.setProperty("--px", `${it.x.toFixed(2)}px`);
        it.el.style.setProperty("--py", `${it.y.toFixed(2)}px`);
      });
      if (still) { leaning = false; gsap.ticker.remove(lean); }
    }
  }

  /* ---------------- Hero: a field of punched dust that leans toward the mouse ---------------- */
  // specks a hole punch leaves (stock dots, the odd slot-shaped chad) scattered over the hero ground. Each sits at its
  // own depth: it wanders slowly on its own, and the whole field leans toward the cursor, near specks further than far ones.
  const dust = document.querySelector("[data-dust]");
  if (dust) {
    const hero = dust.parentElement;
    const ctx = dust.getContext("2d");
    const INK = ["242,242,238", "242,242,238", "229,228,223", "201,204,214"];
    const LEAN_X = 150, LEAN_Y = 90, PAD_X = LEAN_X, PAD_Y = LEAN_Y; // px the nearest speck travels at the hero's edge
    let w = 0, h = 0, dpr = 1, specks = [];
    const seed = () => {
      // scattered past every edge by the most a speck can lean, so leaning never uncovers a bare strip
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
    const size = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const grew = Math.abs(r.width - w) > 40 || Math.abs(r.height - h) > 40;
      w = r.width; h = r.height;
      dust.width = Math.round(w * dpr); dust.height = Math.round(h * dpr);
      if (grew || !specks.length) seed();
      draw(0);
    };
    const lean = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
    const draw = (dt) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      lean.x += (aim.x - lean.x) * Math.min(1, dt * 2.2); // the field trails the cursor a little
      lean.y += (aim.y - lean.y) * Math.min(1, dt * 2.2);
      for (const s of specks) {
        s.x = ((s.x + PAD_X + s.vx * dt + w + 2 * PAD_X) % (w + 2 * PAD_X)) - PAD_X;
        s.y = ((s.y + PAD_Y + s.vy * dt + h + 2 * PAD_Y) % (h + 2 * PAD_Y)) - PAD_Y;
        s.rot += s.spin * dt;
        const x = s.x + lean.x * LEAN_X * s.z, y = s.y + lean.y * LEAN_Y * s.z;
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = `rgb(${s.ink})`;
        if (s.chad) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot);
          ctx.beginPath(); ctx.roundRect(-3.2, -1, 6.4, 2, 1); ctx.fill(); ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }
    };
    size();
    new ResizeObserver(size).observe(hero);
    if (!reduce) {
      // the field leans toward the cursor: -1..1 across the hero, eased in draw()
      if (finePointer) {
        hero.addEventListener("pointermove", (e) => {
          const r = hero.getBoundingClientRect();
          aim.x = ((e.clientX - r.left) / r.width) * 2 - 1;
          aim.y = ((e.clientY - r.top) / r.height) * 2 - 1;
        });
        hero.addEventListener("pointerleave", () => { aim.x = 0; aim.y = 0; });
      }
      let on = true, prev = performance.now();
      new IntersectionObserver((es) => { on = es[es.length - 1].isIntersecting; }).observe(hero);
      const tick = (now) => {
        const dt = Math.min((now - prev) / 1000, 0.05);
        prev = now;
        if (on && !document.hidden) draw(dt);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
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

  /* ---------------- Achievements: passes ride past on a strap ---------------- */
  const reel = document.querySelector("[data-reel]");
  const track = reel.querySelector("[data-reel-track]");
  // a second, hidden copy makes the loop seamless (CSS moves the track by half its width)
  [...track.children].forEach((li) => {
    const c = li.cloneNode(true);
    c.classList.add("is-clone");
    c.setAttribute("aria-hidden", "true");
    c.querySelectorAll("img").forEach((im) => { im.alt = ""; });
    track.append(c);
  });
  const pace = () => track.style.setProperty("--reel-dur", `${Math.round(track.scrollWidth / 2 / 38)}s`); // about 38px a second
  pace();
  window.addEventListener("resize", pace);
  if (reduce) {
    // no motion: the row stands still and scrolls sideways, by keyboard too
    reel.tabIndex = 0;
    reel.setAttribute("role", "region");
    reel.setAttribute("aria-label", "Achievements, scroll sideways");
  }
  // hover slows the strap to a stroll instead of stopping it (keyboard focus still stops it, in CSS)
  if (!reduce && finePointer) {
    const speed = { r: 1 };
    const ease = (to) => gsap.to(speed, {
      r: to, duration: 0.8, ease: "power2.out", overwrite: true,
      onUpdate: () => track.getAnimations().forEach((a) => { a.playbackRate = speed.r; }),
    });
    reel.addEventListener("pointerenter", () => ease(0.25));
    reel.addEventListener("pointerleave", () => ease(1));
  }
  // each pass flips through its photos, a few seconds apart and out of step with its neighbours;
  // a pass and its clone turn together, so the loop's seam never shows two different photos
  const stacks = [...track.querySelectorAll("[data-photos]")];
  const half = stacks.length / 2;
  if (!reduce) {
    stacks.slice(0, half).forEach((stack, k) => {
      const pair = [stack, stacks[k + half]];
      const count = stack.querySelectorAll(".ach-photo").length;
      if (count < 2) return;
      let at = 0;
      const turn = () => {
        if (reel.classList.contains("is-offscreen") || document.hidden) return;
        at = (at + 1) % count;
        pair.forEach((st) => {
          st.querySelectorAll(".ach-photo").forEach((im, i) => im.classList.toggle("is-on", i === at));
          st.querySelectorAll(".ach-dots i").forEach((d, i) => d.classList.toggle("is-on", i === at));
        });
      };
      setTimeout(() => setInterval(turn, 3600), 1200 + k * 750);
    });
  }
  // the latest entry wins: a jump to #achievements queues "out" and "in" in one batch
  new IntersectionObserver((es) => reel.classList.toggle("is-offscreen", !es[es.length - 1].isIntersecting)).observe(reel);

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
