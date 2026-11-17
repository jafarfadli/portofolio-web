/**
 * The build plan: every visible part of the page as a task for the swarm, and each section built its own way.
 *
 *  nav           not built: it is there from the start
 *  hero          first and alone, the headline's lead line ("AI integrations") is typed small and grown; then it is
 *                copied into the lines above and below it and each copy retyped. Meanwhile the screens are dropped
 *                in as image boxes and turned into their tilt, and one button is built and the other copied from it.
 *                The badge is not built: it drops in on its lanyard by itself (home-motion)
 *  about         several agents type the paragraph at once, a line each; the skill chips are not built, they pop in
 *                by themselves as they scroll in
 *  work          the heading only; the cards are there from the start
 *  achievements  the heading only; the passes are there from the start and the strip keeps running
 *  activities    the heading only; the agenda is there from the start
 *  experience    the card is drawn, the first stop typed, the rest copied down
 *  closing       "Let's talk." grows a size at a time and its wave is dropped in; the rest is there from the start
 *
 * Classification is generic (a part with words is typed, a part with a fill or a rule is a box, pictures are media),
 * so whatever the owner puts in the editor is covered; the sections only choose how.
 */
import { textLines, type Pt } from "./geom";
import type { Swarm } from "./swarm";
import type { Group, Member, Part, Piece, PieceKind, Section, Task } from "./types";

const SKIP = ".sr-only, .skip, .sticker-cap, .preview, .hero-dust, .cord, .menu-sheet, .face.back, .ach.is-clone, [hidden], .sw-layer, .sw-ghost, script, style, template, noscript";
/** taken whole: its insides are not parts of their own (except a feature tag on a screenshot) */
const MEDIA = "img, svg, canvas, video, picture, .ico-stk, .sticker, .print, .ach-photos, .strap, .seal";
const KEEP_IN_MEDIA = ".feat-tag";
/** carry their own tilt, which an agent turns them into */
const TILTED = ".sticker, .chip, .ach-card, .print, .ico-stk";

type Spec = { el: HTMLElement; kind: PieceKind; parent: number };

const transparent = (c: string) => !c || c === "transparent" || /rgba?\([^)]*,\s*0(\.0+)?\)$/.test(c);

function visualOf(el: Element, cs: CSSStyleDeclaration): boolean {
  if (!transparent(cs.backgroundColor) || cs.backgroundImage !== "none" || cs.boxShadow !== "none") return true;
  for (const s of ["Top", "Right", "Bottom", "Left"] as const) {
    if (parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0 && cs.getPropertyValue(`border-${s.toLowerCase()}-style`) !== "none" && !transparent(cs.getPropertyValue(`border-${s.toLowerCase()}-color`))) return true;
  }
  for (const ps of ["::before", "::after"]) {
    const p = getComputedStyle(el, ps);
    if (!p.content || p.content === "none" || p.content === "normal" || p.display === "none") continue;
    if (!transparent(p.backgroundColor) || p.backgroundImage !== "none" || p.boxShadow !== "none" || parseFloat(p.borderTopWidth) > 0) return true;
  }
  return false;
}

const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());

function inlineOnly(el: Element): boolean {
  if (!el.textContent?.trim()) return false;
  for (const c of el.children) {
    const d = getComputedStyle(c).display;
    if (d !== "none" && !d.startsWith("inline") && d !== "contents") return false;
  }
  return true;
}

/**
 * The parts of a subtree, parents before children: what kind each is, and which part it sits in. A section's own
 * ground is not a part (`inside`: only what is in it). `faded`: parts faded out for now (waiting for an entrance)
 * count too.
 */
export function partsOf(root: HTMLElement, inside = false, faded = false): Spec[] {
  const out: Spec[] = [];
  const visit = (el: HTMLElement, parent: number) => {
    if (el.matches(SKIP)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || (!faded && parseFloat(cs.opacity) < 0.05)) return;
    const r = el.getBoundingClientRect();
    const sized = r.width >= 1 && r.height >= 1;
    if (el.matches(MEDIA)) {
      if (!sized) return;
      out.push({ el, kind: "media", parent });
      const me = out.length - 1;
      el.querySelectorAll<HTMLElement>(KEEP_IN_MEDIA).forEach((k) => visit(k, me));
      return;
    }
    if (sized && (ownText(el) || inlineOnly(el))) {
      const label = visualOf(el, cs);
      out.push({ el, kind: label ? "label" : "text", parent });
      if (label) return;
      const me = out.length - 1;
      for (const c of el.children) {
        const d = getComputedStyle(c).display;
        if (c.matches(MEDIA) || (!d.startsWith("inline") && d !== "contents")) visit(c as HTMLElement, me);
      }
      return;
    }
    let me = parent;
    if (sized && visualOf(el, cs)) {
      out.push({ el, kind: "box", parent });
      me = out.length - 1;
    }
    for (const c of el.children) visit(c as HTMLElement, me);
  };
  if (inside) for (const c of root.children) visit(c as HTMLElement, -1);
  else visit(root, -1);
  return out;
}

type Flavor = (s: Spec, i: number) => { act?: string; data?: Record<string, unknown>; skip?: boolean; deps?: Task[] } | void;

class Planner {
  readonly sw: Swarm;
  sec!: Section;
  /** elements already planned, and subtrees taken whole */
  private readonly planned = new Set<Element>();
  private readonly whole = new Set<Element>();

  constructor(sw: Swarm) {
    this.sw = sw;
  }

  section(key: string, el: HTMLElement, recipe: () => void, extra?: Partial<Section>): void {
    const r = el.getBoundingClientRect();
    const top = r.top + this.sw.win.scrollY;
    this.sec = { key, el, top, bottom: top + r.height, tasks: [], started: false, done: false, ...extra };
    recipe();
    this.leftovers(el);
    this.sw.sections.push(this.sec);
  }

  /** A task in the current section. */
  task(act: string, piece: Piece | null, deps: Task[], data: Record<string, unknown> = {}, at?: Pt): Task {
    const b = piece?.base;
    const t: Task = {
      id: this.sw.tasks.length + 1,
      act,
      piece,
      x: at?.x ?? (b ? b.x + Math.min(b.w, 200) / 2 : 0),
      y: at?.y ?? (b ? b.y : this.sec.top),
      deps: deps.filter(Boolean),
      state: "wait",
      sec: this.sec,
      data,
      fixed: !!b?.fixed,
    };
    this.sw.tasks.push(t);
    this.sec.tasks.push(t);
    return t;
  }

  /** Marks elements a recipe handles itself, so the generic pass leaves them alone. */
  claim(el: Element): void {
    this.planned.add(el);
  }

  /** Leaves an element and everything in it out of the build: it is on the page from the start. */
  skip(el: Element): void {
    this.planned.add(el);
    this.whole.add(el);
  }

  private pieceFor(s: Spec, parent: Piece | null): Piece {
    const p = this.sw.piece(s.el, s.kind, parent, s.el.matches(TILTED));
    this.planned.add(s.el);
    if (s.kind === "media" || s.kind === "label") this.whole.add(s.el);
    if (!p.base) this.sw.measure(p);
    return p;
  }

  /**
   * Plans a list of parts: one task each, after the part it sits in. `flavor` picks a part's act and extras, or skips
   * a part (left for another recipe; what sits in it waits for what it waits for). Tilted parts are built upright and
   * then turned, after everything inside them.
   */
  build(specs: Spec[], deps0: Task[], flavor?: Flavor): Task[] {
    const tasks: Task[] = [];
    const after: Task[][] = [];
    const pieces: (Piece | null)[] = [];
    const tilts: { t: Task; i: number }[] = [];
    specs.forEach((s, i) => {
      const up = s.parent >= 0 ? after[s.parent] : deps0;
      const f = flavor?.(s, i) ?? {};
      if (f.skip) {
        after[i] = up;
        pieces[i] = s.parent >= 0 ? pieces[s.parent] : null;
        return;
      }
      const p = this.pieceFor(s, s.parent >= 0 ? pieces[s.parent] : null);
      pieces[i] = p;
      const act = f.act ?? (s.kind === "media" ? "box" : s.kind);
      const data: Record<string, unknown> = { ...f.data };
      if (s.kind === "media") data.img = !s.el.matches(".ico-stk, svg");
      if (s.el.matches(".ico-stk")) data.pop = true;
      const tilt = !!p.tiltVia;
      if (tilt) {
        data.tilt = true;
        data.more = true;
      }
      const t = this.task(act, p, [...(f.deps ?? []), ...up], data);
      tasks.push(t);
      after[i] = [t];
      if (tilt) tilts.push({ t, i });
    });
    for (const { t, i } of tilts) {
      const inner = specs.map((_, j) => (j !== i && within(specs, j, i) ? after[j] : [])).flat();
      tasks.push(this.task("tilt", t.piece, [t, ...new Set(inner)], {}, { x: t.x, y: t.y + 1 }));
    }
    return tasks;
  }

  /** A subtree's parts not planned yet, each pointing at the nearest kept part it sits in. */
  fresh(root: HTMLElement): Spec[] {
    const all = partsOf(root);
    const at: number[] = [];
    const out: Spec[] = [];
    all.forEach((s, i) => {
      if (this.planned.has(s.el)) {
        at[i] = s.parent >= 0 ? at[s.parent] : -1;
        return;
      }
      out.push({ ...s, parent: s.parent >= 0 ? at[s.parent] : -1 });
      at[i] = out.length - 1;
    });
    return out;
  }

  /** Plans a subtree generically, with a flavor. */
  tree(root: HTMLElement, deps0: Task[] = [], flavor?: Flavor): Task[] {
    return this.build(this.fresh(root), deps0, flavor);
  }

  /**
   * A set of alike parts: the first is built (with `flavor`), the others are copies of a built one, dragged into
   * place and then edited: their words retyped, their pictures swapped, by several agents at once. Returns the
   * master's tasks and the task that marks it built (more can be added to wait for). `burst`: how many copies may be
   * dragged out at once (3 when not given).
   */
  group(roots: HTMLElement[], deps0: Task[], flavor?: Flavor, burst?: number): { master: Task[]; ready: Task | null; all: Task[] } {
    if (!roots.length) return { master: [], ready: null, all: [] };
    const members: Member[] = roots.map((root) => ({ root, parts: [], built: false, dup: null }));
    const group: Group = { members, burst };
    const master = members[0];
    const mSpecs = this.fresh(master.root);
    const mTasks = this.build(mSpecs, deps0, flavor);
    master.parts = mSpecs.map((s) => ({ el: s.el, kind: s.kind, parent: s.parent, task: null, stand: null }));
    const all = [...mTasks];
    const ready = this.task("mark", null, mTasks, { member: master }, { x: 0, y: mTasks[0]?.y ?? this.sec.top });
    all.push(ready);
    members.slice(1).forEach((m, k) => {
      const specs = this.fresh(m.root);
      const pieces: Piece[] = [];
      m.parts = specs.map((s, i): Part => {
        pieces[i] = this.pieceFor(s, s.parent >= 0 ? pieces[s.parent] : null);
        return { el: s.el, kind: s.kind, parent: s.parent, task: null, stand: null };
      });
      const rb = this.sw.measureEl(m.root);
      const dup = this.task("dup", null, [ready, ...deps0], { group, k: k + 1 }, { x: rb.x + 20, y: rb.y });
      dup.fixed = this.sw.isFixedEl(m.root);
      m.dup = dup;
      dup.instant = () => this.sw.settleCopy(m, null, true);
      all.push(dup);
      const edits: Task[] = [];
      m.parts.forEach((part, i) => {
        const p = pieces[i];
        if (part.kind === "text" || part.kind === "label") part.task = this.task("edit", p, [dup], { part });
        // a picture in a line of words (an icon) shows once the words around it are retyped
        else if (part.kind === "media") part.task = this.task("swap", p, [dup, ...(part.parent >= 0 && m.parts[part.parent].kind === "text" ? [m.parts[part.parent].task!] : [])], { part });
        if (part.task) edits.push(part.task);
      });
      all.push(...edits);
      all.push(this.task("mark", null, [dup, ...edits], { member: m }, { x: rb.x, y: rb.y + 1 }));
    });
    return { master: mTasks, ready, all };
  }

  /** Whatever a recipe left out, planned generically after the nearest planned part it sits in. */
  private leftovers(root: HTMLElement): void {
    const specs = partsOf(root, true).filter((s) => {
      if (this.planned.has(s.el)) return false;
      for (let e = s.el.parentElement; e && e !== root; e = e.parentElement) if (this.whole.has(e)) return false;
      return true;
    });
    if (!specs.length) return;
    specs.forEach((s) => {
      const host = this.hostTask(s.el, root);
      this.build([{ ...s, parent: -1 }], host ? [host] : []);
    });
  }

  private hostTask(el: HTMLElement, root: HTMLElement): Task | null {
    for (let e = el.parentElement; e && e !== root.parentElement; e = e.parentElement) {
      const p = this.sw.pieces.get(e);
      if (!p) continue;
      const t = this.sw.tasks.filter((x) => x.piece === p).pop();
      if (t) return t;
    }
    return null;
  }
}

/** Whether spec j sits (at any depth) inside spec i. */
function within(specs: Spec[], j: number, i: number): boolean {
  for (let p = specs[j].parent; p >= 0; p = specs[p].parent) if (p === i) return true;
  return false;
}

const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T & HTMLElement>(sel);
const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T & HTMLElement>(sel)];
const shown = (el: Element) => el.getClientRects().length > 0 && parseFloat(getComputedStyle(el).opacity) > 0.05;

/** A heading is typed small and grown. */
const headings: Flavor = (s) => (s.kind === "text" && s.el.matches("h1, h2, .lede .line > span, .agenda .title, .badge-name span") ? { data: { grow: true } } : undefined);

export function planPage(sw: Swarm): void {
  const doc = sw.doc;
  const P = new Planner(sw);
  for (const s of $$(doc, "main > section")) {
    if (s.matches(".hero")) P.section("hero", s, () => hero(P, s));
    else if (s.id === "about") P.section("about", s, () => about(P, s));
    else if (s.id === "work") P.section("work", s, () => work(P, s));
    else if (s.id === "achievements") P.section("achievements", s, () => achievements(P, s));
    else if (s.id === "activities") P.section("activities", s, () => activities(P, s));
    else if (s.id === "experience") P.section("experience", s, () => experience(P, s));
    else if (s.id === "contact") P.section("closing", s, () => closing(P, s));
    else P.section(s.id || "section", s, () => heads(P, s));
  }
}

function heads(P: Planner, s: HTMLElement): Task[] {
  const head = $(s, ".section-head");
  return head ? P.tree(head, [], headings) : [];
}

function hero(P: Planner, s: HTMLElement): void {
  // the headline's lead line (the one about AI) is the first thing on the page, built alone: typed small and grown.
  // Then it is copied into the other lines, above and below, and each copy is retyped; the rest of the hero waits too.
  const lines = $$(s, ".lede .line > span").filter(shown);
  const lead = lines.find((l) => /\bAI\b/.test(l.textContent ?? "")) ?? lines[0];
  let first: Task[] = [];
  if (lead) {
    const g = P.group([lead, ...lines.filter((l) => l !== lead)], [], headings);
    // the headline goes before anything else the hero's crew could do (on a phone the badge sits above it)
    g.all.forEach((t) => { t.data.first = true; });
    first = g.master;
    P.sw.lead = g.ready;
  }
  const btns = $$(s, ".statement .hero-actions .btn").filter(shown);
  P.group(btns, first);
  $$(s, ".stickers .sticker").filter(shown).forEach((st) => P.tree(st, first));
  // the badge on its lanyard is not built: it drops in on its own (home-motion)
  const pend = $(s, "[data-pendulum]");
  if (pend) P.skip(pend);
}

function about(P: Planner, s: HTMLElement): void {
  const text = $(s, ".about-text");
  if (text) {
    // several agents type it at once, a run of lines each
    const p = P.sw.piece(text, "text", null);
    P.claim(text);
    P.sw.measure(p);
    const n = Math.max(1, textLines(text).length);
    const hands = Math.min(n, P.sw.small ? 2 : 4);
    const per = Math.ceil(n / hands);
    const typists: Task[] = [];
    for (let h = 0; h < hands; h++) {
      const idx = Array.from({ length: Math.min(per, n - h * per) }, (_, i) => h * per + i).filter((i) => i < n);
      if (idx.length) typists.push(P.task("par", p, [], { lines: idx, of: n }, { x: p.base!.x, y: p.base!.y + (h * p.base!.h) / hands }));
    }
    // the icon stickers in the paragraph are dropped in once it is typed
    P.tree(text, typists, (sp) => (sp.el === text ? { skip: true } : undefined));
  }
  // the skill chips are not built: they pop in on their own as they scroll in (home-motion)
  const sheet = $(s, ".stack-sheet");
  if (sheet) P.skip(sheet);
}

function work(P: Planner, s: HTMLElement): void {
  heads(P, s);
  // the cards are not built: they are on the page from the start, and their leader lines draw on as they scroll in
  for (const card of $$(s, ".work-grid > .project")) P.skip(card);
}

function achievements(P: Planner, s: HTMLElement): void {
  heads(P, s);
  // the passes are not built: they are on the page from the start, and the strip keeps running
  for (const li of $$(s, ".reel-track > .ach")) P.skip(li);
}

function activities(P: Planner, s: HTMLElement): void {
  heads(P, s);
  // the agenda is not built: it is on the page from the start
  const agenda = $(s, "[data-agenda]");
  if (agenda) P.skip(agenda);
}

function experience(P: Planner, s: HTMLElement): void {
  heads(P, s);
  const card = $(s, ".itinerary");
  if (!card) return;
  const frame = P.tree(card, [], (sp) => (sp.el === card ? undefined : { skip: true }));
  $$(card, ":scope > h3").forEach((h) => P.tree(h, frame));
  P.group($$(card, ".stop").filter(shown), frame);
}

function closing(P: Planner, s: HTMLElement): void {
  // only the heading and its wave are built; the rest is on the page from the start
  heads(P, s);
  for (const el of $$(s, ":scope > *")) if (!el.matches(".section-head")) P.skip(el);
}
