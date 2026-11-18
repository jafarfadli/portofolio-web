# Project Articles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each featured project an article page at `/projects/[slug]`:
- a curiosity-first top;
- full-width navy and concrete bands;
- a detailed, followable architecture diagram.

The content is written by each project's own agent as JSON, imported by a CLI, corrected and published in the admin.

**Architecture:**
- **Schema.** One zod schema (`src/lib/article.ts`) defines the article. It is shared by the importer, the admin field and the page.
- **Storage.** The article is stored as JSON on `projects.article`, next to an `article_published` flag.
- **Rendering.** A server component, `ArticlePage`, renders the bands. Two client islands handle the diagram (`ArchDiagram`) and the turning screens (`RoomShow`).
- **Routes.** The public route renders only published articles. An admin route previews drafts.

**Tech Stack:** Next.js 16.4 App Router (server components, `force-dynamic`), React 19.3, drizzle-orm 0.45 + better-sqlite3, zod 4, sharp, vitest 5, Playwright 1.65.

**Spec:** `docs/superpowers/specs/2026-11-18-project-articles-design.md`. The prototype the owner approved by eye is in the scratch clone at `/private/tmp/claude-501/-Users-jafarfadli-Koding-portofolio-web/b60235bc-8160-4bc3-a589-e28edc850195/scratchpad/pv/src/app/projects/[slug]/` (`page.tsx`, `Arch.tsx`, `article.css`); this plan ports it.

## Global Constraints

These apply to every task.

### Repository rules

- Read `AGENTS.md`. This is Next.js 16.4. Check `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **No commits, no pushes.** The owner commits only when they say "push". Leave every change in the working tree. Each task ends with a check step instead of a commit.
- **Only this repo changes.** Never write outside `/Users/jafarfadli/Koding/portofolio-web`, except in the scratchpad.
- **Leave the machine's other services alone:** the other pm2 apps, Caddy, the Tailscale serve ports 8443 to 8446, clinky and edith.

### Copy and data

- **Inline markup** is the site's existing parser (`src/lib/inline.ts`): `**bold**` and `_em_`. The spec's `*em*` is replaced by `_em_`; Task 9 amends the spec.
- **No long dashes** (U+2013 and U+2014) in any article text. The admin's rule (`LONG_DASH` in `src/admin/fields.ts`) applies.
- Copy is in English, in the site's voice: short, concrete, no superlatives.
- **Disguise:** no real client names, people, hostnames or real repo names in seed data, examples or screenshots.

### Testing and preview

- **Unit tests:** `pnpm test`. Each file gets its own `DATA_DIR` from `tests/unit/setup.ts`, so unit tests never touch `./.data`.
- **e2e runs only in a scratch clone, never in the repo:**
  ```bash
  E=/private/tmp/claude-501/-Users-jafarfadli-Koding-portofolio-web/b60235bc-8160-4bc3-a589-e28edc850195/scratchpad/e2e-run
  rsync -a --delete --exclude node_modules --exclude .next --exclude .data --exclude .data-e2e --exclude .git /Users/jafarfadli/Koding/portofolio-web/ $E/
  cd $E && rm -rf .next .data .data-e2e && env -u BASE_PATH -u DATA_DIR CI=1 pnpm exec playwright test
  ```
  `$E/node_modules` already exists; if it does not, run `pnpm install --frozen-lockfile` there first.
- **Preview for the owner:** port 3016 behind `tailscale serve --bg --https=8448 http://127.0.0.1:3016`.

### Look and accessibility

- **Design tokens:** colours, shadows and easings come from `src/app/site.css` `:root`. The only accent is `#5ee08c` (the live dot).
- **Reduced motion:** nothing moves on its own.
- **WCAG 2.2 AA:** the axe tags are those in `tests/e2e/a11y.spec.ts`.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/lib/edge-id.ts` | new | `edgeId()`, client-safe (no zod) |
| `src/lib/long-dash.ts` | new | `LONG_DASH`, `LONG_DASH_ERROR` (moved out of `src/admin/fields.ts`, which re-exports them) |
| `src/lib/article.ts` | new | zod schemas `articleSchema` and `articleFileSchema`, types, `checkArticle`, `checkArticleFile` |
| `src/lib/article-leaves.ts` | new | the article's editable words as a flat list, and `setLeaf()` |
| `src/content/article-example.ts` | new | `LEDGERLY_ARTICLE`: dummy article for seed and tests |
| `src/content/article.ts` | new | `getArticleView`, `getArticleViewById`: what the page renders |
| `src/db/schema.ts` | modify | drop `caseStudyMd`; add `article` and `articlePublished` |
| `drizzle/0007_*.sql` | generated | the migration |
| `src/db/seed-data.ts`, `src/db/seed.ts` | modify | Ledgerly published, Kanbo draft |
| `src/content/home.ts` | modify | `HomeProject.hasArticle` |
| `src/admin/media.ts` | modify | `mediaUsage` counts article shots |
| `src/admin/store.ts` | modify | rules: publish needs an article; shot ids must exist |
| `src/admin/fields.ts` | modify | field kind `article` |
| `src/admin/images.ts` | modify | `imageIds` includes article shots |
| `src/admin/resources.ts` | modify | project fields `article`, `articlePublished` |
| `src/components/admin/ArticleEditor.tsx` | new | word fields plus structure JSON |
| `src/components/admin/FieldInput.tsx` | modify | renders `ArticleEditor` |
| `src/app/admin/(panel)/[resource]/[id]/page.tsx` | modify | "Preview article" link |
| `src/app/admin/preview/[id]/page.tsx` | new | draft preview |
| `src/components/home/Scene.tsx` | new | `Scene` and `Shots`, moved out of `ProjectCard.tsx` |
| `src/components/home/ProjectCard.tsx` | modify | imports `Scene`; "Read the story" link |
| `src/components/home/Nav.tsx` | modify | `onHome` prop |
| `src/components/article/ArticlePage.tsx` | new | the bands |
| `src/components/article/ArchDiagram.tsx` | new | diagram and scenarios (client) |
| `src/components/article/RoomShow.tsx` | new | turns the room's screens (client) |
| `src/components/article/article.css` | new | all article styles |
| `src/app/projects/[slug]/page.tsx` | new | public route and metadata |
| `src/article/import.ts`, `src/article/import-cli.ts` | new | the importer |
| `scripts/article-schema.ts` | new | writes `docs/article-schema.json` |
| `docs/article-brief.md`, `docs/article-example.clinky.json`, `docs/article-schema.json` | new | for the project agents |
| `package.json` | modify | `zod`; scripts `article:import` and `article:schema` |
| `tests/unit/article.test.ts`, `article-view.test.ts`, `article-import.test.ts`, `article-leaves.test.ts` | new | unit tests |
| `tests/e2e/article.spec.ts`, `admin-article.spec.ts` | new | e2e tests |
| `tests/e2e/a11y.spec.ts`, `visual.spec.ts` | modify | add the article |
| `DESIGN.md`, the spec | modify | Task 9 |

---

### Task 1: Article schema and the Ledgerly example

**Files:**
- Modify: `package.json` (dependency `zod`)
- Create: `src/lib/edge-id.ts`, `src/lib/long-dash.ts`, `src/lib/article.ts`, `src/content/article-example.ts`
- Modify: `src/admin/fields.ts` (its two long-dash constants move to `src/lib/long-dash.ts`)
- Test: `tests/unit/article.test.ts`

**Interfaces:**
- Produces:
  - `edgeId(e: { from: string; to: string }): string`, which returns `"from>to"`.
  - `articleSchema` and `articleFileSchema` (zod).
  - `type Article`, `type ArticleFile`, `type Architecture = Article["architecture"]`.
  - `type Checked<T> = { ok: true; value: T } | { ok: false; problems: string[] }`.
  - `checkArticle(input: unknown): Checked<Article>` and `checkArticleFile(input: unknown): Checked<ArticleFile>`.
  - `formatPath(path: PropertyKey[]): string`.
  - `LEDGERLY_ARTICLE: Article`, with `shots: []`.
- Problem strings have the form `"<path>: <message>"`, for example `"results.stats[0].source: Fill this in."`.

- [ ] **Step 1: Add zod**

Run: `cd /Users/jafarfadli/Koding/portofolio-web && pnpm add zod@4.6.7`
Expected: `package.json` dependencies gain `"zod": "4.6.7"` (or `^4.6.7`), and the lockfile updates.

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/article.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { checkArticle, checkArticleFile, edgeId, formatPath, type Article } from "@/lib/article";

const copy = (): Article => structuredClone(LEDGERLY_ARTICLE);
const problems = (input: unknown) => {
  const r = checkArticle(input);
  return r.ok ? [] : r.problems;
};

describe("article schema", () => {
  it("accepts the Ledgerly example as it is", () => {
    const r = checkArticle(LEDGERLY_ARTICLE);
    expect(r.ok ? [] : r.problems).toEqual([]);
    if (r.ok) expect(r.value).toEqual(LEDGERLY_ARTICLE);
  });

  it("refuses a number without a source", () => {
    const a = copy();
    a.results.stats[0].source = "  ";
    expect(problems(a)).toContain("results.stats[0].source: Fill this in.");
  });

  it("refuses a wire to a part that does not exist", () => {
    const a = copy();
    a.architecture.edges[0].to = "nowhere";
    expect(problems(a)).toContain('architecture.edges[0].to: No part has the id "nowhere".');
  });

  it("refuses a step that names neither a part nor a wire", () => {
    const a = copy();
    a.architecture.flows[0].steps[0].at = ["ghost"];
    expect(problems(a)).toContain('architecture.flows[0].steps[0].at[0]: "ghost" is not a part id or a wire like "from>to".');
  });

  it("refuses two parts in the same zone and row", () => {
    const a = copy();
    const [first] = a.architecture.nodes;
    a.architecture.nodes[1] = { ...a.architecture.nodes[1], zone: first.zone, row: first.row };
    expect(problems(a)).toContain(`architecture.nodes[1].row: Another part already sits in zone ${first.zone}, row ${first.row}.`);
  });

  it("refuses a part in a zone that does not exist", () => {
    const a = copy();
    a.architecture.nodes[0].zone = 3;
    a.architecture.zones = a.architecture.zones.slice(0, 3);
    expect(problems(a).some((p) => p.startsWith("architecture.nodes[0].zone: There are only 3 zones"))).toBe(true);
  });

  it("refuses over-long text and long dashes", () => {
    const a = copy();
    a.hook = "x".repeat(141);
    a.problem.say = "Slow — and late.";
    const p = problems(a);
    expect(p).toContain("hook: Keep it under 140 characters.");
    expect(p).toContain("problem.say: Use a comma, colon or full stop instead of a long dash.");
  });

  it("refuses keys it does not know", () => {
    expect(problems({ ...copy(), extra: 1 }).some((p) => p.includes("extra"))).toBe(true);
  });

  it("checks the file form: version, slug and screenshot paths", () => {
    const { shots: _s, ...body } = copy();
    const ok = checkArticleFile({ version: 1, slug: "ledgerly", ...body, shots: [{ file: "portfolio-article/pay.png", alt: "The pay page", caption: "The pay page." }] });
    expect(ok.ok ? [] : ok.problems).toEqual([]);
    const bad = checkArticleFile({ version: 1, slug: "ledgerly", ...body, shots: [{ file: "../secret.png", alt: "x", caption: "x" }] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.problems[0]).toMatch(/^shots\[0\]\.file: /);
  });

  it("names wires and paths the same way everywhere", () => {
    expect(edgeId({ from: "api", to: "db" })).toBe("api>db");
    expect(formatPath(["a", 0, "b"])).toBe("a[0].b");
    expect(formatPath([])).toBe("(the file)");
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `pnpm test tests/unit/article.test.ts`
Expected: FAIL. The cause is "Failed to resolve import "@/content/article-example"" (or "@/lib/article").

- [ ] **Step 4: Write `src/lib/edge-id.ts`**

```ts
/** A wire's id in an article diagram: "from>to". Kept apart from the zod schema so client code can use it cheaply. */
export function edgeId(e: { from: string; to: string }): string {
  return `${e.from}>${e.to}`;
}
```

- [ ] **Step 5: Move the long-dash rule out of the admin**

`src/lib/article.ts` needs the rule, and Task 7 makes `src/admin/fields.ts` import `src/lib/article.ts`. If the rule stayed in `fields.ts`, the two modules would import each other, and `article.ts` reads the error text while it builds its schemas, before `fields.ts` has run: a TDZ `ReferenceError`. So the rule moves into its own module.

Create `src/lib/long-dash.ts`:

```ts
/** En and em dashes: the owner's copy uses commas, colons and full stops instead (DESIGN.md, copy rules). */
export const LONG_DASH = /[\u2013\u2014]/;
export const LONG_DASH_ERROR = "Use a comma, colon or full stop instead of a long dash.";
```

In `src/admin/fields.ts`, delete the two lines `export const LONG_DASH_ERROR = ...` and `export const LONG_DASH = ...`, and add near the top:

```ts
import { LONG_DASH, LONG_DASH_ERROR } from "@/lib/long-dash";
export { LONG_DASH, LONG_DASH_ERROR };
```

Run: `pnpm test tests/unit/fields.test.ts`
Expected: PASS, unchanged.

- [ ] **Step 6: Write `src/lib/article.ts`**

```ts
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
  shots: z.array(z.strictObject({ mediaId: z.int().positive(), caption: text(1, 160) })).max(2),
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
```

- [ ] **Step 7: Write `src/content/article-example.ts`**

```ts
import type { Article } from "@/lib/article";

/**
 * Sample article for the seeded Ledgerly project (dummy content, like the rest of the seed). Its numbers are
 * samples. The e2e tests read its words, so change them together.
 */
export const LEDGERLY_ARTICLE: Article = {
  hook: "What if a shop could send an invoice from its phone and _get paid before the week was out?_",
  facts: { year: "2025", role: "Solo, design to deploy", team: "Me, plus a designer for 2 weeks" },
  problem: {
    say: "Small shops waited two weeks to get paid, _because chasing invoices was nobody's job._",
    points: [
      "Invoices went out as **photos of a paper book**, sent over WhatsApp.",
      "Reminders depended on the owner **remembering who still owed money**.",
      "Customers had **no single place to pay**, so many paid late or not at all.",
    ],
  },
  approach: {
    say: "Make the invoice a link that _pays itself_, and let a worker do the chasing.",
    calls: [
      { title: "One link per invoice.", body: "The customer opens it, sees the total and pays there: no account, no app.", gaveUp: "a customer portal with order history." },
      { title: "A worker owns everything later.", body: "Reminders, retries and receipts run from one job table, so a restart loses nothing.", gaveUp: "editing a reminder while it is queued." },
      { title: "Server-rendered dashboard.", body: "Fast on the cheap Android phones most shop owners use.", gaveUp: "some offline behaviour." },
    ],
  },
  architecture: {
    say: "Two front doors, one API, and _a worker that owns everything that happens later._",
    zones: ["People", "Ledgerly", "Data and jobs", "Outside"],
    nodes: [
      { id: "owner", zone: 0, row: 0, name: "Shop owner", tech: "Phone or laptop", note: "Creates and sends invoices", kind: "person" },
      { id: "customer", zone: 0, row: 2, name: "Customer", tech: "Any browser", note: "Opens the pay link", kind: "person" },
      { id: "dash", zone: 1, row: 0, name: "Dashboard", tech: "Next.js", note: "Server-rendered, quick on cheap phones" },
      { id: "api", zone: 1, row: 1, name: "Go API", tech: "Go, chi", note: "Invoices, auth and payment webhooks" },
      { id: "pay", zone: 1, row: 2, name: "Pay link page", tech: "Next.js", note: "No login, one invoice" },
      { id: "db", zone: 2, row: 1, name: "PostgreSQL", tech: "Postgres 16", note: "Invoices and the job table", kind: "store" },
      { id: "worker", zone: 2, row: 2, name: "Reminder worker", tech: "Go", note: "Takes due jobs every minute" },
      { id: "midtrans", zone: 3, row: 1, name: "Midtrans", tech: "Payments", note: "Cards, e-wallets and transfers", kind: "ext" },
      { id: "wa", zone: 3, row: 2, name: "WhatsApp API", tech: "Business API", note: "Delivers the reminders", kind: "ext" },
    ],
    edges: [
      { from: "owner", to: "dash", label: "HTTPS" },
      { from: "customer", to: "pay", label: "HTTPS" },
      { from: "dash", to: "api", label: "REST" },
      { from: "pay", to: "api", label: "REST" },
      { from: "api", to: "db", label: "SQL" },
      { from: "worker", to: "db", label: "job table" },
      { from: "api", to: "midtrans", label: "charge, webhook" },
      { from: "worker", to: "wa", label: "reminders" },
    ],
    flows: [
      {
        title: "A customer pays",
        steps: [
          { at: ["customer", "customer>pay", "pay"], text: "The customer opens the link from WhatsApp. There is nothing to sign in to." },
          { at: ["pay>api", "api", "api>midtrans", "midtrans"], text: "The API asks Midtrans for a payment and sends the customer there." },
          { at: ["api", "api>db", "db"], text: "Midtrans calls back, and the API marks the invoice paid in one transaction." },
        ],
      },
      {
        title: "A reminder goes out",
        steps: [
          { at: ["worker", "worker>db", "db"], text: "Every minute the worker takes the reminders that are due from the job table." },
          { at: ["worker>wa", "wa"], text: "It sends each one through the WhatsApp API." },
          { at: ["worker", "worker>db"], text: "It records the send, so a restart never sends a reminder twice." },
        ],
      },
    ],
  },
  results: {
    say: "Shops got paid _four days sooner._",
    stats: [
      { value: "9.4", label: "days to get paid, down from 13.1", source: "Average over all paid invoices, March to June 2025.", sample: true },
      { value: "1,200", label: "shops sending invoices", source: "Active accounts in June 2025.", sample: true },
    ],
  },
  shots: [],
};
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm test tests/unit/article.test.ts`
Expected: PASS, 10 tests.

If a message differs (zod 4 wording for `strictObject` unknown keys, for example), keep the test's intent and adjust only the assertion. The "refuses keys" test already matches loosely.

- [ ] **Step 9: Check**

Run: `pnpm typecheck && pnpm lint src/lib src/content src/admin`
Expected: no errors. Do not commit.

---

### Task 2: Storage (migration, media usage, save rules)

**Files:**
- Modify: `src/db/schema.ts:97` (the `caseStudyMd` line), `src/admin/media.ts` (`mediaUsage`), `src/admin/store.ts` (`checkRules`), `src/components/home/ProjectCard.tsx:69`
- Generated: `drizzle/0007_*.sql` and `drizzle/meta/*`
- Test: `tests/unit/media.test.ts`, `tests/unit/store.test.ts` (append)

**Interfaces:**
- Consumes: `Article` (Task 1).
- Produces:
  - `projects.article: Article | null` and `projects.articlePublished: boolean`.
  - `mediaUsage()` lists `"<name>, article"` for article shots.
  - `saveItem("projects", …)` refuses `articlePublished: true` with no article (`errors.articlePublished`), and an article shot that does not exist (`errors.article`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/media.test.ts`, inside its top-level `describe` or at the end of the file, matching the file's imports. It already imports `seededDb` and `mediaUsage`; add any import that is missing.

```ts
import { eq } from "drizzle-orm";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { media as mediaTable, projects as projectsTable } from "@/db/schema";

it("counts a screenshot in an article as a use", () => {
  const db = seededDb();
  const shot = db.select({ id: mediaTable.id }).from(mediaTable).get()!;
  db.update(projectsTable)
    .set({ article: { ...LEDGERLY_ARTICLE, shots: [{ mediaId: shot.id, caption: "c" }] } })
    .where(eq(projectsTable.slug, "rute"))
    .run();
  expect(mediaUsage(db, shot.id)).toContain("Rute, article");
});
```

Append to `tests/unit/store.test.ts` inside `describe("store", ...)`:

```ts
it("refuses to publish a project that has no article", () => {
  const db = seededDb();
  const rute = listItems(db, "projects").find((p) => p.slug === "rute")!;
  const r = saveItem(db, "projects", rute.id, { articlePublished: true, article: null });
  expect(r).toEqual({ ok: false, errors: { articlePublished: "Import or write the article before publishing it." } });
});

it("refuses an article screenshot that is not in the media list", () => {
  const db = seededDb();
  const rute = listItems(db, "projects").find((p) => p.slug === "rute")!;
  const r = saveItem(db, "projects", rute.id, { article: { ...LEDGERLY_ARTICLE, shots: [{ mediaId: 99999, caption: "c" }] } });
  expect(r).toEqual({ ok: false, errors: { article: "Screenshot 99999 is not in the media list. Pick another." } });
});
```

Add `import { LEDGERLY_ARTICLE } from "@/content/article-example";` to the imports of `tests/unit/store.test.ts`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test tests/unit/media.test.ts tests/unit/store.test.ts`
Expected: FAIL. TypeScript or SQLite reports that `article` is not a column of `projects`.

- [ ] **Step 3: Change the schema**

In `src/db/schema.ts`, add next to the other type import at the top:

```ts
import type { Article } from "../lib/article";
```

The import is relative and type-only, because drizzle-kit loads this file without the `@/` alias.

Replace the line `caseStudyMd: text("case_study_md").notNull().default(""),` with:

```ts
  /** The project's article (src/lib/article.ts), written by its agent and imported; null until there is one. */
  article: text("article", { mode: "json" }).$type<Article>(),
  /** The article shows at /projects/<slug>, and the card links to it, only while this is on. */
  articlePublished: integer("article_published", { mode: "boolean" }).notNull().default(false),
```

- [ ] **Step 4: Generate the migration**

Run: `pnpm db:generate`
Expected: a new file `drizzle/0007_<random_name>.sql`. Read it. It must, in some order:
- add `article` as nullable `text`;
- add `article_published` as `integer DEFAULT false NOT NULL`;
- drop `case_study_md`, either as `ALTER TABLE ... DROP COLUMN` or as a table rebuild that copies every other column.

If it renames instead of dropping and adding (drizzle-kit asks interactively), answer "create column" for both new columns.

- [ ] **Step 5: Count article shots as media uses**

In `src/admin/media.ts` `mediaUsage`, add as the last element of the returned array, after the activities line:

```ts
    ...db
      .select({ name: projects.name, article: projects.article })
      .from(projects)
      .all()
      .filter((r) => r.article?.shots.some((s) => s.mediaId === id))
      .map((r) => `${r.name}, article`),
```

- [ ] **Step 6: Add the save rules**

In `src/admin/store.ts` `checkRules`, inside `if (res.key === "projects") { ... }`, after the featured check:

```ts
    if (values.articlePublished === true && "article" in values && values.article == null) {
      errors.articlePublished = "Import or write the article before publishing it.";
    }
    const article = values.article as Article | null | undefined;
    for (const s of article?.shots ?? []) {
      if (!db.select({ id: media.id }).from(media).where(eq(media.id, s.mediaId)).get()) {
        errors.article = `Screenshot ${s.mediaId} is not in the media list. Pick another.`;
      }
    }
```

Add the imports: `import type { Article } from "@/lib/article";`. Add `media` to the `@/db/schema` import if it is not there; `eq` already is.

- [ ] **Step 7: Remove the old case study link**

In `src/components/home/ProjectCard.tsx`, delete the line

```tsx
          {pr.caseStudyMd ? <a className="btn btn-ink" href={`/projects/${pr.slug}`}>Case study <Icon name="arrow-ur" /></a> : null}
```

Task 5 adds "Read the story" there.

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `pnpm test`
Expected: all unit tests pass, including the three new ones. `db.test.ts` and `seed.test.ts` run the migrations in memory, so a bad migration fails here.

- [ ] **Step 9: Check**

Run: `pnpm typecheck`
Expected: no errors. Do not commit.

---

### Task 3: Seed and the content the page reads

**Files:**
- Modify: `src/db/seed-data.ts`, `src/db/seed.ts`, `src/content/home.ts`
- Create: `src/content/article.ts`
- Test: `tests/unit/article-view.test.ts`

**Interfaces:**
- Consumes: `LEDGERLY_ARTICLE`, `Article` (Task 1); the `projects.article` and `articlePublished` columns (Task 2).
- Produces:
  - `type ArticleShot = MediaRef & { caption: string }`.
  - `type ArticleRoom = { slug: string; name: string; fieldColor: string; scene: DeviceScene | null; shots: { shot: MediaRef; i: number }[]; phoneShot: MediaRef | null }`.
  - `type ArticleView = { room: ArticleRoom; article: Article; tags: string[]; shots: ArticleShot[]; next: ArticleRoom | null }`.
  - `getArticleView(db: Db, slug: string, opts?: { draft?: boolean }): ArticleView | null`.
  - `getArticleViewById(db: Db, id: number): ArticleView | null`, which always shows drafts.
  - `HomeProject.hasArticle: boolean`.
- Seed: Ledgerly has the article and is published. Kanbo has a draft whose hook is changed. Rute and Pantau have none.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/article-view.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getArticleView, getArticleViewById } from "@/content/article";
import { getHomeContent } from "@/content/home";
import { projects } from "@/db/schema";
import { seededDb } from "./helpers";

describe("article view", () => {
  it("shows a published article with its room and no next project when it is the only one", () => {
    const db = seededDb();
    const v = getArticleView(db, "ledgerly")!;
    expect(v.room.name).toBe("Ledgerly");
    expect(v.article.hook).toContain("get paid before the week was out");
    expect(v.room.shots.length).toBeGreaterThan(0);
    expect(v.next).toBeNull();
  });

  it("hides a draft, an unknown slug and a project taken off the site", () => {
    const db = seededDb();
    expect(getArticleView(db, "kanbo")).toBeNull();
    expect(getArticleView(db, "nope")).toBeNull();
    db.update(projects).set({ showOnSite: false }).where(eq(projects.slug, "ledgerly")).run();
    expect(getArticleView(db, "ledgerly")).toBeNull();
  });

  it("shows a draft to the editor's preview", () => {
    const db = seededDb();
    const kanbo = db.select().from(projects).where(eq(projects.slug, "kanbo")).get()!;
    expect(getArticleViewById(db, kanbo.id)?.article.hook).toContain("see each other think");
    expect(getArticleViewById(db, 99999)).toBeNull();
  });

  it("points Next project at the following published article, wrapping round", () => {
    const db = seededDb();
    db.update(projects).set({ articlePublished: true }).where(eq(projects.slug, "kanbo")).run();
    expect(getArticleView(db, "ledgerly")!.next?.slug).toBe("kanbo");
    expect(getArticleView(db, "kanbo")!.next?.slug).toBe("ledgerly");
  });

  it("marks home cards whose article is published", () => {
    const db = seededDb();
    const byslug = Object.fromEntries(getHomeContent(db)!.projects.map((p) => [p.slug, p.hasArticle]));
    expect(byslug).toMatchObject({ ledgerly: true, kanbo: false, rute: false });
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test tests/unit/article-view.test.ts`
Expected: FAIL. The import `@/content/article` cannot be resolved.

- [ ] **Step 3: Seed the articles**

In `src/db/seed-data.ts`, add at the top `import { LEDGERLY_ARTICLE } from "../content/article-example";` and `import type { Article } from "../lib/article";`, then at the end:

```ts
/** Ledgerly's article is live; Kanbo's is a draft (the e2e tests publish it in the editor). */
export const seedArticles: Record<string, { article: Article; published: boolean }> = {
  ledgerly: { article: LEDGERLY_ARTICLE, published: true },
  kanbo: {
    article: { ...LEDGERLY_ARTICLE, hook: "What if a team of thirty could plan on one board and _see each other think_ while they did?" },
    published: false,
  },
};
```

In `src/db/seed.ts`, add `seedArticles` to the `./seed-data` import. In the `seedProjects.forEach` insert, change the `.values({...})` object to add:

```ts
          article: seedArticles[p.slug]?.article ?? null,
          articlePublished: seedArticles[p.slug]?.published ?? false,
```

- [ ] **Step 4: Write `src/content/article.ts`**

```ts
import "server-only";
import type { Db } from "@/db/client";
import { media, projects } from "@/db/schema";
import { DEVICE_SCENES, type DeviceScene } from "@/content/device-scenes";
import type { Article } from "@/lib/article";
import { toMediaRef, type MediaRef, type Project } from "./home";

export type ArticleShot = MediaRef & { caption: string };
/** A project's room: its Blender scene with its screenshots on the screens, or its main screenshot without one. */
export type ArticleRoom = {
  slug: string; name: string; fieldColor: string; scene: DeviceScene | null;
  shots: { shot: MediaRef; i: number }[]; phoneShot: MediaRef | null;
};
export type ArticleView = { room: ArticleRoom; article: Article; tags: string[]; shots: ArticleShot[]; next: ArticleRoom | null };

const live = (p: Project) => p.article !== null && p.articlePublished && p.showOnSite;

/**
 * What /projects/<slug> renders. Null when there is nothing to show the public: no such project, no article, not
 * published, or not on the site. The editor's preview passes draft to see an unpublished article.
 */
export function getArticleView(db: Db, slug: string, opts: { draft?: boolean } = {}): ArticleView | null {
  const all = db.select().from(projects).all().sort((a, b) => a.sortOrder - b.sortOrder);
  const p = all.find((r) => r.slug === slug);
  if (!p?.article || !(opts.draft || live(p))) return null;
  const refs = new Map(db.select().from(media).all().map((m) => [m.id, toMediaRef(m)]));
  const ref = (id: number | null) => (id == null ? null : (refs.get(id) ?? null));
  const room = (r: Project): ArticleRoom => ({
    slug: r.slug, name: r.name, fieldColor: r.fieldColor, scene: DEVICE_SCENES[r.slug] ?? null, phoneShot: ref(r.phoneShotId),
    shots: [r.screenshotId, r.shot2Id, r.shot3Id, r.shot4Id].flatMap((id, i) => {
      const shot = ref(id);
      return shot ? [{ shot, i }] : [];
    }),
  });
  const own = p.article.shots.flatMap((s) => {
    const m = ref(s.mediaId);
    return m ? [{ ...m, caption: s.caption }] : [];
  });
  // Without screenshots of its own, the article shows the card's second and third, uncaptioned.
  const fallback = [p.shot2Id, p.shot3Id].flatMap((id) => {
    const m = ref(id);
    return m ? [{ ...m, caption: "" }] : [];
  });
  const published = all.filter(live);
  const at = published.findIndex((r) => r.id === p.id);
  const after = at === -1 ? published : [...published.slice(at + 1), ...published.slice(0, at)];
  const next = after.find((r) => r.id !== p.id) ?? null;
  return { room: room(p), article: p.article, tags: p.tags, shots: own.length > 0 ? own : fallback, next: next ? room(next) : null };
}

/** The editor's preview of a project's article, published or not. */
export function getArticleViewById(db: Db, id: number): ArticleView | null {
  const p = db.select({ id: projects.id, slug: projects.slug }).from(projects).all().find((r) => r.id === id);
  return p ? getArticleView(db, p.slug, { draft: true }) : null;
}
```

- [ ] **Step 5: Mark home cards**

In `src/content/home.ts`:
- Add `hasArticle: boolean;` to `type HomeProject`, with the doc comment `/** The project's article is published, so the card links to it. */`.
- In `getHomeContent`'s project map, add `hasArticle: p.article !== null && p.articlePublished,` after `phoneShot: ref(p.phoneShotId),`.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `pnpm test`
Expected: all pass. If `seed.test.ts` counts columns or snapshots rows, update only the counts that changed.

- [ ] **Step 7: Check**

Run: `pnpm typecheck`
Expected: no errors. Do not commit.

---

### Task 4: The article page

**Files:**
- Create: `src/components/home/Scene.tsx`, `src/components/article/ArticlePage.tsx`, `src/components/article/ArchDiagram.tsx`, `src/components/article/RoomShow.tsx`, `src/components/article/article.css`, `src/app/projects/[slug]/page.tsx`
- Modify: `src/components/home/ProjectCard.tsx` (move `Scene` and `Shots` out), `src/components/home/Nav.tsx`
- Test: `tests/e2e/article.spec.ts`

**Interfaces:**
- Consumes: `ArticleView`, `ArticleRoom`, `ArticleShot`, `getArticleView` (Task 3); `Architecture`, `edgeId` (Task 1).
- Produces:
  - `Scene({ scene, slug, layout, shots, phoneShot })`, `Shots({ shots, sizes, objectPosition? })`, `type SceneShot`.
  - `Nav({ name, onHome? })`.
  - `ArticlePage({ view, ownerName })`, used by Task 7's preview.
  - `ArchDiagram({ arch })`.
  - Diagram DOM:
    - each part is a `.arch-node[data-node="<id>"]`, with `.is-lit` or `.is-dim` while something is lit;
    - scenario tabs are `role="tab"`;
    - steps are buttons with `aria-pressed`.

- [ ] **Step 1: Write the failing e2e tests**

Create `tests/e2e/article.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { sessionStorage.setItem("swarm-built", "1"); } catch { /* storage blocked */ }
  });
});

test("a published article opens with its question and shows its four parts in order", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  await expect(page).toHaveTitle(/^Ledgerly: What if a shop could send an invoice/);
  // the h1's text also holds the marquee's aria-hidden copies, so check the name it is read out with
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ledgerly");
  await expect(page.locator(".art-q")).toContainText("get paid before the week was out");
  await expect(page.locator(".art-q em")).toHaveText("get paid before the week was out?");
  await expect(page.locator("main h2")).toHaveText(["Problem (01)", "Approach (02)", "Architecture (03)", "Results (04)"]);
  await expect(page.locator(".art-facts")).toContainText("Solo, design to deploy");
  await expect(page.locator(".art-stats li").first()).toContainText("(sample)");
  await expect(page.getByRole("link", { name: "All work" })).toHaveAttribute("href", "/#work");
  // only one article is published in the seed, so there is no next project
  await expect(page.locator(".art-next")).toHaveCount(0);
});

test("a draft, an unknown slug and a bad slug are not found", async ({ page }) => {
  for (const path of ["/projects/kanbo", "/projects/nope"]) {
    expect((await page.goto(path))!.status(), path).toBe(404);
  }
});

test("a scenario step lights its parts and dims the rest", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  // the first step of the first scenario is on at load
  await expect(node(page, "customer")).toHaveClass(/is-lit/);
  await expect(node(page, "worker")).toHaveClass(/is-dim/);
  await page.getByRole("tab", { name: /A reminder goes out/ }).click();
  await expect(page.getByRole("tab", { name: /A reminder goes out/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /sends each one through the WhatsApp API/ }).click();
  await expect(node(page, "wa")).toHaveClass(/is-lit/);
  await expect(node(page, "customer")).toHaveClass(/is-dim/);
  // pressing the lit step again turns everything back on
  await page.getByRole("button", { name: /sends each one through the WhatsApp API/ }).click();
  await expect(node(page, "customer")).not.toHaveClass(/is-dim|is-lit/);
});

test("hovering a part lights its wires", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  await page.getByRole("button", { name: /The customer opens the link/ }).click(); // turn the step off
  await node(page, "db").hover();
  await expect(node(page, "worker")).toHaveClass(/is-lit/);
  await expect(node(page, "owner")).toHaveClass(/is-dim/);
  await expect(page.locator(".arch-wires path.is-lit")).toHaveCount(2); // api>db and worker>db
});

test("on a phone the article has no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects/ledgerly");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

function node(page: import("@playwright/test").Page, id: string) {
  return page.locator(`.arch-node[data-node="${id}"]`);
}
```

- [ ] **Step 2: Move `Scene` and `Shots` into `src/components/home/Scene.tsx`**

Create `src/components/home/Scene.tsx` with the code cut from `ProjectCard.tsx`:
- the `Shots` and `Scene` functions, unchanged;
- the `Shot` type, renamed and exported;
- their imports.

```tsx
import type { CSSProperties } from "react";
import type { MediaRef } from "@/content/home";
import type { DeviceScene } from "@/content/device-scenes";
import { withBase } from "@/lib/base-path";

export type SceneShot = { shot: MediaRef; i: number };

export function Shots({ shots, sizes, objectPosition }: { shots: SceneShot[]; sizes: string; objectPosition?: string }) {
  return shots.map(({ shot, i }, n) => (
    <img
      key={i}
      className={n === 0 ? "is-on" : undefined}
      data-step={i}
      src={shot.url}
      srcSet={shot.srcSet}
      sizes={sizes}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      loading="lazy"
      style={objectPosition ? { objectPosition } : undefined}
    />
  ));
}

/** A rendered photo of the devices with black screens; the screenshots lie on the screens in the photo's own
 *  perspective (see device-scenes.ts), so they keep turning like the print's. A phone card may show its own frame of
 *  the room (scene.mobile): the photo comes from a <picture> source, and each pose is given for both frames as CSS
 *  variables (--d-* on a desk, --m-* on a phone), so the screens stay one set of elements. */
export function Scene({ scene, slug, layout, shots, phoneShot }: { scene: DeviceScene; slug: string; layout: "wide" | "half"; shots: SceneShot[]; phoneShot: MediaRef | null }) {
  const m = scene.mobile ?? scene;
  const pose = (name: "laptop" | "phone") => {
    const vars: Record<string, string> = {};
    for (const [k, s] of [["d", scene.screens[name]], ["m", m.screens[name]]] as const) {
      if (!s) continue;
      vars[`--${k}-w`] = `${s.w}cqw`;
      vars[`--${k}-h`] = `${s.h}cqw`;
      vars[`--${k}-tf`] = `translate3d(${s.t.map((v) => `${v}cqw`).join(", ")}) matrix3d(${s.m.join(", ")})`;
    }
    return vars as CSSProperties;
  };
  const src = (frame: string, w: number) => `${withBase(`/devices/${slug}${frame}-${w / 2}.webp`)} ${w / 2}w, ${withBase(`/devices/${slug}${frame}-${w}.webp`)} ${w}w`;
  return (
    <div className="scene" style={{ "--d-ar": `${scene.width} / ${scene.height}`, "--m-ar": `${m.width} / ${m.height}`, "--d-p": `${scene.perspective}cqw`, "--m-p": `${m.perspective}cqw` } as CSSProperties}>
      <picture>
        {scene.mobile ? <source media="(max-width: 860px)" srcSet={src("-m", m.width)} sizes="100vw" width={m.width} height={m.height} /> : null}
        <img
          className="scene-photo"
          src={withBase(`/devices/${slug}-${scene.width}.webp`)}
          srcSet={src("", scene.width)}
          sizes={layout === "half" ? "(max-width: 860px) 100vw, 640px" : "(max-width: 860px) 100vw, 1280px"}
          alt=""
          width={scene.width}
          height={scene.height}
          loading="lazy"
        />
      </picture>
      <div className="scene-view">
        <figure className={shots.length > 1 ? "scene-screen is-laptop has-stack" : "scene-screen is-laptop"} style={pose("laptop")} data-show>
          <Shots shots={shots} sizes="(max-width: 860px) 70vw, 720px" />
        </figure>
        {scene.screens.phone && m.screens.phone && phoneShot ? (
          <figure className="scene-screen is-phone" style={pose("phone")} aria-hidden="true">
            <img src={phoneShot.url} srcSet={phoneShot.srcSet} sizes="200px" alt="" width={phoneShot.width} height={phoneShot.height} loading="lazy" />
          </figure>
        ) : null}
      </div>
    </div>
  );
}
```

In `ProjectCard.tsx`:
- delete the moved functions and the `Shot` type;
- add `import { Scene, Shots, type SceneShot } from "./Scene";`;
- replace remaining `Shot` uses with `SceneShot`;
- drop the imports that are now unused (`withBase`, `DeviceScene` if unused).

Run `pnpm typecheck` and confirm there are no errors.

- [ ] **Step 3: Let the nav live off the home page**

Replace `Nav` in `src/components/home/Nav.tsx` (keep `SECTIONS` as is):

```tsx
export function Nav({ name, onHome = true }: { name: string; onHome?: boolean }) {
  // Off the home page the section links lead back to it, the bar is solid from the start (the home page's script that
  // turns it solid only runs there), and Work is the current section.
  const home = withBase("/");
  const sections = onHome ? SECTIONS : SECTIONS.map((s) => ({ ...s, href: `${home}${s.href}` }));
  return (
    <header className={onHome ? "nav" : "nav is-solid"} data-nav>
      <a className="brand" href={onHome ? "#top" : home}>{name}</a>
      <nav className="nav-links" aria-label="Sections">
        {sections.map((s) => (
          <a key={s.href} href={s.href} aria-current={!onHome && s.label === "Work" ? "true" : undefined}>{s.label}</a>
        ))}
      </nav>
      <div className="nav-actions">
        <a className="btn btn-stock" href={withBase("/cv")}>Download CV <Icon name="download" /></a>
        <MobileMenu sections={sections} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Write `src/components/article/RoomShow.tsx`**

```tsx
"use client";

import { useEffect } from "react";

/**
 * Turns the room's laptop screen to its next screenshot every 2.8s, as the work card does (site.css owns the
 * cross-fade). It holds while the room is mostly off screen and in a hidden tab, and does nothing under reduced
 * motion. Renders nothing.
 */
export function RoomShow() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stops: (() => void)[] = [];
    for (const room of document.querySelectorAll<HTMLElement>("[data-room]")) {
      const imgs = [...room.querySelectorAll<HTMLImageElement>("[data-show] img")];
      if (imgs.length < 2) continue;
      let at = 0;
      let seen = false;
      const io = new IntersectionObserver((e) => { seen = e.at(-1)!.isIntersecting; }, { threshold: 0.35 });
      io.observe(room);
      const timer = window.setInterval(() => {
        if (!seen || document.hidden) return;
        const prev = imgs[at];
        at = (at + 1) % imgs.length;
        prev.classList.remove("is-on");
        prev.classList.add("is-out");
        window.setTimeout(() => prev.classList.remove("is-out"), 720);
        imgs[at].classList.add("is-on");
      }, 2800);
      stops.push(() => { io.disconnect(); window.clearInterval(timer); });
    }
    return () => stops.forEach((s) => s());
  }, []);
  return null;
}
```

- [ ] **Step 5: Write `src/components/article/ArchDiagram.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { edgeId } from "@/lib/edge-id";
import type { Architecture } from "@/lib/article";

type Wire = { id: string; d: string; lx: number; ly: number; label: string };

/** The grid's gaps in px; article.css sets the same on .arch-map. Wires run only in these gaps, never over a part. */
const COL_GAP = 64;
const ROW_GAP = 52;
const NARROW = "(max-width: 860px)";

/**
 * The architecture: zones as stitched columns, parts as printed labels, wires that say what runs on them, and
 * scenarios whose steps light their path (the spec, section 4). The first step of the first scenario is on at load;
 * pressing the lit step turns it off. Hovering or focusing a part lights it and its wires.
 */
export function ArchDiagram({ arch }: { arch: Architecture }) {
  const map = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<Wire[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [flow, setFlow] = useState(0);
  const [step, setStep] = useState<number | null>(0);
  const [hover, setHover] = useState<string | null>(null);

  const measure = useCallback(() => {
    const el = map.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    const narrow = window.matchMedia(NARROW).matches;
    const place = new Map(arch.nodes.map((n) => [n.id, n]));
    const box = (id: string) => {
      const b = el.querySelector<HTMLElement>(`[data-node="${id}"]`)!.getBoundingClientRect();
      return {
        l: b.left - r.left, r: b.right - r.left, t: b.top - r.top, b: b.bottom - r.top,
        cx: (b.left + b.right) / 2 - r.left, cy: (b.top + b.bottom) / 2 - r.top,
      };
    };
    setWires(arch.edges.map((e) => {
      const a = box(e.from);
      const b = box(e.to);
      const id = edgeId(e);
      const label = e.label;
      if (narrow) {
        // stacked: out of the left side, down the margin, into the other part's left side
        const x = Math.min(a.l, b.l) - 14;
        return { id, d: `M${a.l},${a.cy} H${x} V${b.cy} H${b.l}`, lx: x, ly: (a.cy + b.cy) / 2, label };
      }
      const pa = place.get(e.from)!;
      const pb = place.get(e.to)!;
      const span = Math.abs(pa.zone - pb.zone);
      if (span === 0) {
        if (Math.abs(pa.row - pb.row) === 1) {
          const down = b.cy > a.cy;
          const y1 = down ? a.b : a.t;
          const y2 = down ? b.t : b.b;
          return { id, d: `M${a.cx},${y1} V${y2}`, lx: a.cx, ly: (y1 + y2) / 2, label };
        }
        // the same zone with a part between: round it through the gutter on the right
        const g = a.r + COL_GAP / 2;
        return { id, d: `M${a.r},${a.cy} H${g} V${b.cy} H${b.r}`, lx: g, ly: (a.cy + b.cy) / 2, label };
      }
      const right = b.cx > a.cx;
      const x1 = right ? a.r : a.l;
      const x2 = right ? b.l : b.r;
      if (span === 1) {
        const mx = (x1 + x2) / 2;
        return { id, d: `M${x1},${a.cy} H${mx} V${b.cy} H${x2}`, lx: mx, ly: (a.cy + b.cy) / 2, label };
      }
      // over more than one zone: out into the gutter beside its part, along the row gap above the higher part, and
      // down the gutter beside the far part
      const g1 = right ? a.r + COL_GAP / 2 : a.l - COL_GAP / 2;
      const g2 = right ? b.l - COL_GAP / 2 : b.r + COL_GAP / 2;
      const lane = Math.min(a.t, b.t) - ROW_GAP / 2;
      return { id, d: `M${x1},${a.cy} H${g1} V${lane} H${g2} V${b.cy} H${x2}`, lx: (g1 + g2) / 2, ly: lane, label };
    }));
  }, [arch]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const el = map.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure]);

  const steps = arch.flows[flow].steps;
  const lit = new Set<string>(step === null ? [] : steps[step].at);
  if (hover) {
    lit.add(hover);
    for (const e of arch.edges) {
      if (e.from === hover || e.to === hover) { lit.add(edgeId(e)); lit.add(e.from); lit.add(e.to); }
    }
  }
  const tone = (id: string) => (lit.size === 0 ? "" : lit.has(id) ? " is-lit" : " is-dim");
  const rows = Math.max(...arch.nodes.map((n) => n.row)) + 1;

  return (
    <div className="arch">
      <div className="arch-map" ref={map} style={{ "--zones": arch.zones.length, "--rows": rows } as CSSProperties}>
        <svg className="arch-wires" width={size.w} height={size.h} aria-hidden="true" focusable="false">
          {wires.map((w) => <path key={w.id} className={tone(w.id).trim() || undefined} d={w.d} />)}
        </svg>
        {wires.map((w) => (
          <span key={w.id} className={`arch-wire-label${tone(w.id)}`} style={{ left: w.lx, top: w.ly }} aria-hidden="true">{w.label}</span>
        ))}
        {arch.zones.map((z, zi) => (
          <div key={zi} className="arch-zone" style={{ gridColumn: zi + 1, order: zi * 10 }}>
            <p className="arch-zone-name">{z}</p>
          </div>
        ))}
        {arch.nodes.map((n) => (
          <div
            key={n.id}
            data-node={n.id}
            tabIndex={0}
            className={`arch-node${n.kind ? ` is-${n.kind}` : ""}${tone(n.id)}`}
            style={{ gridColumn: n.zone + 1, gridRow: n.row + 2, order: n.zone * 10 + n.row + 1 }}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(n.id)}
            onBlur={() => setHover(null)}
          >
            <b>{n.name}</b>
            <span className="arch-tech">{n.tech}</span>
            <span className="arch-note">{n.note}</span>
          </div>
        ))}
      </div>
      <div className="arch-flows">
        <div className="arch-tabs" role="tablist" aria-label="Scenarios">
          {arch.flows.map((f, i) => (
            <button
              key={i} type="button" role="tab" id={`arch-tab-${i}`} aria-selected={i === flow} aria-controls="arch-steps"
              className={i === flow ? "is-on" : undefined}
              onClick={() => { setFlow(i); setStep(0); }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>{f.title}
            </button>
          ))}
        </div>
        <ol className="arch-steps" id="arch-steps" role="tabpanel" aria-labelledby={`arch-tab-${flow}`}>
          {steps.map((s, i) => (
            <li key={`${flow}-${i}`}>
              <button type="button" aria-pressed={i === step} className={i === step ? "is-on" : undefined} onClick={() => setStep(i === step ? null : i)}>
                <span className="arch-step-n" aria-hidden="true">{i + 1}</span>
                <span>{s.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/components/article/ArticlePage.tsx`**

```tsx
import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import { Nav } from "@/components/home/Nav";
import { Scene } from "@/components/home/Scene";
import type { ArticleRoom, ArticleShot, ArticleView } from "@/content/article";
import { withBase } from "@/lib/base-path";
import { ArchDiagram } from "./ArchDiagram";
import { RoomShow } from "./RoomShow";
import "./article.css";

/** Copies of the name in the marquee: two full widths at the largest size, so the loop never shows a gap. */
const MARQUEE_COPIES = 8;

/**
 * A project article (docs/superpowers/specs/2026-11-18-project-articles-design.md): full-width bands in turn navy
 * and concrete, no cards. It opens on a question, the name rolls past, and the room follows; the four parts come after.
 */
export function ArticlePage({ view, ownerName }: { view: ArticleView; ownerName: string }) {
  const { room, article: a, shots, next } = view;
  return (
    <>
      <a className="skip" href="#art-main">Skip to the article</a>
      <Nav name={ownerName} onHome={false} />
      <main className="art" id="art-main">
        <section className="art-band theme-dark art-top" aria-labelledby="art-h">
          <a className="art-back" href={withBase("/#work")}><Icon name="left" />All work</a>
          <p className="art-q"><Inline text={a.hook} /></p>
          <h1 className="art-roll" id="art-h">
            <span className="sr-only">{room.name}</span>
            <span className="art-roll-track" aria-hidden="true">
              {Array.from({ length: MARQUEE_COPIES }, (_, i) => <span key={i}>{room.name}<i>✦</i></span>)}
            </span>
          </h1>
        </section>
        <Room room={room} live />

        <section className="art-band theme-light" aria-labelledby="art-problem">
          <div className="art-sec">
            <div className="art-side">
              <h2 className="art-label" id="art-problem">Problem <b>(01)</b></h2>
              <dl className="art-facts">
                <div><dt>Year</dt><dd>{a.facts.year}</dd></div>
                <div><dt>Role</dt><dd>{a.facts.role}</dd></div>
                <div><dt>Team</dt><dd>{a.facts.team}</dd></div>
                {view.tags.length > 0 ? (
                  <div><dt>Stack</dt><dd className="art-stack">{view.tags.map((t) => <span key={t} className="tag">{t}</span>)}</dd></div>
                ) : null}
              </dl>
            </div>
            <div>
              <p className="art-say"><Inline text={a.problem.say} /></p>
              <ul className="art-points">{a.problem.points.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>
            </div>
          </div>
        </section>

        {shots[0] ? <Screen shot={shots[0]} theme="theme-dark" /> : null}

        <section className="art-band theme-light" aria-labelledby="art-approach">
          <div className="art-sec">
            <h2 className="art-label" id="art-approach">Approach <b>(02)</b></h2>
            <div>
              <p className="art-say"><Inline text={a.approach.say} /></p>
              <ol className="art-calls">
                {a.approach.calls.map((c, i) => (
                  <li key={i}><b>{c.title}</b><Inline text={c.body} /><span>Gave up: {c.gaveUp}</span></li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="art-band theme-dark" aria-labelledby="art-arch">
          <div className="art-sec">
            <h2 className="art-label" id="art-arch">Architecture <b>(03)</b></h2>
            <p className="art-say"><Inline text={a.architecture.say} /></p>
          </div>
          <ArchDiagram arch={a.architecture} />
        </section>

        {shots[1] ? <Screen shot={shots[1]} theme="theme-light" /> : null}

        <section className="art-band theme-dark" aria-labelledby="art-results">
          <div className="art-sec">
            <h2 className="art-label" id="art-results">Results <b>(04)</b></h2>
            <p className="art-say"><Inline text={a.results.say} /></p>
          </div>
          <ul className="art-stats">
            {a.results.stats.map((s, i) => (
              <li key={i}><b>{s.value}</b><span>{s.label}{s.sample ? " (sample)" : ""}</span></li>
            ))}
          </ul>
        </section>

        {next ? (
          <a className="art-band theme-light art-next" href={withBase(`/projects/${next.slug}`)}>
            <span className="art-label">Next project</span>
            <span className="art-next-name">{next.name} <Icon name="arrow-ur" /></span>
            <Room room={next} />
          </a>
        ) : null}
      </main>
      <RoomShow />
    </>
  );
}

/** The project's room. Only the article's own room turns its screens (data-room); the next project's stays still. */
function Room({ room, live = false }: { room: ArticleRoom; live?: boolean }) {
  const cls = live ? "art-room" : "art-room is-next";
  if (room.scene && room.shots.length > 0) {
    return (
      <div className={cls} data-room={live || undefined} style={{ "--field": room.fieldColor, "--scene-ar": `${room.scene.width} / ${room.scene.height}` } as CSSProperties}>
        <Scene scene={room.scene} slug={room.slug} layout="wide" shots={room.shots} phoneShot={room.phoneShot} />
      </div>
    );
  }
  const shot = room.shots[0]?.shot;
  if (!shot) return null;
  return (
    <div className={`${cls} is-print`} style={{ "--field": room.fieldColor } as CSSProperties}>
      <img src={shot.url} srcSet={shot.srcSet} sizes="(max-width: 860px) 92vw, 1100px" alt={shot.alt} width={shot.width} height={shot.height} />
    </div>
  );
}

function Screen({ shot, theme }: { shot: ArticleShot; theme: "theme-dark" | "theme-light" }) {
  return (
    <figure className={`art-band ${theme} art-shot`}>
      <img src={shot.url} srcSet={shot.srcSet} sizes="(max-width: 860px) 100vw, 1200px" alt={shot.alt} width={shot.width} height={shot.height} loading="lazy" />
      {shot.caption ? <figcaption>{shot.caption}</figcaption> : null}
    </figure>
  );
}
```

- [ ] **Step 7: Write `src/components/article/article.css`**

```css
/* Project article (docs/superpowers/specs/2026-11-18-project-articles-design.md). Full-width bands in turn navy and
   concrete (theme-dark / theme-light from site.css), no cards. Every band clips its own sides, as .section does. */
.art { --pad-x: clamp(22px, 7vw, 112px); }
.art-band { position: relative; display: block; padding: clamp(80px, 9vw, 140px) var(--pad-x); overflow-x: clip; }
.art-top { padding-top: clamp(120px, 12vw, 170px); padding-bottom: 0; }
.art-back { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; text-decoration: none; color: var(--on-ground-2); font-size: 16px; }
.art-back:hover { color: var(--on-ground); }

/* the top: the question, then the name rolling past under a stitch */
.art-q { margin-top: clamp(40px, 6vw, 96px); max-width: 17ch; font-size: clamp(40px, 6.2vw, 104px); line-height: 0.98; font-weight: 800; letter-spacing: -0.035em; text-wrap: balance; }
.art-q em { font-style: normal; font-weight: 250; font-variation-settings: "wdth" 125; }
.art-roll { margin: clamp(56px, 7vw, 110px) calc(-1 * var(--pad-x)) 0; padding: 0.06em 0 0.12em; overflow: hidden; border-top: 2px dashed var(--stitch); }
.art-roll-track { display: flex; width: max-content; animation: art-roll 26s linear infinite; }
.art-roll-track > span { display: inline-flex; align-items: center; gap: 0.25em; padding-right: 0.25em; font-size: clamp(96px, 15vw, 250px); line-height: 1; font-weight: 900; font-variation-settings: "wdth" 125; letter-spacing: -0.045em; white-space: nowrap; }
.art-roll-track > span:nth-child(even) { color: transparent; -webkit-text-stroke: 0.018em var(--stock); }
.art-roll-track i { font-style: normal; font-size: 0.4em; color: var(--metal-mid); }
@keyframes art-roll { to { transform: translateX(-50%); } }

/* the room: the work card's Blender render, full width, its screens live */
.art-room { position: relative; display: block; aspect-ratio: var(--scene-ar); background: var(--field); }
.art-room .scene { border-radius: 0; }
.art-room.is-print { aspect-ratio: auto; display: grid; place-items: center; padding: clamp(32px, 5vw, 80px) var(--pad-x); }
.art-room.is-print img { width: min(100%, 1100px); height: auto; border: 8px solid #fff; border-radius: var(--r-sticker); box-shadow: var(--shadow-lift); }

/* a section: a numbered label (and the facts) on the left, the statement and its points on the right */
.art-sec { display: grid; grid-template-columns: minmax(160px, 1fr) 3fr; gap: 24px clamp(24px, 4vw, 64px); align-items: start; }
.art-label { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; font-variation-settings: "wdth" 85; color: var(--on-ground-2); padding-top: 0.9em; }
.art-label b { color: var(--on-ground); font-weight: 900; }
.art-say { max-width: 22ch; font-size: clamp(32px, 4.2vw, 64px); line-height: 1.02; font-weight: 800; letter-spacing: -0.03em; text-wrap: balance; }
.art-say em { font-style: normal; font-weight: 300; font-variation-settings: "wdth" 125; }
.art-points { margin-top: clamp(28px, 3vw, 44px); display: grid; gap: 14px; max-width: 58ch; padding-left: 1.1em; list-style: disc; font-size: 19px; line-height: 1.5; }
.art-points li::marker { color: var(--on-ground-2); }
.art-points strong, .art-calls strong { font-weight: 800; }

.art-facts { display: grid; gap: 18px; margin: 36px 0 0; padding-top: 20px; border-top: 2px solid var(--line); }
.art-facts dt { font-size: 11.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--on-ground-2); font-variation-settings: "wdth" 85; }
.art-facts dd { margin: 5px 0 0; font-size: 16px; font-weight: 650; line-height: 1.3; }
.art-stack { display: flex; flex-wrap: wrap; gap: 6px; }
.art .tag { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: var(--r-pill); border: 1.5px solid var(--line-strong); color: var(--on-ground); background: none; font-size: 13px; font-weight: 650; }

.art-calls { margin-top: clamp(28px, 3vw, 44px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(20px, 3vw, 44px); counter-reset: call; list-style: none; padding: 0; }
.art-calls li { counter-increment: call; padding-top: 18px; border-top: 2px solid var(--line-strong); font-size: 17px; line-height: 1.5; }
.art-calls li::before { content: counter(call, decimal-leading-zero); display: block; font-size: 13px; font-weight: 900; letter-spacing: 0.12em; margin-bottom: 10px; }
.art-calls b { display: block; font-size: 22px; line-height: 1.15; margin-bottom: 8px; letter-spacing: -0.01em; font-weight: 800; }
.art-calls span { display: block; margin-top: 10px; color: var(--on-ground-2); font-size: 15px; }

/* a screen, full width, never taller than most of the window */
.art-shot { margin: 0; padding-top: clamp(56px, 6vw, 96px); padding-bottom: clamp(56px, 6vw, 96px); }
.art-shot img { display: block; width: auto; max-width: 100%; max-height: 82vh; height: auto; margin: 0 auto; border-radius: 12px; box-shadow: var(--shadow-lift); }
.art-shot figcaption { margin: 18px auto 0; max-width: 60ch; font-size: 15.5px; color: var(--on-ground-2); text-align: center; }

/* results: the numbers print large */
.art-stats { list-style: none; padding: 0; margin-top: clamp(48px, 5vw, 80px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(20px, 3vw, 48px); }
.art-stats li { border-top: 2px solid var(--line-strong); padding-top: 18px; }
.art-stats b { display: block; font-size: clamp(96px, 13vw, 210px); line-height: 0.84; font-weight: 900; font-variation-settings: "wdth" 125; letter-spacing: -0.05em; }
.art-stats span { display: block; margin-top: 14px; font-size: 18px; font-weight: 600; color: var(--on-ground-2); }

/* next project: one link, the name large, its room under it */
.art-next { text-decoration: none; padding-bottom: 0; }
.art-next-name { display: flex; align-items: center; gap: 0.2em; margin-top: 10px; font-size: clamp(56px, 9vw, 150px); line-height: 0.9; font-weight: 900; font-variation-settings: "wdth" 125; letter-spacing: -0.04em; }
.art-next-name .icon { transition: transform 420ms var(--ease-out); }
.art-next:hover .art-next-name .icon { transform: translateX(14px); }
.art-room.is-next { margin: clamp(40px, 4vw, 64px) calc(-1 * var(--pad-x)) 0; }

/* architecture: zones as stitched columns, parts as printed labels, wires with what runs on them */
.arch { margin-top: clamp(48px, 5vw, 80px); }
.arch-map {
  position: relative; display: grid;
  grid-template-columns: repeat(var(--zones), minmax(0, 1fr)); grid-template-rows: 24px repeat(var(--rows), auto);
  column-gap: 64px; row-gap: 52px; /* ArchDiagram.tsx routes wires by these two */
}
.arch-zone { grid-row: 1 / -1; position: relative; border-top: 2px dashed var(--stitch); padding-top: 14px; }
.arch-zone ~ .arch-zone::before { content: ""; position: absolute; left: -32px; top: 0; bottom: 0; border-left: 2px dashed var(--stitch); }
.arch-zone-name { font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--on-ground-2); font-variation-settings: "wdth" 85; }
.arch-node {
  position: relative; z-index: 2; align-self: center; padding: 14px 16px 15px; border-radius: 10px;
  background: var(--stock); color: var(--ink); outline: none;
  transition: filter 260ms var(--ease-out), transform 260ms var(--ease-out), box-shadow 260ms var(--ease-out);
}
.arch-node:focus-visible { box-shadow: 0 0 0 3px var(--ground), 0 0 0 5px var(--stock); }
.arch-node b { display: block; font-size: 17px; font-weight: 800; line-height: 1.15; }
.arch-tech { display: inline-block; margin-top: 6px; padding: 2px 7px; border-radius: 4px; background: var(--ink); color: var(--stock); font-size: 11.5px; font-weight: 750; letter-spacing: 0.04em; }
.arch-note { display: block; margin-top: 7px; font-size: 13.5px; line-height: 1.35; color: var(--ink-2); }
.arch-node.is-person { box-shadow: inset 4px 0 0 #5ee08c; }
.arch-node.is-store { background: var(--metal-light); }
.arch-node.is-ext { background: var(--ground); color: var(--on-ground); box-shadow: inset 0 0 0 2px var(--stock); }
.arch-node.is-ext .arch-note { color: var(--on-ground-2); }
.arch-node.is-ext .arch-tech { background: var(--stock); color: var(--ink); }
.arch-node.is-lit { transform: translateY(-3px); box-shadow: 0 0 0 3px #5ee08c, var(--shadow-sticker); }
.arch-node.is-person.is-lit { box-shadow: inset 4px 0 0 #5ee08c, 0 0 0 3px #5ee08c, var(--shadow-sticker); }
.arch-node.is-dim { filter: brightness(0.5) saturate(0.4); }
.arch-wires { position: absolute; inset: 0; z-index: 1; overflow: visible; pointer-events: none; }
.arch-wires path { fill: none; stroke: var(--metal-mid); stroke-width: 2; transition: stroke 260ms, opacity 260ms; }
.arch-wires path.is-lit { stroke: #5ee08c; stroke-width: 3; stroke-dasharray: 7 6; animation: arch-run 0.9s linear infinite; }
.arch-wires path.is-dim { opacity: 0.18; }
@keyframes arch-run { to { stroke-dashoffset: -13; } }
.arch-wire-label { position: absolute; z-index: 3; translate: -50% -50%; padding: 2px 7px; border-radius: var(--r-pill); background: var(--ground); color: var(--on-ground-2); font-size: 11.5px; font-weight: 750; white-space: nowrap; transition: opacity 260ms, color 260ms; }
.arch-wire-label.is-lit { color: #5ee08c; }
.arch-wire-label.is-dim { opacity: 0.35; }

.arch-flows { display: grid; grid-template-columns: minmax(200px, 1fr) 3fr; gap: 24px clamp(24px, 4vw, 64px); margin-top: clamp(48px, 5vw, 72px); padding-top: 26px; border-top: 2px solid var(--line); }
.arch-tabs { display: grid; gap: 8px; align-content: start; }
.arch-tabs button { display: flex; gap: 12px; align-items: baseline; text-align: left; font: inherit; font-size: 18px; font-weight: 750; color: var(--on-ground-2); background: none; border: 0; padding: 8px 0; cursor: pointer; }
.arch-tabs button span { font-size: 12px; font-weight: 900; letter-spacing: 0.12em; }
.arch-tabs button.is-on { color: var(--on-ground); }
.arch-tabs button.is-on::after { content: ""; flex: 1; align-self: center; border-top: 2px solid var(--on-ground); margin-left: 6px; }
.arch-steps { list-style: none; padding: 0; display: grid; gap: 6px; }
.arch-steps button { display: flex; gap: 16px; width: 100%; text-align: left; font: inherit; font-size: 18px; line-height: 1.45; color: var(--on-ground-2); background: none; border: 0; border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: background 200ms, color 200ms; }
.arch-steps button:hover { color: var(--on-ground); }
.arch-steps button.is-on { color: var(--on-ground); background: rgba(242, 242, 238, 0.08); }
.arch-step-n { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid currentColor; font-size: 13px; font-weight: 900; }
.arch-steps button.is-on .arch-step-n { background: #5ee08c; border-color: #5ee08c; color: var(--ink); }

@media (prefers-reduced-motion: reduce) {
  .art-roll-track, .arch-wires path.is-lit { animation: none; }
}

@media (max-width: 860px) {
  .art-room { aspect-ratio: auto; }
  .art-sec { grid-template-columns: 1fr; }
  .art-label { padding-top: 0; }
  .art-calls, .art-stats { grid-template-columns: 1fr; }
  .art-shot { padding-left: 0; padding-right: 0; }
  .art-shot img { border-radius: 0; max-height: none; width: 100%; }
  .art-shot figcaption { padding: 0 var(--pad-x); }
  .arch-map { display: flex; flex-direction: column; gap: 12px; padding-left: 26px; }
  .arch-zone { grid-row: auto; border: 0; padding: 18px 0 0; margin-left: -26px; }
  .arch-zone::before { display: none; }
  .arch-node { align-self: stretch; }
  .arch-wires path:not(.is-lit), .arch-wire-label { display: none; }
  .arch-flows { grid-template-columns: 1fr; }
  .arch-tabs { display: flex; gap: 18px; overflow-x: auto; }
  .arch-tabs button { white-space: nowrap; }
  .arch-tabs button.is-on::after { display: none; }
  .arch-tabs button.is-on { text-decoration: underline 2px; text-underline-offset: 6px; }
}
```

- [ ] **Step 8: Write the route `src/app/projects/[slug]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article/ArticlePage";
import { getArticleView } from "@/content/article";
import { plainText } from "@/content/derive";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = getArticleView(getDb(), (await params).slug);
  if (!view) return { title: "Not found" };
  return { title: `${view.room.name}: ${plainText(view.article.hook)}`, description: plainText(view.article.problem.say) };
}

export default async function ProjectArticle({ params }: Props) {
  const db = getDb();
  const view = getArticleView(db, (await params).slug);
  const owner = getProfile(db);
  if (!view || !owner) notFound();
  return <ArticlePage view={view} ownerName={`${owner.firstName} ${owner.lastName}`} />;
}
```

- [ ] **Step 9: Check that it builds and looks right**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: no errors; unit tests pass.

Then build a preview. In the scratch clone `pv`, sync, seed and serve:

```bash
PV=/private/tmp/claude-501/-Users-jafarfadli-Koding-portofolio-web/b60235bc-8160-4bc3-a589-e28edc850195/scratchpad/pv
rsync -a --delete --exclude node_modules --exclude .next --exclude .data --exclude .data-e2e --exclude .git /Users/jafarfadli/Koding/portofolio-web/ $PV/
cd $PV && rm -rf .data-art && DATA_DIR=.data-art pnpm -s db:seed && env -u BASE_PATH pnpm build
NODE_ENV=production DATA_DIR=$PV/.data-art node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3016
```

Run the server in the background.

Screenshot `/projects/ledgerly` at 1440x900 and 390x844 with Playwright and look at every band. Check:
- the question fills the first screen;
- the marquee runs;
- the print room shows, since Ledgerly has no Blender scene;
- the bullets show;
- no wire crosses a part;
- the phone has no sideways scroll.

- [ ] **Step 10: Run the e2e in the scratch clone**

Use the e2e command in Global Constraints.
Expected: `tests/e2e/article.spec.ts` passes, and every other spec still passes. Do not commit.

---

### Task 5: Card link, accessibility and visual coverage

**Files:**
- Modify: `src/components/home/ProjectCard.tsx` (`project-links`), `tests/e2e/a11y.spec.ts`, `tests/e2e/visual.spec.ts`
- Test: `tests/e2e/article.spec.ts` (append)

**Interfaces:**
- Consumes: `HomeProject.hasArticle` (Task 3).
- Produces: `#p-<slug> a.btn-ink` with the text "Read the story", pointing at `withBase("/projects/<slug>")`.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e/article.spec.ts`:

```ts
test("only a card whose article is published says Read the story", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#p-ledgerly").getByRole("link", { name: "Read the story" })).toHaveAttribute("href", "/projects/ledgerly");
  await expect(page.locator("#p-kanbo").getByRole("link", { name: "Read the story" })).toHaveCount(0);
  await page.locator("#p-ledgerly").getByRole("link", { name: "Read the story" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ledgerly");
});
```

- [ ] **Step 2: Add the link**

In `ProjectCard.tsx`, where the case study line was (first child of `.project-links`):

```tsx
          {pr.hasArticle ? <a className="btn btn-ink" href={withBase(`/projects/${pr.slug}`)}>Read the story <Icon name="arrow-ur" /></a> : null}
```

Import `withBase` from `@/lib/base-path` again if Task 4 removed it.

- [ ] **Step 3: Cover the article in the a11y and visual specs**

In `tests/e2e/a11y.spec.ts`, change the path list to `["/", "/cv", "/projects/ledgerly"]`. Change the builder line to:

```ts
      // The diagram dims the parts a step does not use, on purpose; every step says the same in plain text below it.
      const axe = new AxeBuilder({ page }).withTags(TAGS);
      if (path.startsWith("/projects/")) axe.exclude(".arch-map");
      const { violations } = await axe.analyze();
```

In `tests/e2e/visual.spec.ts`, add after the `cv` test:

```ts
test("article", async ({ page }) => {
  await page.goto("/projects/ledgerly");
  await page.screenshot({ path: "test-results/visual/article.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/visual/article-390.png", fullPage: true });
});
```

Match the style of the file's other tests: if they set `swarm-built` or reduced motion in a `beforeEach`, this test inherits it.

- [ ] **Step 4: Run the e2e in the scratch clone**

Expected: all pass. If axe reports colour contrast on `.art-label` (`--on-ground-2` on concrete at 13px), raise its weight or use `--on-ground` for the label text. Do not exclude it. Do not commit.

---

### Task 6: The importer

**Files:**
- Create: `src/article/import.ts`, `src/article/import-cli.ts`
- Modify: `package.json` (script `article:import`)
- Test: `tests/unit/article-import.test.ts`

**Interfaces:**
- Consumes:
  - `checkArticleFile`, `checkArticle`, `Article` (Task 1);
  - `processUpload`, `createMedia`, `updateAlt`, `UploadError` (`src/admin/media.ts`);
  - `dropUnused` (`src/admin/images.ts`);
  - `uploadsDir` (`src/lib/env.ts`).
- Produces:
  - `ARTICLE_FILE = "portfolio-article.json"`.
  - `MIN_SHOT_WIDTH = 1440`.
  - `type ImportResult = { ok: true; slug: string; newShots: number; replaced: boolean; published: boolean } | { ok: false; problems: string[] }`.
  - `importArticle(db: Db, repoDir: string, opts?: { slug?: string; today?: string }): Promise<ImportResult>`.
  - The CLI: `pnpm article:import <repo folder> [--slug <slug>]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/article-import.test.ts`:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { importArticle } from "@/article/import";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { media, projects } from "@/db/schema";
import { seededDb } from "./helpers";

const { shots: _none, ...BODY } = LEDGERLY_ARTICLE;

async function repo(file: object | string, shots: { name: string; width: number; colour: string }[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "art-repo-"));
  fs.writeFileSync(path.join(dir, "portfolio-article.json"), typeof file === "string" ? file : JSON.stringify(file));
  fs.mkdirSync(path.join(dir, "portfolio-article"));
  for (const s of shots) {
    await sharp({ create: { width: s.width, height: Math.round(s.width * 0.625), channels: 3, background: s.colour } })
      .png()
      .toFile(path.join(dir, "portfolio-article", s.name));
  }
  return dir;
}
const fileFor = (slug: string, shots: object[] = []) => ({ version: 1, slug, ...BODY, shots });
const rowOf = (db: ReturnType<typeof seededDb>, slug: string) => db.select().from(projects).where(eq(projects.slug, slug)).get()!;
const mediaCount = (db: ReturnType<typeof seededDb>) => db.select().from(media).all().length;

describe("importArticle", () => {
  it("stores a new article unpublished, with its screenshots as media", async () => {
    const db = seededDb();
    const dir = await repo(
      fileFor("rute", [{ file: "portfolio-article/map.png", alt: "The arrivals map", caption: "Arrivals on the map." }]),
      [{ name: "map.png", width: 1600, colour: "#224466" }],
    );
    const r = await importArticle(db, dir, { today: "2026-11-18" });
    expect(r).toEqual({ ok: true, slug: "rute", newShots: 1, replaced: false, published: false });
    const row = rowOf(db, "rute");
    expect(row.articlePublished).toBe(false);
    expect(row.article?.hook).toBe(BODY.hook);
    const shot = db.select().from(media).where(eq(media.id, row.article!.shots[0].mediaId)).get()!;
    expect(shot).toMatchObject({ kind: "screenshot", alt: "The arrivals map" });
  });

  it("writes nothing when the file is broken, wrong or names an unknown project", async () => {
    const db = seededDb();
    const before = mediaCount(db);
    const cases: [string | object, RegExp][] = [
      ["{ not json", /is not valid JSON/],
      [{ ...fileFor("rute"), hook: "too short" }, /^hook: Write at least 60 characters\./],
      [fileFor("nope"), /No project has the slug "nope"/],
    ];
    for (const [file, problem] of cases) {
      const r = await importArticle(db, await repo(file));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.problems[0]).toMatch(problem);
    }
    expect(rowOf(db, "rute").article).toBeNull();
    expect(mediaCount(db)).toBe(before);
  });

  it("refuses a screenshot narrower than 1440px and keeps nothing it stored", async () => {
    const db = seededDb();
    const before = mediaCount(db);
    const dir = await repo(
      fileFor("rute", [
        { file: "portfolio-article/ok.png", alt: "a", caption: "a" },
        { file: "portfolio-article/small.png", alt: "b", caption: "b" },
      ]),
      [{ name: "ok.png", width: 1600, colour: "#336699" }, { name: "small.png", width: 900, colour: "#663399" }],
    );
    const r = await importArticle(db, dir);
    expect(r).toEqual({ ok: false, problems: ["shots[1].file: portfolio-article/small.png is 900px wide; capture it at least 1440px wide."] });
    expect(mediaCount(db)).toBe(before);
    expect(rowOf(db, "rute").article).toBeNull();
  });

  it("replaces an article but keeps it published, and drops the screenshots it no longer uses", async () => {
    const db = seededDb();
    const first = await importArticle(
      db,
      await repo(fileFor("ledgerly", [{ file: "portfolio-article/a.png", alt: "a", caption: "a" }]), [{ name: "a.png", width: 1500, colour: "#111111" }]),
    );
    expect(first).toMatchObject({ ok: true, replaced: true, published: true });
    const oldShot = rowOf(db, "ledgerly").article!.shots[0].mediaId;
    const second = await importArticle(db, await repo({ ...fileFor("ledgerly"), hook: `${BODY.hook} Again.` }));
    expect(second).toMatchObject({ ok: true, published: true, newShots: 0 });
    expect(rowOf(db, "ledgerly").article!.hook.endsWith("Again.")).toBe(true);
    expect(db.select().from(media).where(eq(media.id, oldShot)).get()).toBeUndefined();
  });

  it("lets --slug override the slug in the file", async () => {
    const db = seededDb();
    const r = await importArticle(db, await repo(fileFor("whatever")), { slug: "pantau" });
    expect(r).toMatchObject({ ok: true, slug: "pantau" });
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test tests/unit/article-import.test.ts`
Expected: FAIL. `@/article/import` cannot be resolved.

- [ ] **Step 3: Write `src/article/import.ts`**

```ts
/**
 * Imports the article a project's agent wrote (docs/article-brief.md) into the project with its slug. It reads the
 * repo only. On any problem it stores nothing, and a screenshot it already stored is dropped again. A re-import
 * replaces the article and keeps its published state.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import type { Db } from "@/db/client";
import { projects } from "@/db/schema";
import { createMedia, processUpload, updateAlt, UploadError } from "@/admin/media";
import { dropUnused } from "@/admin/images";
import { checkArticle, checkArticleFile, type Article } from "@/lib/article";
import { uploadsDir } from "@/lib/env";

export const ARTICLE_FILE = "portfolio-article.json";
export const MIN_SHOT_WIDTH = 1440;

export type ImportResult =
  | { ok: true; slug: string; newShots: number; replaced: boolean; published: boolean }
  | { ok: false; problems: string[] };

export async function importArticle(db: Db, repoDir: string, opts: { slug?: string; today?: string } = {}): Promise<ImportResult> {
  const root = path.resolve(repoDir);
  let raw: string;
  try {
    raw = await fs.readFile(path.join(root, ARTICLE_FILE), "utf8");
  } catch {
    return { ok: false, problems: [`${ARTICLE_FILE} was not found in ${root}.`] };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, problems: [`${ARTICLE_FILE} is not valid JSON: ${(e as Error).message}`] };
  }
  const file = checkArticleFile(json);
  if (!file.ok) return file;
  const slug = opts.slug ?? file.value.slug;
  const row = db.select().from(projects).where(eq(projects.slug, slug)).get();
  if (!row) return { ok: false, problems: [`No project has the slug "${slug}". Add it in the editor first, or pass --slug.`] };

  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const created: number[] = [];
  const shots: Article["shots"] = [];
  const problems: string[] = [];
  for (const [i, s] of file.value.shots.entries()) {
    const at = path.resolve(root, s.file);
    if (!at.startsWith(root + path.sep)) { problems.push(`shots[${i}].file: must stay inside the repo.`); continue; }
    let buf: Buffer;
    try {
      buf = await fs.readFile(at);
    } catch {
      problems.push(`shots[${i}].file: ${s.file} was not found.`);
      continue;
    }
    const width = (await sharp(buf).metadata().catch(() => ({ width: 0 }))).width ?? 0;
    if (width < MIN_SHOT_WIDTH) {
      problems.push(`shots[${i}].file: ${s.file} is ${width}px wide; capture it at least ${MIN_SHOT_WIDTH}px wide.`);
      continue;
    }
    try {
      const upload = await processUpload(buf, "screenshot", uploadsDir());
      const { id, existed } = createMedia(db, upload, { kind: "screenshot", alt: s.alt, provenance: `Imported with the ${slug} article on ${today}.` });
      if (existed) updateAlt(db, id, s.alt);
      else created.push(id);
      shots.push({ mediaId: id, caption: s.caption });
    } catch (e) {
      problems.push(`shots[${i}].file: ${e instanceof UploadError ? e.message : `could not store ${s.file}.`}`);
    }
  }
  if (problems.length > 0) {
    await dropUnused(db, created);
    return { ok: false, problems };
  }

  const { version: _v, slug: _s, shots: _f, ...body } = file.value;
  const article = checkArticle({ ...body, shots });
  if (!article.ok) {
    await dropUnused(db, created);
    return article;
  }
  const before = row.article?.shots.map((s) => s.mediaId) ?? [];
  db.update(projects).set({ article: article.value, updatedAt: new Date() }).where(eq(projects.id, row.id)).run();
  await dropUnused(db, before);
  return { ok: true, slug, newShots: created.length, replaced: row.article !== null, published: row.articlePublished };
}
```

- [ ] **Step 4: Write `src/article/import-cli.ts` and the script**

```ts
import path from "node:path";
import { dbFile, openDb } from "../db/client";
import { importArticle } from "./import";

const args = process.argv.slice(2);
const slugAt = args.indexOf("--slug");
const slug = slugAt === -1 ? undefined : args[slugAt + 1];
const repo = args.find((a, i) => !a.startsWith("--") && (slugAt === -1 || i !== slugAt + 1));
if (!repo) {
  console.error("Usage: pnpm article:import <repo folder> [--slug <slug>]");
  process.exit(2);
}

async function main(dir: string): Promise<void> {
  const db = openDb(dbFile(), { mustExist: true });
  const r = await importArticle(db, path.resolve(dir), { slug });
  if (!r.ok) {
    console.error(`Nothing was imported:\n${r.problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  const shots = `${r.newShots} new screenshot${r.newShots === 1 ? "" : "s"}`;
  console.log(
    `Imported the ${r.slug} article (${shots}). ${r.replaced ? "It replaced the one before." : "It is new."} ` +
      (r.published ? "It is published, so the change is live now." : "It is not published yet: check it in the editor, then turn on Publish."),
  );
}

void main(repo);
```

In `package.json` `scripts`, add after `db:seed`:

```json
    "article:import": "tsx --conditions=react-server src/article/import-cli.ts",
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `pnpm test tests/unit/article-import.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Try the CLI on a scratch database**

```bash
cd /Users/jafarfadli/Koding/portofolio-web
T=$(mktemp -d) && DATA_DIR=$T pnpm -s db:seed
DATA_DIR=$T pnpm article:import /nonexistent; echo "exit $?"
```

Expected: `Nothing was imported:` and `portfolio-article.json was not found in /nonexistent.`, with exit 1. Task 8 creates the Clinky example; the real import is tried there. Do not commit.

---

### Task 7: The editor (article field, publish switch, preview)

**Files:**
- Create: `src/lib/article-leaves.ts`, `src/components/admin/ArticleEditor.tsx`, `src/app/admin/preview/[id]/page.tsx`
- Modify: `src/admin/fields.ts`, `src/admin/images.ts`, `src/admin/resources.ts`, `src/components/admin/FieldInput.tsx`, `src/app/admin/(panel)/[resource]/[id]/page.tsx`, `src/app/admin/admin.css`
- Test: `tests/unit/article-leaves.test.ts`, `tests/unit/fields.test.ts` (append), `tests/e2e/admin-article.spec.ts`

**Interfaces:**
- Consumes: `checkArticle` (Task 1), `getArticleViewById` (Task 3), `ArticlePage` (Task 4).
- Produces:
  - Field kind `"article"`.
  - `textLeaves(root: unknown): Leaf[]` and `setLeaf<T>(root: T, path: (string | number)[], value: string): T`, where `type Leaf = { key: string; path: (string | number)[]; label: string; value: string; long: boolean }`.
  - Project fields:
    - `article`, labelled "Article", in the section "Article";
    - `articlePublished`, labelled "Publish the article".
  - Route `/admin/preview/<projectId>`.

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/article-leaves.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LEDGERLY_ARTICLE } from "@/content/article-example";
import { setLeaf, textLeaves } from "@/lib/article-leaves";

describe("article words", () => {
  const leaves = textLeaves(LEDGERLY_ARTICLE);
  const label = (l: string) => leaves.find((x) => x.label === l);

  it("lists the words with readable labels, and never ids, places or flags", () => {
    expect(label("Opening question")?.value).toBe(LEDGERLY_ARTICLE.hook);
    expect(label("Problem › Point 2")?.value).toBe(LEDGERLY_ARTICLE.problem.points[1]);
    expect(label("Approach › Decision 1 › Gave up")?.value).toBe("a customer portal with order history.");
    expect(label("Architecture › Part 3 (dash) › Tech")?.value).toBe("Next.js");
    expect(label("Architecture › Wire 1 (owner>dash) › Label")?.value).toBe("HTTPS");
    expect(label("Architecture › Scenario 2 › Step 3 › Text")?.value).toMatch(/never sends a reminder twice/);
    expect(label("Results › Number 1 › Source")?.long).toBe(true);
    expect(leaves.some((l) => /\b(Id|Zone|Row|Kind|From|To|At|Sample)\b/.test(l.label))).toBe(false);
  });

  it("sets one word without touching the rest", () => {
    const leaf = label("Problem › Point 2")!;
    const next = setLeaf(LEDGERLY_ARTICLE, leaf.path, "Changed.");
    expect(next.problem.points[1]).toBe("Changed.");
    expect(LEDGERLY_ARTICLE.problem.points[1]).not.toBe("Changed.");
    expect(next.architecture).toEqual(LEDGERLY_ARTICLE.architecture);
  });
});
```

Append to `tests/unit/fields.test.ts`, adding the imports if missing (`parseField`, `toFormValues` from `@/admin/fields`, and `LEDGERLY_ARTICLE`):

```ts
describe("article field", () => {
  const f = { name: "article", label: "Article", kind: "article", empty: "null" } as const;
  it("parses a valid article and shows it back as JSON", () => {
    expect(parseField(f, JSON.stringify(LEDGERLY_ARTICLE))).toEqual({ value: LEDGERLY_ARTICLE });
    expect(toFormValues([f], { article: LEDGERLY_ARTICLE }).article).toBe(JSON.stringify(LEDGERLY_ARTICLE, null, 2));
    expect(parseField(f, "")).toEqual({ value: null });
  });
  it("names what is wrong, by place", () => {
    expect(parseField(f, "{")).toEqual({ error: "This is not valid JSON." });
    const bad = structuredClone(LEDGERLY_ARTICLE);
    bad.results.stats[0].source = "";
    const r = parseField(f, JSON.stringify(bad));
    expect("error" in r && r.error).toBe("results.stats[0].source: Fill this in.");
  });
});
```

Run: `pnpm test tests/unit/article-leaves.test.ts tests/unit/fields.test.ts`
Expected: FAIL, because the module and the kind are missing.

- [ ] **Step 2: Write `src/lib/article-leaves.ts`**

```ts
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
  zones: "Zone", nodes: "Part", name: "Name", tech: "Tech", note: "Note", edges: "Wire", label: "Label",
  flows: "Scenario", steps: "Step", text: "Text", stats: "Number", value: "Value", source: "Source",
  shots: "Screenshot", caption: "Caption",
};
const LONG = new Set(["hook", "say", "points", "body", "note", "text", "source", "caption"]);
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
```

- [ ] **Step 3: Add the field kind**

In `src/admin/fields.ts`:
- Add `| "article"` to `FieldKind`.
- Add `import { checkArticle } from "@/lib/article";`.
- In `parseField`, change `if (f.kind !== "cardArt" && LONG_DASH.test(s))` to `if (f.kind !== "cardArt" && f.kind !== "article" && LONG_DASH.test(s))`. The article schema names the place of a long dash itself.
- Add the case before `default:`:

```ts
    case "article": {
      let v: unknown;
      try {
        v = JSON.parse(s);
      } catch {
        return { error: "This is not valid JSON." };
      }
      const r = checkArticle(v);
      if (r.ok) return { value: r.value };
      const more = r.problems.length > 6 ? ` And ${r.problems.length - 6} more.` : "";
      return { error: r.problems.slice(0, 6).join(" ") + more };
    }
```

- In `toFormValues`, change `else if (f.kind === "cardArt") out[f.name] = JSON.stringify(v, null, 2);` to `else if (f.kind === "cardArt" || f.kind === "article") out[f.name] = JSON.stringify(v, null, 2);`.

`fields.ts` now imports `checkArticle` from `src/lib/article.ts`. That file takes the long-dash rule from `src/lib/long-dash.ts` (Task 1), not from `fields.ts`, so there is no import cycle.

In `src/admin/images.ts`, replace `imageIds`:

```ts
/** The image ids a row's image fields point at, the article's screenshots included. */
export function imageIds(fields: readonly Field[], row: Record<string, unknown> | undefined | null): unknown[] {
  if (!row) return [];
  return fields.flatMap((f) => {
    if (f.kind === "media") return [row[f.name]];
    if (f.kind === "article") {
      const shots = (row[f.name] as { shots?: { mediaId?: unknown }[] } | null)?.shots;
      return Array.isArray(shots) ? shots.map((s) => s?.mediaId) : [];
    }
    return [];
  });
}
```

In `src/admin/resources.ts`, in the projects `fields`, insert before `...FLAG_FIELDS,`:

```ts
      {
        name: "article", label: "Article", kind: "article", empty: "null", rows: 18, section: "Article",
        help: "Written by the project's agent and imported with pnpm article:import. Edit the words in the fields; parts, wires and scenario steps are in the JSON box.",
      },
      { name: "articlePublished", label: "Publish the article", kind: "bool", help: "Shows it at /projects/ followed by the slug, and adds Read the story to the card." },
```

Add `articlePublished: false` to the projects `defaults`.

Run: `pnpm test tests/unit/article-leaves.test.ts tests/unit/fields.test.ts tests/unit/store.test.ts`
Expected: PASS. In `store.test.ts`, "only name real columns" passes, since both columns exist.

- [ ] **Step 4: Write `src/components/admin/ArticleEditor.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { setLeaf, textLeaves } from "@/lib/article-leaves";

type A11y = { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string };

/**
 * The article in the project editor: one field per piece of text, and the whole article as JSON under "Structure".
 * Only the JSON box is submitted; the word fields write into it. While the JSON does not parse, the word fields hide.
 */
export function ArticleEditor({ value, a11y, rows, error }: { value: string; a11y: A11y; rows?: number; error?: string }) {
  const [json, setJson] = useState(value);
  const parsed = useMemo<unknown>(() => {
    if (!json.trim()) return null;
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }, [json]);
  const leaves = parsed && typeof parsed === "object" ? textLeaves(parsed) : [];
  const edit = (path: (string | number)[], text: string) => setJson(JSON.stringify(setLeaf(parsed, path, text), null, 2));
  return (
    <div className="adm-article">
      {parsed === undefined ? <p className="adm-help">The JSON below does not parse, so the word fields are hidden until it is fixed.</p> : null}
      {parsed === null ? <p className="adm-help">No article yet. Import one with pnpm article:import, or paste its JSON below.</p> : null}
      {leaves.length > 0 ? (
        <div className="adm-article-words">
          {leaves.map((l) => {
            const id = `${a11y.id}-${l.key.replace(/[^a-z0-9]+/gi, "-")}`;
            return (
              <div key={l.key} className="adm-field">
                <label htmlFor={id}>{l.label}</label>
                {l.long ? (
                  <textarea id={id} className="adm-input" rows={2} value={l.value} onChange={(e) => edit(l.path, e.target.value)} />
                ) : (
                  <input id={id} className="adm-input" value={l.value} onChange={(e) => edit(l.path, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      <details className="adm-more" open={Boolean(error) || parsed === undefined || parsed === null || undefined}>
        <summary>Structure (JSON)</summary>
        <textarea className="adm-input is-code" rows={rows ?? 18} spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} {...a11y} />
      </details>
    </div>
  );
}
```

In `src/components/admin/FieldInput.tsx`, add `import { ArticleEditor } from "./ArticleEditor";`. Then replace the line `if (f.kind === "textarea" || f.kind === "lines" || f.kind === "cardArt") {` (the start of the `control` chain) with:

```tsx
  if (f.kind === "article") {
    control = <ArticleEditor value={value} a11y={a11y} rows={f.rows} error={error} />;
  } else if (f.kind === "textarea" || f.kind === "lines" || f.kind === "cardArt") {
```

The rest of the chain stays as it is.

Append to `src/app/admin/admin.css`:

```css
/* the project editor's article: its words as fields, two columns when there is room */
.adm-article-words { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 4px 18px; margin-bottom: 12px; }
.adm-article-words .adm-field label { font-size: 13px; }
```

- [ ] **Step 5: The preview route and its link**

Create `src/app/admin/preview/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/auth/admin";
import { ArticlePage } from "@/components/article/ArticlePage";
import { getArticleViewById } from "@/content/article";
import { getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

/** The editor's preview of a project's article, published or not: the public page, rendered by the admin role. */
export default async function ArticlePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = getDb();
  const view = getArticleViewById(db, id);
  const owner = getProfile(db);
  if (!view || !owner) notFound();
  return <ArticlePage view={view} ownerName={`${owner.firstName} ${owner.lastName}`} />;
}
```

In `src/app/admin/(panel)/[resource]/[id]/page.tsx`, inside `<div className="adm-head">` after the Back link:

```tsx
        {res.key === "projects" && row && (row as { article?: unknown }).article ? (
          <Link className="btn btn-ink-line" href={`/admin/preview/${row.id}`} target="_blank">Preview article</Link>
        ) : null}
```

- [ ] **Step 6: Write the admin e2e test**

Create `tests/e2e/admin-article.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { PUBLIC, signIn } from "./admin-helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("an edited article word shows on the public page, and a draft goes live when published", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Ledgerly", exact: true }).click();
  const hook = page.getByLabel("Opening question");
  const original = await hook.inputValue();
  await hook.fill(`${original} Edited in e2e.`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const pub = await page.context().newPage();
  await pub.goto(`${PUBLIC}/projects/ledgerly`);
  await expect(pub.locator(".art-q")).toContainText("Edited in e2e.");

  await hook.fill(original); // leave the shared e2e data as seeded
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  // Kanbo's article is a draft: the preview shows it, the public page does not, until it is published
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Kanbo", exact: true }).click();
  const preview = await page.context().newPage();
  await preview.goto(await page.getByRole("link", { name: "Preview article" }).getAttribute("href") as string);
  await expect(preview.locator(".art-q")).toContainText("see each other think");
  expect((await pub.goto(`${PUBLIC}/projects/kanbo`))!.status()).toBe(404);

  await page.getByLabel("Publish the article").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  expect((await pub.goto(`${PUBLIC}/projects/kanbo`))!.status()).toBe(200);
  await pub.goto(`${PUBLIC}/projects/ledgerly`);
  await expect(pub.locator(".art-next")).toHaveAttribute("href", "/projects/kanbo");

  await page.getByLabel("Publish the article").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
});

test("publishing a project without an article is refused", async ({ page }) => {
  await page.goto("/admin/projects");
  await page.getByRole("link", { name: "Rute", exact: true }).click();
  await page.getByLabel("Publish the article").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Import or write the article before publishing it.")).toBeVisible();
});
```

- [ ] **Step 7: Run everything**

Run: `pnpm typecheck && pnpm lint && pnpm test`, then the e2e in the scratch clone.
Expected: all pass, including `admin-article.spec.ts` and the existing `admin-editors.spec.ts`. The project form is longer now; if an existing admin test scrolls or counts fields, adjust it to the new fields only.

Open `/admin/projects/<ledgerly id>` in the scratch preview and look at the article panel at 1440px: the word fields sit in two columns, and the Structure box is closed. Do not commit.

---

### Task 8: Brief, example and JSON Schema for the project agents

**Files:**
- Create: `docs/article-brief.md`, `docs/article-example.clinky.json`, `scripts/article-schema.ts`, `docs/article-schema.json` (generated)
- Modify: `package.json` (script `article:schema`)
- Test: `tests/unit/article.test.ts` (append)

**Interfaces:**
- Consumes: `articleFileSchema`, `checkArticleFile` (Task 1); `importArticle` (Task 6).
- Produces: the three docs the owner hands to each project's agent.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/article.test.ts`:

```ts
import fs from "node:fs";
import { z } from "zod";
import { articleFileSchema } from "@/lib/article";

describe("the brief's files", () => {
  it("the Clinky example is a valid article file", () => {
    const r = checkArticleFile(JSON.parse(fs.readFileSync("docs/article-example.clinky.json", "utf8")));
    expect(r.ok ? [] : r.problems).toEqual([]);
  });
  it("the committed JSON Schema matches the zod schema", () => {
    const now = JSON.stringify(z.toJSONSchema(articleFileSchema, { io: "input" }), null, 2) + "\n";
    expect(fs.readFileSync("docs/article-schema.json", "utf8")).toBe(now);
  });
});
```

Run: `pnpm test tests/unit/article.test.ts`
Expected: FAIL with ENOENT on `docs/article-example.clinky.json`.

- [ ] **Step 2: Write `scripts/article-schema.ts` and the script**

```ts
// Writes docs/article-schema.json from the zod schema (src/lib/article.ts), for the project agents' brief.
// Run `pnpm article:schema` after changing the schema; a unit test fails while the two differ.
import fs from "node:fs";
import { z } from "zod";
import { articleFileSchema } from "../src/lib/article";

fs.writeFileSync("docs/article-schema.json", JSON.stringify(z.toJSONSchema(articleFileSchema, { io: "input" }), null, 2) + "\n");
console.log("Wrote docs/article-schema.json");
```

In `package.json` `scripts`, add: `"article:schema": "tsx scripts/article-schema.ts",`

Run: `pnpm article:schema`
Expected: `Wrote docs/article-schema.json`. The file has `"type": "object"` and the properties `version`, `slug`, `hook`, `facts`, `problem`, `approach`, `architecture`, `results`, `shots`.

- [ ] **Step 3: Write `docs/article-example.clinky.json`**

This is the content the owner approved in the prototype, in file form. Its numbers are marked as samples, because the Clinky agent will replace them with real ones.

```json
{
  "version": 1,
  "slug": "clinky",
  "hook": "What if every coding agent I run lived in _one room,_ and _called me_ when it got stuck?",
  "facts": { "year": "2026", "role": "Solo, design to deploy", "team": "Just me" },
  "problem": {
    "say": "A session per project meant a dozen terminals, and _no way to see which one was waiting on me._",
    "points": [
      "Every project ran its own Claude session in its own terminal tab, **on one Mac mini at home**.",
      "Away from the desk, a session that stopped to ask a question **sat there for hours**.",
      "Family members wanted to use the same agents, **without touching my terminal**."
    ]
  },
  "approach": {
    "say": "Keep the sessions on the Mac, and make the browser _a window onto them_, not a copy.",
    "calls": [
      { "title": "One server owns every session.", "body": "The browser can close and come back; the agent never notices.", "gaveUp": "running agents on the phone itself." },
      { "title": "One folder per project, enforced.", "body": "An agent can read the machine but write only inside its own project.", "gaveUp": "agents that fix things across projects." },
      { "title": "The tailnet is the login.", "body": "No passwords to manage; a guest gets a shared session with narrower rights.", "gaveUp": "access from outside the tailnet." }
    ]
  },
  "architecture": {
    "say": "The page is only a window. A server at home owns every session, _so nothing stops when you close the tab._",
    "zones": ["Your devices", "Mac mini, at home", "The agents", "Outside"],
    "nodes": [
      { "id": "phone", "zone": 0, "row": 0, "name": "Phone", "tech": "PWA, push on", "note": "Where most answers come from", "kind": "person" },
      { "id": "desk", "zone": 0, "row": 2, "name": "Laptop", "tech": "Any browser", "note": "The 3D room lives here", "kind": "person" },
      { "id": "ts", "zone": 1, "row": 0, "name": "Tailscale serve", "tech": "HTTPS, tailnet only", "note": "The login: who you are on the tailnet" },
      { "id": "srv", "zone": 1, "row": 1, "name": "Session server", "tech": "Node, Fastify", "note": "Owns every session; the page is only a window" },
      { "id": "db", "zone": 1, "row": 2, "name": "Session store", "tech": "SQLite, WAL", "note": "Chats, states, who may see what", "kind": "store" },
      { "id": "mcp", "zone": 2, "row": 0, "name": "House tools", "tech": "MCP servers", "note": "Screen, files, passwords: by role" },
      { "id": "run", "zone": 2, "row": 1, "name": "Agent runner", "tech": "Claude Agent SDK", "note": "One agent per project folder" },
      { "id": "fs", "zone": 2, "row": 2, "name": "Project folders", "tech": "git, one per agent", "note": "An agent writes only in its own", "kind": "store" },
      { "id": "push", "zone": 3, "row": 0, "name": "Web Push", "tech": "Apple, Google", "note": "Wakes the phone when an agent waits", "kind": "ext" },
      { "id": "api", "zone": 3, "row": 1, "name": "Claude API", "tech": "Anthropic", "note": "The model behind every agent", "kind": "ext" }
    ],
    "edges": [
      { "from": "phone", "to": "ts", "label": "HTTPS" },
      { "from": "desk", "to": "ts", "label": "HTTPS" },
      { "from": "ts", "to": "srv", "label": "proxy" },
      { "from": "srv", "to": "db", "label": "read, write" },
      { "from": "srv", "to": "run", "label": "SSE events" },
      { "from": "run", "to": "api", "label": "messages" },
      { "from": "run", "to": "mcp", "label": "tool calls" },
      { "from": "run", "to": "fs", "label": "edits, git" },
      { "from": "srv", "to": "push", "label": "notify" },
      { "from": "push", "to": "phone", "label": "needs you" }
    ],
    "flows": [
      {
        "title": "You send a message",
        "steps": [
          { "at": ["phone", "phone>ts", "ts"], "text": "The message leaves the phone over HTTPS; Tailscale says who sent it." },
          { "at": ["ts>srv", "srv", "srv>db", "db"], "text": "The server checks that this person may use this project, and saves the message." },
          { "at": ["srv>run", "run"], "text": "It hands the message to the project's agent, which keeps working if you close the page." },
          { "at": ["run>api", "api", "run>fs", "fs"], "text": "The agent thinks with the Claude API and edits only its own folder." }
        ]
      },
      {
        "title": "An agent gets stuck",
        "steps": [
          { "at": ["run", "srv>run", "srv"], "text": "The agent asks for permission; the server marks the session as needing you." },
          { "at": ["srv>push", "push", "push>phone", "phone"], "text": "A push wakes the phone, even with the page closed." },
          { "at": ["phone", "phone>ts", "ts>srv", "srv>run", "run"], "text": "One tap answers it, and the agent carries on where it stopped." }
        ]
      }
    ]
  },
  "results": {
    "say": "It replaced the terminal for _everyday work._",
    "stats": [
      { "value": "12", "label": "projects running side by side", "source": "Sample: the agent replaces it with the count of projects in Clinky.", "sample": true },
      { "value": "3", "label": "people in the house use it", "source": "Sample: the agent replaces it with the count of signed-in users.", "sample": true },
      { "value": "0", "label": "terminal tabs left open", "source": "Sample: the owner's own count on a working day.", "sample": true }
    ]
  },
  "shots": [
    { "file": "portfolio-article/session.png", "alt": "A Clinky session open: the agent's chat with its tool calls on the right of the 3D room", "caption": "A session open: the agent's question, and the answer box under it." }
  ]
}
```

Run: `pnpm test tests/unit/article.test.ts`
Expected: PASS. If a string is over its limit, shorten the string, not the limit, and keep its meaning.

- [ ] **Step 4: Write `docs/article-brief.md`**

````markdown
# Brief: write your project's article for the portfolio

You work on one project in clinky. The owner's portfolio shows each featured project as an article at
`/projects/<slug>`. Its selling point is the architecture diagram. You know this project's code best, so you write
the article.

## What to produce

Write these in your own repo, at its root, and nowhere else:

- `portfolio-article.json`, which follows `article-schema.json` (sent with this brief). `article-example.clinky.json` is a complete example.
- `portfolio-article/`: 0 to 2 screenshots (PNG or JPEG, at least 1440px wide) that the JSON names under `shots`.

Do not change anything else in your repo for this, and do not touch the portfolio's repo. The owner imports your
file with `pnpm article:import <your repo folder>`.

## The parts, and what each is for

| Field | What it is | Limits |
|------|------------|--------|
| `hook` | One question that makes a stranger want to read on. Not a summary. | 60 to 140 characters |
| `facts` | `year`, `role` (like "Solo, design to deploy"), `team` (like "Me and two others") | short |
| `problem.say` | The problem in one sentence. | up to 140 |
| `problem.points` | 2 to 4 concrete facts about the problem. Bold the key phrase in each with `**...**`. | up to 160 each |
| `approach.say` | The idea of the solution in one sentence. | up to 140 |
| `approach.calls` | 2 or 3 decisions: `title`, `body` (why), `gaveUp` (what it cost). | 60 / 200 / 120 |
| `architecture` | The diagram, explained below. | |
| `results.say` | The outcome in one sentence. | up to 140 |
| `results.stats` | 2 or 3 numbers. Each has `value` (short: `12`, `4x`, `-38%`, `<1s`), `label`, `source`, `sample`. | |
| `shots` | `file`, `alt` (what the screen shows, for a blind reader), `caption`. | |

### Markup

Text may use `**bold**`, and `_soft_` for a phrase set in the thin wide style. In `hook` and every `say`, mark the
turn of the sentence with `_..._`, as the example does. No links, no HTML, and no long dashes (– or —): use a comma,
colon or full stop.

### The architecture diagram

It is the reason people read the article. Make it true to the code, and specific.

- `zones`: 2 to 4 columns, left to right, for example "Your devices", "Server", "Workers", "Outside".
- `nodes`: 4 to 12 parts. Each has:
  - `id`: lowercase, like `session-server`;
  - `zone`: the column index, from 0;
  - `row`: 0 to 3, top to bottom;
  - `name`;
  - `tech`: the real technology, like "Go, chi" or "Postgres 16";
  - `note`: its job in a few words;
  - `kind`, optional: `person` for a person or their device, `store` for a database or files, `ext` for a service you do not run.

  No two parts share a zone and row. Put parts that talk to each other in neighbouring zones or rows where you can:
  wires are drawn in the gaps between parts.
- `edges`: wires, each `from`, `to` and a 1 to 3 word `label` saying what runs on it ("HTTPS", "SQL", "SSE events",
  "webhook"). One direction per pair of parts: name a two-way link once, like "charge, webhook".
- `flows`: 1 to 3 scenarios a reader can follow, like "A customer pays". Each has 2 to 5 `steps`. A step's `at`
  lists the parts and wires it lights (wires as `"from>to"`), and its `text` says what happens in one sentence.

### Numbers

- **Never invent a number.** Each stat needs a `source`: where it comes from (a log, a query, a count, a measurement), specific enough that the owner can check it.
- If you cannot measure something, either leave it out or set `"sample": true` and say in `source` what would measure it. The site then prints "(sample)" next to it.

### Disguise

The page is public:
- No client names, people's names, internal hostnames, IPs, keys, tokens or real repo names.
- Name a client by its kind ("a government finance team").
- In screenshots, every name, number or record that belongs to a client or a real person must be dummy data before you capture.

## Steps

1. Read your own code: entry points, services, data stores, queues, external APIs. List the parts and what flows between them.
2. Write `portfolio-article.json`, following the example's tone: short, concrete, no superlatives, English.
3. If you have a UI, capture up to 2 screenshots with dummy data, at least 1440px wide, into `portfolio-article/`.
4. Validate the file against `article-schema.json`. The schema checks shapes and lengths. Check by hand that every id in `edges` and in `at` exists, and that no two parts share a zone and row: the importer refuses the file otherwise.
5. Tell the owner the file is ready, and list anything you marked as a sample.
````

- [ ] **Step 5: Try a real import of the example on a scratch database**

```bash
cd /Users/jafarfadli/Koding/portofolio-web
T=$(mktemp -d) && DATA_DIR=$T pnpm -s db:seed
R=$(mktemp -d) && cp docs/article-example.clinky.json $R/portfolio-article.json && mkdir $R/portfolio-article
node -e 'require("sharp")({create:{width:1600,height:1000,channels:3,background:"#203040"}}).png().toFile(process.argv[1])' $R/portfolio-article/session.png
DATA_DIR=$T pnpm article:import $R --slug pantau; echo "exit $?"
```

Expected: `Imported the pantau article (1 new screenshot). It is new. It is not published yet: check it in the editor, then turn on Publish.` and `exit 0`. Delete `$T` and `$R` afterwards. Do not commit.

---

### Task 9: Docs, full verification and the owner's preview

**Files:**
- Modify: `DESIGN.md`, `docs/superpowers/specs/2026-11-18-project-articles-design.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Amend the spec**

In `docs/superpowers/specs/2026-11-18-project-articles-design.md`:

- **Inline markup.** Replace each `*em*` and `*phrases*` with `_em_` and `_phrases_`. Change the hook example to `_one room,_ and _called me_`. Under "Rules", change the inline rule to: "Inline markup: only `_em_` (the thin wide style) and `**bold**`, the site's existing parser (`src/lib/inline.ts`)."
- **Metadata.** Remove "canonical path set" from section 6. Add: "No canonical link: the app sets no `metadataBase`."
- **Storage.** In section 6, add: "Article screenshots count as media uses (`mediaUsage`), so the media list never deletes one an article shows."

- [ ] **Step 2: Rewrite the case-study parts of DESIGN.md**

In `DESIGN.md`, delete these, which describe the superseded `mockup/project.html`:
- the paragraph starting "The case study page (`mockup/project.html`";
- the "Case studies read as an event program" bullet;
- the `### Case study uses (pending migration)` section;
- "Case study tiers";
- the "Case study page." and "Responsive rules under 860px (case study)." paragraphs;
- the z-index note "On the case study: …";
- `### Case study depth`;
- the case-study cord bullet;
- `### Case study header` and the sections under it that belong to the case study, up to the next non-case-study heading.

Use `grep -n -i "case stud" DESIGN.md` to find each. Replace "Case study" with "Read the story" in the Ink button rule and the project card rule.

Then add one section after the home page's section rules:

```markdown
### Project article (`/projects/[slug]`)

The spec is `docs/superpowers/specs/2026-11-18-project-articles-design.md` (owner, 2026-11-18). There are no cards: the article is full-width bands in turn navy and concrete, each clipping its own sides.

- **Top (navy):** "All work", then the hook: one question, `clamp(40px, 6.2vw, 104px)`, 800, with `_em_` at 250 and wdth 125, balanced. Under a dashed stitch the name rolls past: 8 copies with ✦, 900 and wdth 125, every other copy outlined (0.018em stock stroke), 26s a loop, still under reduced motion. The `h1` is the name; the copies are `aria-hidden`. There are no Live site or Code buttons: the owner wanted curiosity first.
- **The room:** the work card's Blender scene, full width, its screens turning every 2.8s (`RoomShow`). A project without a scene shows its main screenshot as a print (8px white border) on its field colour.
- **Sections:** a small label `PROBLEM (01)` (13px, 800, tracked 0.18em, an `h2`) on the left, and on the right the statement (`clamp(32px, 4.2vw, 64px)`, 800, `_em_` at 300 and wdth 125), then its content. The Problem section's left column also carries the facts: Year, Role, Team, Stack chips.
  - Problem: bulleted points with bold key phrases.
  - Approach: 2 or 3 numbered decisions with "Gave up:".
  - Results: the numbers at `clamp(96px, 13vw, 210px)`, 900, wdth 125, "(sample)" after a sample's label.
- **Screens:** up to two screenshots between sections, full width, never taller than 82vh, with a caption.
- **Architecture:**
  - Zones are columns split by dashed stitches.
  - Parts are stock labels (10px radius) with the tech on an ink chip: `person` has a green inset bar, `store` is `metal-light`, `ext` is navy with a stock ring.
  - Wires (2px `metal-mid`, labelled in a pill) run only in the 64px column and 52px row gaps.
  - Scenario tabs and steps sit below. A lit step turns its parts and wires `#5ee08c` (the wires dashed and running) and dims the rest with `brightness(0.5)`; hovering or focusing a part lights its wires.
  - On a phone the zones stack and only lit wires are drawn.
- **Next project (concrete):** one link: the label, the name at 900 with an arrow that slides on hover, and its room.
- **Nav:** the home nav, solid from load, Work current, its links pointing back to the home sections.
```

- [ ] **Step 3: Full verification**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

Then run the e2e in the scratch clone (Global Constraints).
Expected: every spec passes, apart from tests the suite already skips. Note the counts for the owner.

- [ ] **Step 4: The owner's preview**

Restart the 3016 preview from Task 4 Step 9 on a fresh build with `.data-art`, and expose it: `tailscale serve --bg --https=8448 http://127.0.0.1:3016`. Check that `https://jafars-mac-mini.tail9e540f.ts.net:8448/projects/ledgerly` returns 200.

Tell the owner, in Indonesian and briefly:
- what to look at: the Ledgerly article (dummy) and the editor's Article panel;
- that nothing is committed;
- that the next step is handing `docs/article-brief.md`, `docs/article-schema.json` and `docs/article-example.clinky.json` to the Clinky session.

- [ ] **Step 5: Only on the owner's "push": commit, migrate the live database, deploy**

```bash
cd /Users/jafarfadli/Koding/portofolio-web
git add -A && git status --short   # review: only the files in this plan, no .data, no .playwright-mcp
git commit -m "feat: project articles with a followable architecture diagram, written by each project's agent and imported"
git push origin main
BASE_PATH=/portofolio pnpm build                       # the old server keeps running on the old schema meanwhile
sqlite3 .data/portfolio.db ".backup .data/portfolio.before-articles.db"  # backup; not cp: the DB runs in WAL mode, so recent writes sit in portfolio.db-wal and a plain copy is stale
pnpm db:migrate && pm2 restart portofolio-web portofolio-admin  # migrate and restart back to back: the old code reads case_study_md
```

End the commit message with the attribution lines from the session's system reminder.

Expected:
- the live home page still renders;
- no card says "Read the story", since no live project has an article yet;
- `/portofolio/projects/clinky` is a 404 until the Clinky article is imported and published.

Afterwards:
- turn off `tailscale serve --https=8448 off`;
- stop the preview server;
- remove `.playwright-mcp` if it exists.
