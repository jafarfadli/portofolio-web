/* Case study page - Read surface. Motion only explains state: where you are, how the parts connect, what the demo shows.
   Everything is readable with scripts off: index links work, the flows list describes the architecture, the video has a poster. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = () => window.matchMedia("(max-width: 860px)").matches;

  /* ---------- Program index: mark the section being read ---------- */
  const index = document.querySelector("[data-index]");
  const links = [...index.querySelectorAll("a")];
  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const setCurrent = (id) => {
    links.forEach((a) => a.removeAttribute("aria-current"));
    const a = byId.get(id);
    if (!a) return;
    a.setAttribute("aria-current", "true");
    if (narrow()) { // keep the active pill in view inside the horizontal row, never scroll the page
      const row = index.querySelector("ol");
      const left = a.offsetLeft - (row.clientWidth - a.offsetWidth) / 2;
      row.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    }
  };
  // current = the last section whose top has passed 35% of the viewport; before the first one, the first one
  const sections = [...document.querySelectorAll(".cs-page")];
  let shown = "";
  const pick = () => {
    const line = window.innerHeight * 0.35;
    let cur = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= line) cur = s;
    if (cur.id !== shown) { shown = cur.id; setCurrent(cur.id); }
  };
  // scroll, not IntersectionObserver: a jump between two spots where no section crosses a threshold must still update
  let queued = false;
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; pick(); }); };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  pick();

  /* ---------- Architecture: wire the booths, draw the cords when reached ---------- */
  const arch = document.querySelector("[data-arch]");
  const svg = arch.querySelector(".arch-wires");
  const flows = [...document.querySelectorAll("[data-wires] li")];
  const NS = "http://www.w3.org/2000/svg";
  const draw = () => {
    svg.replaceChildren();
    const stacked = narrow(); // under 860px the booths hang in rows, so cords run top to bottom
    const box = arch.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    flows.forEach((li, i) => {
      const a = arch.querySelector(`[data-node="${li.dataset.from}"]`).getBoundingClientRect();
      const b = arch.querySelector(`[data-node="${li.dataset.to}"]`).getBoundingClientRect();
      let x1, y1, x2, y2, d;
      if (stacked && Math.abs(a.top - b.top) > 4) { // stacked rows: leave the bottom edge, arrive at the top edge
        const down = b.top > a.top;
        x1 = a.left + a.width / 2 - box.left; y1 = (down ? a.bottom : a.top) - box.top;
        x2 = b.left + b.width / 2 - box.left; y2 = (down ? b.top : b.bottom) - box.top;
        const dy = (y2 - y1) * 0.5;
        d = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
      } else if (!stacked && Math.abs(a.left - b.left) < 4) { // same column: hang straight down or up
        const up = b.top < a.top;
        x1 = x2 = a.left + a.width / 2 - box.left;
        y1 = (up ? a.top : a.bottom) - box.top;
        y2 = (up ? b.bottom : b.top) - box.top;
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        const ltr = b.left > a.left;
        x1 = (ltr ? a.right : a.left) - box.left; y1 = a.top + a.height / 2 - box.top;
        x2 = (ltr ? b.left : b.right) - box.left; y2 = b.top + b.height / 2 - box.top;
        const dx = (x2 - x1) * 0.5;
        d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      }
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      svg.append(path);
      [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", 4.5);
        svg.append(c);
      });
      if (!reduce && !arch.classList.contains("is-drawn")) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        path.style.transitionDelay = `${i * 90}ms`;
      }
    });
  };
  draw();
  new ResizeObserver(() => draw()).observe(arch);
  const reveal = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    reveal.disconnect();
    arch.classList.add("is-armed");
    requestAnimationFrame(() => {
      arch.classList.add("is-drawn");
      svg.querySelectorAll("path").forEach((p) => { p.style.strokeDashoffset = "0"; });
    });
  }, { threshold: 0.35 });
  if (reduce) arch.classList.add("is-drawn"); else reveal.observe(arch);

  /* ---------- Demo: plays muted only while visible and motion is allowed; always pausable ---------- */
  const video = document.querySelector("[data-demo]");
  const btn = document.querySelector("[data-demo-toggle]");
  video.controls = false; // native controls stay for scripts-off readers; the printed toggle takes over here
  btn.hidden = false;
  let userPaused = false;
  let played = false;
  const sync = () => {
    const playing = !video.paused;
    if (playing) played = true;
    btn.dataset.state = !played ? "idle" : playing ? "playing" : "paused";
    if (played) btn.setAttribute("aria-label", playing ? "Pause demo" : "Play demo"); // idle: the printed label is the name
  };
  video.addEventListener("play", sync);
  video.addEventListener("pause", sync);
  btn.addEventListener("click", () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); }
    else { userPaused = true; video.pause(); }
  });
  if (!reduce) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !userPaused) video.play().catch(() => {});
        else if (!e.isIntersecting) video.pause();
      });
    }, { threshold: 0.5 }).observe(video);
  }
  sync();
})();
