/**
 * The agent swarm: a crew of multiplayer cursors that builds this page in front of the visitor, the way a team builds a
 * page in a design tool, and then leaves.
 *
 * Build (every load of the page, a reload too): every visible part of the page below the nav (which is simply there)
 * is planned as a task (plan.ts): boxes dragged out with a crosshair and a live W x H badge over a placeholder, images
 * swept in, text typed under an I-beam, headings typed small and grown, lines drawn with a pen tool, tilted things
 * rotated into their tilt, and repeated parts (chips, tags, rows, passes, cards, the headline's lines) built once and
 * then copied: the master is selected, a copy is dragged out with the duplicate key held (copy outlines, the gap
 * measured), and the copy is edited: its words selected and retyped (long ones pasted), its picture swapped. Each
 * section has its own way of being built, and its own crew, which comes in from the screen's edge as its work opens
 * and grows while the work piles up; a hand with nothing to do heads off the screen after a moment, and comes back
 * when there is work again. The headline's lead line is the first thing built, alone; everything else waits for it.
 * Tasks unlock top down as the visitor scrolls (a part on screen also pulls in whatever it waits for, below the fold
 * or not); work left far above is finished at once, so nothing stays missing. Escape finishes it all at once.
 *
 * Once a section is built, its whole crew dashes off the screen (the owner preferred an empty page to parked huddles;
 * the huddle code stays, with no one kept in it). The only control is a sound switch in the nav.
 *
 * Every agent runs one small script at a time (a generator, stepped once per frame with the frame's time). The page
 * parts' looks are written by the renderer once per frame, after all reads.
 */
import { ACTS } from "./acts";
import { clamp, easeInOut, easeOut, frameBounds, framesOf, linesClip, mapLocal, pick, rand, textLines, type Box, type Frame, type Pt } from "./geom";
import { ghostOf, textGhostOf } from "./ghost";
import { HOT, POINTER_SVG, TONES, TONES_LIGHT, initials, type Shape, type Tone } from "./look";
import { partsOf, planPage } from "./plan";
import { Overlay } from "./render";
import * as sfx from "./sound";
import type { Act, Agent, Crew, Group, Look, Member, Ov, Part, Piece, PieceKind, Section, Task } from "./types";

export type SwarmHooks = {
  /** a part of the page is in place */
  built: (el: HTMLElement) => void;
};

export type SwarmStart = "build" | "idle";

const STYLE_PROPS = ["clip-path", "transform", "rotate", "scale", "transform-origin", "opacity"] as const;
const BUILT = "swarm-built";
/** the build runs a little faster than a person would work: the page is there to be read */
const PACE = 1.6;
/** sections with a lot of repeated work run faster still */
const TEMPO: Record<string, number> = { about: 1.4, work: 1.5, achievements: 2.2 };
/** how long a hand with nothing to do stays where it stopped, while its section is built, before it heads off (s) */
const LINGER = 0.7;
/** how far below the top of the screen work opens, in screens: a little more than the screen, so it is under way as it scrolls in */
const AHEAD = 1.2;
/** where each agent stands in its crew's huddle (its pointer's tip; its name tag hangs below right), and the huddle's size with tags */
const HUDDLE = [{ x: 0, y: 0 }, { x: 48, y: 10 }, { x: 18, y: 40 }, { x: 66, y: 52 }, { x: 36, y: 84 }, { x: 84, y: 94 }, { x: 54, y: 126 }, { x: 102, y: 136 }];
const HUDDLE_SMALL = [{ x: 0, y: 0 }, { x: 40, y: 8 }, { x: 14, y: 34 }, { x: 54, y: 44 }, { x: 28, y: 70 }, { x: 68, y: 80 }];
const TAG = { w: 46, h: 41 };
const TAG_SMALL = { w: 38, h: 35 };

const neutral = (): Look => ({ hide: false, mute: false, clip: null, tilt: null, sc: null });

type Mode = "off" | "build" | "finale" | "idle";

const SPEAKER_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="cone" d="M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4Z"/><path class="wave" d="M15.5 9.2A4 4 0 0 1 15.5 14.8M18 7A7.2 7.2 0 0 1 18 17"/></svg>';
const SPEAKER_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="cone" d="M4 9.5H7.5L12 5.5V18.5L7.5 14.5H4Z"/><path class="wave" d="M16 9.5L21 14.5M21 9.5L16 14.5"/></svg>';

export class Swarm {
  readonly doc: Document;
  readonly win: Window;
  readonly hooks: SwarmHooks;
  readonly small: boolean;
  readonly ov: Overlay;
  agents: Agent[] = [];
  pieces = new Map<Element, Piece>();
  tasks: Task[] = [];
  sections: Section[] = [];
  /** the first thing built, alone: the rest of the page waits for it */
  lead: Task | null = null;
  mode: Mode = "off";
  tempo = 1;
  sx = 0;
  sy = 0;
  vw = 0;
  vh = 0;
  pointer: Pt | null = null;
  clock = 0;
  /** one crew per section, top down */
  crews: Crew[] = [];
  private readonly crewBySec = new Map<Section, Crew>();
  private readonly names = new Set<string>();
  private nextAgent = 1;
  private raf = 0;
  private last = 0;
  private t0 = 0;
  private modeAt = 0;
  private placeAt = 0;
  private dirty = new Set<Piece>();
  readonly ghosts = new Set<HTMLElement>();
  private readonly ac = new AbortController();
  private focus: { el: HTMLElement; agent: Agent | null } | null = null;
  private readonly drawn = new WeakMap<Agent, { t: string; p: string; s: string }>();
  /** the most agents on the page at once, and how many of a crew stay once its section is built */
  private readonly cap: number;
  private readonly stay: number;
  private readonly live: HTMLElement;
  private readonly soundBtn: HTMLButtonElement | null;

  constructor(doc: Document, hooks: SwarmHooks) {
    this.doc = doc;
    this.win = doc.defaultView!;
    this.hooks = hooks;
    this.small = this.win.matchMedia("(max-width: 860px)").matches;
    this.cap = this.small ? 16 : 36;
    // nobody stays once a section is built: the whole crew heads off the screen
    this.stay = 0;
    this.ov = new Overlay(doc);
    this.live = doc.createElement("p");
    this.live.className = "sr-only";
    this.live.setAttribute("aria-live", "polite");
    doc.body.append(this.live);
    const sig = { signal: this.ac.signal };
    sfx.unlockOnFirstGesture(this.ac.signal);
    // the one control: sound, in the nav
    this.soundBtn = doc.querySelector<HTMLButtonElement>("[data-sound]");
    if (this.soundBtn) {
      const btn = this.soundBtn;
      btn.hidden = false;
      btn.addEventListener("click", () => {
        if (!sfx.isLive()) {
          sfx.unlock();
          sfx.setMuted(false);
        } else sfx.setMuted(!sfx.isMuted());
        this.paintSound();
      }, sig);
      const off = sfx.onChange(() => this.paintSound());
      this.ac.signal.addEventListener("abort", () => { off(); btn.hidden = true; });
      this.paintSound();
    }
    this.win.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") this.pointer = { x: e.pageX, y: e.pageY };
    }, sig);
    this.doc.documentElement.addEventListener("pointerleave", () => { this.pointer = null; }, sig);
    this.win.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.mode === "build") this.skip();
    }, sig);
    this.win.addEventListener("resize", () => this.remeasure(), sig);
    this.doc.addEventListener("pointerover", (e) => this.hover(e), sig);
    this.doc.addEventListener("visibilitychange", () => { this.last = 0; }, sig);
    // the crews' corners move with the page: look for them again when it changes size (pictures, fonts, the editor)
    const ro = new ResizeObserver(() => { this.placeAt = this.clock + 0.3; });
    ro.observe(doc.body);
    this.ac.signal.addEventListener("abort", () => ro.disconnect());
    doc.fonts?.ready.then(() => { this.placeAt = this.clock + 0.05; }).catch(() => {});
    this.readView();
    // for checking the plan from the console: /?swarm-debug
    if (/[?&]swarm-debug\b/.test(this.win.location.search)) (this.win as unknown as { __swarm: Swarm }).__swarm = this;
  }

  /** The sound switch: a speaker with waves when sound plays, crossed out when it is off. */
  private paintSound(): void {
    const btn = this.soundBtn;
    if (!btn) return;
    const on = !sfx.isMuted();
    const playing = on && sfx.isLive();
    btn.innerHTML = on ? SPEAKER_ON : SPEAKER_OFF;
    // a toggle: one name, its state in aria-pressed; the tooltip says what a press does
    btn.setAttribute("aria-label", "Sound");
    btn.setAttribute("aria-pressed", String(playing));
    btn.title = playing ? "Sound on" : on ? "Sound: press to turn on" : "Sound off";
    btn.classList.toggle("is-waiting", on && !playing);
  }

  /* ------------------------------------------------------------------ lifecycle */

  static startMode(win: Window): SwarmStart {
    try {
      return win.sessionStorage.getItem(BUILT) === "1" ? "idle" : "build";
    } catch {
      return "idle";
    }
  }

  start(kind: SwarmStart): void {
    this.makeCrews();
    if (kind === "build") this.beginBuild();
    else this.setMode("idle");
    this.loop();
  }

  destroy(): void {
    this.ac.abort();
    this.win.cancelAnimationFrame(this.raf);
    this.finishAll();
    this.agents.forEach((a) => a.el.remove());
    this.agents = [];
    this.crews = [];
    this.ghosts.forEach((g) => g.remove());
    this.ov.destroy();
    this.live.remove();
    this.doc.documentElement.classList.remove("sw-building", "swarm-pending");
  }

  private setMode(m: Mode): void {
    this.mode = m;
    this.modeAt = this.clock;
  }

  private beginBuild(): void {
    this.readView();
    this.tasks = [];
    this.sections = [];
    this.lead = null;
    const root = this.doc.documentElement;
    try {
      planPage(this);
      this.measureAll();
    } catch (err) {
      // the page is complete without the swarm: show it as it is, and keep the crew
      console.error("[swarm] plan failed", err);
      this.pieces.forEach((p) => this.restore(p));
      this.pieces.clear();
      this.tasks = [];
      this.sections = [];
      root.classList.remove("swarm-pending");
      this.setMode("idle");
      return;
    }
    this.staffCrews();
    root.classList.add("sw-building");
    // hidden before the first paint by html.swarm-pending; now each part hides itself instead
    this.pieces.forEach((p) => {
      p.look.hide = true;
      this.apply(p);
    });
    root.classList.remove("swarm-pending");
    this.t0 = this.clock;
    // straight to work: the crews come in from the screen's edges as their work opens
    this.setMode("build");
    this.live.textContent = "AI agents are building this page. Press Escape to show it all now.";
  }

  skip(): void {
    if (this.mode !== "build") return;
    this.agents.forEach((a) => { this.setJob(a, null); a.task = null; a.ov = null; a.caret = null; a.shape = "arrow"; });
    this.finishAll();
    this.finale();
  }

  private finishAll(): void {
    for (const t of this.tasks) if (t.state !== "done") this.instantly(t);
    this.pieces.forEach((p) => { if (!p.done) this.pieceDone(p); });
    this.ghosts.forEach((g) => g.remove());
    this.ghosts.clear();
    this.sections.forEach((s) => { if (!s.done) { s.done = true; s.onDone?.(); } });
    this.flush();
  }

  /** Built: the chord, and every crew settles into its corner. */
  private finale(): void {
    this.setMode("finale");
    this.doc.documentElement.classList.remove("sw-building");
    // not remembered: a reload builds the page again (only a test sets swarm-built, to skip the build)
    const secs = (this.clock - this.t0).toFixed(1);
    const n = this.nextAgent - 1;
    this.live.textContent = `The page is built: ${n} agents, ${secs} seconds.`;
    sfx.chord();
    this.crews.forEach((c) => { c.started = true; c.done = true; });
    this.agents.forEach((a) => { if (!a.leaving) this.setJob(a, null); a.task = null; a.ov = null; a.caret = null; a.shape = "arrow"; a.idle = true; });
    this.placeAt = this.clock + 0.05;
  }

  /* ------------------------------------------------------------------ frame loop */

  private loop = (): void => {
    this.raf = this.win.requestAnimationFrame((now) => {
      if (this.ac.signal.aborted) return;
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0.016;
      this.last = now;
      this.clock += dt;
      try {
        this.tick(dt);
      } catch (err) {
        console.error("[swarm] frame failed", err);
        this.finishAll();
        this.destroy();
        return;
      }
      this.loop();
    });
  };

  private readView(): void {
    this.sx = this.win.scrollX;
    this.sy = this.win.scrollY;
    this.vw = this.doc.documentElement.clientWidth;
    this.vh = this.win.innerHeight;
    for (const c of this.crews) {
      const r = c.el.getBoundingClientRect();
      c.top = r.top + this.sy;
      c.bottom = r.bottom + this.sy;
    }
  }

  private tick(dt: number): void {
    this.readView();
    if (this.placeAt && this.clock >= this.placeAt) {
      this.placeAt = 0;
      this.placeCrews();
    }
    const building = this.mode === "build";
    const tdt = building ? dt * this.tempo * PACE : dt;
    if (this.mode === "build") this.schedule();
    else if (this.mode === "finale" && this.clock - this.modeAt > 0.5) this.setMode("idle");
    if (this.mode !== "off") this.tendCrews(dt);
    if (this.mode === "idle") this.watch();

    for (const a of [...this.agents]) {
      if (!a.job) continue;
      let res: IteratorResult<void, void>;
      try {
        res = a.job.next(building ? tdt * (a.crew?.tempo ?? 1) : dt);
      } catch (err) {
        console.error("[swarm] agent script failed", err);
        if (a.task) this.instantly(a.task);
        res = { done: true, value: undefined };
      }
      if (res.done) {
        a.job = null;
        a.task = null;
        a.ov = null;
        if (a.leaving) this.drop(a);
      }
    }
    this.flush();
    this.draw(dt);
  }

  /** Which tasks can start, how big each crew should be, and who in it does what. */
  private schedule(): void {
    const { sy, vh } = this;
    // nothing else starts until the lead is built
    const lead = this.lead && this.lead.state !== "done" ? this.lead : null;
    for (const s of this.sections) {
      if (!s.started && s.top < sy + vh * 1.15 && (!lead || lead.sec === s)) {
        s.started = true;
        s.onStart?.();
        const c = this.crewBySec.get(s);
        if (c) c.started = true;
      }
    }
    // the work on screen (and a little below) is wanted, and so is everything it waits for, wherever that is: a copy
    // on screen pulls in the rest of its master even below the fold, so it never sits waiting for a scroll
    const wanted = new Set<Task>();
    const want = (t: Task) => {
      if (t.state === "done" || wanted.has(t)) return;
      wanted.add(t);
      t.deps.forEach(want);
    };
    for (const t of this.tasks) if (t.state !== "done" && t.sec.started && this.taskY(t) < sy + vh * AHEAD) want(t);
    const open: Task[] = [];
    let left = 0;
    for (const t of this.tasks) {
      if (t.state === "done") continue;
      left++;
      if (t.state === "busy") continue;
      // a part may start once the box it sits in shows; a copy, a turn and a set's mark wait for all of it
      const whole = t.act === "mark" || t.act === "tilt" || t.act === "dup";
      const ready = t.sec.started && t.deps.every((d) => d.state === "done" || (!whole && d.ready));
      if (!ready) continue;
      if (t.act === "mark") {
        // a set's member is complete: it can be copied now
        (t.data.member as Member).built = true;
        t.state = "done";
        continue;
      }
      // work the visitor has scrolled far past is finished at once, so nothing is missing when they come back
      if (this.taskY(t) < sy - vh * 1.4) {
        this.instantly(t);
        continue;
      }
      if (wanted.has(t)) {
        t.state = "open";
        open.push(t);
      }
    }
    for (const s of this.sections) {
      if (s.started && !s.done && s.tasks.every((t) => t.state === "done")) {
        s.done = true;
        s.onDone?.();
      }
    }
    for (const c of this.crews) {
      if (!c.done && c.started && this.sections.every((s) => this.crewBySec.get(s) !== c || s.done)) c.done = true;
    }
    if (left === 0) {
      this.finale();
      return;
    }
    // copies go out a few at a time per set, so they cascade from what is built instead of piling on the master (a set
    // of many small parts goes out in a bigger burst)
    const copying = new Map<Group, number>();
    for (const t of this.tasks) if (t.state === "busy" && t.act === "dup") copying.set(t.data.group as Group, (copying.get(t.data.group as Group) ?? 0) + 1);
    const free = (t: Task) => t.act !== "dup" || (copying.get(t.data.group as Group) ?? 0) < ((t.data.group as Group).burst ?? 3);
    const byCrew = new Map<Crew, Task[]>();
    for (const t of open) {
      const c = this.crewBySec.get(t.sec);
      if (!c) continue;
      const list = byCrew.get(c);
      if (list) list.push(t);
      else byCrew.set(c, [t]);
    }
    for (const c of this.crews) {
      if (!c.started || c.done) continue;
      const list = byCrew.get(c) ?? [];
      list.sort((p, q) => this.rank(p) - this.rank(q));
      const here = c.agents.filter((a) => !a.leaving);
      const busy = here.filter((a) => a.task).length;
      // what can be taken up right now (copies over their set's burst wait): a hand called in for anything else would
      // only stand about, head off and come back
      const left = new Map<Group, number>();
      const doable = list.filter((t) => {
        if (t.act !== "dup") return true;
        const g = t.data.group as Group;
        const n = left.get(g) ?? (g.burst ?? 3) - (copying.get(g) ?? 0);
        left.set(g, n - 1);
        return n > 0;
      });
      // a crew grows while its work piles up, one hand at a time, from the screen's edge nearest the work
      const size = clamp(busy + Math.ceil(doable.length / 1.4), Math.min(2, c.size), c.size);
      if (here.length < size && c.cool <= 0 && doable.length > here.length - busy && this.agents.length < this.cap) {
        this.join(c, this.entryFor(c, doable[here.length - busy]));
        c.cool = 0.14;
      }
      if (!list.length) continue;
      for (const a of c.agents) {
        if (a.leaving || a.task || (a.job && !a.idle)) continue;
        const choice = list.filter(free);
        if (!choice.length) break;
        const t = this.pickFor(a, choice);
        if (!t) break;
        list.splice(list.indexOf(t), 1);
        if (t.act === "dup") copying.set(t.data.group as Group, (copying.get(t.data.group as Group) ?? 0) + 1);
        t.state = "busy";
        a.task = t;
        a.idle = false;
        this.setJob(a, this.run(a, t));
      }
    }
  }

  /** A task's page y: a task on the fixed nav is always at the top of the screen. */
  taskY(t: Task): number {
    return t.fixed ? t.y + this.sy : t.y;
  }

  /** The order work is taken in: top down, with work marked first (the headline) ahead of everything. */
  private rank(t: Task): number {
    return this.taskY(t) - (t.data.first ? 1e5 : 0);
  }

  private pickFor(a: Agent, open: Task[]): Task | null {
    const top = open.slice(0, 10);
    const r0 = this.rank(top[0]);
    let best: Task | null = null;
    let score = Infinity;
    for (const t of top) {
      const y = this.taskY(t);
      const s = Math.hypot(t.x - a.x, y - a.y) * 0.6 + (this.rank(t) - r0) * 0.9;
      if (s < score) {
        score = s;
        best = t;
      }
    }
    return best;
  }

  private *run(a: Agent, t: Task): Act {
    const act = ACTS[t.act];
    if (act) yield* act(this, a, t);
    if (t.state !== "done") this.finish(t);
    a.ov = null;
    a.caret = null;
    a.shape = "arrow";
  }

  finish(t: Task): void {
    t.state = "done";
  }

  /** Finishes a task with no agent: everything it would have put in place, in place. */
  instantly(t: Task): void {
    if (t.state === "done") return;
    for (const a of this.agents) if (a.task === t) { this.setJob(a, null); a.task = null; a.ov = null; a.caret = null; a.shape = "arrow"; }
    t.instant?.();
    for (const v of Object.values(t.data)) {
      if (v instanceof HTMLElement && v.classList.contains("sw-ghost")) this.dropGhost(v);
    }
    if (t.piece && !t.data.keepPiece) this.pieceDone(t.piece);
    t.state = "done";
  }

  /* ------------------------------------------------------------------ pieces */

  piece(el: HTMLElement, kind: PieceKind, parent: Piece | null, tilt = false): Piece {
    const had = this.pieces.get(el);
    if (had) return had;
    const st = el.style;
    const saved: Record<string, string> = {};
    for (const k of STYLE_PROPS) saved[k] = st.getPropertyValue(k);
    let tiltVia: Piece["tiltVia"] = null;
    let tiltDeg = 0;
    if (tilt) {
      const cs = getComputedStyle(el);
      if (cs.rotate && cs.rotate !== "none") {
        tiltVia = "rotate";
        tiltDeg = parseFloat(cs.rotate) || 0;
      } else if (cs.transform && cs.transform !== "none") {
        const m = cs.transform.match(/-?[\d.e]+/g)?.map(Number);
        if (m && m.length >= 4) {
          tiltVia = "transform";
          tiltDeg = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
        }
      }
      if (Math.abs(tiltDeg) < 0.2) tiltVia = null;
    }
    const p: Piece = { el, kind, look: neutral(), dirty: true, tiltVia, tiltDeg, saved, anim: null, done: false, parent, typing: null, base: null };
    this.pieces.set(el, p);
    return p;
  }

  /** Measures every piece's layout box (one forced layout), keeping what is known about its tilt. */
  measureAll(): void {
    const list = [...this.pieces.values()];
    const frames = framesOf(list.map((p) => p.el));
    list.forEach((p, i) => {
      const f = frames[i];
      if (p.base) {
        Object.assign(p.base, { x: f.x, y: f.y, w: f.w, h: f.h, ox: f.ox, oy: f.oy });
      } else {
        p.base = f;
        // its own tilt is carried by tiltDeg (an inline upright tilt may already be on it)
        if (p.tiltVia === "rotate") p.base.rot = 0;
        if (p.tiltVia === "transform") p.base.m = null;
      }
    });
  }

  private remeasure(): void {
    if (!this.pieces.size) return;
    this.readView();
    this.measureAll();
    this.ov.fit();
  }

  /** Measures one piece's layout box (its own tilt is kept apart, in tiltDeg). */
  measure(p: Piece): void {
    p.base = framesOf([p.el])[0];
    if (p.tiltVia === "rotate") p.base.rot = 0;
    if (p.tiltVia === "transform") p.base.m = null;
  }

  /** Re-measures the pieces inside an element, after it was turned upright. */
  remeasureWithin(el: HTMLElement): void {
    const inner = [...this.pieces.values()].filter((p) => p.el !== el && el.contains(p.el) && !p.done);
    if (!inner.length) return;
    const frames = framesOf(inner.map((p) => p.el));
    inner.forEach((p, i) => {
      const f = frames[i];
      if (p.base) Object.assign(p.base, { x: f.x, y: f.y, w: f.w, h: f.h, ox: f.ox, oy: f.oy });
    });
  }

  /** Any element's layout box and transforms, now. */
  measureEl(el: Element): Frame {
    return framesOf([el])[0];
  }

  isFixedEl(el: Element): boolean {
    return framesOf([el])[0]?.fixed ?? false;
  }

  /** Writes a piece's look at once (before something is measured with it). */
  applyNow(p: Piece): void {
    this.apply(p);
    this.dirty.delete(p);
  }

  /** A piece's untransformed box on the page. */
  pageBox(p: Piece): Box {
    const f = this.frame(p);
    return { x: f.x + (f.fixed ? this.sx : 0), y: f.y + (f.fixed ? this.sy : 0), w: f.w, h: f.h };
  }

  /** The line boxes of a stand-in's words, on the page. */
  textRects(node: HTMLElement): Box[] {
    const r = this.doc.createRange();
    r.selectNodeContents(node);
    const out: Box[] = [];
    for (const c of r.getClientRects()) {
      if (c.width < 1) continue;
      const b = { x: c.left + this.sx, y: c.top + this.sy, w: c.width, h: c.height };
      const last = out[out.length - 1];
      if (last && Math.abs(last.y - b.y) < b.h * 0.5) {
        const x = Math.min(last.x, b.x);
        last.w = Math.max(last.x + last.w, b.x + b.w) - x;
        last.x = x;
      } else out.push(b);
    }
    return out;
  }

  /** Where a stand-in's words begin, on the page. */
  textStart(node: HTMLElement): Pt {
    const r = this.textRects(node)[0];
    if (r) return { x: r.x, y: r.y + r.h / 2 };
    const b = node.getBoundingClientRect();
    return { x: b.left + this.sx, y: b.top + this.sy + b.height / 2 };
  }

  /**
   * The path a pen draws for a line piece: a strap from its top to its bottom, a rule along its top edge, or a leader
   * line through its own points (drawn on with its dash as the pen moves).
   */
  linePath(p: Piece, axis: string): { pts: Pt[]; at: number[]; draw?: (k: number) => void; done?: () => void } {
    const f = this.frame(p);
    if (axis === "strap") return { pts: [this.local(f, f.w / 2, 0), this.local(f, f.w / 2, f.h)], at: [0, 1] };
    if (axis === "leader") {
      const path = p.el.querySelector("path");
      const d = path?.getAttribute("d") ?? "";
      const nums = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
      if (path && /^[\sML\d.,-]+$/.test(d) && nums.length >= 4) {
        const v: Pt[] = [];
        for (let i = 0; i + 1 < nums.length; i += 2) v.push({ x: nums[i], y: nums[i + 1] });
        const seg = v.slice(1).map((q, i) => Math.hypot(q.x - v[i].x, q.y - v[i].y));
        const total = seg.reduce((s, l) => s + l, 0) || 1;
        const at = [0];
        seg.forEach((l) => at.push(at[at.length - 1] + l / total));
        const st = (path as SVGPathElement).style;
        const was = { a: st.strokeDasharray, o: st.strokeDashoffset };
        return {
          pts: v.map((q) => this.local(f, (q.x / 100) * f.w, (q.y / 100) * f.h)),
          at,
          draw: (k) => { st.strokeDasharray = "1"; st.strokeDashoffset = String(1 - k); },
          done: () => { st.strokeDasharray = was.a === "1" ? "" : was.a; st.strokeDashoffset = ""; },
        };
      }
    }
    return { pts: [this.local(f, 0, 0), this.local(f, f.w, 0)], at: [0, 1] };
  }

  /**
   * A copy lands. With `src`, the copy shows its master's words and pictures in its own place until they are edited:
   * its boxes are in place at once, its labels' boxes show with the master's words over them. Without (a skip), every
   * part of it is simply in place.
   */
  settleCopy(m: Member, src: Member | null, instant: boolean): void {
    m.parts.forEach((part, i) => {
      const p = this.pieces.get(part.el);
      if (!p) return;
      if (instant || !src) {
        if (part.stand) this.dropGhost(part.stand);
        part.stand = null;
        this.pieceDone(p);
        return;
      }
      const from = matchPart(src, m, i);
      if (part.kind === "box" || part.kind === "line") {
        this.reveal(p, "now");
        this.pieceDone(p);
      } else if (part.kind === "label") {
        this.set(p, { hide: false, mute: true });
        const fromText = from ? [...from.el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim() : "";
        const lines = textLines(p.el, (n) => n.parentNode !== p.el);
        if (from && fromText && lines.length) part.stand = this.ghost(this.labelStand(from.el, fromText, this.frame(p), union(lines)));
      } else if (part.kind === "text") {
        if (from) part.stand = this.ghost(textGhostOf(from.el, this.pageBox(p)));
      } else if (part.kind === "media" && from) {
        part.stand = this.ghost(ghostOf(from.el, this.frame(p), this.sx, this.sy));
        const b = this.frame(p);
        Object.assign(part.stand.style, { width: `${b.w}px`, height: `${b.h}px` });
      }
    });
  }

  /** A piece's frame now: its layout box, with the tilt, growth and offset it has right now. */
  frame(p: Piece): Frame {
    if (!p.base) p.base = framesOf([p.el])[0];
    const f: Frame = { ...p.base };
    const tilt = p.look.tilt ?? (p.tiltVia ? p.tiltDeg : 0);
    if (p.tiltVia === "rotate") f.rot = tilt;
    else if (p.tiltVia === "transform" && tilt) {
      const r = (tilt * Math.PI) / 180;
      f.m = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
    } else if (p.tiltVia === "transform") f.m = null;
    if (p.look.sc !== null) {
      f.sx = p.look.sc;
      f.sy = p.look.sc;
      f.ox = 0;
      f.oy = 0;
    }
    return f;
  }

  local(f: Frame, x: number, y: number): Pt {
    return mapLocal(f, x, y, this.sx, this.sy);
  }

  bounds(f: Frame, b?: Box): Box {
    return frameBounds(f, this.sx, this.sy, b);
  }

  /** Changes how a piece looks; written to the page at the end of the frame. */
  set(p: Piece, patch: Partial<Look>): void {
    Object.assign(p.look, patch);
    this.mark(p);
  }

  mark(p: Piece): void {
    this.dirty.add(p);
  }

  /** Shows a hidden piece: at once, fading in, swept in from the top, or popped. */
  reveal(p: Piece, how: "now" | "fade" | "sweep" | "pop" = "now"): void {
    this.set(p, { hide: false });
    p.anim?.cancel();
    p.anim = null;
    const opts = { easing: "cubic-bezier(.2,.7,.2,1)" };
    if (how === "fade") p.anim = p.el.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 260 });
    else if (how === "sweep") p.anim = p.el.animate([{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }], { ...opts, duration: 520 });
    else if (how === "pop") p.anim = p.el.animate([{ opacity: 0, scale: "0.6" }, { opacity: 1, scale: "1.08", offset: 0.6 }, { opacity: 1, scale: "1" }], { ...opts, duration: 380 });
    if (p.anim) {
      const a = p.anim;
      a.onfinish = () => { if (p.anim === a) p.anim = null; };
    }
  }

  /** Whether every part of the page inside an element is in place (true when the swarm is not building it). */
  isBuilt(root: Element): boolean {
    for (const p of this.pieces.values()) if (!p.done && root.contains(p.el)) return false;
    return true;
  }

  /** A piece is in its final place: everything the swarm wrote on it goes. */
  pieceDone(p: Piece): void {
    if (p.done) return;
    p.done = true;
    if (p.anim && p.anim.playState !== "finished") {
      p.anim.finish();
    }
    p.anim = null;
    if (p.typing?.stand) this.dropGhost(p.typing.stand);
    p.typing = null;
    p.look = neutral();
    this.mark(p);
    this.hooks.built(p.el);
  }

  /** Writes changed looks to the page. */
  private flush(): void {
    this.dirty.forEach((p) => this.apply(p));
    this.dirty.clear();
  }

  private apply(p: Piece): void {
    const { el, look: L } = p;
    const st = el.style;
    el.classList.toggle("sw-hide", L.hide);
    el.classList.toggle("sw-mute", L.mute);
    const put = (k: (typeof STYLE_PROPS)[number], v: string | null) => {
      if (v === null) {
        if (p.saved[k]) st.setProperty(k, p.saved[k]);
        else st.removeProperty(k);
      } else st.setProperty(k, v);
    };
    const T = p.typing;
    if (T?.stand) {
      T.stand.style.clipPath = linesClip(T.lines, T.shown);
      put("clip-path", L.clip);
    } else put("clip-path", T ? linesClip(T.lines, T.shown) : L.clip);
    if (p.tiltVia === "rotate") put("rotate", L.tilt === null ? null : `${L.tilt}deg`);
    else if (p.tiltVia === "transform") put("transform", L.tilt === null ? null : `rotate(${L.tilt}deg)`);
    put("scale", L.sc === null ? null : String(L.sc));
    put("transform-origin", L.sc === null ? null : "0 0");
  }

  private restore(p: Piece): void {
    p.anim?.cancel();
    p.look = neutral();
    p.typing = null;
    this.apply(p);
  }

  /* ------------------------------------------------------------------ typing */

  /**
   * Gets a block of text ready to be typed: its lines measured (without the parts of it that are pieces of their own),
   * shown, and clipped to nothing. A label is typed into a stand-in laid over it, while its own words stay hidden.
   */
  startTyping(p: Piece, label = false): void {
    if (label) {
      const own = (n: Node) => n.parentNode !== p.el;
      const lines = textLines(p.el, own);
      if (!lines.length) return;
      const lb = union(lines);
      const text = [...p.el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\s+/g, " ").trim();
      const f = this.frame(p);
      const g = this.ghost(this.labelStand(p.el, text, f, lb));
      p.typing = { lines: [{ x: 0, y: 0, w: lb.w, h: lb.h }], shown: [0], perChar: lb.w / Math.max(1, text.length), stand: g, at: lb };
      this.set(p, { hide: false, mute: true });
      return;
    }
    const inner = (n: Node) => {
      for (let e = n.parentElement; e && e !== p.el; e = e.parentElement) if (this.pieces.has(e)) return true;
      return false;
    };
    const lines = textLines(p.el, inner);
    let chars = 0;
    const walker = this.doc.createTreeWalker(p.el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!inner(n)) chars += (n.textContent ?? "").replace(/\s+/g, " ").length;
    const total = lines.reduce((s, l) => s + l.w, 0);
    p.typing = { lines, shown: lines.map(() => 0), perChar: total / Math.max(1, chars), stand: null, at: null };
    this.set(p, { hide: false });
  }

  private labelStand(from: HTMLElement, text: string, f: Frame, lb: Box): HTMLElement {
    const g = this.doc.createElement("div");
    g.className = "sw-ghost sw-stand";
    const cs = getComputedStyle(from);
    g.textContent = text;
    const st = g.style;
    for (const k of ["color", "font-family", "font-size", "font-weight", "font-style", "font-variation-settings", "font-feature-settings", "letter-spacing", "text-transform", "word-spacing"]) {
      st.setProperty(k, cs.getPropertyValue(k));
    }
    const at = this.local(f, lb.x, lb.y);
    const tilted = !!(f.rot || f.m);
    Object.assign(st, { position: "absolute", left: `${at.x}px`, top: `${at.y}px`, height: `${lb.h}px`, lineHeight: `${lb.h}px`, whiteSpace: "nowrap" });
    if (tilted) {
      const r = f.rot + (f.m ? (Math.atan2(f.m[1], f.m[0]) * 180) / Math.PI : 0);
      st.transformOrigin = "0 0";
      st.transform = `rotate(${r}deg)`;
    }
    return g;
  }

  /**
   * Types the given lines of a piece, left to right, a key at a time: fast, a little uneven, a rare pause. Long texts
   * speed up so nothing takes much over a second and a half.
   */
  *type(a: Agent, p: Piece, idx: number[], pace = 1): Act {
    const T = p.typing;
    if (!T) return;
    const px = idx.reduce((s, i) => s + Math.max(0, T.lines[i].w - T.shown[i]), 0);
    const chars = Math.max(1, Math.round(px / Math.max(1, T.perChar)));
    const k = clamp(40 / chars, 0.06, 1) * pace;
    let budget = 0;
    for (const i of idx) {
      const l = T.lines[i];
      a.caret = { p, i };
      while (T.shown[i] < l.w) {
        budget += yield;
        let keys = 0;
        while (budget > 0 && T.shown[i] < l.w) {
          let d = rand(0.016, 0.042);
          if (Math.random() < 0.025) d += rand(0.08, 0.18);
          budget -= d * k;
          T.shown[i] = Math.min(l.w, T.shown[i] + T.perChar);
          keys++;
        }
        if (keys) {
          this.mark(p);
          const c = this.caretPoint(p, i);
          sfx.key(c.x - this.sx, Math.random() < 0.16);
        }
      }
    }
  }

  endTyping(p: Piece): void {
    if (!p.typing) return;
    if (p.typing.stand) {
      this.dropGhost(p.typing.stand);
      this.set(p, { mute: false });
    }
    p.typing = null;
    this.mark(p);
  }

  caretPoint(p: Piece, i: number): Pt {
    const T = p.typing!;
    const l = T.lines[i];
    const off = T.at ?? { x: 0, y: 0 };
    return this.local(this.frame(p), off.x + l.x + T.shown[i], off.y + l.y);
  }

  /** The caret an agent is typing with, as an overlay. */
  caretOv(a: Agent): Ov[] {
    const c = a.caret;
    if (!c || !c.p.typing) return [];
    const T = c.p.typing;
    const l = T.lines[c.i];
    if (!l) return [];
    const off = T.at ?? { x: 0, y: 0 };
    return [{ t: "caret", x: off.x + l.x + T.shown[c.i], y: off.y + l.y, h: l.h, c: a.color, f: this.frame(c.p) }];
  }

  /* ------------------------------------------------------------------ ghosts */

  ghost<T extends HTMLElement>(g: T): T {
    g.classList.add("sw-ghost");
    this.ov.layer.append(g);
    this.ghosts.add(g);
    return g;
  }

  dropGhost(g: HTMLElement): void {
    g.remove();
    this.ghosts.delete(g);
  }

  /* ------------------------------------------------------------------ agents */

  spawn(x: number, y: number, tones: readonly Tone[] = TONES, small = this.small): Agent {
    const id = this.nextAgent++;
    const tone = tones[(id - 1) % tones.length];
    const name = initials(this.names);
    this.names.add(name);
    const el = this.doc.createElement("div");
    el.className = small ? "sw-cur is-small" : "sw-cur";
    el.style.setProperty("--c", tone.c);
    el.style.setProperty("--rim", tone.rim);
    el.innerHTML = `<span class="sw-ptrs">${POINTER_SVG}</span><span class="sw-name">${name}</span>`;
    el.dataset.shape = "arrow";
    this.ov.layer.append(el);
    const a: Agent = { id, name, color: tone.c, el, x, y, shape: "arrow", press: 0, job: null, task: null, ov: null, leaving: false, small, caret: null, idle: false, parked: false, crew: null, slot: 0, rest: 0 };
    this.agents.push(a);
    return a;
  }

  /** Gives an agent a new script, closing the one it had (its clean-up runs). */
  setJob(a: Agent, job: Act | null): void {
    const old = a.job;
    a.job = job;
    if (old && old !== job) {
      try {
        old.return();
      } catch { /* it is the one running */ }
    }
  }

  private drop(a: Agent): void {
    a.el.remove();
    this.agents = this.agents.filter((b) => b !== a);
    this.names.delete(a.name);
    if (a.crew) a.crew.agents = a.crew.agents.filter((b) => b !== a);
  }

  leave(a: Agent): void {
    if (a.leaving) return;
    a.leaving = true;
    a.task = null;
    a.ov = null;
    a.caret = null;
    this.setJob(a, this.exit(a));
  }

  /** Gone: a beat, then a dash off the nearest edge of the screen (a side, or the bottom), speeding up as it goes. */
  private *exit(a: Agent): Act {
    a.shape = "arrow";
    // out of sight already: simply gone
    if (!this.inView({ x: a.x - 20, y: a.y - 20, w: 40, h: 40 }, 40)) return;
    yield* this.wait(rand(0, 0.12));
    const l = a.x - this.sx;
    const r = this.sx + this.vw - a.x;
    const b = this.sy + this.vh - a.y;
    const x = a.x + rand(-50, 50);
    const y = a.y + rand(-40, 40);
    const to = (): Pt => {
      if (b < l && b < r) return { x, y: this.sy + this.vh + 60 };
      return { x: l < r ? this.sx - 60 : this.sx + this.vw + 60, y };
    };
    yield* this.moveTo(a, to, { speed: 1.5, flee: true });
  }

  /* ------------------------------------------------------------------ motion primitives */

  *wait(t: number): Act {
    let n = 0;
    while (n < t) n += yield;
  }

  /**
   * Glides an agent to a point (or a moving point) on a slight arc, as a hand moves a mouse: it eases in, travels and
   * settles. A drag eases both ends; a flight off the screen speeds up all the way.
   */
  *moveTo(a: Agent, target: Pt | (() => Pt), o: { speed?: number; drag?: boolean; flee?: boolean; bend?: number; onStep?: (k: number) => void } = {}): Act {
    const get = typeof target === "function" ? target : () => target;
    const x0 = a.x;
    const y0 = a.y;
    const p0 = get();
    const dist = Math.hypot(p0.x - x0, p0.y - y0);
    if (dist < 0.5) {
      a.x = p0.x;
      a.y = p0.y;
      o.onStep?.(1);
      return;
    }
    const dur = clamp(0.08 + Math.sqrt(dist) * 0.018, 0.12, 0.7) / (o.speed ?? 1);
    const bend = (o.bend ?? (Math.random() < 0.5 ? -1 : 1) * rand(0.04, 0.13)) * Math.min(dist, 600);
    let t = 0;
    while (t < dur) {
      t += yield;
      const k = Math.min(1, t / dur);
      const e = o.drag ? easeInOut(k) : o.flee ? k * k : easeOut(k ** 1.35);
      const p = get();
      const dx = p.x - x0;
      const dy = p.y - y0;
      const L = Math.hypot(dx, dy) || 1;
      const off = Math.sin(Math.PI * e) * bend;
      a.x = x0 + dx * e + (-dy / L) * off;
      a.y = y0 + dy * e + (dx / L) * off;
      o.onStep?.(e);
    }
  }

  *click(a: Agent): Act {
    a.press = 1;
    sfx.press(a.x - this.sx);
    yield* this.wait(0.07);
  }

  /** A soft note for something set in place, by its size on screen and where it is. */
  note(b: Box): void {
    sfx.note(Math.sqrt((b.w * b.h) / Math.max(1, this.vw * this.vh)), b.x + b.w / 2 - this.sx);
  }

  inView(b: Box, margin = 0): boolean {
    return b.y + b.h > this.sy - margin && b.y < this.sy + this.vh + margin && b.x + b.w > this.sx && b.x < this.sx + this.vw;
  }

  /* ------------------------------------------------------------------ crews */

  /** One crew per section of the page, top down. */
  private makeCrews(): void {
    let els = [...this.doc.querySelectorAll<HTMLElement>("main > section")].filter((s) => s.getClientRects().length > 0);
    if (!els.length) els = [this.doc.body];
    this.crews = els.map((el, i): Crew => {
      const key = el.id || (el.classList.contains("hero") ? "hero" : `section-${i}`);
      return {
        key, el, size: this.stay, stay: this.stay, tempo: TEMPO[key] ?? 1, agents: [], side: i % 2 ? "l" : "r", light: lightGround(el),
        spot: { x: 0, y: 0 }, top: 0, bottom: 0, started: true, done: true, settled: false, cool: 0, shuffle: rand(5, 10),
      };
    });
    this.readView();
    this.placeCrews();
  }

  /** Build mode: which crew builds which section, and how many hands each gets for the work in it. */
  private staffCrews(): void {
    for (const s of this.sections) {
      const c = this.crews.find((k) => k.el === s.el) ?? this.crews.find((k) => k.el.contains(s.el)) ?? this.crews[0];
      this.crewBySec.set(s, c);
    }
    for (const c of this.crews) {
      const n = this.tasks.filter((t) => this.crewBySec.get(t.sec) === c).length;
      c.size = this.small ? clamp(Math.round(n / 8), 2, 6) : clamp(Math.round(n / 3.5), 3, 14);
      c.started = false;
      c.done = n === 0;
      c.settled = false;
    }
  }

  /** Adds an agent to a crew, arriving from a point, in the first free place of its huddle, in a tone for its ground. */
  private join(c: Crew, from: Pt): Agent {
    const a = this.spawn(from.x, from.y, c.light ? TONES_LIGHT : TONES);
    const used = new Set(c.agents.filter((b) => !b.leaving).map((b) => b.slot));
    let k = 0;
    while (used.has(k)) k++;
    a.crew = c;
    a.slot = k;
    c.agents.push(a);
    return a;
  }

  /**
   * Where a crew's newcomer comes in: just past the side of the screen nearest the work it is wanted for, level with
   * it; with no work in mind, on the crew's side, beside its section.
   */
  private entryFor(c: Crew, near?: Task): Pt {
    if (near) {
      const y = clamp(this.taskY(near) + rand(-60, 60), this.sy + 60, this.sy + this.vh - 40);
      return { x: near.x - this.sx < this.vw / 2 ? this.sx - 40 : this.sx + this.vw + 40, y };
    }
    const y = clamp(this.sy + this.vh * rand(0.3, 0.75), c.top + 30, Math.max(c.top + 30, c.bottom - 30));
    return { x: c.side === "r" ? this.sx + this.vw + 40 : this.sx - 40, y };
  }

  private huddle(): Pt[] {
    return this.small ? HUDDLE_SMALL : HUDDLE;
  }

  /** How much room a huddle of n takes, name tags included. */
  private huddleBox(n: number): { w: number; h: number } {
    const tag = this.small ? TAG_SMALL : TAG;
    const spots = this.huddle().slice(0, Math.max(1, n));
    return { w: Math.max(...spots.map((p) => p.x)) + tag.w, h: Math.max(...spots.map((p) => p.y)) + tag.h };
  }

  /** Finds each crew's corner again (the page moved or changed size). */
  private placeCrews(): void {
    // the page's content edges, from the first section that keeps to a column
    let edges: { l: number; r: number } | null = null;
    for (const c of this.crews) {
      const b = widest(c.el);
      const r = c.el.getBoundingClientRect();
      if (b && b.width > r.width * 0.5 && b.width < r.width * 0.97) {
        edges = { l: b.left + this.sx, r: b.right + this.sx };
        break;
      }
    }
    for (const c of this.crews) this.placeCrew(c, edges);
  }

  /**
   * A crew's corner: inside its section's top or bottom margin, lined up with the content's left or right edge, on its
   * own side first (sections alternate, so the huddles zigzag down the page); a corner with something in it is passed
   * over for the next, and failing all four, the first free place down an edge.
   */
  private placeCrew(c: Crew, edges: { l: number; r: number } | null): void {
    const r = c.el.getBoundingClientRect();
    if (!r.height) return;
    const top = r.top + this.sy;
    const bottom = r.bottom + this.sy;
    const gut = this.small ? 14 : 28;
    const b = widest(c.el);
    const own = b && b.width > r.width * 0.5 && b.width < r.width * 0.97;
    const L = own ? b.left + this.sx : (edges?.l ?? r.left + this.sx + gut);
    const R = own ? b.right + this.sx : (edges?.r ?? r.right + this.sx - gut);
    const cs = getComputedStyle(c.el);
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const { w, h } = this.huddleBox(c.stay);
    const yT = padT >= h + 24 ? top + (padT - h) / 2 : top + 24;
    const yB = padB >= h + 24 ? bottom - padB + (padB - h) / 2 : bottom - h - 24;
    const xR = R - w;
    const xL = L;
    const right = [{ x: xR, y: yT }, { x: xR, y: yB }];
    const left = [{ x: xL, y: yB }, { x: xL, y: yT }];
    const order = c.side === "r" ? [...right, ...left] : [...left, ...right];
    const blocks = this.obstacles(c);
    const m = 14;
    const free = (p: Pt) => !blocks.some((o) => p.x < o.x + o.w + m && p.x + w > o.x - m && p.y < o.y + o.h + m && p.y + h > o.y - m);
    let spot = order.find(free);
    for (const x of c.side === "r" ? [xR, xL] : [xL, xR]) {
      for (let y = top + 24; !spot && y + h < bottom - 24; y += 24) if (free({ x, y })) spot = { x, y };
    }
    c.spot = spot ?? order[0];
  }

  /** What is in a section, on the page: words line by line, pictures, boxes, labels (faded ones too). */
  private obstacles(c: Crew): Box[] {
    const out: Box[] = [];
    const add = (b: DOMRect) => {
      if (b.width > 0 && b.height > 0) out.push({ x: b.left + this.sx, y: b.top + this.sy, w: b.width, h: b.height });
    };
    const range = this.doc.createRange();
    for (const s of partsOf(c.el, true, true)) {
      if (s.kind === "text") {
        range.selectNodeContents(s.el);
        for (const b of range.getClientRects()) add(b);
      } else add(s.el.getBoundingClientRect());
    }
    // a strip that runs sideways covers its whole row
    c.el.querySelectorAll(".reel, [data-reel-track]").forEach((e) => add(e.getBoundingClientRect()));
    // the fixed nav sits over the top of the first section
    if (c === this.crews[0]) {
      const nav = this.doc.querySelector<HTMLElement>("[data-nav]");
      if (nav) out.push({ x: 0, y: 0, w: this.sx + this.vw, h: nav.offsetHeight + 12 });
    }
    return out;
  }

  /** Where an agent parks: its place in its crew's huddle, in the crew's corner. */
  parkSpot(a: Agent): Pt {
    const c = a.crew;
    if (!c) return { x: this.sx + this.vw - 60, y: this.sy + this.vh - 90 };
    const f = this.huddle()[a.slot % this.huddle().length];
    return { x: c.spot.x + f.x, y: c.spot.y + f.y };
  }

  /**
   * Where an agent waits: in its crew's huddle once the section is built; while it is being built, where it stopped
   * (`hold`), for the moment before it heads off the screen.
   */
  restSpot(a: Agent, hold?: Pt): Pt {
    const c = a.crew;
    if (c && !c.done && hold) return hold;
    return this.parkSpot(a);
  }

  /**
   * Every crew, every frame. While its section is built, a hand with nothing to do stays where it stopped for a
   * moment, then heads off the screen (it does not wait at the edges); hands come back in as work opens, as the
   * visitor scrolls. Once its section is built, the ones nearest its corner go straight there and the rest dash off
   * the screen together; after that it keeps to its size (missing ones come in, straight to the corner when it is out
   * of sight) and its places close up. Anyone without a job parks. Now and then two in a huddle on screen swap places.
   */
  private tendCrews(dt: number): void {
    for (const c of this.crews) {
      c.cool -= dt;
      let here = c.agents.filter((a) => !a.leaving);
      if (!c.done) {
        for (const a of here) {
          a.rest = a.idle && a.job ? a.rest + dt : 0;
          if (a.rest > LINGER) this.leave(a);
        }
        here = c.agents.filter((a) => !a.leaving);
      } else {
        if (here.length > c.stay) {
          const d = (a: Agent) => Math.hypot(a.x - c.spot.x, a.y - c.spot.y);
          const keep = [...here].sort((p, q) => d(p) - d(q)).slice(0, c.stay);
          for (const a of here) if (a.idle && !keep.includes(a)) this.leave(a);
          here = c.agents.filter((a) => !a.leaving);
          if (!c.settled) {
            // the first places of the huddle go to those who stay
            keep.sort((p, q) => p.slot - q.slot).forEach((a, i) => { a.slot = i; });
            here.filter((a) => !keep.includes(a)).forEach((a, i) => { a.slot = c.stay + i; });
          }
        } else if (here.length < c.stay && c.cool <= 0 && this.agents.length < this.cap) {
          const used = new Set(here.map((a) => a.slot));
          let k = 0;
          while (used.has(k)) k++;
          const f = this.huddle()[k % this.huddle().length];
          const at = { x: c.spot.x + f.x, y: c.spot.y + f.y };
          const seen = this.inView({ x: at.x - 30, y: at.y - 30, w: 60, h: 60 }, 60);
          this.join(c, seen ? this.entryFor(c) : at);
          c.cool = seen ? 0.3 : 0;
        }
        if (here.length <= c.stay) {
          here.sort((p, q) => p.slot - q.slot).forEach((a, i) => { a.slot = i; });
        }
        if (!c.settled) {
          // to the corner now, on a fresh glide, from wherever they waited
          c.settled = true;
          for (const a of here) if (a.idle) this.setJob(a, null);
        }
        c.shuffle -= dt;
        if (c.shuffle <= 0) {
          c.shuffle = rand(7, 14);
          const parked = here.filter((a) => a.parked && a.idle);
          if (parked.length >= 2 && this.inView({ x: c.spot.x, y: c.spot.y, w: 80, h: 80 })) {
            const [p, q] = [pick(parked), pick(parked)];
            if (p !== q) [p.slot, q.slot] = [q.slot, p.slot];
          }
        }
      }
      for (const a of here) {
        if (!a.job) {
          a.idle = true;
          this.setJob(a, ACTS.park(this, a, null as unknown as Task));
        }
      }
    }
  }

  /** Built: one comes over to what the visitor points at. */
  private watch(): void {
    const f = this.focus;
    if (f && !f.agent && !this.small) {
      const b = f.el.getBoundingClientRect();
      const cx = b.left + this.sx + b.width / 2;
      const cy = b.top + this.sy + b.height / 2;
      const own = this.crews.find((c) => c.el.contains(f.el));
      const near = (a: Agent) => a.idle && !a.leaving && this.inView({ x: a.x - 10, y: a.y - 10, w: 20, h: 20 }, this.vh * 0.5);
      let free = (own?.agents ?? []).filter((a) => a.idle && !a.leaving);
      if (!free.length) free = this.agents.filter(near);
      free.sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy));
      const a = free[0];
      if (a) {
        f.agent = a;
        a.idle = false;
        this.setJob(a, ACTS.attend(this, a, { data: { el: f.el } } as unknown as Task));
      }
    }
  }

  private hover(e: PointerEvent): void {
    if (e.pointerType !== "mouse" || this.mode !== "idle") return;
    const el = (e.target as Element).closest<HTMLElement>(".project, .ach-card, .sticker, .chip, .tag, .btn, .agenda .row, .stop, .badge");
    if (!el || this.focus?.el === el) return;
    this.focus = { el, agent: null };
    const leave = () => {
      if (this.focus?.el === el) this.focus = null;
      el.removeEventListener("pointerleave", leave);
    };
    el.addEventListener("pointerleave", leave);
  }

  /** Whether the visitor is still pointing at an element an agent came to. */
  focused(el: HTMLElement): boolean {
    return this.focus?.el === el;
  }

  /* ------------------------------------------------------------------ drawing */

  private draw(dt: number): void {
    const list: Ov[] = [];
    for (const a of this.agents) {
      if (a.ov) list.push(...a.ov());
      if (a.caret) list.push(...this.caretOv(a));
    }
    this.ov.draw(list, this.sx, this.sy);
    // only what changed is written: a parked crew costs little
    for (const a of this.agents) {
      a.press = Math.max(0, a.press - dt * 7);
      const was = this.drawn.get(a) ?? { t: "", p: "", s: "" };
      if (was.s !== a.shape) {
        a.el.dataset.shape = a.shape;
        const [hx, hy] = HOT[a.shape as Shape];
        a.el.style.setProperty("--hx", `${-hx}px`);
        a.el.style.setProperty("--hy", `${-hy}px`);
        was.s = a.shape;
      }
      const t = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      if (was.t !== t) a.el.style.transform = was.t = t;
      const pr = (1 - a.press * 0.16).toFixed(3);
      if (was.p !== pr) a.el.style.setProperty("--press", (was.p = pr));
      this.drawn.set(a, was);
      if (a.el.classList.contains("is-parked") !== a.parked) a.el.classList.toggle("is-parked", a.parked);
    }
  }
}

/** The part of a member that matches part i of another: the same place if it is of the same kind, else the same turn. */
function matchPart(src: Member, dst: Member, i: number): Part | null {
  const want = dst.parts[i];
  if (src.parts[i]?.kind === want.kind) return src.parts[i];
  const n = dst.parts.slice(0, i).filter((q) => q.kind === want.kind).length;
  return src.parts.filter((q) => q.kind === want.kind)[n] ?? null;
}

/** Whether an element's own ground is light (by its background's lightness). */
function lightGround(el: HTMLElement): boolean {
  const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number);
  if (!m || m.length < 3 || m[3] === 0) return el.matches(".theme-light");
  return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 > 0.5;
}

/** The widest box among an element's children (a section's content column). */
function widest(el: HTMLElement): DOMRect | null {
  let best: DOMRect | null = null;
  for (const k of el.children) {
    const b = k.getBoundingClientRect();
    if (b.height > 0 && (!best || b.width > best.width)) best = b;
  }
  return best;
}

function union(list: Box[]): Box {
  const x = Math.min(...list.map((b) => b.x));
  const y = Math.min(...list.map((b) => b.y));
  return { x, y, w: Math.max(...list.map((b) => b.x + b.w)) - x, h: Math.max(...list.map((b) => b.y + b.h)) - y };
}

export { pick, union };
