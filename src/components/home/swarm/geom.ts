/**
 * Geometry for the agent swarm: page boxes, the "frame" of an element (its layout box plus the transforms it is drawn
 * with, so overlays can be drawn tilted with it), and the line boxes of a block of text for typing.
 */
export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
export const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/**
 * An element's untransformed layout box, with the transforms it is drawn with. `fixed` boxes are in viewport
 * coordinates (the nav), the rest in page coordinates. Origin and translate are in px from the box's top left.
 */
export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  fixed: boolean;
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  /** the individual `rotate` property, degrees */
  rot: number;
  sx: number;
  sy: number;
  /** the `transform` matrix, or null for none */
  m: [number, number, number, number, number, number] | null;
};

export function isFixed(el: Element): boolean {
  for (let e: Element | null = el; e && e !== e.ownerDocument.body; e = e.parentElement) {
    if (getComputedStyle(e).position === "fixed") return true;
  }
  return false;
}

function angle(v: string): number {
  if (!v || v === "none") return 0;
  const m = /(-?[\d.]+)(deg|turn|rad|grad)\s*$/.exec(v.trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return m[2] === "turn" ? n * 360 : m[2] === "rad" ? (n * 180) / Math.PI : m[2] === "grad" ? n * 0.9 : n;
}

function lengthIn(v: string | undefined, of: number): number {
  if (!v) return 0;
  return v.endsWith("%") ? (parseFloat(v) / 100) * of : parseFloat(v) || 0;
}

function matrixOf(v: string): Frame["m"] {
  if (!v || v === "none") return null;
  const n = v.match(/-?[\d.e]+/g)?.map(Number) ?? [];
  if (v.startsWith("matrix3d") && n.length === 16) return [n[0], n[1], n[4], n[5], n[12], n[13]];
  if (n.length >= 6) return [n[0], n[1], n[2], n[3], n[4], n[5]];
  return null;
}

const NEUTRAL = ["transform", "rotate", "translate", "scale", "transition"] as const;

/**
 * Takes the transforms off some elements for a measurement, and puts them back. Transitions are held off while the
 * transforms come and go, and the style is settled again before they return, so the lift never starts a transition.
 */
function lift(els: Element[]): () => void {
  const saved = els.map((el) => {
    const st = (el as HTMLElement).style;
    const s = NEUTRAL.map((k) => [st.getPropertyValue(k), st.getPropertyPriority(k)] as const);
    NEUTRAL.forEach((k) => st.setProperty(k, "none", "important"));
    return s;
  });
  return () => {
    els.forEach((el, i) => {
      const st = (el as HTMLElement).style;
      NEUTRAL.forEach((k, j) => {
        if (k === "transition") return;
        const [v, prio] = saved[i][j];
        if (v) st.setProperty(k, v, prio);
        else st.removeProperty(k);
      });
    });
    if (els.length) void getComputedStyle(els[0]).transform; // settle the style with transitions still off
    els.forEach((el, i) => {
      const st = (el as HTMLElement).style;
      const [v, prio] = saved[i][NEUTRAL.length - 1];
      if (v) st.setProperty("transition", v, prio);
      else st.removeProperty("transition");
    });
  };
}

/** Reads the frames of several elements with one forced layout: transforms are lifted, every box read, then put back. */
export function framesOf(els: Element[]): Frame[] {
  const win = els[0]?.ownerDocument.defaultView;
  if (!win) return [];
  const styles = els.map((el) => getComputedStyle(el));
  const parts = styles.map((cs) => ({
    rot: angle(cs.rotate),
    scale: cs.scale && cs.scale !== "none" ? cs.scale.split(/\s+/).map(Number) : [1, 1],
    translate: cs.translate && cs.translate !== "none" ? cs.translate.split(/\s+/) : [],
    m: matrixOf(cs.transform),
    origin: cs.transformOrigin.split(/\s+/).map((v) => parseFloat(v) || 0),
  }));
  const moved = els.filter((_, i) => {
    const p = parts[i];
    return p.rot || p.m || p.translate.length || p.scale[0] !== 1 || (p.scale[1] ?? p.scale[0]) !== 1;
  });
  const putBack = lift(moved);
  const fixed = els.map((el) => isFixed(el));
  const sx = win.scrollX;
  const sy = win.scrollY;
  const frames = els.map((el, i): Frame => {
    const r = el.getBoundingClientRect();
    const p = parts[i];
    return {
      x: r.left + (fixed[i] ? 0 : sx),
      y: r.top + (fixed[i] ? 0 : sy),
      w: r.width,
      h: r.height,
      fixed: fixed[i],
      ox: p.origin[0] ?? r.width / 2,
      oy: p.origin[1] ?? r.height / 2,
      tx: lengthIn(p.translate[0], r.width),
      ty: lengthIn(p.translate[1], r.height),
      rot: p.rot,
      sx: p.scale[0] ?? 1,
      sy: p.scale[1] ?? p.scale[0] ?? 1,
      m: p.m,
    };
  });
  putBack();
  return frames;
}

export function frameOf(el: Element): Frame {
  return framesOf([el])[0];
}

/** The scroll offset to add to a frame's coordinates to get page coordinates. */
export const scrollFor = (f: Frame, sx: number, sy: number): Pt => (f.fixed ? { x: sx, y: sy } : { x: 0, y: 0 });

/** Maps a point in an element's local box (px from its top left) to page coordinates, through its transforms. */
export function mapLocal(f: Frame, lx: number, ly: number, sx: number, sy: number): Pt {
  let x = lx - f.ox;
  let y = ly - f.oy;
  if (f.m) {
    const [a, b, c, d, e, g] = f.m;
    [x, y] = [a * x + c * y + e, b * x + d * y + g];
  }
  x *= f.sx;
  y *= f.sy;
  if (f.rot) {
    const t = (f.rot * Math.PI) / 180;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    [x, y] = [x * cos - y * sin, x * sin + y * cos];
  }
  x += f.tx + f.ox;
  y += f.ty + f.oy;
  const off = scrollFor(f, sx, sy);
  return { x: f.x + x + off.x, y: f.y + y + off.y };
}

/** The page box a frame covers once transformed (its axis-aligned bounds). */
export function frameBounds(f: Frame, sx: number, sy: number, local?: Box): Box {
  const b = local ?? { x: 0, y: 0, w: f.w, h: f.h };
  const pts = [
    mapLocal(f, b.x, b.y, sx, sy),
    mapLocal(f, b.x + b.w, b.y, sx, sy),
    mapLocal(f, b.x, b.y + b.h, sx, sy),
    mapLocal(f, b.x + b.w, b.y + b.h, sx, sy),
  ];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** The CSS that draws a node at a local box of a frame, tilted and moved exactly as the element is. */
export function frameStyle(f: Frame, b: Box, sx: number, sy: number): { left: number; top: number; css: string } {
  const off = scrollFor(f, sx, sy);
  const parts: string[] = [];
  if (f.tx || f.ty) parts.push(`translate(${f.tx}px, ${f.ty}px)`);
  if (f.rot) parts.push(`rotate(${f.rot}deg)`);
  if (f.sx !== 1 || f.sy !== 1) parts.push(`scale(${f.sx}, ${f.sy})`);
  if (f.m) parts.push(`matrix(${f.m.join(",")})`);
  return {
    left: f.x + b.x + off.x,
    top: f.y + b.y + off.y,
    css: parts.length ? `transform-origin:${f.ox - b.x}px ${f.oy - b.y}px;transform:${parts.join(" ")}` : "",
  };
}

/** The rendered page box of an element right now (transforms and all). */
export function pageRect(el: Element): Box {
  const r = el.getBoundingClientRect();
  const win = el.ownerDocument.defaultView!;
  return { x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height };
}

/**
 * The line boxes of a block of text, local to the element's untransformed box, top to bottom. Pieces of one line
 * (a word in bold, an inline icon) are merged into one box. Read with the element's own transforms lifted.
 */
export function textLines(el: Element, skip?: (n: Node) => boolean): Box[] {
  const doc = el.ownerDocument;
  const putBack = lift([el]);
  const base = el.getBoundingClientRect();
  const rects: DOMRect[] = [];
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    if (skip?.(n)) continue;
    const range = doc.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 0.5) rects.push(r);
  }
  putBack();
  rects.sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: Box[] = [];
  for (const r of rects) {
    const box = { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
    const last = lines[lines.length - 1];
    const overlap = last ? Math.min(last.y + last.h, box.y + box.h) - Math.max(last.y, box.y) : 0;
    if (last && overlap > Math.min(last.h, box.h) * 0.5) {
      const x = Math.min(last.x, box.x);
      const y = Math.min(last.y, box.y);
      last.w = Math.max(last.x + last.w, box.x + box.w) - x;
      last.h = Math.max(last.y + last.h, box.y + box.h) - y;
      last.x = x;
      last.y = y;
    } else lines.push(box);
  }
  return lines;
}

/** The clip-path that shows only the first `shown[i]` px of each line (a few px of slack round the glyphs). */
export function linesClip(lines: Box[], shown: number[]): string {
  let d = "";
  lines.forEach((l, i) => {
    const w = shown[i] ?? 0;
    if (w <= 0) return;
    const full = w >= l.w - 0.5;
    const x0 = l.x - 3;
    const y0 = l.y - 3;
    const ww = (full ? l.w + 8 : w) + 3;
    d += `M${x0.toFixed(1)} ${y0.toFixed(1)}h${ww.toFixed(1)}v${(l.h + 6).toFixed(1)}h${(-ww).toFixed(1)}Z`;
  });
  return d ? `path("${d}")` : "inset(0 100% 100% 0)";
}
