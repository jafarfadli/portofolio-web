/**
 * The agent crew's sounds, synthesized live with the Web Audio API (no audio files): a mouse press and release, a key
 * tick for typing, a soft thock when something is set down, an airy sweep when the page clears, and a chord when it is
 * done. Browsers keep audio locked until the visitor clicks or types, so nothing plays before that first gesture: the
 * first-visit entrance runs silent, and everything after a click has sound. The visitor can switch it off; that choice
 * is remembered in this browser.
 */
const PREF = "crew-sound";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = readMuted();
const last: Record<string, number> = {};

function readMuted(): boolean {
  try {
    return localStorage.getItem(PREF) === "off";
  } catch {
    return false;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try {
    localStorage.setItem(PREF, m ? "off" : "on");
  } catch {
    /* private window: the choice lasts this visit only */
  }
}

/** Creates or wakes the audio graph. Call only from a click or key handler, where the browser allows it. */
export function unlock(): void {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    out = ctx.createGain();
    out.gain.value = 0.85;
    out.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
}

/** Unlocks on the visitor's first click or key anywhere, so sounds after it can play. */
export function unlockOnFirstGesture(signal: AbortSignal): void {
  const go = () => unlock();
  window.addEventListener("pointerdown", go, { once: true, signal, capture: true });
  window.addEventListener("keydown", go, { once: true, signal, capture: true });
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
  p.pan.value = Math.max(-0.7, Math.min(0.7, (x / window.innerWidth) * 2 - 1)) ;
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

/** A mouse button: a sharp tick going down, a softer one coming up. */
export function click(x?: number, up = false): void {
  const r = ready(up ? "up" : "down", 28);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  burst(r.ac, dest, t, up ? 0.018 : 0.026, up ? 5200 : 3800, 1.4, up ? 0.22 : 0.4);
  tone(r.ac, dest, t, 0.02, up ? 2300 : 1700, up ? 2000 : 1300, up ? 0.04 : 0.07, "triangle");
}

/** A key on a mechanical keyboard: a click over a short low thock, deeper on a space. */
export function key(x?: number, space = false): void {
  const r = ready("key", 34);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  const v = 0.85 + Math.random() * 0.3;
  // The click carries it; the thock under it stays small, or it reads as a drum instead of a key.
  // Two ticks a few ms apart, as a key goes down and then bottoms out: a bright one, then a duller one.
  burst(r.ac, dest, t, 0.008, 4800 * v, 0.9, 0.38);
  burst(r.ac, dest, t + 0.007, 0.014, (space ? 1500 : 2400) * v, 1.1, 0.22);
  tone(r.ac, dest, t + 0.007, 0.025, (space ? 180 : 260) * v, (space ? 120 : 180) * v, 0.015);
}

/** Something set down in its place: a soft card-on-table thock. */
export function thock(x?: number): void {
  const r = ready("thock", 60);
  if (!r) return;
  const dest = panner(r.ac, r.dest, x);
  const t = r.ac.currentTime;
  tone(r.ac, dest, t, 0.12, 170, 82, 0.22);
  burst(r.ac, dest, t, 0.05, 900, 0.8, 0.14, "lowpass");
}

/** The page clearing: filtered air rising, then falling away. */
export function sweep(): void {
  const r = ready("sweep", 400);
  if (!r) return;
  const { ac, dest } = r;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.6;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(3200, t + 0.5);
  f.frequency.exponentialRampToValueAtTime(900, t + 0.9);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
  src.stop(t + 1);
}

/** Done: a soft E major chord, rolled from the bottom. */
export function chord(): void {
  const r = ready("chord", 1000);
  if (!r) return;
  const t = r.ac.currentTime;
  [329.63, 415.3, 493.88, 659.25].forEach((f, i) => {
    tone(r.ac, r.dest, t + i * 0.07, 1.6, f, f * 0.998, 0.07);
    tone(r.ac, r.dest, t + i * 0.07, 0.9, f * 2, f * 2, 0.012);
  });
}
