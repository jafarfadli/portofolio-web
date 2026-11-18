/** Splits statement copy into display lines: each given line breaks wherever it has " / " (a slash with a space on both sides). */
export function statementLines(...lines: string[]): string[] {
  return lines.flatMap((l) => l.split(" / ")).map((l) => l.trim()).filter(Boolean);
}

/**
 * Where the lead line prints an "o" as a switch: the last "o" inside the longest plain word (6+ letters, the "o" neither
 * first nor last), so "AI integrations," gives the "o" of "integrations". Icon tokens (`:rocket:`) are passed over.
 * -1 when there is none, or when the line carries ** or _ markup a split could break.
 */
export function switchAt(line: string): number {
  if (/[*_]/.test(line)) return -1;
  const tokens = [...line.matchAll(/:[a-z]+:/g)].map((m) => [m.index, m.index + m[0].length]);
  let best = -1;
  let bestLen = 0;
  for (const m of line.matchAll(/[A-Za-z]{6,}/g)) {
    const word = m[0];
    if (tokens.some(([a, b]) => m.index < b && a < m.index + word.length)) continue;
    const k = word.slice(1, -1).lastIndexOf("o");
    if (k < 0 || word.length <= bestLen) continue;
    best = m.index + 1 + k;
    bestLen = word.length;
  }
  return best;
}
