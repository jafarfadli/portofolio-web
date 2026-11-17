/**
 * The swarm's sounds, synthesized live with the Web Audio API (no audio files). Mostly clicky, a little musical:
 * mouse presses, mechanical key ticks while typing, a crisp snap when a turned part lands on its angle, rising ticks
 * while a heading grows, and a sparse glass-piano note from the E major pentatonic for every finished box, image and
 * copy, on an eighth-note grid (big things low, small things high, rising left to right, panned to where it happens).
 * A soft chord when the page is done.
 * Browsers keep audio locked until the visitor clicks or types, so nothing plays before that first gesture.
 */
const PREF = "crew-sound";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let verb: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = readMuted();
const last: Record<string, number> = {};
const slots = new Set<number>();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(PREF) === "off";
  } catch {
    return false;
  }
}

export const isMuted = () => muted;

/** True once the browser lets sound play (after the visitor's first click or key). */
export const isLive = () => !!ctx && ctx.state === "running";

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(PREF, m ? "off" : "on");
  } catch {
    /* private window: the choice lasts this visit only */
  }
  listeners.forEach((fn) => fn());
}

/** Called when sound becomes live or is switched on or off. */
export function onChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function impulse(ac: AudioContext, secs: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * secs);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
  }
  return buf;
}

/** Creates or wakes the audio graph. Call only from a click or key handler, where the browser allows it. */
export function unlock(): void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(comp).connect(ctx.destination);
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 2.2);
    verb = ctx.createGain();
    verb.gain.value = 0.22;
    verb.connect(conv).connect(out);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ctx.onstatechange = () => listeners.forEach((fn) => fn());
  }
  if (ctx.state === "suspended") void ctx.resume().then(() => listeners.forEach((fn) => fn()));
}

/**
 * Unlocks on the visitor's first click or key anywhere, so sounds after it can play. A press on the sound switch is
 * left to the switch, which then knows to turn sound on rather than off.
 */
export function unlockOnFirstGesture(signal: AbortSignal): void {
  const stop = new AbortController();
  const go = (e: Event) => {
    if ((e.target as Element | null)?.closest?.("[data-sound]")) return;
    unlock();
    stop.abort();
  };
  signal.addEventListener("abort", () => stop.abort());
  window.addEventListener("pointerdown", go, { signal: stop.signal, capture: true });
  window.addEventListener("keydown", go, { signal: stop.signal, capture: true });
}

/** The graph, when a sound may play now. Rate-limits each kind so a busy swarm stays a texture, not a roar. */
function ready(kind: string, gapMs: number): { ac: AudioContext; dest: AudioNode } | null {
  if (muted || !ctx || !out || ctx.state !== "running") return null;
  const now = performance.now();
  if (now - (last[kind] ?? 0) < gapMs) return null;
  last[kind] = now;
  return { ac: ctx, dest: out };
}

/** Left-right place of a sound from the screen x it happens at. */
function panner(ac: AudioContext, dest: AudioNode, x?: number): AudioNode {
  if (x === undefined || typeof ac.createStereoPanner !== "function") return dest;
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-0.7, Math.min(0.7, (x / window.innerWidth) * 2 - 1));
  p.connect(dest);
  return p;
}

function burst(ac: AudioContext, dest: AudioNode, at: number, dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = "bandpass") {
  const src = ac.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 0.3, dur + 0.02);
}

function tone(ac: AudioContext, dest: AudioNode, at: number, dur: number, f0: number, f1: number, gain: number, type: OscillatorType = "sine") {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** A mouse button: a sharp tick going down and a softer one coming up. */
export function press(x?: number): void {
  const r = ready("press", 30);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  burst(r.ac, dest, t, 0.024, 3800, 1.4, 0.32);
  tone(r.ac, dest, t, 0.018, 1700, 1300, 0.05, "triangle");
  burst(r.ac, dest, t + 0.075, 0.016, 5200, 1.4, 0.16);
}

/** A key on a mechanical keyboard: a bright tick then a duller bottom-out, deeper on a space. */
export function key(x?: number, space = false): void {
  const r = ready("key", 34);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  const v = 0.85 + Math.random() * 0.3;
  burst(r.ac, dest, t, 0.008, 4800 * v, 0.9, 0.3);
  burst(r.ac, dest, t + 0.007, 0.014, (space ? 1500 : 2400) * v, 1.1, 0.18);
  tone(r.ac, dest, t + 0.007, 0.025, (space ? 180 : 260) * v, (space ? 120 : 180) * v, 0.012);
}

/** A part landing on its angle: a crisp, high double click. */
export function snap(x?: number): void {
  const r = ready("snap", 60);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  burst(r.ac, dest, t, 0.01, 6400, 2.2, 0.3);
  tone(r.ac, dest, t, 0.03, 2600, 2400, 0.05);
  burst(r.ac, dest, t + 0.03, 0.008, 7600, 2.2, 0.16);
}

/** A heading stepping up a size: a short tick that climbs with each step. */
export function grow(step: number, x?: number): void {
  const r = ready("grow", 40);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  const f = 520 * 2 ** (step * 2 / 12);
  tone(r.ac, dest, t, 0.05, f, f * 1.01, 0.05, "triangle");
  burst(r.ac, dest, t, 0.01, f * 4, 2, 0.08);
}

const PENTA = [0, 2, 4, 7, 9]; // E F# G# B C#
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

function piano(ac: AudioContext, midi: number, at: number, vel: number, x?: number, ring = 2.2) {
  const f = mtof(midi);
  const dest = panner(ac, out!, x);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = Math.min(9000, f * 9);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vel, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
  lp.connect(g);
  g.connect(dest);
  if (verb) g.connect(verb);
  for (const [ratio, amp, decay] of [[1, 1, 1], [2, 0.32, 0.55], [3, 0.1, 0.35], [4.18, 0.05, 0.2]] as const) {
    const o = ac.createOscillator();
    o.frequency.value = f * ratio * (1 + (Math.random() - 0.5) * 0.002);
    const pg = ac.createGain();
    pg.gain.setValueAtTime(amp, at);
    pg.gain.exponentialRampToValueAtTime(0.0001, at + ring * decay);
    o.connect(pg).connect(lp);
    o.start(at);
    o.stop(at + ring + 0.05);
  }
  burst(ac, dest, at, 0.012, Math.min(9000, f * 5), 1.2, vel * 0.5);
}

/**
 * Something set in its place: one note, on the next free eighth of a 96 bpm grid. Big things play low and small things
 * high; further right is higher. `size` is 0 (tiny) to 1 (a whole screen), `x` the screen x.
 */
export function note(size: number, x: number): void {
  if (muted || !ctx || !out || ctx.state !== "running") return;
  const grid = 60 / 96 / 2;
  const now = ctx.currentTime;
  let at = Math.ceil((now + 0.01) / grid) * grid;
  const slot = (t: number) => Math.round(t / grid);
  if (slots.has(slot(at))) at += grid;
  if (slots.has(slot(at))) return; // the grid is full: let this one pass silently
  slots.add(slot(at));
  if (slots.size > 64) slots.delete(slots.values().next().value!);
  const across = Math.max(0, Math.min(1, x / window.innerWidth));
  const step = Math.round((1 - Math.sqrt(Math.max(0, Math.min(1, size)))) * 7 + across * 3);
  const midi = 52 + 12 * Math.floor(step / 5) + PENTA[step % 5];
  piano(ctx, midi, at, 0.045 + Math.random() * 0.025, x);
}

/** Done: a soft E major chord, rolled from the bottom. */
export function chord(): void {
  const r = ready("chord", 1000);
  if (!r) return;
  const t = r.ac.currentTime + 0.02;
  [52, 59, 64, 68, 71, 76].forEach((m, i) => piano(r.ac, m, t + i * 0.06, 0.06, undefined, 3));
}
