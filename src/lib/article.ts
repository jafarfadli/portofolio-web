/**
 * The project article: what each project's agent writes (articleFileSchema, the portfolio-article.json file) and
 * what the site stores and renders (articleSchema). The design is in
 * docs/superpowers/specs/2026-11-18-project-articles-design.md.
 */
import { z } from "zod";
import { edgeId } from "./edge-id";
import { LONG_DASH, LONG_DASH_ERROR } from "./long-dash";

export { edgeId };

/** Text with a length range. Inline markup (**bold**, _em_) counts towards the length. */
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, { error: min === 1 ? "Fill this in." : `Write at least ${min} characters.` })
    .max(max, { error: `Keep it under ${max} characters.` })
    .refine((s) => !LONG_DASH.test(s), { error: LONG_DASH_ERROR });

const ID = z.string().regex(/^[a-z][a-z0-9-]{0,23}$/, { error: "Use lowercase letters, numbers and hyphens, like session-server." });

const node = z.strictObject({
  id: ID,
  zone: z.int().min(0).max(3),
  row: z.int().min(0).max(3),
  name: text(1, 32),
  tech: text(1, 40),
  note: text(1, 90),
  kind: z.enum(["person", "store", "ext"]).optional(),
});
const edge = z.strictObject({ from: ID, to: ID, label: text(1, 24) });
const step = z.strictObject({ at: z.array(z.string()).min(1).max(12), text: text(1, 160) });
const flow = z.strictObject({ title: text(1, 40), steps: z.array(step).min(2).max(5) });

type Graph = { zones: string[]; nodes: z.infer<typeof node>[]; edges: z.infer<typeof edge>[]; flows: z.infer<typeof flow>[] };

/** Every id a wire or a step names must exist, and no two parts may share a place in the grid. */
function checkGraph(a: Graph, ctx: z.RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  const ids = new Set<string>();
  const cells = new Set<string>();
  a.nodes.forEach((n, i) => {
    if (ids.has(n.id)) issue(["nodes", i, "id"], `Another part already has the id "${n.id}".`);
    ids.add(n.id);
    if (n.zone >= a.zones.length) issue(["nodes", i, "zone"], `There are only ${a.zones.length} zones (0 to ${a.zones.length - 1}).`);
    const cell = `${n.zone}:${n.row}`;
    if (cells.has(cell)) issue(["nodes", i, "row"], `Another part already sits in zone ${n.zone}, row ${n.row}.`);
    cells.add(cell);
  });
  const wires = new Set<string>();
  a.edges.forEach((e, i) => {
    for (const end of ["from", "to"] as const) if (!ids.has(e[end])) issue(["edges", i, end], `No part has the id "${e[end]}".`);
    if (e.from === e.to) issue(["edges", i, "to"], "A wire must join two different parts.");
    const id = edgeId(e);
    if (wires.has(id)) issue(["edges", i], `The wire ${id} is listed twice.`);
    wires.add(id);
  });
  a.flows.forEach((f, fi) =>
    f.steps.forEach((s, si) =>
      s.at.forEach((x, xi) => {
        if (!ids.has(x) && !wires.has(x)) issue(["flows", fi, "steps", si, "at", xi], `"${x}" is not a part id or a wire like "from>to".`);
      }),
    ),
  );
}

const architecture = z
  .strictObject({
    say: text(1, 140),
    zones: z.array(text(1, 28)).min(2).max(4),
    nodes: z.array(node).min(4).max(12),
    edges: z.array(edge).min(1).max(20),
    flows: z.array(flow).min(1).max(3),
  })
  .superRefine(checkGraph);

const stat = z.strictObject({
  value: text(1, 10),
  label: text(1, 60),
  /** How the number is known: a measurement, a log, a count from real use. Required, even for a sample. */
  source: text(1, 200),
  sample: z.boolean().default(false),
});

const body = {
  hook: text(60, 140),
  facts: z.strictObject({ year: text(1, 20), role: text(1, 60), team: text(1, 60) }),
  problem: z.strictObject({ say: text(1, 140), points: z.array(text(1, 160)).min(2).max(4) }),
  approach: z.strictObject({
    say: text(1, 140),
    calls: z.array(z.strictObject({ title: text(1, 60), body: text(1, 200), gaveUp: text(1, 120) })).min(2).max(3),
  }),
  architecture,
  results: z.strictObject({ say: text(1, 140), stats: z.array(stat).min(2).max(3) }),
};

/** The file a project's agent writes: portfolio-article.json at the root of its repo. */
export const articleFileSchema = z.strictObject({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use the project's slug, like debt-report." }),
  ...body,
  shots: z
    .array(
      z.strictObject({
        file: z.string().regex(/^portfolio-article\/[A-Za-z0-9._-]+\.(png|jpe?g)$/i, {
          error: "Put screenshots in portfolio-article/ as .png or .jpg, like portfolio-article/inbox.png.",
        }),
        alt: text(1, 300),
        caption: text(1, 160),
      }),
    )
    .max(2)
    .default([]),
});

/** What the site stores on projects.article: the screenshots are media rows by now. */
export const articleSchema = z.strictObject({
  ...body,
  shots: z.array(z.strictObject({ mediaId: z.int().positive(), alt: text(1, 300), caption: text(1, 160) })).max(2),
});

export type Article = z.infer<typeof articleSchema>;
export type ArticleFile = z.infer<typeof articleFileSchema>;
export type Architecture = Article["architecture"];
export type Checked<T> = { ok: true; value: T } | { ok: false; problems: string[] };

/** "architecture.edges[2].to", the way the brief and the importer name a place in the file. */
export function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) return "(the file)";
  return path.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : s ? `${s}.${String(k)}` : String(k)), "");
}

function check<T>(schema: z.ZodType<T>, input: unknown): Checked<T> {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, problems: r.error.issues.map((i) => `${formatPath(i.path)}: ${i.message}`) };
}

export const checkArticle = (input: unknown): Checked<Article> => check(articleSchema, input);
export const checkArticleFile = (input: unknown): Checked<ArticleFile> => check(articleFileSchema, input);
