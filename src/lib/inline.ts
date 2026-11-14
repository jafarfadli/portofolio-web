export const ICON_STICKERS = ["browsers", "database", "cursor", "pin", "loading", "team", "rocket", "wave"] as const;
export type IconStickerName = (typeof ICON_STICKERS)[number];

export type InlineSegment = { text: string; strong?: true; em?: true } | { icon: IconStickerName };

const ICON_RE = new RegExp(` ?:(${ICON_STICKERS.join("|")}):`, "g");

/** Splits `:name:` tokens out of one run of text. The space before an icon becomes a no-break space, so an icon never starts a line. */
function splitIcons(text: string, flags: { strong?: true; em?: true }, out: InlineSegment[]) {
  let last = 0;
  let m: RegExpExecArray | null;
  ICON_RE.lastIndex = 0;
  while ((m = ICON_RE.exec(text)) !== null) {
    const before = text.slice(last, m.index) + (m[0].startsWith(" ") ? " " : "");
    if (before) out.push({ text: before, ...flags });
    out.push({ icon: m[1] as IconStickerName });
    last = ICON_RE.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last), ...flags });
}

/**
 * Tiny inline markup for owner-written copy: **strong**, _em_ and, when `icons` is on, `:name:` icon stickers.
 * Nothing else is interpreted.
 */
export function parseInline(src: string, opts: { icons?: boolean } = {}): InlineSegment[] {
  const out: InlineSegment[] = [];
  const push = (text: string, flags: { strong?: true; em?: true }) => {
    if (opts.icons) splitIcons(text, flags, out);
    else out.push({ text, ...flags });
  };
  const re = /\*\*(.+?)\*\*|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) push(src.slice(last, m.index), {});
    if (m[1] !== undefined) push(m[1], { strong: true });
    else push(m[2], { em: true });
    last = re.lastIndex;
  }
  if (last < src.length) push(src.slice(last), {});
  return out;
}

/** How many icon stickers the copy sets. */
export function iconCount(src: string): number {
  return parseInline(src, { icons: true }).filter((s) => "icon" in s).length;
}

/**
 * Owner copy as plain text: no markers, no icon tokens, line-break slashes as a space.
 * Use this, never the raw string, for anything that is not rendered through <Inline>.
 */
export function toPlain(src: string): string {
  const segs = parseInline(src, { icons: true });
  let out = "";
  segs.forEach((s, i) => {
    if ("icon" in s) return;
    out += "icon" in (segs[i + 1] ?? {}) ? s.text.trimEnd() : s.text;
  });
  return out.replace(/ \/ /g, " ").replace(/[  ]{2,}/g, " ").trim();
}
