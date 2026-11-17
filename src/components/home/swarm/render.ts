/**
 * Draws what the agents show while they work, in the swarm's layer over the page (page coordinates): selection boxes
 * with handles and a W x H badge, placeholders, copy outlines with the gap measured, carets, text highlights, pen
 * paths. Immediate mode: every frame the agents say what they show, and pooled nodes are laid out to match. In the
 * page's palette, by the ground under each mark: stock on the navy sections, ink on the concrete ones, with the live
 * dot's green for copies and gaps.
 */
import { frameBounds, frameStyle, mapLocal, type Box, type Frame } from "./geom";
import { IMAGE_GLYPH } from "./look";
import type { Ov } from "./types";

const SVGNS = "http://www.w3.org/2000/svg";
const NAV_H = 72;

type Pools = { [k: string]: Element[] };
type Ground = { top: number; bottom: number; light: boolean };

function plain(f: Frame | undefined, b: Box, sx: number, sy: number): Box | null {
  // a frame that only moves and scales (a growing heading) is drawn as a plain box, so its rules stay 1px
  if (!f) return b;
  if (f.rot || f.m) return null;
  const p = mapLocal(f, b.x, b.y, sx, sy);
  return { x: p.x, y: p.y, w: b.w * f.sx, h: b.h * f.sy };
}

export class Overlay {
  readonly layer: HTMLElement;
  private readonly doc: Document;
  private readonly ink: SVGSVGElement;
  private readonly pools: Pools = {};
  private used: Record<string, number> = {};
  private grounds: Ground[] = [];
  private sy = 0;

  constructor(doc: Document) {
    this.doc = doc;
    this.layer = doc.createElement("div");
    this.layer.className = "sw-layer";
    this.layer.setAttribute("aria-hidden", "true");
    this.ink = doc.createElementNS(SVGNS, "svg");
    this.ink.classList.add("sw-ink");
    this.layer.append(this.ink);
    doc.body.append(this.layer);
    this.fit();
  }

  /** The layer is as tall as the page and clips what flies past its edges; the grounds under it are read again. */
  fit(): void {
    const h = this.doc.documentElement.scrollHeight;
    this.layer.style.height = `${h}px`;
    this.ink.setAttribute("height", String(h));
    const sy = this.doc.defaultView?.scrollY ?? 0;
    this.grounds = [...this.doc.querySelectorAll<HTMLElement>("main > section")].map((s) => {
      const r = s.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy, light: s.classList.contains("theme-light") };
    });
  }

  /** Whether a mark at this page y sits on a light ground. The nav, fixed at the top and navy, is dark. */
  light(y: number, fixed = false): boolean {
    if (fixed || y - this.sy < NAV_H) return false;
    for (const g of this.grounds) if (y >= g.top && y < g.bottom) return g.light;
    return false;
  }

  destroy(): void {
    this.layer.remove();
  }

  private take<T extends Element>(kind: string, make: () => T): T {
    const pool = (this.pools[kind] ??= []);
    const i = (this.used[kind] = (this.used[kind] ?? 0) + 1) - 1;
    if (!pool[i]) pool[i] = make();
    const el = pool[i] as T;
    if ((el as unknown as HTMLElement).hidden) (el as unknown as HTMLElement).hidden = false;
    if (el instanceof SVGElement && el.style.display) el.style.display = "";
    return el;
  }

  private div(cls: string, html = ""): HTMLElement {
    const d = this.doc.createElement("div");
    d.className = cls;
    if (html) d.innerHTML = html;
    this.layer.append(d);
    return d;
  }

  private svg<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    const n = this.doc.createElementNS(SVGNS, tag);
    this.ink.append(n);
    return n;
  }

  /** Lays out everything the agents show this frame. */
  draw(list: Ov[], sx: number, sy: number): void {
    this.used = {};
    this.sy = sy;
    for (const o of list) {
      if (o.t === "box") this.box(o, sx, sy);
      else if (o.t === "caret") {
        const n = this.take("caret", () => this.div("sw-caret"));
        const p = o.f ? mapLocal(o.f, o.x, o.y, sx, sy) : { x: o.x, y: o.y };
        const k = o.f ? o.f.sy : 1;
        n.classList.toggle("is-light", this.light(p.y, o.f?.fixed));
        n.style.cssText = `left:${p.x}px;top:${p.y}px;height:${o.h * k}px`;
      } else if (o.t === "hl") {
        for (const r of o.rects) {
          const n = this.take("hl", () => this.div("sw-hl"));
          const b = plain(o.f, r, sx, sy);
          if (b) n.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
          else {
            const st = frameStyle(o.f!, r, sx, sy);
            n.style.cssText = `left:${st.left}px;top:${st.top}px;width:${r.w}px;height:${r.h}px;${st.css}`;
          }
          n.classList.toggle("is-light", this.light(b ? b.y : r.y, o.f?.fixed));
        }
      } else if (o.t === "measure") this.measure(o.a, o.b, o.label);
      else if (o.t === "pen") this.pen(o.pts, o.to);
    }
    // hide what this frame did not use
    for (const [kind, pool] of Object.entries(this.pools)) {
      for (let i = this.used[kind] ?? 0; i < pool.length; i++) {
        const el = pool[i] as HTMLElement | SVGElement;
        if (el instanceof SVGElement) el.style.display = "none";
        else if (!el.hidden) el.hidden = true;
      }
    }
  }

  private box(o: Extract<Ov, { t: "box" }>, sx: number, sy: number): void {
    const n = this.take("box", () => this.div("sw-box", `<i class="sw-ph">${IMAGE_GLYPH}</i><b data-c="tl"></b><b data-c="tr"></b><b data-c="bl"></b><b data-c="br"></b>`));
    const b = plain(o.f, o.b, sx, sy);
    let bounds: Box;
    if (b) {
      n.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`;
      bounds = b;
    } else {
      const st = frameStyle(o.f!, o.b, sx, sy);
      n.style.cssText = `left:${st.left}px;top:${st.top}px;width:${o.b.w}px;height:${o.b.h}px;${st.css}`;
      bounds = frameBounds(o.f!, sx, sy, o.b);
    }
    const light = this.light(bounds.y + Math.min(bounds.h, 60) / 2, o.f?.fixed);
    n.className = `sw-box${o.copy ? " is-copy" : ""}${o.handles ? " has-hd" : ""}${o.thin ? " is-thin" : ""}${light ? " is-light" : ""}`;
    n.dataset.ph = String(o.ph ?? 0);
    if (o.ph) n.style.setProperty("--ph-op", String(o.phOp ?? 1));
    if (o.badge) {
      const t = this.take("badge", () => this.div("sw-badge"));
      if (t.textContent !== o.badge) t.textContent = o.badge;
      t.className = `sw-badge${o.copy ? " is-copy" : ""}${this.light(bounds.y + bounds.h + 10, o.f?.fixed) ? " is-light" : ""}`;
      t.style.cssText = `left:${bounds.x + bounds.w / 2}px;top:${bounds.y + bounds.h + 7}px`;
    }
  }

  private measure(a: { x: number; y: number }, b: { x: number; y: number }, label: string): void {
    const line = this.take("mline", () => {
      const l = this.svg("path");
      l.setAttribute("class", "sw-mline");
      return l;
    });
    const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
    const tick = (p: { x: number; y: number }) => (horiz ? `M${p.x} ${p.y - 4}V${p.y + 4}` : `M${p.x - 4} ${p.y}H${p.x + 4}`);
    line.setAttribute("d", `M${a.x} ${a.y}L${b.x} ${b.y}${tick(a)}${tick(b)}`);
    const t = this.take("mlabel", () => this.div("sw-badge is-copy"));
    if (t.textContent !== label) t.textContent = label;
    t.style.cssText = `left:${(a.x + b.x) / 2}px;top:${(a.y + b.y) / 2 + (horiz ? 6 : -9)}px`;
  }

  private pen(pts: { x: number; y: number }[], to: { x: number; y: number } | undefined): void {
    if (!pts.length) return;
    const light = this.light(pts[0].y);
    const path = this.take("pen", () => {
      const p = this.svg("path");
      p.setAttribute("class", "sw-pen");
      return p;
    });
    path.setAttribute("d", pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(""));
    path.classList.toggle("is-light", light);
    if (to) {
      const band = this.take("band", () => {
        const l = this.svg("path");
        l.setAttribute("class", "sw-band");
        return l;
      });
      const p = pts[pts.length - 1];
      band.setAttribute("d", `M${p.x} ${p.y}L${to.x} ${to.y}`);
      band.classList.toggle("is-light", light);
    }
    for (const p of pts) {
      const r = this.take("anchor", () => {
        const a = this.svg("rect");
        a.setAttribute("class", "sw-anchor");
        a.setAttribute("width", "7");
        a.setAttribute("height", "7");
        return a;
      });
      r.setAttribute("x", String(p.x - 3.5));
      r.setAttribute("y", String(p.y - 3.5));
      r.classList.toggle("is-light", light);
    }
  }
}
