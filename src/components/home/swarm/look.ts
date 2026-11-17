/**
 * How the agents look: in the page's own palette, by the ground of the section their crew works in (stock, metal,
 * blue-grey and concrete on navy; navy and ink on concrete; the green of the "open to work" dot on both), each with its
 * initials on a printed tag, and a pointer drawn in its tone with a rim
 * that contrasts it, in the shapes a design tool uses.
 */
export type Tone = { c: string; rim: string };

/** On the navy grounds: the light tones. */
export const TONES: readonly Tone[] = [
  { c: "#f2f2ee", rim: "#111216" }, // stock
  { c: "#5ee08c", rim: "#111216" }, // the live dot's green
  { c: "#c9ccd6", rim: "#111216" }, // metal
  { c: "#b4bcd3", rim: "#111216" }, // blue-grey of the type on navy
  { c: "#e5e4df", rim: "#111216" }, // concrete
];

/** On the concrete grounds: the dark ones, and the green. */
export const TONES_LIGHT: readonly Tone[] = [
  { c: "#1d2640", rim: "#f2f2ee" }, // navy
  { c: "#5ee08c", rim: "#111216" }, // green
  { c: "#111216", rim: "#f2f2ee" }, // ink
];

/**
 * Agents go by initials, as people do in a shared design file: two letters, picked at random, no two alike on the
 * page. Doubled letters and pairs that read as something else are left out, and so are the owner's own initials,
 * so no agent passes for the owner.
 */
const FIRST = "ABCDEFGHIJKLMNOPRSTWYZ";
const SECOND = "ABCDEFGHIJKLMNOPRSTUVWXYZ";
const NOT = new Set(["JF", "WC", "BH", "CD", "FU", "SX"]);

export function initials(taken: Set<string>): string {
  for (let i = 0; i < 200; i++) {
    const a = FIRST[Math.floor(Math.random() * FIRST.length)];
    const b = SECOND[Math.floor(Math.random() * SECOND.length)];
    const s = a + b;
    if (a !== b && !NOT.has(s) && !taken.has(s)) return s;
  }
  return `A${taken.size}`;
}

export type Shape = "arrow" | "dup" | "cross" | "ibeam" | "pen" | "rotate" | "ew" | "ns";

/** Where each shape's hot spot sits in its 24px box. */
export const HOT: Record<Shape, [number, number]> = {
  arrow: [4, 3],
  dup: [4, 3],
  pen: [3, 3],
  cross: [12, 12],
  ibeam: [12, 12],
  rotate: [12, 12],
  ew: [12, 12],
  ns: [12, 12],
};

const ARROW = "M4 3 L4 19.4 L8.4 15.3 L11.4 21.6 L14.3 20.3 L11.4 14.1 L17.4 14.1 Z";
/** the tone fills, the rim outlines; thin shapes get a rim-coloured halo under a tone line */
const BODY = (d: string, extra = "") => `<path class="body" d="${d}"${extra}/>`;
const HALO = (d: string, w = 1.5) =>
  `<path class="halo" d="${d}" stroke-width="${w + 2.6}"/><path class="line" d="${d}" stroke-width="${w}"/>`;

const SHAPES: Record<Shape, string> = {
  arrow: BODY(ARROW),
  // holding the duplicate key: a second, hollow arrow behind the first
  dup: `<path class="ghost" d="${ARROW}" transform="translate(4.2 3.4)"/>` + BODY(ARROW),
  cross: HALO("M12 3.5V20.5M3.5 12H20.5"),
  ibeam: HALO("M8.6 4.4H10.4Q12 4.4 12 6Q12 4.4 13.6 4.4H15.4M12 6V18M8.6 19.6H10.4Q12 19.6 12 18Q12 19.6 13.6 19.6H15.4"),
  pen: BODY("M3 3L13.4 6.4L17.6 10.6L10.6 17.6L6.4 13.4Z") + BODY("M17.6 10.6L20.8 13.8L13.8 20.8L10.6 17.6Z") +
    '<path class="nib" d="M3.8 3.8L9 9"/><circle class="nib" cx="10.3" cy="10.3" r="1.6"/>',
  rotate: HALO("M6.5 9.5A7 7 0 0 1 17.5 8M17.5 8L17.9 4.6M17.5 8L14.2 7.4M17.5 14.5A7 7 0 0 1 6.5 16M6.5 16L6.1 19.4M6.5 16L9.8 16.6", 1.6),
  ew: BODY("M2.5 12L7 7.5V10.4H17V7.5L21.5 12L17 16.5V13.6H7V16.5Z"),
  ns: BODY("M2.5 12L7 7.5V10.4H17V7.5L21.5 12L17 16.5V13.6H7V16.5Z", ' transform="rotate(90 12 12)"'),
};

/** The markup of one pointer: every shape, one shown at a time by `data-shape` on the cursor. */
export const POINTER_SVG = (Object.keys(SHAPES) as Shape[])
  .map((s) => `<svg class="sw-ptr" data-s="${s}" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${SHAPES[s]}</svg>`)
  .join("");

/** The image glyph a placeholder shows while it waits for its picture. */
export const IMAGE_GLYPH =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18L10 13L14 16L17 13.5L21 17"/></svg>';
