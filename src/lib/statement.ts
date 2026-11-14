/** Splits statement copy into display lines: each given line breaks wherever it has " / " (a slash with a space on both sides). */
export function statementLines(...lines: string[]): string[] {
  return lines.flatMap((l) => l.split(" / ")).map((l) => l.trim()).filter(Boolean);
}
