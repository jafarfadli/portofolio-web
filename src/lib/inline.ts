export type InlineSegment = { text: string; strong?: true; em?: true };

/** Tiny inline markup for owner-written copy: **strong** and _em_. Nothing else is interpreted. */
export function parseInline(src: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  const re = /\*\*(.+?)\*\*|_(.+?)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], strong: true });
    else out.push({ text: m[2], em: true });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}
