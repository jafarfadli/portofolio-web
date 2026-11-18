// node export.mjs <repo> <renders>  -> public/devices/*.webp and src/content/device-scenes.ts from the renders (scene.py output)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const repo = process.argv[2];
const renders = process.argv[3];
const sharp = createRequire(path.join(repo, "package.json"))("sharp");
const here = import.meta.dirname;
const S = JSON.parse(fs.readFileSync(path.join(here, "scenes.json")));
// where the result tag sits, in % of the field; the dot goes on the laptop screen's edge (side, or top), t along it
const PLACE = {
  edith: { pin: { x: 62, y: 20, side: "l" }, t: 0.2 },
  clinky: { pin: { x: 68, y: 20, side: "l" }, t: 0.2 },
  "c-sat": { pin: { x: 30, y: 28, side: "r" }, t: 0.25 },
  // these two hang a little off the card's outer edge and top (owner, 2026-11-18)
  "debt-report": { pin: { x: 36, y: 7, side: "r" }, edge: "top", t: 0.56 },
  "dont-call-me": { pin: { x: 59, y: 6, side: "l" }, edge: "top", t: 0.4 },
};
const r = (v, n = 2) => +v.toFixed(n);
(async () => {
  fs.mkdirSync(path.join(repo, "public/devices"), { recursive: true });
  const out = {};
  for (const slug of Object.keys(PLACE)) {
    const p = JSON.parse(fs.readFileSync(path.join(renders, slug + ".json")));
    const png = path.join(renders, slug + ".png");
    const W = S[slug].w;
    for (const w of [W, W / 2]) {
      await sharp(png).resize({ width: w }).webp({ quality: 80, effort: 6 }).toFile(path.join(repo, "public/devices", `${slug}-${w}.webp`));
    }
    const { pin } = PLACE[slug];
    const q = p.screens.laptop.quad.map(([x, y]) => [x * 100, y * 100]);
    const [a, b] = PLACE[slug].edge === "top" ? [q[0], q[1]] : pin.side === "l" ? [q[1], q[2]] : [q[0], q[3]];
    const t = PLACE[slug].t ?? 0.3;
    const dot = { x: r(a[0] + (b[0] - a[0]) * t, 1), y: r(a[1] + (b[1] - a[1]) * t, 1) };
    const dx = pin.x - dot.x;
    const d = `M ${dot.x} ${dot.y} C ${r(dot.x + dx * 0.45, 1)} ${dot.y}, ${r(dot.x + dx * 0.55, 1)} ${pin.y}, ${pin.x} ${pin.y}`;
    const screens = {};
    for (const [k, v] of Object.entries(p.screens)) screens[k] = { w: v.w, h: v.h, t: v.t, m: v.m };
    out[slug] = { width: W, height: S[slug].h, perspective: p.perspective, screens, pin, dot, leader: d };
  }
  const ts = `// Generated from the Blender scenes (see DESIGN.md, "Device scenes"). Do not edit by hand: run scripts/devices/render.sh.
/** A rendered room for a work card: a picture of the devices with black screens, and each screen's pose, so the
 *  page can lay the real screenshots onto them. Poses are CSS: the scene is 100cqw wide, seen with perspective
 *  \`perspective\` cqw from its centre; a screen box of w x h cqw sits at its centre, moved by t (cqw), turned by m. */
export type DeviceScreen = { w: number; h: number; t: [number, number, number]; m: number[] };
export type DeviceScene = {
  width: number; height: number; perspective: number;
  screens: { laptop: DeviceScreen; phone?: DeviceScreen };
  /** % of the field */
  pin: { x: number; y: number; side: "l" | "r" }; dot: { x: number; y: number }; leader: string;
};

export const DEVICE_SCENES: Record<string, DeviceScene> = ${JSON.stringify(out, null, 2)};
`;
  fs.writeFileSync(path.join(repo, "src/content/device-scenes.ts"), ts);
  console.log("ok", Object.keys(out));
})();
