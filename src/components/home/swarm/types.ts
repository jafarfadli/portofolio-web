import type { Box, Frame, Pt } from "./geom";
import type { Shape } from "./look";

/** What a page part looks like while the swarm works on it. The renderer writes it to the element when it changes. */
export type Look = {
  /** hidden, its place kept (visibility) */
  hide: boolean;
  /** its box shows, its own words and icon do not (a label waiting to be typed) */
  mute: boolean;
  /** clip-path while typing */
  clip: string | null;
  /** an upright or part-way tilt, degrees, instead of its own; null leaves its own */
  tilt: number | null;
  /** a heading growing from small type: a scale from its top left; null for none */
  sc: number | null;
};

export type PieceKind = "box" | "media" | "text" | "label" | "line";

export type Piece = {
  el: HTMLElement;
  kind: PieceKind;
  look: Look;
  dirty: boolean;
  /** which property carries the element's own tilt, and its value in degrees */
  tiltVia: "transform" | "rotate" | null;
  tiltDeg: number;
  /** inline styles the swarm writes, as they were before, to put back */
  saved: Record<string, string>;
  /** set while a reveal animation runs, so a skip can finish it */
  anim: Animation | null;
  done: boolean;
  /** the piece this one sits in (its box), if any */
  parent: Piece | null;
  /** typing state, while it is typed */
  typing: Typing | null;
  /** its layout box and transforms, measured when planned */
  base: Frame | null;
};

export type Typing = {
  lines: Box[];
  shown: number[];
  /** px per typed character, for pacing */
  perChar: number;
  /** a label is typed into a stand-in laid over it, not on the element */
  stand: HTMLElement | null;
  /** where the stand-in's line sits in the element (local), for the caret */
  at: Box | null;
};

export type Ov =
  | { t: "box"; b: Box; f?: Frame; copy?: boolean; handles?: boolean; badge?: string; ph?: 0 | 1 | 2; phOp?: number; thin?: boolean }
  | { t: "measure"; a: Pt; b: Pt; label: string }
  | { t: "caret"; x: number; y: number; h: number; c: string; f?: Frame }
  | { t: "hl"; rects: Box[]; f?: Frame }
  | { t: "pen"; pts: Pt[]; to?: Pt; c: string };

export type Agent = {
  id: number;
  name: string;
  color: string;
  el: HTMLElement;
  x: number;
  y: number;
  shape: Shape;
  /** 1 at a press, easing back to 0 */
  press: number;
  job: Generator<void, void, number> | null;
  task: Task | null;
  ov: (() => Ov[]) | null;
  /** leaving the page: removed once off screen */
  leaving: boolean;
  small: boolean;
  /** the line it is typing on, for its caret */
  caret: { p: Piece; i: number } | null;
  /** between tasks: free to be given one */
  idle: boolean;
  /** in its parking spot */
  parked: boolean;
  /** the section crew it belongs to, and its place in the crew's huddle */
  crew: Crew | null;
  slot: number;
  /** how long it has had nothing to do, while its section is built (s) */
  rest: number;
};

/**
 * The agents of one section: they build it, and once it is built a few of them stay, parked in a huddle in one of its
 * corners, and keep an eye on it.
 */
export type Crew = {
  key: string;
  el: HTMLElement;
  /** hands while the section is built */
  size: number;
  /** how many stay once it is built */
  stay: number;
  /** the build runs this much faster here */
  tempo: number;
  agents: Agent[];
  /** which side of the page its corner is on; sections alternate */
  side: "l" | "r";
  /** its section's ground is light: its agents wear the dark tones */
  light: boolean;
  /** the huddle's top left on the page */
  spot: Pt;
  /** its section's top and bottom on the page, read each frame */
  top: number;
  bottom: number;
  started: boolean;
  done: boolean;
  /** sent to its corner since it was done */
  settled: boolean;
  /** time to the next arrival or departure */
  cool: number;
  /** time to the next shuffle in the huddle */
  shuffle: number;
};

export type Act = Generator<void, void, number>;

export type TaskState = "wait" | "open" | "busy" | "done";

export type Task = {
  id: number;
  act: string;
  piece: Piece | null;
  /** page point used to order the work top down and to pick the nearest */
  x: number;
  y: number;
  deps: Task[];
  state: TaskState;
  sec: Section;
  data: Record<string, unknown>;
  /** on something fixed to the screen: its y is on the screen, not the page */
  fixed: boolean;
  /** its part shows already (the rest is lingering): what sits inside it may start */
  ready?: boolean;
  /** finishes the task at once, with no agent (a skip, or work left far behind) */
  instant?: () => void;
};

export type Section = {
  key: string;
  el: HTMLElement;
  top: number;
  bottom: number;
  tasks: Task[];
  started: boolean;
  done: boolean;
  onStart?: () => void;
  onDone?: () => void;
  /** when it started (the swarm's clock) and who worked on it, for the agents' log */
  t0?: number;
  hands?: Set<string>;
};

/** One of a set of alike parts (chips, tags, rows, passes, cards): the master is built, the rest are copied. */
export type Member = {
  root: HTMLElement;
  parts: Part[];
  /** every part of it is in place */
  built: boolean;
  dup: Task | null;
};

/** One part of a member. Its piece is looked up when needed (a master's tags are planned after the master). */
export type Part = { el: HTMLElement; kind: PieceKind; parent: number; task: Task | null; stand: HTMLElement | null };

/** `burst`: how many copies of it may be dragged out at once (3 when not set) */
export type Group = { members: Member[]; burst?: number };
