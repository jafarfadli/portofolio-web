/**
 * The agent crew: pointer cursors with a printed name tag, like the other people in a shared design file. They live in
 * one layer laid over the whole page in page coordinates, so a cursor stays on its target while the page scrolls.
 * Decoration only: the layer is aria-hidden and takes no pointer events.
 */
import { gsap } from "gsap";

/** One pointer with three faces: the arrow, the I-beam for typing, and the crosshair for dragging out a frame. */
const POINTER =
  '<span class="crew-ptr">' +
  '<svg class="is-arrow" viewBox="0 0 20 24" width="20" height="24"><path d="M2 2V19.2L6.6 15L9.6 21.6L12.5 20.4L9.6 13.9H15.6Z" /></svg>' +
  '<svg class="is-text" viewBox="0 0 12 22" width="12" height="22"><path d="M2 2H4.6Q6 2 6 3.6V18.4Q6 20 4.6 20H2M10 2H7.4Q6 2 6 3.6M10 20H7.4Q6 20 6 18.4M3.6 11H8.4" /></svg>' +
  '<svg class="is-cross" viewBox="0 0 22 22" width="22" height="22"><path d="M11 1V8M11 14V21M1 11H8M14 11H21" /></svg>' +
  "</span>";

export type Cursor = {
  el: HTMLElement;
  name: string;
  /** The tip's place on the page. */
  x: number;
  y: number;
  /** Glides the tip to a page point; a slight arc, as a hand moves a mouse. */
  to: (x: number, y: number, dur: number, tl?: gsap.core.Timeline, at?: gsap.Position) => gsap.core.Timeline;
  /** Puts the tip there at once. */
  place: (x: number, y: number) => void;
  /** Squeezes the arrow as a button press would. */
  press: (tl?: gsap.core.Timeline, at?: gsap.Position) => gsap.core.Timeline;
  shape: (s: "arrow" | "text" | "cross") => void;
  remove: () => void;
};

export function agentName(i: number): string {
  return `agent-${String(i + 1).padStart(2, "0")}`;
}

export function crewLayer(doc: Document): { layer: HTMLElement; destroy: () => void } {
  const layer = doc.createElement("div");
  layer.className = "crew";
  layer.setAttribute("aria-hidden", "true");
  doc.body.append(layer);
  // The layer is as tall as the page and clips what flies past its edges: an absolutely placed layer escapes the
  // body's overflow clip, so a cursor arriving from off screen would otherwise widen the page.
  const fit = () => { layer.style.height = `${doc.documentElement.scrollHeight}px`; };
  fit();
  const win = doc.defaultView!;
  win.addEventListener("resize", fit);
  return { layer, destroy: () => { win.removeEventListener("resize", fit); layer.remove(); } };
}

export function spawnCursor(layer: HTMLElement, name: string, opts: { small?: boolean } = {}): Cursor {
  const el = layer.ownerDocument.createElement("div");
  el.className = opts.small ? "crew-cursor is-small" : "crew-cursor";
  el.innerHTML = `${POINTER}<span class="crew-name"><i></i>${name}</span>`;
  el.dataset.shape = "arrow";
  layer.append(el);
  const c: Cursor = {
    el, name, x: 0, y: 0,
    place(x, y) {
      c.x = x;
      c.y = y;
      gsap.set(el, { x, y });
    },
    to(x, y, dur, tl = gsap.timeline(), at) {
      const from = { x: c.x, y: c.y };
      c.x = x;
      c.y = y;
      // x and y on different curves bend the straight line into a soft arc.
      tl.to(el, { x, duration: dur, ease: "power2.inOut" }, at);
      tl.to(el, { y, duration: dur, ease: from.y > y ? "power1.out" : "power2.in" }, "<");
      return tl;
    },
    press(tl = gsap.timeline(), at) {
      const ptr = el.firstElementChild;
      tl.to(ptr, { scale: 0.8, duration: 0.07, ease: "power2.out" }, at);
      tl.to(ptr, { scale: 1, duration: 0.18, ease: "back.out(3)" });
      return tl;
    },
    shape(s) {
      el.dataset.shape = s;
    },
    remove() {
      gsap.killTweensOf(el);
      el.remove();
    },
  };
  return c;
}

/** Page coordinates of an element's box. */
export function pageRect(el: Element): { x: number; y: number; w: number; h: number } {
  const r = el.getBoundingClientRect();
  const win = el.ownerDocument.defaultView!;
  return { x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height };
}

/** A point just outside the viewport, on the side nearest a page point, so a cursor flies in from there. */
export function offstage(doc: Document, x: number, y: number, spread = 120): { x: number; y: number } {
  const win = doc.defaultView!;
  const vx = x - win.scrollX;
  const vy = y - win.scrollY;
  const jitter = () => (Math.random() - 0.5) * spread;
  const d = { l: vx, r: win.innerWidth - vx, t: vy, b: win.innerHeight - vy };
  const side = (Object.keys(d) as (keyof typeof d)[]).reduce((a, k) => (d[k] < d[a] ? k : a), "l");
  if (side === "l") return { x: win.scrollX - 60, y: y + jitter() };
  if (side === "r") return { x: win.scrollX + win.innerWidth + 30, y: y + jitter() };
  if (side === "t") return { x: x + jitter(), y: win.scrollY - 60 };
  return { x: x + jitter(), y: win.scrollY + win.innerHeight + 30 };
}
