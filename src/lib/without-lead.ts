/**
 * Drops a leading label the text repeats. Older CV lines start with the rank, role or institution that the CV
 * already prints as a tag or heading ("**Winner**, Nusantara Code Cup"). The lead only counts when it is the
 * whole first phrase: optionally wrapped in ** and followed by the end, a comma or a colon.
 */
export function withoutLead(text: string, lead: string): string {
  const word = lead.trim();
  if (!word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*(?:\\*\\*${escaped}\\*\\*|${escaped})(?:\\s*$|\\s*[,:]\\s*)`, "i").exec(text);
  return m ? text.slice(m[0].length).trim() : text;
}
