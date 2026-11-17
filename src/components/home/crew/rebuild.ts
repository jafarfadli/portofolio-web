/**
 * "Watch the agents rebuild this page": the page clears, and a crew of agent cursors builds it back piece by piece.
 * A cursor drags out a frame with its size, then fills it: text is typed in left to right under an I-beam, everything
 * else sweeps in from the top. Pieces unlock as they come into view, so scrolling ahead leaves blank space the crew
 * catches up on, and more agents join while there is a backlog. Esc or Skip shows the page at once.
 *
 * Only the visitor's click starts it, so the page never waits on it, and it never runs under reduced motion.
 */
import { gsap } from "gsap";
import { agentName, crewLayer, pageRect, spawnCursor, type Cursor } from "./cursor";
import * as sfx from "./sound";

/** Built as one piece, never split: media, controls, small printed things, and parts that move on their own. */
const ATOMIC = [
  "img", "svg", "canvas", "video", "button", "input", "textarea", "select",
  ".btn", ".chip", ".tag", ".role", ".pin", ".feat-tag", ".ico-stk", ".lead-dot",
  ".badge", ".strap", ".hw", ".slot-li", ".print", ".reel", ".qr",
].join(",");
/** Never touched: decoration behind everything, screen-reader text, the closed mobile menu, and the crew itself. */
const SKIP = ".hero-dust, .cord, .sr-only, .skip, .menu-sheet, .crew, .crew-bar, [hidden], [aria-hidden='true'] .sr-only";

type Piece = { el: HTMLElement | SVGElement; kind: "text" | "box"; chars: number; state: "wait" | "claimed" | "built" };

function collect(roots: Element[]): Piece[] {
  const out: Piece[] = [];
  const walk = (el: Element) => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement) || el.matches(SKIP)) return;
    const r = el.getBoundingClientRect();
    const style = el.ownerDocument.defaultView!.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;
    if (el.matches(ATOMIC) && r.width * r.height >= 40) {
      out.push({ el, kind: "box", chars: 0, state: "wait" });
      return;
    }
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim() !== "");
    if (text && r.width * r.height >= 40) {
      out.push({ el, kind: "text", chars: (el.textContent ?? "").trim().length, state: "wait" });
      return;
    }
    for (const child of el.children) walk(child);
  };
  roots.forEach(walk);
  return out;
}

export type Rebuild = { stop: () => void };

export function startRebuild(doc: Document, opts: { toTop: () => void; onEnd?: () => void }): Rebuild {
  const win = doc.defaultView!;
  const small = win.innerWidth < 760;
  const BASE = small ? 5 : 8;
  const MAX = small ? 8 : 14;
  const pieces = collect([...doc.querySelectorAll("[data-nav], main")]);
  const { layer, destroy } = crewLayer(doc);
  const crew: Cursor[] = [];
  const t0 = performance.now();
  let built = 0;
  let over = false;
  let pointer = { x: win.scrollX + win.innerWidth / 2, y: win.scrollY + win.innerHeight / 2 };
  const ac = new AbortController();
  win.addEventListener("pointermove", (e) => { pointer = { x: e.clientX + win.scrollX, y: e.clientY + win.scrollY }; }, { signal: ac.signal });

  /* ---------- The bar: progress, sound, skip ---------- */
  const bar = doc.createElement("div");
  bar.className = "crew-bar";
  bar.innerHTML =
    '<p class="crew-status" role="status"></p>' +
    '<button type="button" class="crew-btn" data-sound></button>' +
    '<button type="button" class="crew-btn" data-skip>Skip</button>';
  doc.body.append(bar);
  const status = bar.querySelector<HTMLElement>(".crew-status")!;
  const soundBtn = bar.querySelector<HTMLButtonElement>("[data-sound]")!;
  const skipBtn = bar.querySelector<HTMLButtonElement>("[data-skip]")!;
  const paintSound = () => {
    soundBtn.textContent = sfx.isMuted() ? "Sound off" : "Sound on";
    soundBtn.setAttribute("aria-pressed", String(!sfx.isMuted()));
  };
  paintSound();
  soundBtn.addEventListener("click", () => { sfx.unlock(); sfx.setMuted(!sfx.isMuted()); paintSound(); }, { signal: ac.signal });
  skipBtn.addEventListener("click", () => (over ? end() : finish(true)), { signal: ac.signal });
  win.addEventListener("keydown", (e) => { if (e.key === "Escape") finish(true); }, { signal: ac.signal });
  const paintStatus = () => {
    status.textContent = `${crew.length} agents rebuilding: ${built} of ${pieces.length}`;
  };
  paintStatus();
  gsap.fromTo(bar, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.6)" });

  /* ---------- Clear the page, then go to the top ---------- */
  sfx.sweep();
  pieces.forEach((p) => p.el.classList.add("crew-wait"));
  const tick = () => {
    if (over) return;
    const backlog = pieces.filter((p) => p.state === "wait" && inView(p.el)).length;
    if (backlog > crew.length * 2 && crew.length < MAX) join(true);
  };
  win.setTimeout(() => {
    if (over) return;
    opts.toTop();
    for (let i = 0; i < BASE; i++) join(false);
  }, 520);
  const ticker = win.setInterval(tick, 700);

  function inView(el: Element): boolean {
    const r = el.getBoundingClientRect();
    return r.bottom > -80 && r.top < win.innerHeight * 1.1;
  }

  function join(late: boolean) {
    const c = spawnCursor(layer, agentName(crew.length));
    crew.push(c);
    const cx = win.scrollX + win.innerWidth / 2;
    const cy = win.scrollY + win.innerHeight / 2;
    if (late) {
      c.place(win.scrollX + Math.random() * win.innerWidth, win.scrollY + win.innerHeight + 30);
    } else {
      // The first crew fans out from the middle of the screen.
      const a = (crew.length / BASE) * Math.PI * 2;
      c.place(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
      gsap.from(c.el, { opacity: 0, scale: 0.4, duration: 0.3 });
    }
    paintStatus();
    win.setTimeout(() => work(c), late ? 0 : 200 + crew.length * 60);
  }

  function pick(c: Cursor): Piece | null {
    let best: Piece | null = null;
    let score = Infinity;
    for (const p of pieces) {
      if (p.state !== "wait" || !inView(p.el)) continue;
      const r = p.el.getBoundingClientRect();
      // Top of the page first, then whatever is nearest this agent.
      const s = r.top * 1.4 + Math.hypot(r.left + win.scrollX - c.x, r.top + win.scrollY - c.y) * 0.5;
      if (s < score) { score = s; best = p; }
    }
    return best;
  }

  function work(c: Cursor) {
    if (over) return;
    const p = pick(c);
    if (!p) {
      if (pieces.every((q) => q.state === "built")) return finish(false);
      // Nothing in view to build: wander near the bottom of the screen until the visitor scrolls on.
      const tl = c.to(win.scrollX + Math.random() * win.innerWidth, win.scrollY + win.innerHeight * (0.55 + Math.random() * 0.35), 0.9);
      tl.eventCallback("onComplete", () => win.setTimeout(() => work(c), 120));
      return;
    }
    p.state = "claimed";
    const backlog = pieces.filter((q) => q.state === "wait" && inView(q.el)).length;
    const pace = backlog > crew.length * 3 ? 0.55 : backlog > crew.length ? 0.8 : 1;
    build(c, p, pace).eventCallback("onComplete", () => {
      p.state = "built";
      built++;
      paintStatus();
      work(c);
    });
  }

  function build(c: Cursor, p: Piece, pace: number): gsap.core.Timeline {
    const r = pageRect(p.el);
    const tl = gsap.timeline();
    const travel = Math.min(0.5, Math.max(0.16, Math.hypot(r.x - c.x, r.y - c.y) / 1800)) * pace;
    c.shape("arrow");
    c.to(r.x, r.y, travel, tl);
    // The frame: dragged out from the top left corner with a live size readout.
    const frame = doc.createElement("div");
    frame.className = p.kind === "text" ? "crew-frame is-text" : "crew-frame";
    frame.innerHTML = "<span></span>";
    const size = frame.firstElementChild as HTMLElement;
    const drag = Math.min(0.4, Math.max(0.12, Math.sqrt(r.w * r.h) / 1100)) * pace;
    const box = { w: 0, h: 0 };
    tl.call(() => {
      c.shape("cross");
      layer.append(frame);
      gsap.set(frame, { x: r.x, y: r.y, width: 0, height: 0 });
      sfx.click(r.x - win.scrollX);
    });
    c.press(tl);
    tl.to(box, {
      w: r.w, h: r.h, duration: drag, ease: "power2.out",
      onUpdate: () => {
        frame.style.width = `${box.w}px`;
        frame.style.height = `${box.h}px`;
        size.textContent = `${Math.round(box.w)} × ${Math.round(box.h)}`;
      },
    }, "<");
    c.to(r.x + r.w, r.y + r.h, drag, tl, "<");
    tl.call(() => sfx.click(r.x + r.w - win.scrollX, true));

    if (p.kind === "text") {
      // Typed in: the line uncovers left to right under an I-beam, a key sound per few letters.
      const type = Math.min(0.9, Math.max(0.18, p.chars * 0.011)) * pace;
      const mid = r.y + Math.min(r.h / 2, 18);
      tl.call(() => {
        c.shape("text");
        p.el.classList.remove("crew-wait");
        p.el.style.clipPath = "inset(0 100% 0 0)";
      });
      c.to(r.x, mid, 0.08, tl);
      const reveal = { v: 100 };
      tl.to(reveal, {
        v: 0, duration: type, ease: "none",
        onUpdate: () => {
          p.el.style.clipPath = `inset(0 ${reveal.v}% 0 0)`;
          if (Math.random() < 0.55) sfx.key(r.x + r.w * (1 - reveal.v / 100) - win.scrollX, Math.random() < 0.15);
        },
      });
      c.to(r.x + r.w, mid, type, tl, "<");
    } else {
      // Filled: the piece sweeps in from the top, with a soft thock as it lands.
      const sweep = Math.min(0.4, Math.max(0.16, r.h / 1000)) * pace;
      tl.call(() => {
        p.el.classList.remove("crew-wait");
        p.el.style.clipPath = "inset(0 0 100% 0)";
        sfx.thock(r.x + r.w / 2 - win.scrollX);
      });
      const reveal = { v: 100 };
      tl.to(reveal, { v: 0, duration: sweep, ease: "power2.out", onUpdate: () => { p.el.style.clipPath = `inset(0 0 ${reveal.v}% 0)`; } });
    }
    tl.call(() => { p.el.style.clipPath = ""; });
    // The frame fades on its own while the agent is already on its way to the next piece.
    tl.call(() => { gsap.to(frame, { opacity: 0, duration: 0.25, onComplete: () => frame.remove() }); });
    return tl;
  }

  function finish(skipped: boolean) {
    if (over) return;
    over = true;
    win.clearInterval(ticker);
    pieces.forEach((p) => { p.el.classList.remove("crew-wait"); p.el.style.clipPath = ""; });
    layer.querySelectorAll(".crew-frame").forEach((f) => f.remove());
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    if (skipped) {
      crew.forEach((c) => c.remove());
      end();
      return;
    }
    // Done: the crew gathers at the visitor's pointer, then clocks out.
    sfx.chord();
    status.textContent = `Rebuilt by ${crew.length} agents in ${secs}s.`;
    skipBtn.textContent = "Close";
    crew.forEach((c, i) => {
      c.shape("arrow");
      gsap.killTweensOf(c.el);
      const a = (i / crew.length) * Math.PI * 2;
      const tl = c.to(pointer.x + Math.cos(a) * 46, pointer.y + Math.sin(a) * 46, 0.7);
      tl.to(c.el, { opacity: 0, duration: 0.5, delay: 0.9 + i * 0.05, onComplete: () => c.remove() });
    });
    win.setTimeout(end, 5200);
  }

  let ended = false;
  function end() {
    if (ended) return;
    ended = true;
    over = true;
    ac.abort();
    gsap.to(bar, { y: 40, opacity: 0, duration: 0.3, onComplete: () => bar.remove() });
    win.setTimeout(destroy, 2500);
    opts.onEnd?.();
  }

  return { stop: () => { finish(true); bar.remove(); destroy(); } };
}
