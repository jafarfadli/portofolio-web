/**
 * What an agent does for each kind of task, as small scripts stepped once a frame. They change pieces' looks and say
 * what the agent shows (a.ov); the engine writes and draws. Times are in seconds at 1x build speed.
 */
import { clamp, easeInOut, easeOut, frameBounds, rand, type Box, type Frame, type Pt } from "./geom";
import { ghostOf } from "./ghost";
import type { Swarm } from "./swarm";
import type { Act, Agent, Group, Member, Ov, Part, Piece, Task } from "./types";

type ActFn = (sw: Swarm, a: Agent, t: Task) => Act;

const full = (f: Frame): Box => ({ x: 0, y: 0, w: f.w, h: f.h });
const size = (w: number, h: number) => `${Math.round(w)} × ${Math.round(h)}`;
const sel = (f: Frame, extra: Partial<Extract<Ov, { t: "box" }>> = {}): Ov => ({ t: "box", f, b: full(f), handles: true, badge: size(f.w, f.h), ...extra });

/** Where a drag across a box should end: its far corner, or the screen's edge for a box bigger than the screen. */
function dragEnd(sw: Swarm, f: Frame): Pt {
  const tl = sw.local(f, 0, 0);
  const maxX = sw.sx + sw.vw - 28 - tl.x;
  const maxY = sw.sy + sw.vh - 84 - tl.y;
  return { x: clamp(Math.min(f.w, maxX), Math.min(f.w, 40), f.w), y: clamp(Math.min(f.h, maxY), Math.min(f.h, 28), f.h) };
}

/**
 * Drags out a piece's frame with the crosshair (a grey placeholder and a live size badge), then lets the real part
 * fill it. A label's words stay hidden (muted) for typing after.
 */
function* frameOut(sw: Swarm, a: Agent, p: Piece, o: { img?: boolean; mute?: boolean; how?: "fade" | "sweep" | "pop"; shown?: () => void } = {}): Act {
  const f0 = sw.frame(p);
  const ph: 1 | 2 = o.img ? 2 : 1;
  a.shape = "cross";
  yield* sw.moveTo(a, () => sw.local(sw.frame(p), 0, 0));
  a.press = 1;
  const draw = { w: 0, h: 0 };
  a.ov = () => [{ t: "box", f: sw.frame(p), b: { x: 0, y: 0, w: draw.w, h: draw.h }, handles: true, badge: size(draw.w, draw.h), ph }];
  const end = dragEnd(sw, f0);
  yield* sw.moveTo(a, () => sw.local(sw.frame(p), end.x, end.y), {
    speed: 1, drag: true, bend: 0,
    onStep: (k) => { draw.w = end.x * k; draw.h = end.y * k; },
  });
  if (end.x < f0.w - 0.5 || end.y < f0.h - 0.5) {
    const w0 = draw.w;
    const h0 = draw.h;
    let k = 0;
    while (k < 1) {
      k = Math.min(1, k + (yield) / 0.3);
      const e = easeOut(k);
      draw.w = w0 + (f0.w - w0) * e;
      draw.h = h0 + (f0.h - h0) * e;
    }
  }
  draw.w = f0.w;
  draw.h = f0.h;
  a.shape = "arrow";
  yield* sw.wait(rand(0.05, 0.1));
  if (o.mute) sw.set(p, { mute: true });
  sw.reveal(p, o.how ?? (o.img ? "sweep" : "fade"));
  o.shown?.();
  let op = 1;
  a.ov = () => [{ t: "box", f: sw.frame(p), b: full(f0), handles: true, badge: size(f0.w, f0.h), ph, phOp: op }];
  while (op > 0) op = Math.max(0, op - (yield) / 0.22);
  a.ov = () => [sel(sw.frame(p))];
}

/** A box or a picture: dragged out, then filled. Tilted ones are built upright and turned later. */
function* box(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  if (t.data.tilt) {
    sw.set(p, { tilt: 0 });
    sw.applyNow(p);
    sw.remeasureWithin(p.el);
  }
  yield* frameOut(sw, a, p, { img: !!t.data.img, how: t.data.pop ? "pop" : undefined, shown: () => { t.ready = true; } });
  yield* sw.wait(t.data.img ? 0.2 : 0.12);
  a.ov = null;
  if (!t.data.more) sw.pieceDone(p);
}

/** Text: a text box dragged over the first line, then typed; headings are typed small and grown. */
function* text(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  const grow = !!t.data.grow;
  sw.startTyping(p);
  const T = p.typing;
  if (!T || !T.lines.length) {
    sw.endTyping(p);
    sw.reveal(p, "fade");
    sw.pieceDone(p);
    return;
  }
  const fs = parseFloat(getComputedStyle(p.el).fontSize) || 16;
  if (grow && fs > 28) sw.set(p, { sc: clamp(18 / fs, 0.1, 1) });
  const all = unionOf(T.lines);
  const L0 = T.lines[0];
  const sc = () => p.look.sc ?? 1;
  a.shape = "cross";
  yield* sw.moveTo(a, () => sw.local(sw.frame(p), L0.x, L0.y));
  if (all.w * sc() > 110) {
    a.press = 1;
    const d = { w: 0, h: 0 };
    a.ov = () => [{ t: "box", f: sw.frame(p), b: { x: L0.x, y: L0.y, w: d.w, h: d.h }, handles: true, badge: size(d.w * sc(), d.h * sc()) }];
    yield* sw.moveTo(a, () => sw.local(sw.frame(p), all.x + all.w, L0.y + L0.h), {
      speed: 0.95, drag: true, bend: 0,
      onStep: (k) => { d.w = (all.x + all.w - L0.x) * k; d.h = L0.h * k; },
    });
  } else yield* sw.click(a);
  a.shape = "ibeam";
  a.ov = () => [{ t: "box", f: sw.frame(p), b: all, thin: true }];
  // step aside, under the line, so the words show as they come
  const aside = { x: rand(-16, 16), y: rand(10, 22) };
  yield* sw.moveTo(a, () => {
    const q = sw.local(sw.frame(p), L0.x + Math.min(all.w, 50), L0.y + L0.h);
    return { x: q.x + aside.x, y: q.y + aside.y };
  }, { speed: 1.6 });
  yield* sw.type(a, p, T.lines.map((_, i) => i), t.data.pace ? Number(t.data.pace) : 1);
  a.caret = null;
  sw.endTyping(p);
  a.shape = "arrow";
  a.ov = () => [sel(sw.frame(p), { badge: size(p.base!.w * sc(), p.base!.h * sc()) })];
  if (grow && p.look.sc !== null) {
    const from = p.look.sc * fs;
    const steps = [24, 32, 40, 48, 56, 64, 72, 88, 104, 120, 144, 168].filter((s) => s > from + 2 && s < fs - 2);
    for (const s of [...steps, fs]) {
      yield* sw.wait(0.045);
      sw.set(p, { sc: s / fs });
    }
    sw.set(p, { sc: null });
    yield* sw.wait(0.12);
  }
  yield* sw.wait(0.1);
  a.ov = null;
  if (!t.data.more) sw.pieceDone(p);
}

/** A label (a chip, a tag, a button): its box, then its words typed into it. */
function* label(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  if (t.data.tilt) {
    sw.set(p, { tilt: 0 });
    sw.applyNow(p);
  }
  yield* frameOut(sw, a, p, { mute: true, shown: () => { t.ready = true; } });
  sw.startTyping(p, true);
  if (p.typing) {
    a.shape = "ibeam";
    a.ov = () => [sel(sw.frame(p), { handles: false, badge: undefined, thin: true })];
    const h = p.typing.lines[0].h;
    const aside = { x: rand(4, 18), y: h + rand(6, 14) };
    yield* sw.moveTo(a, () => {
      const c = sw.caretPoint(p, 0);
      return { x: c.x + aside.x, y: c.y + aside.y };
    }, { speed: 1.5 });
    yield* sw.type(a, p, [0]);
    a.caret = null;
  }
  sw.endTyping(p);
  sw.set(p, { mute: false });
  a.shape = "arrow";
  a.ov = () => [sel(sw.frame(p))];
  yield* sw.wait(0.1);
  a.ov = null;
  if (!t.data.more) sw.pieceDone(p);
}

/** Turns a piece built upright into its own tilt with the rotate handle, its angle on the badge. */
function* tilt(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  if (!p.tiltVia) {
    sw.pieceDone(p);
    return;
  }
  const to = p.tiltDeg;
  const from = p.look.tilt ?? 0;
  const corner = () => {
    const f = sw.frame(p);
    return sw.local(f, f.w + 9, -9);
  };
  a.shape = "arrow";
  yield* sw.moveTo(a, corner);
  a.shape = "rotate";
  a.press = 1;
  a.ov = () => [sel(sw.frame(p), { badge: `${Math.round(p.look.tilt ?? to)}°` })];
  let k = 0;
  while (k < 1) {
    k = Math.min(1, k + (yield) / 0.42);
    sw.set(p, { tilt: from + (to - from) * easeInOut(k) });
    const c = corner();
    a.x = c.x;
    a.y = c.y;
  }
  a.shape = "arrow";
  yield* sw.wait(0.12);
  a.ov = null;
  sw.pieceDone(p);
}

/** A line drawn with the pen: anchor by anchor, the path following the pen. */
function* line(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  const how = sw.linePath(p, String(t.data.axis));
  a.shape = "pen";
  yield* sw.moveTo(a, how.pts[0]);
  yield* sw.click(a);
  const placed: Pt[] = [how.pts[0]];
  if (how.draw) {
    sw.reveal(p, "now");
    how.draw(0);
  }
  a.ov = () => [{ t: "pen", pts: placed, to: { x: a.x, y: a.y }, c: a.color }];
  for (let i = 1; i < how.pts.length; i++) {
    const f0 = how.at[i - 1];
    const f1 = how.at[i];
    yield* sw.moveTo(a, how.pts[i], { speed: 0.85, bend: 0, onStep: (k) => how.draw?.(f0 + (f1 - f0) * k) });
    yield* sw.click(a);
    placed.push(how.pts[i]);
  }
  how.draw?.(1);
  a.ov = () => [{ t: "pen", pts: placed, c: a.color }];
  if (!how.draw) sw.reveal(p, "fade");
  t.ready = true;
  yield* sw.moveTo(a, { x: a.x + rand(14, 30), y: a.y + rand(10, 24) }, { speed: 1.4 });
  a.ov = null;
  how.done?.();
  if (!t.data.more) sw.pieceDone(p);
}

/** A result tag's number: clicked into, then it counts up to its value. */
function* count(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  yield* sw.moveTo(a, () => sw.local(sw.frame(p), 12, (p.base?.h ?? 20) / 2));
  yield* sw.click(a);
  a.shape = "ibeam";
  sw.reveal(p, "now");
  sw.pieceDone(p); // the page counts it up
  a.ov = () => [{ t: "box", f: sw.frame(p), b: full(sw.frame(p)), thin: true }];
  for (let i = 0; i < 10; i++) {
    yield* sw.wait(0.07);
  }
  a.shape = "arrow";
  a.ov = null;
}

/** One of several agents typing a paragraph at once: its own run of lines. The last one done finishes it. */
function* par(sw: Swarm, a: Agent, t: Task): Act {
  const p = t.piece!;
  if (!p.typing) sw.startTyping(p);
  const T = p.typing;
  if (!T) {
    sw.reveal(p, "fade");
    sw.pieceDone(p);
    return;
  }
  const idx = (t.data.lines as number[]).filter((i) => i < T.lines.length);
  if (!idx.length) return;
  const L = T.lines[idx[0]];
  a.shape = "cross";
  yield* sw.moveTo(a, () => sw.local(sw.frame(p), L.x, L.y));
  yield* sw.click(a);
  a.shape = "ibeam";
  const aside = { x: rand(-10, 30), y: rand(6, 14) };
  yield* sw.moveTo(a, () => {
    const q = sw.local(sw.frame(p), L.x + 40, L.y + L.h);
    return { x: q.x + aside.x, y: q.y + aside.y };
  }, { speed: 1.6 });
  yield* sw.type(a, p, idx, 1.4);
  a.caret = null;
  const all = T.lines.every((l, i) => T.shown[i] >= l.w);
  if (all) {
    sw.endTyping(p);
    a.shape = "arrow";
    a.ov = () => [sel(sw.frame(p))];
    yield* sw.wait(0.3);
    a.ov = null;
    sw.pieceDone(p);
  }
}

/** The gap between two boxes, measured as a design tool shows it: side by side, or one above the other. */
function spacing(a: Box, b: Box): Ov | null {
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  if (oy > 0) {
    const [l, r] = a.x < b.x ? [a, b] : [b, a];
    const gap = r.x - (l.x + l.w);
    if (gap > 2) {
      const y = Math.max(a.y, b.y) + oy / 2;
      return { t: "measure", a: { x: l.x + l.w, y }, b: { x: r.x, y }, label: String(Math.round(gap)) };
    }
  } else if (ox > 0) {
    const [u, d] = a.y < b.y ? [a, b] : [b, a];
    const gap = d.y - (u.y + u.h);
    if (gap > 2) {
      const x = Math.max(a.x, b.x) + ox / 2;
      return { t: "measure", a: { x, y: u.y + u.h }, b: { x, y: d.y }, label: String(Math.round(gap)) };
    }
  }
  return null;
}

function angleOf(f: Frame): number {
  return f.rot + (f.m ? (Math.atan2(f.m[1], f.m[0]) * 180) / Math.PI : 0);
}

/**
 * A copy: the nearest built member is selected, then dragged out with the duplicate key held, as a copy, to where the
 * new one goes (red outlines, the gap measured). There the copy stands in until it is edited.
 */
function* dup(sw: Swarm, a: Agent, t: Task): Act {
  const grp = t.data.group as Group;
  const dst = grp.members[t.data.k as number];
  const df = sw.measureEl(dst.root);
  let src: Member = grp.members[0];
  let best = Infinity;
  for (const m of grp.members) {
    if (!m.built) continue;
    const f = sw.measureEl(m.root);
    const d = Math.hypot(f.x - df.x, f.y - df.y);
    if (d < best) {
      best = d;
      src = m;
    }
  }
  const sf = sw.measureEl(src.root);
  const grab = { x: Math.min(sf.w * rand(0.25, 0.7), 90), y: Math.min(sf.h * rand(0.3, 0.7), 40) };
  a.shape = "arrow";
  yield* sw.moveTo(a, () => sw.local(sf, grab.x, grab.y));
  yield* sw.click(a);
  a.ov = () => [sel(sf)];
  yield* sw.wait(rand(0.1, 0.18));
  a.shape = "dup";
  yield* sw.wait(0.1);
  a.press = 1;
  const g = sw.ghost(ghostOf(src.root, sf, sw.sx, sw.sy));
  t.data.ghost = g;
  const u = { x: a.x, y: a.y };
  const off = { x: df.x - sf.x, y: df.y - sf.y };
  const r0 = angleOf(sf);
  const r1 = angleOf(df);
  let k = 0;
  const ghostBox = () => frameBounds({ ...sf, x: sf.x + off.x * k, y: sf.y + off.y * k, m: null, rot: r0 + (r1 - r0) * k }, sw.sx, sw.sy);
  a.ov = () => {
    const sb = sw.bounds(sf);
    const gb = ghostBox();
    const m = spacing(sb, gb);
    return [{ t: "box", f: sf, b: full(sf), copy: true }, { t: "box", b: gb, copy: true }, ...(m ? [m] : [])];
  };
  yield* sw.moveTo(a, { x: u.x + off.x, y: u.y + off.y }, {
    speed: 0.75, drag: true,
    onStep: (e) => {
      k = e;
      g.style.translate = `${off.x * e}px ${off.y * e}px`;
      g.style.rotate = `${(r1 - r0) * e}deg`;
    },
  });
  sw.dropGhost(g);
  t.data.ghost = null;
  sw.settleCopy(dst, src, false);
  a.shape = "arrow";
  a.ov = () => [sel(df)];
  yield* sw.wait(0.18);
  a.ov = null;
}

/** Text in a copy longer than this is pasted in, not retyped. */
const PASTE = 36;

/**
 * Retypes a copied word: double-click selects the copy's words, which are typed over with this one's own (a long text
 * is pasted over them instead).
 */
function* edit(sw: Swarm, a: Agent, t: Task): Act {
  const part = t.data.part as Part;
  const p = t.piece!;
  const old = part.stand;
  a.shape = "arrow";
  const target = old ? sw.textStart(old) : sw.local(sw.frame(p), 8, (p.base?.h ?? 20) / 2);
  yield* sw.moveTo(a, { x: target.x + rand(6, 26), y: target.y + rand(-2, 3) });
  yield* sw.click(a);
  yield* sw.wait(0.05);
  yield* sw.click(a);
  a.shape = "ibeam";
  if (old) {
    const rects = sw.textRects(old);
    a.ov = () => [{ t: "hl", rects }];
    yield* sw.wait(rand(0.14, 0.22));
    sw.dropGhost(old);
    part.stand = null;
  }
  a.ov = null;
  if (part.kind === "text" && (p.el.textContent ?? "").replace(/\s+/g, " ").trim().length > PASTE) {
    // a long text is pasted over the selection, not retyped: it lands at once, selected
    sw.set(p, { hide: false, mute: false });
    const rects = sw.textRects(p.el);
    a.ov = () => [{ t: "hl", rects }];
    yield* sw.wait(0.24);
    a.ov = null;
    a.shape = "arrow";
    sw.pieceDone(p);
    yield* sw.wait(0.06);
    return;
  }
  sw.startTyping(p, part.kind === "label");
  const T = p.typing;
  if (T) yield* sw.type(a, p, T.lines.map((_, i) => i), 1.4);
  a.caret = null;
  sw.endTyping(p);
  sw.set(p, { mute: false });
  a.shape = "arrow";
  sw.pieceDone(p);
  yield* sw.wait(0.08);
}

/** Swaps a copied picture for this one's own: clicked, then the old one wipes away from the top. */
function* swap(sw: Swarm, a: Agent, t: Task): Act {
  const part = t.data.part as Part;
  const p = t.piece!;
  const f = sw.frame(p);
  a.shape = "arrow";
  const at = { x: f.w * rand(0.35, 0.6), y: f.h * rand(0.35, 0.6) };
  yield* sw.moveTo(a, () => sw.local(sw.frame(p), at.x, at.y));
  yield* sw.click(a);
  a.ov = () => [sel(sw.frame(p))];
  yield* sw.wait(0.1);
  const old = part.stand;
  if (old) {
    sw.reveal(p, "now");
    old.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(100% 0 0 0)" }], { duration: 480, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
  } else sw.reveal(p, p.el.matches(".ico-stk") ? "pop" : "sweep");
  yield* sw.wait(0.42);
  if (old) {
    sw.dropGhost(old);
    part.stand = null;
  }
  yield* sw.wait(0.12);
  a.ov = null;
  sw.pieceDone(p);
}

/* ---------------------------------------------------------------- the crew once the page is built */

const pointerNear = (sw: Swarm, p: Pt, r: number) => !!sw.pointer && Math.hypot(sw.pointer.x - p.x, sw.pointer.y - p.y) < r;

/**
 * Parked: in its place in its crew's huddle (or, while its section is built, where it finished its last task, for the
 * moment before it heads off the screen), drifting a little, out of step with the others, so it reads as someone
 * there. It steps aside when the pointer comes near. Out of sight it simply stays put.
 */
function* park(sw: Swarm, a: Agent): Act {
  a.shape = "arrow";
  const hold = { x: a.x, y: a.y };
  try {
    yield* sw.moveTo(a, () => sw.restSpot(a, hold), { speed: 1.3 });
    a.parked = true;
    for (;;) {
      const dt = yield;
      const p = sw.restSpot(a, hold);
      if (!sw.inView({ x: p.x - 40, y: p.y - 40, w: 80, h: 80 }, 40)) {
        a.x = p.x;
        a.y = p.y;
        continue;
      }
      if (pointerNear(sw, p, 64)) {
        const dx = p.x - sw.pointer!.x;
        const dy = p.y - sw.pointer!.y;
        const L = Math.hypot(dx, dy) || 1;
        p.x += (dx / L) * (64 - L);
        p.y += (dy / L) * (64 - L);
      }
      p.x += Math.sin(sw.clock * 0.9 + a.id * 2.1) * 1.4;
      p.y += Math.sin(sw.clock * 1.5 + a.id * 1.3) * 1.8;
      const k = Math.min(1, dt * 5);
      a.x += (p.x - a.x) * k;
      a.y += (p.y - a.y) * k;
    }
  } finally {
    a.parked = false;
  }
}

/** Comes to what the visitor points at and selects it, for as long as they point at it, then goes back to park. */
function* attend(sw: Swarm, a: Agent, t: Task): Act {
  const el = t.data.el as HTMLElement;
  const f = sw.measureEl(el);
  a.shape = "arrow";
  yield* sw.moveTo(a, () => {
    const c = sw.local(f, f.w, f.h);
    return { x: c.x + 8, y: c.y + 6 };
  }, { speed: 0.95 });
  a.press = 1;
  a.ov = () => [sel(f)];
  let w = 0;
  while (sw.focused(el) && w < 8) w += yield;
  a.ov = null;
}

function unionOf(list: Box[]): Box {
  const x = Math.min(...list.map((b) => b.x));
  const y = Math.min(...list.map((b) => b.y));
  return { x, y, w: Math.max(...list.map((b) => b.x + b.w)) - x, h: Math.max(...list.map((b) => b.y + b.h)) - y };
}

export const ACTS: Record<string, ActFn> = { box, text, label, tilt, line, count, par, dup, edit, swap, park, attend };
