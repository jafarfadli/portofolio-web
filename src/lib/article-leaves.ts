/**
 * The words in an article, as the editor shows them: one field per piece of text, labelled by where it sits. Ids,
 * zones, rows, kinds, wire ends, step targets, screenshot ids and flags are structure: they stay in the JSON box.
 */
export type Leaf = { key: string; path: (string | number)[]; label: string; value: string; long: boolean };

const STRUCTURE = new Set(["id", "zone", "row", "kind", "from", "to", "at", "mediaId", "sample", "version", "slug", "file"]);
const NAMES: Record<string, string> = {
  hook: "Opening question", facts: "Facts", year: "Year", role: "Role", team: "Team",
  problem: "Problem", approach: "Approach", architecture: "Architecture", results: "Results",
  say: "Statement", points: "Point", calls: "Decision", title: "Title", body: "Text", gaveUp: "Gave up",
  zones: "Area", nodes: "Part", name: "Name", tech: "Tech", note: "Note", edges: "Wire", label: "Label",
  flows: "Scenario", steps: "Step", text: "Text", stats: "Number", value: "Value", source: "Source",
  shots: "Screenshot", alt: "Alt text", caption: "Caption",
};
const LONG = new Set(["hook", "say", "points", "body", "note", "text", "source", "alt", "caption"]);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Which item of a list this is, in words: a part's id, or a wire's ends. */
function tagOf(v: unknown): string {
  if (!isObj(v)) return "";
  if (typeof v.id === "string") return ` (${v.id})`;
  if (typeof v.from === "string" && typeof v.to === "string") return ` (${v.from}>${v.to})`;
  return "";
}

export function textLeaves(root: unknown): Leaf[] {
  const out: Leaf[] = [];
  const walk = (v: unknown, path: (string | number)[], label: string[], key: string) => {
    if (typeof v === "string") {
      out.push({ key: path.join("."), path, label: label.join(" › "), value: v, long: LONG.has(key) });
    } else if (Array.isArray(v)) {
      const name = NAMES[key] ?? key;
      v.forEach((x, i) => walk(x, [...path, i], [...label.slice(0, -1), `${name} ${i + 1}${tagOf(x)}`], key));
    } else if (isObj(v)) {
      for (const [k, x] of Object.entries(v)) {
        if (!STRUCTURE.has(k)) walk(x, [...path, k], [...label, NAMES[k] ?? k], k);
      }
    }
  };
  walk(root, [], [], "");
  return out;
}

/** A copy of `root` with the text at `path` replaced. */
export function setLeaf<T>(root: T, path: (string | number)[], value: string): T {
  const copy = structuredClone(root) as unknown as Record<string | number, unknown>;
  let at = copy;
  for (const k of path.slice(0, -1)) at = at[k] as Record<string | number, unknown>;
  at[path[path.length - 1]] = value;
  return copy as unknown as T;
}
