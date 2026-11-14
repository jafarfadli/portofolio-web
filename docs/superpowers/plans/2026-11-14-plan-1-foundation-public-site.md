# Plan 1: Foundation + Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved static mockup into a Next.js app that renders the home page and the CV page from a SQLite database seeded with the mockup's sample content, with the same look, motion, and reduced-motion behaviour, plus a mobile menu.

**Architecture:** One Next.js 16 App Router app at the repo root. Drizzle ORM over better-sqlite3 stores all content in `DATA_DIR/portfolio.db`; uploads live in `DATA_DIR/uploads` and are served by a `/media/[...path]` route. Pages are Server Components that read the DB synchronously. All motion runs in one client island (`HomeMotion`) that ports `mockup/main.js` with full cleanup. Styling is `mockup/styles.css` ported verbatim as a global stylesheet so class names match the mockup 1:1.

**Tech Stack:** Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript, Drizzle ORM 0.45 + drizzle-kit 0.31, better-sqlite3 13, GSAP 3.15 (+ScrollTrigger), Lenis 1.3, qrcode 1.5, Vitest 5, Playwright 1.65, tsx 4, pnpm 10, Node 23.

**Spec:** `docs/superpowers/specs/2026-11-14-portfolio-cv-design.md`. Visual authority: `DESIGN.md`. Reference implementation: `mockup/index.html`, `mockup/styles.css`, `mockup/main.js`, `mockup/cv.html`.

**Later plans (not in this plan):**
- Plan 2: admin (role split, tailnet guard, public-role security headers, auth with the `admin_user` / `sessions` / `login_attempts` tables, editors, uploads, revalidation).
- Plan 3: CV builder, Playwright PDF, `/cv.pdf`, and the OpenGraph image (rendered with the same Playwright).
- Plan 4: Mac mini deploy.
- The `/projects/[slug]` case study page is designed (mockup) before Plan 2 and built in Plan 3.

## Global Constraints

- Content language: English. Zero em dashes (`—`) and zero en dashes (`–`) in any user-visible string; use a hyphen, comma, colon, or period.
- DESIGN.md is authoritative for tokens, components, states, motion constants, and mobile rules. Do not invent new colours, fonts, radii, or effects.
- One font: Archivo variable (`wdth` 62–125, `wght` 100–900), self-hosted via `next/font/local`. No Google Fonts `<link>` in the app.
- No Tailwind. Global stylesheet `src/app/site.css` ported from `mockup/styles.css`; CV styles in `src/app/cv/cv.css`.
- All copy must stay real DOM text (no canvas/WebGL text).
- Every animation has a `prefers-reduced-motion: reduce` path that renders the final readable state.
- `DATA_DIR` defaults to `./.data` in development; it is git-ignored. Never commit `.data*`.
- Sample content is labelled: every seeded project metric has `metricIsSample = true` and renders "(sample)".
- Example domains only for sample links: `*.example` (never real companies' domains for fake accounts).
- Accessibility: WCAG 2.2 AA; every interaction reachable by keyboard.
- macOS shell: `sed -i ''` syntax.

## File Structure

```
package.json, next.config.ts, tsconfig.json (from create-next-app)
drizzle.config.ts                     drizzle-kit config
vitest.config.ts                      unit test config (alias @ -> src)
playwright.config.ts                  e2e config (seeds .data-e2e, builds, serves :3100)
drizzle/                              generated SQL migrations (committed)
public/textures/twill.png, webbing.png   woven ground + strap tiles (from mockup)
src/fonts/archivo-latin-variable.woff2   self-hosted Archivo
src/lib/env.ts                        dataDir(), uploadsDir()
src/lib/inline.ts                     parseInline(): **strong** / _em_ segments
src/lib/url.ts                        displayUrl()
src/lib/safe-path.ts                  safeJoin(), MEDIA_TYPES
src/lib/cv-resolve.ts                 resolveCvSection() per-section CV picks/fallback
src/db/schema.ts                      all content tables + CardArt type
src/db/client.ts                      openDb(), getDb()
src/db/seed-data.ts                   sample content from the mockup
src/db/seed.ts                        seed(), resetContent()
src/db/seed-cli.ts                    `pnpm db:seed [--force]`
src/content/home.ts                   getHomeContent(), getProfile(), mediaUrl(), types
src/content/cv.ts                     getCvContent(), groupSkills()
src/app/layout.tsx                    html/body, font, site.css
src/app/site.css                      ported mockup stylesheet + mobile menu styles
src/app/page.tsx                      home route
src/app/media/[...path]/route.ts      uploads server
src/app/cv/page.tsx, cv.css           CV route + styles
src/components/Icon.tsx               Phosphor icon paths
src/components/Inline.tsx             renders parseInline() output
src/components/home/*.tsx             HomePage, Nav, MobileMenu, Hero, About, SectionHead, Work, ProjectCard, Achievements, Activities, Experience, Closing
src/components/home/HomeMotion.tsx    client island mounting home-motion.ts
src/components/home/home-motion.ts    port of mockup/main.js with cleanup
src/components/cv/CvDocument.tsx, PrintButton.tsx
tests/unit/*.test.ts                  vitest
tests/e2e/*.spec.ts                   playwright
```

---

### Task 1: Scaffold the app and tooling

**Files:**
- Create (via create-next-app): `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/*`, `.gitignore`, `eslint.config.mjs`
- Create: `vitest.config.ts`, `playwright.config.ts`, `drizzle.config.ts`, `src/lib/env.ts`, `tests/unit/env.test.ts`
- Modify: `.gitignore`, `package.json` (scripts, pnpm build allowlist), `next.config.ts`

**Interfaces:**
- Produces: `dataDir(): string` (absolute path, `DATA_DIR` or `./.data`), `uploadsDir(): string` (`<dataDir>/uploads`). Scripts `test`, `e2e`, `db:generate`, `db:seed`, `e2e:serve`, `typecheck`.

- [ ] **Step 1: Scaffold Next.js beside the repo, then move it in**

The repo (already a git repository with remote `origin` = github.com/jafarfadli/portofolio-web) holds `mockup/`, `docs/`, `PRODUCT.md`, `DESIGN.md` and a curated `.gitignore`, so scaffold in a sibling folder and copy over without touching `.gitignore`.

```bash
cd /Users/jafarfadli/Koding
pnpm create next-app@latest portfolio-scaffold --ts --app --src-dir --eslint --no-tailwind --import-alias "@/*" --use-pnpm --yes
rsync -a --exclude .git --exclude node_modules --exclude .gitignore portfolio-scaffold/ portofolio-web/
rm -rf portfolio-scaffold
cd portofolio-web
rm -f src/app/page.module.css src/app/globals.css public/*.svg
pnpm install
```

Expected: `package.json` lists `next@16.x`, `react@19.x`.

- [ ] **Step 2: Add dependencies**

```bash
pnpm add drizzle-orm better-sqlite3 gsap lenis qrcode
pnpm add -D drizzle-kit @types/better-sqlite3 @types/qrcode vitest @playwright/test tsx
```

- [ ] **Step 3: Allow native builds (pnpm 10 blocks install scripts by default)**

Add to `package.json` (top level):

```json
"pnpm": {
  "onlyBuiltDependencies": ["better-sqlite3", "esbuild", "sharp", "unrs-resolver"]
}
```

Then:

```bash
pnpm rebuild better-sqlite3
node -e "const D=require('better-sqlite3'); const d=new D(':memory:'); console.log(d.prepare('select 1 as ok').get())"
```

Expected: `{ ok: 1 }`

- [ ] **Step 4: Set scripts in `package.json`**

Replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test",
  "db:generate": "drizzle-kit generate",
  "db:seed": "tsx src/db/seed-cli.ts",
  "e2e:serve": "rm -rf .data-e2e && DATA_DIR=.data-e2e tsx src/db/seed-cli.ts && next build && DATA_DIR=.data-e2e next start -p 3100"
}
```

- [ ] **Step 5: Configure Next, Vitest, Playwright, drizzle-kit**

`next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command: "pnpm e2e:serve",
    url: "http://127.0.0.1:3100",
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
```

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
```

- [ ] **Step 6: Extend `.gitignore` with Next.js build artefacts**

The repo `.gitignore` already covers `node_modules/`, `.next/`, `.data*/`, test output, env files, and local tool state. Append only:

```
# Next.js / TypeScript artefacts
next-env.d.ts
*.tsbuildinfo
/out/
/coverage/
```

- [ ] **Step 7: Write the failing test for `env.ts`**

`tests/unit/env.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { dataDir, uploadsDir } from "@/lib/env";

describe("env", () => {
  const original = process.env.DATA_DIR;
  afterEach(() => {
    if (original === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = original;
  });

  it("defaults DATA_DIR to ./.data", () => {
    delete process.env.DATA_DIR;
    expect(dataDir()).toBe(path.resolve(".data"));
    expect(uploadsDir()).toBe(path.resolve(".data", "uploads"));
  });

  it("uses DATA_DIR when set", () => {
    process.env.DATA_DIR = "/tmp/portfolio-data";
    expect(dataDir()).toBe("/tmp/portfolio-data");
    expect(uploadsDir()).toBe("/tmp/portfolio-data/uploads");
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `pnpm test tests/unit/env.test.ts`
Expected: FAIL, cannot resolve `@/lib/env`.

- [ ] **Step 9: Implement `src/lib/env.ts`**

```ts
import path from "node:path";

/** Absolute data directory: DATA_DIR, or ./.data in development. Read at call time. */
export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR ?? ".data");
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}
```

- [ ] **Step 10: Run tests and install the Playwright browser**

```bash
pnpm test tests/unit/env.test.ts
pnpm exec playwright install chromium
```

Expected: 2 passed.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with drizzle, vitest, playwright"
```

---

### Task 2: Text helpers (inline markup, display URLs)

**Files:**
- Create: `src/lib/inline.ts`, `src/lib/url.ts`, `src/components/Inline.tsx`
- Test: `tests/unit/inline.test.ts`

**Interfaces:**
- Produces: `type InlineSegment = { text: string; strong?: true; em?: true }`; `parseInline(src: string): InlineSegment[]` (supports `**strong**` and `_em_`; unclosed markers stay literal); `displayUrl(url: string): string` (drops scheme and trailing slash); `<Inline text={string} />`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/inline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseInline } from "@/lib/inline";
import { displayUrl } from "@/lib/url";

describe("parseInline", () => {
  it("returns plain text as one segment", () => {
    expect(parseInline("Plain words.")).toEqual([{ text: "Plain words." }]);
  });

  it("splits strong runs", () => {
    expect(parseInline("**Ledgerly** helps shops.")).toEqual([
      { text: "Ledgerly", strong: true },
      { text: " helps shops." },
    ]);
  });

  it("splits em runs and mixes with strong", () => {
    expect(parseInline("Cut **840 ms**, _and more_.")).toEqual([
      { text: "Cut " },
      { text: "840 ms", strong: true },
      { text: ", " },
      { text: "and more", em: true },
      { text: "." },
    ]);
  });

  it("leaves unclosed markers literal", () => {
    expect(parseInline("**half open")).toEqual([{ text: "**half open" }]);
  });
});

describe("displayUrl", () => {
  it("drops the scheme and trailing slash", () => {
    expect(displayUrl("https://github.example/dimasarkana/")).toBe("github.example/dimasarkana");
    expect(displayUrl("http://dimasarkana.example")).toBe("dimasarkana.example");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/inline.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/lib/inline.ts`:

```ts
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
```

`src/lib/url.ts`:

```ts
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
```

`src/components/Inline.tsx`:

```tsx
import { Fragment } from "react";
import { parseInline } from "@/lib/inline";

export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((s, i) =>
        s.strong ? <strong key={i}>{s.text}</strong> : s.em ? <em key={i}>{s.text}</em> : <Fragment key={i}>{s.text}</Fragment>,
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/unit/inline.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inline.ts src/lib/url.ts src/components/Inline.tsx tests/unit/inline.test.ts
git commit -m "feat: inline markup parser and display URL helper"
```

---

### Task 3: Safe path resolution for uploads

**Files:**
- Create: `src/lib/safe-path.ts`
- Test: `tests/unit/safe-path.test.ts`

**Interfaces:**
- Produces: `safeJoin(root: string, segments: string[]): string | null` (absolute path strictly inside `root`, or `null`); `MEDIA_TYPES: Record<string, string>` (`.png .jpg .jpeg .webp .avif` only; SVG deliberately excluded).

- [ ] **Step 1: Write the failing tests**

`tests/unit/safe-path.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MEDIA_TYPES, safeJoin } from "@/lib/safe-path";

describe("safeJoin", () => {
  const root = "/srv/uploads";

  it("joins normal segments inside the root", () => {
    expect(safeJoin(root, ["screens", "ledgerly-abc.png"])).toBe("/srv/uploads/screens/ledgerly-abc.png");
  });

  it.each([
    [[]],
    [[".."]],
    [["..", "etc", "passwd"]],
    [["screens", ".."]],
    [["screens", "."]],
    [["a/b.png"]],
    [["a\\b.png"]],
    [["ok", ""]],
    [["bad\0.png"]],
  ])("rejects %j", (segments) => {
    expect(safeJoin(root, segments as string[])).toBeNull();
  });
});

describe("MEDIA_TYPES", () => {
  it("serves raster images only", () => {
    expect(MEDIA_TYPES[".png"]).toBe("image/png");
    expect(MEDIA_TYPES[".jpg"]).toBe("image/jpeg");
    expect(MEDIA_TYPES[".svg"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/safe-path.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/safe-path.ts`**

```ts
import path from "node:path";

/** Join URL path segments under root. Returns null for anything that could escape or is malformed. */
export function safeJoin(root: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const s of segments) {
    if (s === "" || s === "." || s === ".." || s.includes("/") || s.includes("\\") || s.includes("\0")) return null;
  }
  const base = path.resolve(root);
  const full = path.resolve(base, ...segments);
  return full.startsWith(base + path.sep) ? full : null;
}

export const MEDIA_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/unit/safe-path.test.ts`
Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/safe-path.ts tests/unit/safe-path.test.ts
git commit -m "feat: safe path join for media serving"
```

---

### Task 4: Database schema, client, and first migration

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle/` (generated)
- Test: `tests/unit/db.test.ts`

**Interfaces:**
- Produces: tables `media, profile, projects, achievements, activities, experiences, education, skills, cvProfiles, cvProfileItems`; `type CardArt`; `type Db`; `openDb(file: string): Db` (creates dir, WAL, foreign keys, runs migrations from `./drizzle`); `getDb(): Db` (cached, `<dataDir>/portfolio.db`).
- List tables share columns: `id, sortOrder, showOnSite, showInCv, createdAt, updatedAt`.

- [ ] **Step 1: Write the schema `src/db/schema.ts`**

```ts
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

/** Columns every ordered, toggleable content list shares. Fresh builders per table. */
const listCols = () => ({
  id: integer("id").primaryKey({ autoIncrement: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  showOnSite: integer("show_on_site", { mode: "boolean" }).notNull().default(true),
  showInCv: integer("show_in_cv", { mode: "boolean" }).notNull().default(true),
  ...timestamps(),
});

export const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Relative to DATA_DIR/uploads, content-hashed, e.g. "screens/ledgerly-3fa1c2d4e5.png". */
  path: text("path").notNull(),
  kind: text("kind", { enum: ["screenshot", "photo", "logo"] }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  alt: text("alt").notNull(),
  provenance: text("provenance").notNull(),
  ...timestamps(),
});

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull(),
  stackLine: text("stack_line").notNull(),
  location: text("location").notNull(),
  availabilityNote: text("availability_note").notNull(),
  openToWork: integer("open_to_work", { mode: "boolean" }).notNull().default(true),
  openToWorkLabel: text("open_to_work_label").notNull(),
  email: text("email").notNull(),
  siteUrl: text("site_url").notNull(),
  githubUrl: text("github_url").notNull(),
  linkedinUrl: text("linkedin_url").notNull(),
  statementLine1: text("statement_line1").notNull(),
  statementLine2: text("statement_line2").notNull(),
  /** Inline markup: _em_ renders in the soft on-ground colour. */
  aboutText: text("about_text").notNull(),
  closingLine: text("closing_line").notNull(),
  cvSummary: text("cv_summary").notNull(),
  cvLocationLine: text("cv_location_line").notNull(),
  ...timestamps(),
});

/** Per-project art direction for the Selected work card. All numbers are % of the card field. */
export type CardArt = {
  print: { left: number; top: number; width: number; height: number; rot: number; objectPosition?: string };
  leader: { d: string; dot: { x: number; y: number }; ink?: boolean };
  pin: { x: number; y: number; side: "l" | "r"; big?: boolean; ink?: boolean };
};

export const projects = sqliteTable("projects", {
  ...listCols(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** Inline markup, e.g. "**Ledgerly** helps 1,200 small shops ..." */
  headline: text("headline").notNull(),
  period: text("period").notNull(),
  roleLine: text("role_line").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
  fieldColor: text("field_color").notNull(),
  screenshotId: integer("screenshot_id").references(() => media.id),
  stickerCaption: text("sticker_caption").notNull(),
  cardArt: text("card_art", { mode: "json" }).$type<CardArt>().notNull(),
  layout: text("layout", { enum: ["wide", "half"] }).notNull(),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  metricValue: text("metric_value").notNull(),
  metricLabel: text("metric_label").notNull(),
  metricIsSample: integer("metric_is_sample", { mode: "boolean" }).notNull().default(false),
  liveUrl: text("live_url"),
  codeUrl: text("code_url"),
  caseStudyMd: text("case_study_md").notNull().default(""),
  cvTitle: text("cv_title").notNull(),
  cvLine: text("cv_line").notNull(),
});

export const achievements = sqliteTable("achievements", {
  ...listCols(),
  title: text("title").notNull(),
  rank: text("rank", { enum: ["winner", "finalist", "award"] }).notNull(),
  rankLabel: text("rank_label").notNull(),
  description: text("description").notNull(),
  year: text("year").notNull(),
  /** When set: foil seal on the fan badge and the hero seal sticker. */
  sealText: text("seal_text"),
  sealCaption: text("seal_caption"),
  /** Bold lead of the fan caption, e.g. "Winner, Nusantara Code Cup 2024, software development". */
  caption: text("caption").notNull(),
  /** Sentence after the caption. */
  story: text("story").notNull(),
  /** Inline markup for the CV line. */
  cvLine: text("cv_line").notNull(),
  cvYear: text("cv_year").notNull(),
});

export const activities = sqliteTable("activities", {
  ...listCols(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  /** Shape of the role tag (state by form): speaker | organizer | mentor | volunteer. */
  role: text("role", { enum: ["speaker", "organizer", "mentor", "volunteer"] }).notNull(),
  /** Printed word on the tag, e.g. "Host" uses the organizer shape. */
  roleLabel: text("role_label").notNull(),
  year: text("year").notNull(),
  photoId: integer("photo_id").references(() => media.id),
  url: text("url"),
  cvLine: text("cv_line").notNull(),
});

export const experiences = sqliteTable("experiences", {
  ...listCols(),
  role: text("role").notNull(),
  org: text("org").notNull(),
  location: text("location").notNull().default(""),
  period: text("period").notNull(),
  cvPeriod: text("cv_period").notNull(),
  /** Inline markup with **metrics**. */
  summary: text("summary").notNull(),
  cvBullets: text("cv_bullets", { mode: "json" }).$type<string[]>().notNull(),
});

export const education = sqliteTable("education", {
  ...listCols(),
  degree: text("degree").notNull(),
  institution: text("institution").notNull(),
  period: text("period").notNull(),
  /** Inline markup. */
  note: text("note").notNull(),
  cvNote: text("cv_note").notNull(),
});

export const skills = sqliteTable("skills", {
  ...listCols(),
  groupName: text("group_name").notNull(),
  name: text("name").notNull(),
  /** Chip tilt in degrees on the About sticker sheet. */
  rot: real("rot").notNull().default(0),
});

export const cvProfiles = sqliteTable("cv_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  summaryOverride: text("summary_override"),
  ...timestamps(),
});

export const cvProfileItems = sqliteTable("cv_profile_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => cvProfiles.id, { onDelete: "cascade" }),
  itemType: text("item_type", {
    enum: ["project", "achievement", "activity", "experience", "education", "skill"],
  }).notNull(),
  itemId: integer("item_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm db:generate`
Expected: a new `drizzle/0000_*.sql` creating 10 tables, plus `drizzle/meta/`.

- [ ] **Step 3: Write the failing test**

`tests/unit/db.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { openDb } from "@/db/client";
import { profile, projects } from "@/db/schema";

describe("openDb", () => {
  it("migrates an in-memory database and round-trips json and boolean columns", () => {
    const db = openDb(":memory:");
    db.insert(profile)
      .values({
        id: 1, firstName: "A", lastName: "B", role: "r", stackLine: "s", location: "l",
        availabilityNote: "a", openToWorkLabel: "o", email: "e@x.example", siteUrl: "https://x.example",
        githubUrl: "https://g.example", linkedinUrl: "https://l.example", statementLine1: "1",
        statementLine2: "2", aboutText: "a", closingLine: "c", cvSummary: "s", cvLocationLine: "l",
      })
      .run();
    db.insert(projects)
      .values({
        slug: "p", name: "P", headline: "**P** does x", period: "2025", roleLine: "solo", tags: ["Go"],
        fieldColor: "#000000", stickerCaption: "c", layout: "wide", metricValue: "1", metricLabel: "x",
        cvTitle: "t", cvLine: "l",
        cardArt: { print: { left: 1, top: 2, width: 3, height: 4, rot: 0 }, leader: { d: "M 0 0", dot: { x: 0, y: 0 } }, pin: { x: 1, y: 1, side: "l" } },
      })
      .run();

    const row = db.select().from(projects).get()!;
    expect(row.tags).toEqual(["Go"]);
    expect(row.cardArt.pin.side).toBe("l");
    expect(row.showOnSite).toBe(true);
    expect(row.featured).toBe(false);
    expect(db.select().from(profile).get()!.openToWork).toBe(true);
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `pnpm test tests/unit/db.test.ts`
Expected: FAIL, cannot resolve `@/db/client`.

- [ ] **Step 5: Implement `src/db/client.ts`**

```ts
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/env";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/** Open (creating if needed) a SQLite file or ":memory:", then apply migrations from ./drizzle. */
export function openDb(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

let cached: Db | undefined;

export function getDb(): Db {
  cached ??= openDb(path.join(dataDir(), "portfolio.db"));
  return cached;
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm test tests/unit/db.test.ts`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts src/db/client.ts drizzle tests/unit/db.test.ts
git commit -m "feat: content schema, sqlite client, first migration"
```

---

### Task 5: CV section resolver

**Files:**
- Create: `src/lib/cv-resolve.ts`
- Test: `tests/unit/cv-resolve.test.ts`

**Interfaces:**
- Produces: `type CvItemType = "project" | "achievement" | "activity" | "experience" | "education" | "skill"`; `type CvPick = { itemType: CvItemType; itemId: number; sortOrder: number }`; `type CvOrderable = { id: number; sortOrder: number; showInCv: boolean }`; `resolveCvSection<T extends CvOrderable>(all: T[], type: CvItemType, picks: CvPick[]): T[]`.
- Rule (spec section 4): no picks of `type` → every `showInCv` item sorted by `sortOrder`; otherwise picked items in pick order (even if `showInCv` is false), unknown ids dropped.

- [ ] **Step 1: Write the failing tests**

`tests/unit/cv-resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveCvSection, type CvPick } from "@/lib/cv-resolve";

const rows = [
  { id: 1, sortOrder: 2, showInCv: true, name: "b" },
  { id: 2, sortOrder: 1, showInCv: true, name: "a" },
  { id: 3, sortOrder: 3, showInCv: false, name: "hidden" },
];

describe("resolveCvSection", () => {
  it("falls back to showInCv items in sortOrder when there are no picks", () => {
    expect(resolveCvSection(rows, "skill", []).map((r) => r.name)).toEqual(["a", "b"]);
  });

  it("falls back per section when picks exist only for other types", () => {
    const picks: CvPick[] = [{ itemType: "project", itemId: 1, sortOrder: 0 }];
    expect(resolveCvSection(rows, "skill", picks).map((r) => r.name)).toEqual(["a", "b"]);
  });

  it("uses picks in pick order, includes picked hidden items, drops unknown ids", () => {
    const picks: CvPick[] = [
      { itemType: "skill", itemId: 3, sortOrder: 1 },
      { itemType: "skill", itemId: 99, sortOrder: 2 },
      { itemType: "skill", itemId: 1, sortOrder: 0 },
    ];
    expect(resolveCvSection(rows, "skill", picks).map((r) => r.name)).toEqual(["b", "hidden"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/cv-resolve.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/cv-resolve.ts`**

```ts
export type CvItemType = "project" | "achievement" | "activity" | "experience" | "education" | "skill";
export type CvPick = { itemType: CvItemType; itemId: number; sortOrder: number };
export type CvOrderable = { id: number; sortOrder: number; showInCv: boolean };

export function resolveCvSection<T extends CvOrderable>(all: T[], type: CvItemType, picks: CvPick[]): T[] {
  const mine = picks.filter((p) => p.itemType === type);
  if (mine.length === 0) {
    return all.filter((i) => i.showInCv).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const byId = new Map(all.map((i) => [i.id, i]));
  return mine
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => byId.get(p.itemId))
    .filter((i): i is T => i !== undefined);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/unit/cv-resolve.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cv-resolve.ts tests/unit/cv-resolve.test.ts
git commit -m "feat: per-section CV pick resolution"
```

---

### Task 6: Seed data, seeder, and CLI

**Files:**
- Create: `src/db/seed-data.ts`, `src/db/seed.ts`, `src/db/seed-cli.ts`
- Test: `tests/unit/seed.test.ts`

**Interfaces:**
- Consumes: `openDb`, schema tables (Task 4).
- Produces: `seed(db: Db, opts: { assetsDir: string; uploadsDir: string }): void` (copies `mockup/assets` media into uploads with content-hashed names, inserts all content and a default CV profile whose achievement picks are in rank order); `resetContent(db: Db): void` (deletes all content rows); CLI `pnpm db:seed [--force]`.

- [ ] **Step 1: Write the sample content `src/db/seed-data.ts`**

```ts
import type { CardArt } from "./schema";

type SeedMedia = {
  key: string;
  file: string;
  kind: "screenshot" | "photo";
  width: number;
  height: number;
  alt: string;
  provenance: string;
};

const SCREEN = "Synthetic sample screenshot rendered from mockup/assets-src/screens. Replace with a real screenshot.";
const PHOTO = "Unsplash photo (see mockup/assets/photos/SOURCES.txt), Unsplash License. Replace with your own event photo.";

export const seedMedia: SeedMedia[] = [
  { key: "ledgerly", file: "screens/ledgerly.png", kind: "screenshot", width: 1440, height: 900, alt: "Ledgerly overview: outstanding balance, payments per week, top customers", provenance: SCREEN },
  { key: "rute", file: "screens/rute.png", kind: "screenshot", width: 780, height: 1688, alt: "Rute bottom sheet listing live bus arrivals at Harmoni Central", provenance: SCREEN },
  { key: "kanbo", file: "screens/kanbo.png", kind: "screenshot", width: 1440, height: 900, alt: "Kanbo board: a card outlined while a teammate edits it", provenance: SCREEN },
  { key: "pantau", file: "screens/pantau.png", kind: "screenshot", width: 1440, height: 900, alt: "Pantau status page: all systems operational, uptime bars per service", provenance: SCREEN },
  { key: "act-talk", file: "photos/act-talk.jpg", kind: "photo", width: 900, height: 675, alt: "A speaker presenting to a meetup audience", provenance: PHOTO },
  { key: "act-hackathon", file: "photos/act-hackathon.jpg", kind: "photo", width: 900, height: 675, alt: "A large hall of people coding at a hackathon", provenance: PHOTO },
  { key: "act-mentor", file: "photos/act-mentor.jpg", kind: "photo", width: 900, height: 675, alt: "Two students working through code on a laptop", provenance: PHOTO },
  { key: "act-workshop", file: "photos/act-workshop.jpg", kind: "photo", width: 900, height: 675, alt: "A group working on laptops around a shared table", provenance: PHOTO },
  { key: "act-conf", file: "photos/act-conf.jpg", kind: "photo", width: 900, height: 675, alt: "A conference audience in a dark hall", provenance: PHOTO },
  { key: "act-stage", file: "photos/act-stage.jpg", kind: "photo", width: 900, height: 675, alt: "A speaker on stage in front of a large screen", provenance: PHOTO },
];

export const seedProfile = {
  firstName: "Dimas",
  lastName: "Arkana",
  role: "Full-stack Engineer",
  stackLine: "TypeScript, Next.js, Go, PostgreSQL",
  location: "Jakarta",
  availabilityNote: "Jakarta or remote",
  openToWork: true,
  openToWorkLabel: "Open to full-time roles",
  email: "hello@dimasarkana.example",
  siteUrl: "https://dimasarkana.example",
  githubUrl: "https://github.example/dimasarkana",
  linkedinUrl: "https://linkedin.example/in/dimasarkana",
  statementLine1: "Web products, end to end.",
  statementLine2: "From schema to pixel.",
  aboutText:
    "Full-stack engineer in Jakarta. I like owning a feature from the first migration to the last loading state, _and I do my best work on small teams that ship every week._",
  closingLine: "Open to full-time full-stack roles from January 2027, in Jakarta or remote.",
  cvSummary:
    "Full-stack engineer who owns features from database migration to interface. Ships TypeScript and Go products used by small businesses and commuters; strongest in Next.js, PostgreSQL, and API performance work.",
  cvLocationLine: "Jakarta, Indonesia (open to remote)",
};

type SeedProject = {
  slug: string; name: string; headline: string; period: string; roleLine: string; tags: string[];
  fieldColor: string; screenshot: string; stickerCaption: string; cardArt: CardArt; layout: "wide" | "half";
  metricValue: string; metricLabel: string; liveUrl: string | null; codeUrl: string | null; cvTitle: string; cvLine: string;
};

export const seedProjects: SeedProject[] = [
  {
    slug: "ledgerly", name: "Ledgerly",
    headline: "**Ledgerly** helps 1,200 small shops send invoices and get paid four days sooner.",
    period: "2025", roleLine: "solo full-stack", tags: ["Next.js", "Go", "PostgreSQL", "Midtrans"],
    fieldColor: "#0E2A22", screenshot: "ledgerly", stickerCaption: "Ledgerly: invoicing for 1,200 small shops",
    cardArt: {
      print: { left: 7, top: 14, width: 58, height: 80, rot: -2.5 },
      leader: { d: "M 61.5 30 C 68 26, 70 40, 74 44", dot: { x: 61.5, y: 30 } },
      pin: { x: 74, y: 44, side: "l", big: true },
    },
    layout: "wide", metricValue: "9.4 days", metricLabel: "average time to get paid, down from 13.1",
    liveUrl: "https://ledgerly.example", codeUrl: "https://code.example/dimasarkana/ledgerly",
    cvTitle: "invoicing for small shops", cvLine: "Used by 1,200 shops; average time to get paid dropped from 13.1 to 9.4 days.",
  },
  {
    slug: "rute", name: "Rute",
    headline: "**Rute** shows Jakarta commuters when the next bus actually arrives.",
    period: "2024", roleLine: "mobile and API", tags: ["React Native", "Go", "Redis"],
    fieldColor: "#FF6A2B", screenshot: "rute", stickerCaption: "Rute: live bus arrivals",
    cardArt: {
      print: { left: 12, top: 12, width: 30, height: 132, rot: -3 },
      leader: { d: "M 40 71 C 48 70, 50 52, 54 46", dot: { x: 40, y: 71 } },
      pin: { x: 54, y: 46, side: "l" },
    },
    layout: "half", metricValue: "Every 15 s", metricLabel: "live arrival refresh from GPS feeds",
    liveUrl: null, codeUrl: "https://code.example/dimasarkana/rute",
    cvTitle: "live bus arrivals for Jakarta commuters", cvLine: "Arrival times refresh every 15 seconds from GPS feeds.",
  },
  {
    slug: "kanbo", name: "Kanbo",
    headline: "**Kanbo** lets teams of 3 to 30 plan on one board and see each other edit live.",
    period: "2024", roleLine: "team of 3", tags: ["Next.js", "WebSockets", "PostgreSQL"],
    fieldColor: "#E9E2D6", screenshot: "kanbo", stickerCaption: "Kanbo: realtime team boards",
    cardArt: {
      print: { left: 6, top: 16, width: 76, height: 70, rot: 2 },
      leader: { d: "M 37 36 C 44 24, 47 16, 52 12", dot: { x: 37, y: 36 }, ink: true },
      pin: { x: 52, y: 12, side: "l", ink: true },
    },
    layout: "half", metricValue: "<120 ms", metricLabel: "presence updates between teammates",
    liveUrl: "https://kanbo.example", codeUrl: null,
    cvTitle: "realtime team boards", cvLine: "Presence updates under 120 ms for teams of 3 to 30.",
  },
  {
    slug: "pantau", name: "Pantau",
    headline: "**Pantau** is an open-source uptime monitor and status page that runs on a single binary.",
    period: "2023 to present", roleLine: "maintainer", tags: ["Go", "SQLite", "HTMX"],
    fieldColor: "#16161D", screenshot: "pantau", stickerCaption: "Pantau: open-source uptime monitor",
    cardArt: {
      print: { left: 30, top: 16, width: 60, height: 84, rot: 1.5, objectPosition: "center top" },
      leader: { d: "M 36 52 C 28 52, 26 40, 22 36", dot: { x: 36, y: 52 } },
      pin: { x: 22, y: 36, side: "r", big: true },
    },
    layout: "wide", metricValue: "640 stars", metricLabel: "on GitHub, 31 contributors",
    liveUrl: null, codeUrl: "https://code.example/dimasarkana/pantau",
    cvTitle: "open-source uptime monitor and status page", cvLine: "Single-binary deploy; 640 GitHub stars and 31 contributors.",
  },
];

type SeedAchievement = {
  title: string; rank: "winner" | "finalist" | "award"; rankLabel: string; description: string; year: string;
  sealText: string | null; sealCaption: string | null; caption: string; story: string; cvLine: string; cvYear: string;
};

/** Site order (fan): chronological with the winner in the middle. */
export const seedAchievements: SeedAchievement[] = [
  { title: "Hackathon Jakarta Pintar", rank: "finalist", rankLabel: "Finalist", description: "Hackathon, team of 4. Top 10 of 214 teams.", year: "2023", sealText: null, sealCaption: null, caption: "Finalist, Hackathon Jakarta Pintar 2023", story: "Top 10 of 214 teams with a flood-report app for RT heads.", cvLine: "**Finalist**, Hackathon Jakarta Pintar (top 10 of 214)", cvYear: "2023" },
  { title: "Regional Programming Contest", rank: "award", rankLabel: "Honorable mention", description: "Team of 3. Solved 7 of 12 problems.", year: "2023", sealText: null, sealCaption: null, caption: "Honorable mention, Regional Programming Contest 2023", story: "Solved 7 of 12 problems in five hours, team of three.", cvLine: "Honorable mention, Regional Programming Contest", cvYear: "2023" },
  { title: "Nusantara Code Cup", rank: "winner", rankLabel: "Winner", description: "Software development. First of 96 finalist teams.", year: "2024", sealText: "1st", sealCaption: "Code Cup 2024", caption: "Winner, Nusantara Code Cup 2024, software development", story: "Built an offline-first clinic queue system; first of 96 finalist teams.", cvLine: "**Winner**, Nusantara Code Cup, software development", cvYear: "2024" },
  { title: "AWS Certified Developer", rank: "award", rankLabel: "Certified", description: "Cloud certification, associate level.", year: "2025", sealText: null, sealCaption: null, caption: "AWS Certified Developer, Associate, 2025", story: "Certification covering serverless, IAM, and deployment pipelines.", cvLine: "AWS Certified Developer, Associate", cvYear: "2025" },
  { title: "Dean's List", rank: "award", rankLabel: "Dean's list", description: "Five semesters, Institut Teknologi Nusantara.", year: "2023", sealText: null, sealCaption: null, caption: "Dean's List, 2021 to 2023", story: "Five consecutive semesters, Institut Teknologi Nusantara.", cvLine: "Dean's List, five semesters", cvYear: "2021 to 2023" },
];

/** Default CV order for achievements: by rank, then recency. Titles reference seedAchievements. */
export const defaultCvAchievementOrder = [
  "Nusantara Code Cup",
  "AWS Certified Developer",
  "Hackathon Jakarta Pintar",
  "Regional Programming Contest",
  "Dean's List",
];

type SeedActivity = {
  title: string; subtitle: string; role: "speaker" | "organizer" | "mentor" | "volunteer"; roleLabel: string;
  year: string; photo: string; showInCv: boolean; cvLine: string;
};

export const seedActivities: SeedActivity[] = [
  { title: "JakWeb Meetup #42", subtitle: "Talk: self-hosting Next.js on a Mac mini", role: "speaker", roleLabel: "Speaker", year: "2025", photo: "act-talk", showInCv: true, cvLine: "Speaker, JakWeb Meetup #42" },
  { title: "Ruang Kode Hackathon", subtitle: "48 hours, 300 participants, 3 sponsor tracks", role: "organizer", roleLabel: "Organizer", year: "2024", photo: "act-hackathon", showInCv: true, cvLine: "Organizer, Ruang Kode Hackathon (300 participants)" },
  { title: "Campus Code Camp", subtitle: "Mentored 18 first-year students through their first web app", role: "mentor", roleLabel: "Mentor", year: "2024", photo: "act-mentor", showInCv: true, cvLine: "Mentor, Campus Code Camp" },
  { title: "Open Source Saturday", subtitle: "Monthly session helping people land their first pull request", role: "organizer", roleLabel: "Host", year: "2023", photo: "act-workshop", showInCv: true, cvLine: "Host, Open Source Saturday" },
  { title: "DevDays Indonesia", subtitle: "Ran the registration desk and speaker room", role: "volunteer", roleLabel: "Volunteer", year: "2023", photo: "act-conf", showInCv: false, cvLine: "Volunteer, DevDays Indonesia" },
  { title: "HMIF Tech Talk", subtitle: "Hosted a 400-seat evening on careers in software", role: "organizer", roleLabel: "Organizer", year: "2022", photo: "act-stage", showInCv: false, cvLine: "Organizer, HMIF Tech Talk" },
];

export const seedExperiences = [
  { role: "Software Engineer", org: "Arunika Labs", location: "Jakarta", period: "Feb 2025 to now", cvPeriod: "Feb 2025 to present", summary: "Built the billing service in Go and the customer dashboard in Next.js. Cut p95 API latency from **840 ms to 210 ms**.", cvBullets: ["Built the billing service in Go and the customer dashboard in Next.js for 3,000 business accounts.", "Cut p95 API latency from 840 ms to 210 ms by reshaping queries and adding a Redis read-through cache."] },
  { role: "Software Engineer Intern", org: "Lumbung Data", location: "remote", period: "Jun to Dec 2024", cvPeriod: "Jun 2024 to Dec 2024", summary: "Shipped a CSV import pipeline with column mapping, now used by **40 enterprise clients**.", cvBullets: ["Shipped a CSV import pipeline with column mapping and validation, now used by 40 enterprise clients."] },
  { role: "Teaching Assistant, Web Programming", org: "Institut Teknologi Nusantara", location: "", period: "Jul 2023 to May 2024", cvPeriod: "Jul 2023 to May 2024", summary: "Ran weekly labs for **120 students** and rewrote the grading scripts.", cvBullets: ["Ran weekly labs for 120 students and rewrote the automated grading scripts."] },
];

export const seedEducation = [
  { degree: "B.Sc. Computer Science", institution: "Institut Teknologi Nusantara", period: "2020 to 2024", note: "GPA **3.71 / 4.00**. Thesis on offline-first sync for field data apps.", cvNote: "Institut Teknologi Nusantara, GPA 3.71 / 4.00" },
];

/** sortOrder = array index + 1. Site chips show in this order; CV groups by first appearance. */
export const seedSkills: { groupName: string; name: string; rot: number; showOnSite: boolean }[] = [
  { groupName: "Languages", name: "TypeScript", rot: -3, showOnSite: true },
  { groupName: "Web", name: "Next.js", rot: 2, showOnSite: true },
  { groupName: "Web", name: "React", rot: -1, showOnSite: true },
  { groupName: "Languages", name: "Go", rot: 4, showOnSite: true },
  { groupName: "Data and infra", name: "PostgreSQL", rot: -2, showOnSite: true },
  { groupName: "Data and infra", name: "Redis", rot: 3, showOnSite: true },
  { groupName: "Data and infra", name: "Docker", rot: -4, showOnSite: true },
  { groupName: "Web", name: "Tailwind CSS", rot: 2, showOnSite: true },
  { groupName: "Data and infra", name: "Playwright", rot: -2, showOnSite: true },
  { groupName: "Web", name: "React Native", rot: 3, showOnSite: true },
  { groupName: "Languages", name: "SQL", rot: 0, showOnSite: false },
  { groupName: "Languages", name: "Python", rot: 0, showOnSite: false },
];
```

- [ ] **Step 2: Write the failing test**

`tests/unit/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "@/db/client";
import { achievements, activities, cvProfileItems, cvProfiles, media, profile, projects, skills } from "@/db/schema";
import { resetContent, seed } from "@/db/seed";

describe("seed", () => {
  it("seeds the mockup content and copies media with content-hashed names", () => {
    const db = openDb(":memory:");
    const uploads = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-"));
    seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: uploads });

    expect(db.select().from(profile).get()!.firstName).toBe("Dimas");
    expect(db.select().from(projects).all()).toHaveLength(4);
    expect(db.select().from(achievements).all()).toHaveLength(5);
    expect(db.select().from(activities).all()).toHaveLength(6);
    expect(db.select().from(skills).all()).toHaveLength(12);

    const files = db.select().from(media).all();
    expect(files).toHaveLength(10);
    for (const f of files) {
      expect(f.path).toMatch(/^(screens|photos)\/[a-z-]+-[0-9a-f]{10}\.(png|jpg)$/);
      expect(fs.existsSync(path.join(uploads, f.path))).toBe(true);
    }

    const def = db.select().from(cvProfiles).get()!;
    expect(def.isDefault).toBe(true);
    expect(db.select().from(cvProfileItems).all()).toHaveLength(5);

    resetContent(db);
    expect(db.select().from(projects).all()).toHaveLength(0);
    expect(db.select().from(media).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test tests/unit/seed.test.ts`
Expected: FAIL, cannot resolve `@/db/seed`.

- [ ] **Step 4: Implement `src/db/seed.ts`**

```ts
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./client";
import {
  achievements, activities, cvProfileItems, cvProfiles, education, experiences, media, profile, projects, skills,
} from "./schema";
import {
  defaultCvAchievementOrder, seedAchievements, seedActivities, seedEducation, seedExperiences, seedMedia,
  seedProfile, seedProjects, seedSkills,
} from "./seed-data";

export function resetContent(db: Db): void {
  db.transaction((tx) => {
    tx.delete(cvProfileItems).run();
    tx.delete(cvProfiles).run();
    tx.delete(projects).run();
    tx.delete(achievements).run();
    tx.delete(activities).run();
    tx.delete(experiences).run();
    tx.delete(education).run();
    tx.delete(skills).run();
    tx.delete(profile).run();
    tx.delete(media).run();
  });
}

function copyHashed(assetsDir: string, uploadsDir: string, file: string): string {
  const buf = fs.readFileSync(path.join(assetsDir, file));
  const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 10);
  const ext = path.extname(file);
  const rel = `${path.dirname(file)}/${path.basename(file, ext)}-${hash}${ext}`;
  fs.mkdirSync(path.join(uploadsDir, path.dirname(file)), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, rel), buf);
  return rel;
}

export function seed(db: Db, opts: { assetsDir: string; uploadsDir: string }): void {
  const mediaIds = new Map<string, number>();
  for (const m of seedMedia) {
    const rel = copyHashed(opts.assetsDir, opts.uploadsDir, m.file);
    const row = db
      .insert(media)
      .values({ path: rel, kind: m.kind, width: m.width, height: m.height, alt: m.alt, provenance: m.provenance })
      .returning({ id: media.id })
      .get();
    mediaIds.set(m.key, row.id);
  }
  const mediaId = (key: string) => {
    const id = mediaIds.get(key);
    if (id === undefined) throw new Error(`Unknown seed media key: ${key}`);
    return id;
  };

  db.transaction((tx) => {
    tx.insert(profile).values({ id: 1, ...seedProfile }).run();

    seedProjects.forEach((p, i) => {
      const { screenshot, ...rest } = p;
      tx.insert(projects)
        .values({ ...rest, sortOrder: i + 1, featured: true, metricIsSample: true, screenshotId: mediaId(screenshot) })
        .run();
    });

    const achievementIds = new Map<string, number>();
    seedAchievements.forEach((a, i) => {
      const row = tx.insert(achievements).values({ ...a, sortOrder: i + 1 }).returning({ id: achievements.id }).get();
      achievementIds.set(a.title, row.id);
    });

    seedActivities.forEach((a, i) => {
      const { photo, ...rest } = a;
      tx.insert(activities).values({ ...rest, sortOrder: i + 1, photoId: mediaId(photo) }).run();
    });

    seedExperiences.forEach((e, i) => tx.insert(experiences).values({ ...e, sortOrder: i + 1 }).run());
    seedEducation.forEach((e, i) => tx.insert(education).values({ ...e, sortOrder: i + 1 }).run());
    seedSkills.forEach((s, i) => tx.insert(skills).values({ ...s, sortOrder: i + 1 }).run());

    const def = tx
      .insert(cvProfiles)
      .values({ slug: "default", name: "Default", isDefault: true })
      .returning({ id: cvProfiles.id })
      .get();
    defaultCvAchievementOrder.forEach((title, i) => {
      const itemId = achievementIds.get(title);
      if (itemId === undefined) throw new Error(`Unknown achievement in CV order: ${title}`);
      tx.insert(cvProfileItems).values({ profileId: def.id, itemType: "achievement", itemId, sortOrder: i }).run();
    });
  });
}
```

- [ ] **Step 5: Implement `src/db/seed-cli.ts`**

```ts
import path from "node:path";
import { dataDir, uploadsDir } from "../lib/env";
import { openDb } from "./client";
import { profile } from "./schema";
import { resetContent, seed } from "./seed";

const force = process.argv.includes("--force");
const db = openDb(path.join(dataDir(), "portfolio.db"));

if (db.select().from(profile).get() && !force) {
  console.error("The database already has content. Re-run with --force to wipe it and reseed.");
  process.exit(1);
}

resetContent(db);
seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: uploadsDir() });
console.log(`Seeded sample content into ${dataDir()}`);
```

- [ ] **Step 6: Run tests and the CLI**

```bash
pnpm test tests/unit/seed.test.ts
pnpm db:seed
pnpm db:seed            # second run must refuse
pnpm db:seed --force
```

Expected: test 1 passed; first CLI run prints "Seeded sample content into …/.data"; second exits 1 with the refusal message; `--force` reseeds.

- [ ] **Step 7: Commit**

```bash
git add src/db/seed-data.ts src/db/seed.ts src/db/seed-cli.ts tests/unit/seed.test.ts
git commit -m "feat: seed sample content from the mockup"
```

---

### Task 7: Content queries for home and CV

**Files:**
- Create: `src/content/home.ts`, `src/content/cv.ts`
- Test: `tests/unit/content.test.ts`

**Interfaces:**
- Consumes: `Db`, schema tables, `resolveCvSection`, `CvPick`.
- Produces from `home.ts`: types `MediaRef {url,width,height,alt}`, `Profile`, `Project`, `Achievement`, `Activity`, `Experience`, `Education`, `Skill`, `HomeProject = Project & { screenshot: MediaRef | null }`, `HomeActivity = Activity & { photo: MediaRef | null }`, `HomeContent`; functions `mediaUrl(relPath: string): string`, `getProfile(db: Db): Profile`, `getHomeContent(db: Db): HomeContent`.
- Produces from `cv.ts`: `SkillGroup {group,names}`, `CvContent {profile, summary, experiences, projects, achievements, activities, education, skillGroups}`, `groupSkills(rows: Skill[]): SkillGroup[]`, `getCvContent(db: Db, slug?: string): CvContent | null` (null only for an unknown slug).

- [ ] **Step 1: Write the failing tests**

`tests/unit/content.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb, type Db } from "@/db/client";
import { seed } from "@/db/seed";
import { getHomeContent, mediaUrl } from "@/content/home";
import { getCvContent } from "@/content/cv";

let db: Db;
beforeAll(() => {
  db = openDb(":memory:");
  seed(db, { assetsDir: path.resolve("mockup/assets"), uploadsDir: fs.mkdtempSync(path.join(os.tmpdir(), "up-")) });
});

describe("mediaUrl", () => {
  it("encodes each segment", () => {
    expect(mediaUrl("photos/a b.jpg")).toBe("/media/photos/a%20b.jpg");
  });
});

describe("getHomeContent", () => {
  it("returns featured projects in order with screenshot refs", () => {
    const c = getHomeContent(db);
    expect(c.profile.firstName).toBe("Dimas");
    expect(c.projects.map((p) => p.slug)).toEqual(["ledgerly", "rute", "kanbo", "pantau"]);
    expect(c.projects[0].screenshot?.url).toMatch(/^\/media\/screens\/ledgerly-[0-9a-f]{10}\.png$/);
    expect(c.projects[1].screenshot?.height).toBe(1688);
  });

  it("keeps site order and site visibility", () => {
    const c = getHomeContent(db);
    expect(c.achievements.map((a) => a.title)[2]).toBe("Nusantara Code Cup");
    expect(c.activities).toHaveLength(6);
    expect(c.activities[0].photo?.url).toMatch(/^\/media\/photos\/act-talk-/);
    expect(c.skills.map((s) => s.name)).not.toContain("Python");
    expect(c.skills).toHaveLength(10);
  });
});

describe("getCvContent", () => {
  it("uses the default profile picks for achievements and falls back elsewhere", () => {
    const cv = getCvContent(db)!;
    expect(cv.achievements.map((a) => a.title)).toEqual([
      "Nusantara Code Cup", "AWS Certified Developer", "Hackathon Jakarta Pintar", "Regional Programming Contest", "Dean's List",
    ]);
    expect(cv.activities.map((a) => a.title)).toEqual([
      "JakWeb Meetup #42", "Ruang Kode Hackathon", "Campus Code Camp", "Open Source Saturday",
    ]);
    expect(cv.skillGroups[0]).toEqual({ group: "Languages", names: ["TypeScript", "Go", "SQL", "Python"] });
    expect(cv.summary).toBe(cv.profile.cvSummary);
  });

  it("returns null for an unknown profile slug", () => {
    expect(getCvContent(db, "nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/content.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/content/home.ts`**

```ts
import type { Db } from "@/db/client";
import { achievements, activities, education, experiences, media, profile, projects, skills } from "@/db/schema";

export type MediaRef = { url: string; width: number; height: number; alt: string };
export type Profile = typeof profile.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Education = typeof education.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type HomeProject = Project & { screenshot: MediaRef | null };
export type HomeActivity = Activity & { photo: MediaRef | null };
export type HomeContent = {
  profile: Profile;
  projects: HomeProject[];
  achievements: Achievement[];
  activities: HomeActivity[];
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
};

export function mediaUrl(relPath: string): string {
  return `/media/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}

const onSite = <T extends { showOnSite: boolean; sortOrder: number }>(rows: T[]): T[] =>
  rows.filter((r) => r.showOnSite).sort((a, b) => a.sortOrder - b.sortOrder);

export function getProfile(db: Db): Profile {
  const p = db.select().from(profile).get();
  if (!p) throw new Error("No profile found. Run `pnpm db:seed` first.");
  return p;
}

export function getHomeContent(db: Db): HomeContent {
  const refs = new Map<number, MediaRef>(
    db.select().from(media).all().map((m) => [m.id, { url: mediaUrl(m.path), width: m.width, height: m.height, alt: m.alt }]),
  );
  const ref = (id: number | null) => (id == null ? null : (refs.get(id) ?? null));
  return {
    profile: getProfile(db),
    projects: onSite(db.select().from(projects).all())
      .filter((p) => p.featured)
      .slice(0, 4)
      .map((p) => ({ ...p, screenshot: ref(p.screenshotId) })),
    achievements: onSite(db.select().from(achievements).all()),
    activities: onSite(db.select().from(activities).all()).map((a) => ({ ...a, photo: ref(a.photoId) })),
    experiences: onSite(db.select().from(experiences).all()),
    education: onSite(db.select().from(education).all()),
    skills: onSite(db.select().from(skills).all()),
  };
}
```

- [ ] **Step 4: Implement `src/content/cv.ts`**

```ts
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  achievements, activities, cvProfileItems, cvProfiles, education, experiences, projects, skills,
} from "@/db/schema";
import { resolveCvSection, type CvPick } from "@/lib/cv-resolve";
import {
  getProfile, type Achievement, type Activity, type Education, type Experience, type Profile, type Project, type Skill,
} from "./home";

export type SkillGroup = { group: string; names: string[] };
export type CvContent = {
  profile: Profile;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  achievements: Achievement[];
  activities: Activity[];
  education: Education[];
  skillGroups: SkillGroup[];
};

export function groupSkills(rows: Skill[]): SkillGroup[] {
  const groups = new Map<string, string[]>();
  for (const s of rows) {
    const list = groups.get(s.groupName) ?? [];
    list.push(s.name);
    groups.set(s.groupName, list);
  }
  return [...groups].map(([group, names]) => ({ group, names }));
}

/** No slug: the default CV profile (or plain fallback if none exists). Unknown slug: null. */
export function getCvContent(db: Db, slug?: string): CvContent | null {
  const cvProfile = slug
    ? db.select().from(cvProfiles).where(eq(cvProfiles.slug, slug)).get()
    : db.select().from(cvProfiles).where(eq(cvProfiles.isDefault, true)).get();
  if (slug && !cvProfile) return null;

  const picks: CvPick[] = cvProfile
    ? db.select().from(cvProfileItems).where(eq(cvProfileItems.profileId, cvProfile.id)).all()
    : [];
  const p = getProfile(db);

  return {
    profile: p,
    summary: cvProfile?.summaryOverride ?? p.cvSummary,
    experiences: resolveCvSection(db.select().from(experiences).all(), "experience", picks),
    projects: resolveCvSection(db.select().from(projects).all(), "project", picks),
    achievements: resolveCvSection(db.select().from(achievements).all(), "achievement", picks),
    activities: resolveCvSection(db.select().from(activities).all(), "activity", picks),
    education: resolveCvSection(db.select().from(education).all(), "education", picks),
    skillGroups: groupSkills(resolveCvSection(db.select().from(skills).all(), "skill", picks)),
  };
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test tests/unit/content.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/content tests/unit/content.test.ts
git commit -m "feat: home and CV content queries"
```

---

### Task 8: Media route

**Files:**
- Create: `src/app/media/[...path]/route.ts`
- Test: `tests/unit/media-route.test.ts`

**Interfaces:**
- Consumes: `safeJoin`, `MEDIA_TYPES`, `uploadsDir`.
- Produces: `GET /media/<segments>` → file bytes with `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`; 404 for traversal, unknown extension, or missing file.

- [ ] **Step 1: Write the failing test**

`tests/unit/media-route.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET } from "@/app/media/[...path]/route";

const call = (segs: string[]) => GET(new Request("http://x/media"), { params: Promise.resolve({ path: segs }) });

beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "data-"));
  fs.mkdirSync(path.join(dir, "uploads", "screens"), { recursive: true });
  fs.writeFileSync(path.join(dir, "uploads", "screens", "a-0123456789.png"), Buffer.from([137, 80, 78, 71]));
  fs.writeFileSync(path.join(dir, "uploads", "notes.txt"), "secret");
  process.env.DATA_DIR = dir;
});

describe("GET /media/[...path]", () => {
  it("serves an upload with immutable caching", async () => {
    const res = await call(["screens", "a-0123456789.png"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it.each([[["..", "..", "etc", "passwd"]], [["notes.txt"]], [["screens", "missing.png"]], [["../uploads/notes.txt"]]])(
    "returns 404 for %j",
    async (segs) => {
      expect((await call(segs as string[])).status).toBe(404);
    },
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/media-route.test.ts`
Expected: FAIL, cannot resolve the route module.

- [ ] **Step 3: Implement `src/app/media/[...path]/route.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/env";
import { MEDIA_TYPES, safeJoin } from "@/lib/safe-path";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const file = safeJoin(uploadsDir(), segments);
  if (!file) return notFound();
  const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
  if (!type) return notFound();
  try {
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/unit/media-route.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add "src/app/media/[...path]/route.ts" tests/unit/media-route.test.ts
git commit -m "feat: media route serving uploads safely"
```

---

### Task 9: Global styles, font, textures, root layout

**Files:**
- Create: `src/app/site.css` (from `mockup/styles.css`), `src/fonts/archivo-latin-variable.woff2`, `public/textures/twill.png`, `public/textures/webbing.png`
- Modify: `src/app/layout.tsx` (replace scaffold), `src/app/page.tsx` (temporary placeholder so the build passes)

**Interfaces:**
- Produces: CSS custom property `--font-archivo` on `<html>`; every class name from `mockup/styles.css`, with hero sticker slots renamed `.s-a .s-b .s-c .s-d` (`.s-award` unchanged) and agenda rows targeted as `.agenda .row`; new classes `.nav-actions`, `.menu-btn`, `.menu-sheet`.

- [ ] **Step 1: Copy textures and fetch the font**

```bash
mkdir -p src/fonts public/textures
cp mockup/assets/textures/twill.png mockup/assets/textures/webbing.png public/textures/
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
URL=$(curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" | awk '/\/\* latin \*\//{f=1} f && /src: url/{match($0,/https:[^)]+/); print substr($0,RSTART,RLENGTH); exit}')
curl -s -o src/fonts/archivo-latin-variable.woff2 "$URL"
file src/fonts/archivo-latin-variable.woff2
```

Expected: `Web Open Font Format (Version 2)` and about 90 KB.

- [ ] **Step 2: Port the stylesheet**

```bash
cp mockup/styles.css src/app/site.css
sed -i '' \
  -e 's#url("assets/textures/twill.png")#url("/textures/twill.png")#' \
  -e 's#url("assets/textures/webbing.png")#url("/textures/webbing.png")#g' \
  -e 's/\.s-ledgerly/.s-a/g; s/\.s-rute/.s-b/g; s/\.s-kanbo/.s-c/g; s/\.s-pantau/.s-d/g' \
  -e 's/\.agenda\.is-hovering a:/.agenda.is-hovering .row:/g' \
  -e 's/\.agenda a/.agenda .row/g' \
  -e 's/--font: "Archivo", ui-sans-serif, system-ui, sans-serif;/--font: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;/' \
  -e '/mock-note/d' \
  src/app/site.css
grep -c 'assets/textures\|s-ledgerly\|s-rute\|s-kanbo\|s-pantau\|mock-note\|agenda a\|agenda.is-hovering a' src/app/site.css
grep -c 'var(--font-archivo)' src/app/site.css
```

Expected: first count `0`, second `1`.

- [ ] **Step 3: Append the mobile menu styles to `src/app/site.css`**

```css

/* ---------- Mobile menu (spec section 5) ---------- */
.nav-actions { display: flex; align-items: center; gap: 10px; }
.menu-btn { display: none; min-height: 42px; font-size: 15px; }
.menu-sheet {
  position: fixed; left: 12px; right: 12px; top: 76px; z-index: 55;
  background: var(--stock); color: var(--ink); border-radius: var(--r-card); box-shadow: var(--shadow-hang);
  padding: 8px 20px 20px;
}
.menu-sheet[hidden] { display: none; }
.menu-sheet nav { display: grid; }
.menu-sheet nav a {
  display: flex; align-items: center; min-height: 54px; text-decoration: none; color: var(--ink);
  font-size: 22px; font-weight: 800; font-variation-settings: "wdth" 112; letter-spacing: -0.01em;
  border-bottom: 1px solid rgba(17, 18, 22, 0.14);
}
.menu-sheet .btn { margin-top: 16px; width: 100%; justify-content: center; }
@media (max-width: 860px) {
  .menu-btn { display: inline-flex; }
  .nav-actions > .btn-stock { display: none; }
}
@media (min-width: 861px) { .menu-sheet { display: none !important; } }
```

- [ ] **Step 4: Replace `src/app/layout.tsx`**

```tsx
import type { Viewport } from "next";
import localFont from "next/font/local";
import "./site.css";

const archivo = localFont({
  src: "../fonts/archivo-latin-variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const viewport: Viewport = { themeColor: "#2132d6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Temporary `src/app/page.tsx` so the build passes**

```tsx
export default function Page() {
  return <main id="top" />;
}
```

- [ ] **Step 6: Verify the build**

Run: `pnpm build`
Expected: build succeeds with routes `/` and `/media/[...path]`.

- [ ] **Step 7: Commit**

```bash
git add src/app/site.css src/app/layout.tsx src/app/page.tsx src/fonts public/textures
git commit -m "feat: port mockup stylesheet, self-host Archivo, root layout"
```

---

### Task 10: Home page server components

**Files:**
- Create: `src/components/Icon.tsx`, `src/components/home/HomePage.tsx`, `Nav.tsx`, `MobileMenu.tsx` (stub in this task, finished in Task 12), `Hero.tsx`, `About.tsx`, `SectionHead.tsx`, `Work.tsx`, `ProjectCard.tsx`, `Achievements.tsx`, `Activities.tsx`, `Experience.tsx`, `Closing.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `getDb`, `getHomeContent`, `HomeContent`, `HomeProject`, `HomeActivity`, `Achievement`, `Experience`, `Education`, `Profile`, `Inline`, `displayUrl`.
- Produces: `<HomePage content qrDataUrl />`; DOM hooks used by Task 11: `[data-nav]`, `.nav-links a`, `[data-pendulum]`, `[data-badge]`, `[data-face="front"|"back"]`, `[data-flip]`, `[data-fit]`, `[data-stickers]`, `.sticker`, `.stickers .slot-li`, `[data-lede]`, `.lede .line > span`, `.statement .hero-actions .btn`, `[data-chips] .chip`, `.project`, `.leader path`, `.lead-dot`, `.pin`, `[data-fan][data-active]`, `.fan-item[data-title][data-what]`, `[data-fan-caption]`, `[data-fan-prev]`, `[data-fan-next]`, `[data-agenda] .row[data-photo]`, `[data-preview] img`, `.cord`, `.cord-fill`, `#about`, `#contact`, `.hero`.
- `SECTIONS` constant exported from `Nav.tsx`: `[{href:"#work",label:"Work"},{href:"#achievements",label:"Achievements"},{href:"#activities",label:"Activities"},{href:"#experience",label:"Experience"}]`.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/home.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("home renders every section from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Dimas\s*Arkana/);
  await expect(page.locator("[data-stickers] .slot-li")).toHaveCount(5);
  await expect(page.locator("article.project")).toHaveCount(4);
  await expect(page.locator("article.project").first()).toContainText("Ledgerly");
  await expect(page.locator(".pin").first()).toContainText("(sample)");
  await expect(page.locator(".fan-item")).toHaveCount(5);
  await expect(page.locator("[data-agenda] .row")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Experience and education" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let's talk." })).toBeVisible();
  await expect(page.locator(".qr img")).toHaveAttribute("src", /^data:image\/svg\+xml/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "Person", name: "Dimas Arkana", jobTitle: "Full-stack Engineer" });
});

test("copy has no em or en dashes", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/[\u2013\u2014]/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm e2e tests/e2e/home.spec.ts`
Expected: FAIL (the placeholder page has no heading). The first run also seeds `.data-e2e`, builds, and starts the server, so it takes a minute or two.

- [ ] **Step 3: `src/components/Icon.tsx`**

```tsx
const PATHS = {
  "arrow-ur": "M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z",
  download: "M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z",
  github: "M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z",
  linkedin: "M216,24H40A16,16,0,0,0,24,40V216a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V40A16,16,0,0,0,216,24Zm0,192H40V40H216V216ZM96,112v64a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm88,28v36a8,8,0,0,1-16,0V140a20,20,0,0,0-40,0v36a8,8,0,0,1-16,0V112a8,8,0,0,1,15.79-1.78A36,36,0,0,1,184,140ZM100,84A12,12,0,1,1,88,72,12,12,0,0,1,100,84Z",
  mail: "M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z",
  left: "M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z",
  right: "M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z",
  flip: "M224,48V96a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h28.69L182.06,73.37a79.56,79.56,0,0,0-56.13-23.43h-.45A79.52,79.52,0,0,0,69.59,72.71,8,8,0,0,1,58.41,61.27a96,96,0,0,1,135,.79L208,76.69V48a8,8,0,0,1,16,0ZM186.41,183.29a80,80,0,0,1-112.47-.66L59.31,168H88a8,8,0,0,0,0-16H40a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V179.31l14.63,14.63A95.43,95.43,0,0,0,130,222.06h.53a95.36,95.36,0,0,0,67.07-27.33,8,8,0,0,0-11.18-11.44Z",
} as const;

export type IconName = keyof typeof PATHS;

/** Phosphor (regular) glyphs, inlined. Decorative: pair with visible text or an aria-label. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 256 256" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
```

- [ ] **Step 4: `src/components/home/SectionHead.tsx`**

```tsx
import type { CSSProperties } from "react";

export function SectionHead({ id, title, lead, style }: { id: string; title: string; lead?: string; style?: CSSProperties }) {
  return (
    <div className="section-head" style={style}>
      <span className="clip-mark" aria-hidden="true" />
      <h2 id={id}>{title}</h2>
      {lead ? <p>{lead}</p> : null}
    </div>
  );
}
```

- [ ] **Step 5: `src/components/home/Nav.tsx` and a stub `MobileMenu.tsx`**

`Nav.tsx`:

```tsx
import { Icon } from "@/components/Icon";
import { MobileMenu } from "./MobileMenu";

export const SECTIONS = [
  { href: "#work", label: "Work" },
  { href: "#achievements", label: "Achievements" },
  { href: "#activities", label: "Activities" },
  { href: "#experience", label: "Experience" },
] as const;

export function Nav({ name }: { name: string }) {
  return (
    <header className="nav" data-nav>
      <a className="brand" href="#top">{name}</a>
      <nav className="nav-links" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.href} href={s.href}>{s.label}</a>
        ))}
      </nav>
      <div className="nav-actions">
        <a className="btn btn-stock" href="/cv">Download CV <Icon name="download" /></a>
        <MobileMenu sections={SECTIONS} />
      </div>
    </header>
  );
}
```

`MobileMenu.tsx` (stub, replaced in Task 12):

```tsx
export function MobileMenu(_props: { sections: readonly { href: string; label: string }[] }) {
  return null;
}
```

- [ ] **Step 6: `src/components/home/Hero.tsx`**

```tsx
import { Icon } from "@/components/Icon";
import type { HomeContent } from "@/content/home";
import { displayUrl } from "@/lib/url";

const SLOTS = ["s-a", "s-b", "s-c", "s-d"] as const;

export function Hero({ content, qrDataUrl }: { content: HomeContent; qrDataUrl: string }) {
  const { profile: p, projects, achievements } = content;
  const seal = achievements.find((a) => a.sealText);
  const fullName = `${p.firstName} ${p.lastName}`;
  const strap = Array.from({ length: 4 }, () => fullName.toUpperCase()).join("\u00a0\u00a0 ");

  return (
    <section className="hero" aria-label="Introduction">
      <div className="hero-stage">
        <div className="pendulum" data-pendulum>
          <div className="strap" aria-hidden="true"><span>{strap}</span></div>
          <div className="clasp" aria-hidden="true" />
          <div className="badge" data-badge>
            <div className="badge-inner">
              <div className="face front on-stock" data-face="front">
                <span className="slot" aria-hidden="true" />
                <div className="badge-rule" aria-hidden="true" />
                <h1 className="badge-name">
                  <span className="first" data-fit>{p.firstName}</span>
                  <span className="last">{p.lastName}</span>
                </h1>
                <p className="badge-role">{p.role}</p>
                <p className="badge-stack">{p.stackLine}</p>
                <div className="badge-foot">
                  <div className="flip-row">
                    <span>CV and contact on the back</span>
                    <button className="flip-btn" type="button" data-flip aria-label="Flip badge to see CV and contact">
                      <Icon name="flip" />Flip
                    </button>
                  </div>
                  <p className="avail">
                    <span className={p.openToWork ? "live" : undefined}>{p.openToWorkLabel}</span>
                    <span>{p.availabilityNote}</span>
                  </p>
                </div>
              </div>

              <div className="face back on-stock" data-face="back" inert>
                <span className="slot" aria-hidden="true" />
                <div className="badge-rule" aria-hidden="true" />
                <div className="back-body">
                  <h2>Scan to take my CV with you</h2>
                  <div className="qr">
                    <img src={qrDataUrl} alt="QR code linking to the CV page" width={196} height={196} />
                  </div>
                  <a className="btn btn-ink" href="/cv">Download CV <Icon name="download" /></a>
                  <div className="back-links">
                    <a href={`mailto:${p.email}`}><Icon name="mail" /><span>{p.email}</span></a>
                    <a href={p.githubUrl}><Icon name="github" /><span>{displayUrl(p.githubUrl)}</span></a>
                  </div>
                  <button className="flip-btn" type="button" data-flip aria-label="Flip badge back to the front">
                    <Icon name="flip" />Front
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ul className="stickers" data-stickers aria-label="Projects">
          {projects.map((pr, i) =>
            pr.screenshot ? (
              <li key={pr.id} className={`slot-li ${SLOTS[i]}`}>
                <a className={`sticker${i === 0 ? " is-resting" : ""}`} href={`#p-${pr.slug}`}>
                  <img src={pr.screenshot.url} alt={pr.screenshot.alt} width={pr.screenshot.width} height={pr.screenshot.height} />
                  <span className={`sticker-cap${i === 0 ? " cap-top" : ""}`}>{pr.stickerCaption} <Icon name="arrow-ur" /></span>
                </a>
              </li>
            ) : null,
          )}
          {seal ? (
            <li className="slot-li s-award">
              <a className="sticker" href="#achievements">
                <span className="seal"><span><b>{seal.sealText}</b><small>{seal.sealCaption}</small></span></span>
                <span className="sticker-cap">{seal.caption} <Icon name="arrow-ur" /></span>
              </a>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="statement">
        <p className="lede" data-lede>
          <span className="line"><span>{p.statementLine1}</span></span>
          <span className="line"><span>{p.statementLine2}</span></span>
        </p>
        <div className="hero-actions">
          <a className="btn btn-stock" href="#work">See the work <Icon name="arrow-ur" /></a>
          <a className="btn btn-line" href="/cv">Download CV <Icon name="download" /></a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: `src/components/home/About.tsx`**

```tsx
import type { CSSProperties } from "react";
import { Inline } from "@/components/Inline";
import type { HomeContent } from "@/content/home";

export function About({ content }: { content: HomeContent }) {
  return (
    <section className="section" id="about" aria-labelledby="about-h">
      <h2 id="about-h" className="sr-only">About</h2>
      <p className="about-text"><Inline text={content.profile.aboutText} /></p>
      <ul className="stack-sheet" data-chips aria-label="Stack">
        {content.skills.map((s) => (
          <li key={s.id} className="chip" style={{ "--rot": `${s.rot}deg` } as CSSProperties}>{s.name}</li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 8: `src/components/home/ProjectCard.tsx` and `Work.tsx`**

`ProjectCard.tsx`:

```tsx
import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Inline } from "@/components/Inline";
import type { HomeProject } from "@/content/home";

export function ProjectCard({ project: pr }: { project: HomeProject }) {
  const { print, leader, pin } = pr.cardArt;
  const pinClass = ["pin", pin.big && "is-big", pin.ink && "is-ink", pin.side === "r" && "points-r"].filter(Boolean).join(" ");
  const printStyle = {
    left: `${print.left}%`, top: `${print.top}%`, width: `${print.width}%`, height: `${print.height}%`, "--rot": `${print.rot}deg`,
  } as CSSProperties;

  return (
    <article
      className={`project${pr.layout === "half" ? " is-half" : ""}`}
      id={`p-${pr.slug}`}
      style={{ "--field": pr.fieldColor } as CSSProperties}
    >
      <div className="project-field">
        {pr.screenshot ? (
          <figure className="print" style={printStyle}>
            <img
              src={pr.screenshot.url}
              alt={pr.screenshot.alt}
              width={pr.screenshot.width}
              height={pr.screenshot.height}
              loading="lazy"
              style={print.objectPosition ? { objectPosition: print.objectPosition } : undefined}
            />
          </figure>
        ) : null}
        <svg className="leader" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={leader.d} pathLength={1} style={leader.ink ? { stroke: "var(--ink)" } : undefined} />
        </svg>
        <span className="lead-dot" style={{ left: `${leader.dot.x}%`, top: `${leader.dot.y}%` }} aria-hidden="true" />
        <p className={pinClass} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
          <b>{pr.metricValue}</b>
          <span>{pr.metricLabel}{pr.metricIsSample ? " (sample)" : ""}</span>
        </p>
      </div>
      <div className="project-body">
        <div>
          <h3><Inline text={pr.headline} /></h3>
          <div className="project-meta">
            <span>{pr.period}, {pr.roleLine}</span>
            <span className="tags">{pr.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
          </div>
        </div>
        <div className="project-links">
          {pr.caseStudyMd ? <a className="btn btn-ink" href={`/projects/${pr.slug}`}>Case study <Icon name="arrow-ur" /></a> : null}
          {pr.liveUrl ? <a className="link-plain" href={pr.liveUrl}>Live site</a> : null}
          {pr.codeUrl ? <a className="link-plain" href={pr.codeUrl}>Code</a> : null}
        </div>
      </div>
    </article>
  );
}
```

`Work.tsx`:

```tsx
import type { HomeProject } from "@/content/home";
import { ProjectCard } from "./ProjectCard";
import { SectionHead } from "./SectionHead";

export function Work({ projects }: { projects: HomeProject[] }) {
  return (
    <section className="section" id="work" aria-labelledby="work-h">
      <SectionHead id="work-h" title="Selected work" />
      <div className="work-grid">
        {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>
    </section>
  );
}
```

- [ ] **Step 9: `src/components/home/Achievements.tsx`**

```tsx
import { Icon } from "@/components/Icon";
import type { Achievement } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Achievements({ items }: { items: Achievement[] }) {
  const winner = items.findIndex((a) => a.rank === "winner");
  const active = winner >= 0 ? winner : Math.floor(items.length / 2);

  return (
    <section className="section" id="achievements" aria-labelledby="ach-h">
      <SectionHead id="ach-h" title="Achievements" lead="Competitions, certifications, and academic awards. Drag or use the arrows to browse." />
      <div className="fan-wrap">
        <ol className="fan" data-fan data-active={active} aria-label="Achievements, use the buttons below to browse">
          {items.map((a) => (
            <li key={a.id} className="fan-item" data-title={a.caption} data-what={a.story}>
              <div className="stub" aria-hidden="true" />
              <div className="event">
                <span className="slot" aria-hidden="true" />
                <div className="badge-rule" aria-hidden="true" />
                {a.sealText ? <span className="foil" aria-hidden="true">{a.sealText}</span> : null}
                <h3>{a.title}</h3>
                <p className="what">{a.description}</p>
                <div className={`ribbon is-${a.rank}`}>
                  {a.rank === "winner" ? (
                    <>
                      <span className="tail l" aria-hidden="true" />
                      <span className="tail r" aria-hidden="true" />
                    </>
                  ) : null}
                  {a.rank === "finalist" ? <span className="tail" aria-hidden="true" /> : null}
                  <span className="band">{a.rankLabel}</span>
                </div>
                <p className="year">{a.year}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="fan-controls">
          <button className="round-btn" type="button" data-fan-prev aria-label="Previous achievement"><Icon name="left" /></button>
          <button className="round-btn" type="button" data-fan-next aria-label="Next achievement"><Icon name="right" /></button>
          <p className="fan-caption" data-fan-caption aria-live="polite" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 10: `src/components/home/Activities.tsx`**

```tsx
import type { HomeActivity } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Activities({ items }: { items: HomeActivity[] }) {
  const first = items.find((a) => a.photo)?.photo;
  return (
    <section className="section" id="activities" aria-labelledby="act-h">
      <SectionHead id="act-h" title="Activities" lead="Where I show up outside of work: talks, hackathons, mentoring." />
      <ol className="agenda" data-agenda>
        {items.map((a) => {
          const inner = (
            <>
              <span className="yr">{a.year}</span>
              <span className="title">{a.title}<small>{a.subtitle}</small></span>
              <span className="role" data-role={a.role}>{a.roleLabel}</span>
              {a.photo ? (
                <img className="thumb" src={a.photo.url} alt="" loading="lazy" width={a.photo.width} height={a.photo.height} />
              ) : null}
            </>
          );
          return (
            <li key={a.id}>
              {a.url ? (
                <a className="row" href={a.url} data-photo={a.photo?.url}>{inner}</a>
              ) : (
                <div className="row" tabIndex={0} data-photo={a.photo?.url}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
      {first ? (
        <div className="preview" data-preview aria-hidden="true">
          <img alt="" src={first.url} />
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 11: `src/components/home/Experience.tsx` and `Closing.tsx`**

`Experience.tsx`:

```tsx
import { Inline } from "@/components/Inline";
import type { Education, Experience as ExperienceRow } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Experience({ experiences, education }: { experiences: ExperienceRow[]; education: Education[] }) {
  return (
    <section className="section" id="experience" aria-labelledby="exp-h">
      <SectionHead id="exp-h" title="Experience and education" />
      <div className="itinerary on-stock">
        <h3>Experience</h3>
        <ol>
          {experiences.map((e) => (
            <li key={e.id} className="stop">
              <time>{e.period}</time>
              <div className="who">{e.role}<span>{[e.org, e.location].filter(Boolean).join(", ")}</span></div>
              <p><Inline text={e.summary} /></p>
            </li>
          ))}
        </ol>
        <h3>Education</h3>
        <ol>
          {education.map((e) => (
            <li key={e.id} className="stop">
              <time>{e.period}</time>
              <div className="who">{e.degree}<span>{e.institution}</span></div>
              <p><Inline text={e.note} /></p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

`Closing.tsx`:

```tsx
import { Icon } from "@/components/Icon";
import type { Profile } from "@/content/home";
import { SectionHead } from "./SectionHead";

export function Closing({ profile: p }: { profile: Profile }) {
  return (
    <section className="section closing" id="contact" aria-labelledby="contact-h">
      <SectionHead id="contact-h" title="Let's talk." style={{ marginBottom: 0 }} />
      <p className="sub">{p.closingLine}</p>
      <div className="hero-actions">
        <a className="btn btn-stock" href={`mailto:${p.email}`}>Email me <Icon name="mail" /></a>
        <a className="btn btn-line" href="/cv">Download CV <Icon name="download" /></a>
      </div>
      <div className="socials">
        <a href={p.githubUrl}><Icon name="github" /><span>GitHub</span></a>
        <a href={p.linkedinUrl}><Icon name="linkedin" /><span>LinkedIn</span></a>
        <a href={`mailto:${p.email}`}><Icon name="mail" /><span>{p.email}</span></a>
      </div>
      <footer className="footer">
        <span>{p.firstName} {p.lastName}, {new Date().getFullYear()}</span>
        <span>Built with Next.js, served from a Mac mini</span>
      </footer>
    </section>
  );
}
```

- [ ] **Step 12: `src/components/home/HomePage.tsx`**

```tsx
import type { HomeContent } from "@/content/home";
import { About } from "./About";
import { Achievements } from "./Achievements";
import { Activities } from "./Activities";
import { Closing } from "./Closing";
import { Experience } from "./Experience";
import { Hero } from "./Hero";
import { Nav } from "./Nav";
import { Work } from "./Work";

export function HomePage({ content, qrDataUrl }: { content: HomeContent; qrDataUrl: string }) {
  const { profile: p } = content;
  return (
    <>
      <a className="skip" href="#work">Skip to work</a>
      <div className="weave" aria-hidden="true" />
      <div className="cord" aria-hidden="true"><span className="cord-fill" /></div>
      <Nav name={`${p.firstName} ${p.lastName}`} />
      <main id="top">
        <Hero content={content} qrDataUrl={qrDataUrl} />
        <About content={content} />
        <Work projects={content.projects} />
        <Achievements items={content.achievements} />
        <Activities items={content.activities} />
        <Experience experiences={content.experiences} education={content.education} />
        <Closing profile={p} />
      </main>
    </>
  );
}
```

- [ ] **Step 13: Replace `src/app/page.tsx`**

```tsx
import type { Metadata } from "next";
import QRCode from "qrcode";
import { HomePage } from "@/components/home/HomePage";
import { getHomeContent, getProfile } from "@/content/home";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const p = getProfile(getDb());
  return { title: `${p.firstName} ${p.lastName}, ${p.role}`, description: p.cvSummary };
}

export default async function Page() {
  const content = getHomeContent(getDb());
  const svg = await QRCode.toString(`${content.profile.siteUrl}/cv`, {
    type: "svg",
    margin: 0,
    color: { dark: "#111216", light: "#f2f2ee" },
  });
  const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const p = content.profile;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `${p.firstName} ${p.lastName}`,
    jobTitle: p.role,
    email: `mailto:${p.email}`,
    url: p.siteUrl,
    sameAs: [p.githubUrl, p.linkedinUrl],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <HomePage content={content} qrDataUrl={qrDataUrl} />
    </>
  );
}
```

- [ ] **Step 14: Run the e2e test and the type check**

```bash
pnpm typecheck
pnpm e2e tests/e2e/home.spec.ts
```

Expected: no type errors; 2 passed.

- [ ] **Step 15: Commit**

```bash
git add src/components src/app/page.tsx tests/e2e/home.spec.ts
git commit -m "feat: home page rendered from the database"
```

---

### Task 11: Motion island (port of mockup/main.js)

**Files:**
- Create: `src/components/home/home-motion.ts`, `src/components/home/HomeMotion.tsx`
- Modify: `src/components/home/HomePage.tsx` (render `<HomeMotion />` last)
- Test: `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: DOM hooks listed in Task 10.
- Produces: `initHomeMotion(doc: Document): () => void` (returns a cleanup that removes every listener, ticker, timeout, ScrollTrigger, tween, and Lenis); `<HomeMotion />` client island. Constants (DESIGN.md): pendulum K=36, C=2.4, drag clamp ±38°, release velocity clamp ±260; Lenis `{ lerp: 0.11, wheelMultiplier: 0.95 }`; fan spread `clamp(innerWidth*0.135, 150, 220)`, step y 26, rotation 7.5°, scale −0.075; agenda quickTo 0.55s power3.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/motion.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("flip turns the badge to the CV side and back, moving focus", async ({ page }) => {
  await page.goto("/");
  const badge = page.locator("[data-badge]");
  await page.getByRole("button", { name: "Flip badge to see CV and contact" }).click();
  await expect(badge).toHaveClass(/is-flipped/);
  await expect(page.locator('[data-face="back"]')).not.toHaveAttribute("inert");
  await expect(page.locator('[data-face="front"]')).toHaveAttribute("inert");
  await expect(page.getByRole("button", { name: "Flip badge back to the front" })).toBeFocused();
  await page.getByRole("button", { name: "Flip badge back to the front" }).click();
  await expect(badge).not.toHaveClass(/is-flipped/);
});

test("achievement fan opens on the winner and steps with buttons and arrow keys", async ({ page }) => {
  await page.goto("/");
  await page.locator("#achievements").scrollIntoViewIfNeeded();
  const caption = page.locator("[data-fan-caption]");
  await expect(caption).toContainText("Winner, Nusantara Code Cup 2024");
  await page.getByRole("button", { name: "Next achievement" }).click();
  await expect(caption).toContainText("AWS Certified Developer");
  await page.keyboard.press("ArrowLeft");
  await expect(caption).toContainText("Winner, Nusantara Code Cup 2024");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("renders final states without waiting for scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".lede .line > span").first()).toHaveCSS("transform", "none");
    await page.locator("#work").scrollIntoViewIfNeeded();
    await expect(page.locator(".pin").first()).toHaveCSS("opacity", "1");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm e2e tests/e2e/motion.spec.ts`
Expected: the flip and fan tests FAIL (no behaviour yet). The reduced-motion test may already pass, which is fine.

- [ ] **Step 3: Implement `src/components/home/home-motion.ts`**

```ts
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

type Ticker = (time: number, deltaTime: number) => void;

/**
 * Port of mockup/main.js. Motion grammar is physical: the badge is a damped pendulum, stickers slap down,
 * leader lines draw to the result they explain. Under reduced motion everything renders in its final state.
 * Returns a cleanup that undoes every listener, ticker, timeout, tween, ScrollTrigger, and Lenis.
 */
export function initHomeMotion(doc: Document): () => void {
  gsap.registerPlugin(ScrollTrigger);
  const win = doc.defaultView!;
  const reduce = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = win.matchMedia("(pointer: fine)").matches;
  const wide = () => win.matchMedia("(min-width: 861px)").matches;

  const ac = new AbortController();
  const on = (el: EventTarget, type: string, fn: (e: Event) => void) => el.addEventListener(type, fn, { signal: ac.signal });
  const tickers: Ticker[] = [];
  const addTicker = (fn: Ticker) => { gsap.ticker.add(fn); tickers.push(fn); };
  const timeouts: number[] = [];
  let lenis: Lenis | null = null;

  const ctx = gsap.context(() => {
    /* ---------- Fit the first name to the badge width ---------- */
    const fit = () =>
      doc.querySelectorAll<HTMLElement>("[data-fit]").forEach((el) => {
        el.style.fontSize = "";
        const over = el.scrollWidth / el.clientWidth;
        if (over > 1) el.style.fontSize = `${(parseFloat(win.getComputedStyle(el).fontSize) / over) * 0.98}px`;
      });
    fit();
    on(win, "resize", fit);

    /* ---------- Smooth scroll + in-page anchors ---------- */
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
      lenis.on("scroll", ScrollTrigger.update);
      addTicker((t) => lenis?.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
      on(a, "click", (e) => {
        const id = a.getAttribute("href")!;
        if (id === "#") { e.preventDefault(); return; }
        const target = doc.querySelector<HTMLElement>(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -24, duration: 1.1 });
        else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }),
    );

    /* ---------- Nav: solid after the top, hides on the way down ---------- */
    const nav = doc.querySelector<HTMLElement>("[data-nav]")!;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle("is-solid", y > 40);
        nav.classList.toggle("is-hidden", self.direction === 1 && y > win.innerHeight * 0.8);
      },
    });
    const links = [...doc.querySelectorAll<HTMLAnchorElement>(".nav-links a")];
    links.forEach((l) => {
      const sec = doc.querySelector(l.getAttribute("href")!);
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: (self) => { if (self.isActive) links.forEach((x) => x.setAttribute("aria-current", String(x === l))); },
      });
    });

    /* ---------- The cord: draws with progress ---------- */
    const cord = doc.querySelector<HTMLElement>(".cord");
    if (cord) {
      gsap.to(".cord-fill", {
        scaleY: 1, ease: "none",
        scrollTrigger: {
          trigger: "#about", start: "top bottom", endTrigger: "#contact", end: "bottom bottom", scrub: reduce ? false : 0.4,
          onToggle: (self) => cord.classList.toggle("is-on", self.isActive || self.progress > 0),
        },
      });
    }

    /* ---------- Badge: damped pendulum + flip ---------- */
    const pendulum = doc.querySelector<HTMLElement>("[data-pendulum]")!;
    const badge = doc.querySelector<HTMLElement>("[data-badge]")!;
    const front = badge.querySelector<HTMLElement>('[data-face="front"]')!;
    const back = badge.querySelector<HTMLElement>('[data-face="back"]')!;
    const phys = { a: 0, v: 0, K: 36, C: 2.4, awake: false, dragging: false };
    const render = () => { pendulum.style.transform = `rotate(${phys.a.toFixed(3)}deg)`; };
    if (!reduce) {
      addTicker((_t, dtMs) => {
        if (phys.dragging || !phys.awake) return;
        const dt = Math.min(dtMs, 40) / 1000;
        phys.v += (-phys.K * phys.a - phys.C * phys.v) * dt;
        phys.a += phys.v * dt;
        if (Math.abs(phys.a) < 0.02 && Math.abs(phys.v) < 0.05) { phys.a = 0; phys.v = 0; phys.awake = false; }
        render();
      });
    }
    const kick = (dv: number) => { if (reduce) return; phys.v += dv; phys.awake = true; };
    const flip = (): boolean => {
      const toBack = !badge.classList.contains("is-flipped");
      badge.classList.toggle("is-flipped", toBack);
      front.inert = toBack;
      back.inert = !toBack;
      kick(toBack ? 34 : -34);
      return toBack;
    };
    badge.querySelectorAll<HTMLButtonElement>("[data-flip]").forEach((b) =>
      on(b, "click", (e) => {
        e.stopPropagation();
        const toBack = flip();
        const next = (toBack ? back : front).querySelector<HTMLButtonElement>("[data-flip]")!;
        timeouts.push(win.setTimeout(() => next.focus({ preventScroll: true }), reduce ? 0 : 380));
      }),
    );

    if (!finePointer) badge.style.touchAction = "pan-y";
    type Drag = { x: number; y: number; t: number; p: { x: number; y: number }; a0: number; pa0: number; lastA: number; lastT: number; moved: number };
    let drag: Drag | null = null;
    const pivot = () => { const r = pendulum.getBoundingClientRect(); return { x: r.left, y: r.top }; };
    const angleTo = (e: PointerEvent, p: { x: number; y: number }) => -Math.atan2(e.clientX - p.x, e.clientY - p.y) * (180 / Math.PI);
    on(badge, "pointerdown", (ev) => {
      const e = ev as PointerEvent;
      if ((e.target as Element).closest("a, button")) return;
      const p = pivot();
      const now = performance.now();
      drag = { x: e.clientX, y: e.clientY, t: now, p, a0: phys.a, pa0: angleTo(e, p), lastA: phys.a, lastT: now, moved: 0 };
      badge.setPointerCapture(e.pointerId);
      phys.dragging = true;
      phys.v = 0;
      badge.classList.add("is-dragging");
    });
    on(badge, "pointermove", (ev) => {
      const e = ev as PointerEvent;
      if (!drag) return;
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
      if (reduce) return;
      const a = Math.max(-38, Math.min(38, drag.a0 + (angleTo(e, drag.p) - drag.pa0)));
      const now = performance.now();
      const dt = Math.max(now - drag.lastT, 1) / 1000;
      phys.v = phys.v * 0.6 + ((a - drag.lastA) / dt) * 0.4;
      drag.lastA = a;
      drag.lastT = now;
      phys.a = a;
      render();
    });
    const release = (ev: Event) => {
      if (!drag) return;
      const wasClick = drag.moved < 6 && performance.now() - drag.t < 350;
      badge.classList.remove("is-dragging");
      phys.dragging = false;
      phys.awake = !reduce;
      phys.v = Math.max(-260, Math.min(260, phys.v));
      drag = null;
      if (wasClick && ev.type === "pointerup") flip();
    };
    on(badge, "pointerup", release);
    on(badge, "pointercancel", release);

    if (lenis) {
      let heroVisible = true;
      ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: (s) => { heroVisible = s.isActive; } });
      lenis.on("scroll", (l: Lenis) => {
        if (!heroVisible || phys.dragging) return;
        phys.v += Math.max(-6, Math.min(6, l.velocity * 0.9));
        phys.awake = true;
      });
    }

    /* ---------- Stickers: peel one, the rest step back ---------- */
    const stickerList = doc.querySelector<HTMLElement>("[data-stickers]");
    stickerList?.querySelectorAll<HTMLElement>(".sticker").forEach((s) => {
      const peek = () => { stickerList.classList.add("is-peeking"); s.classList.add("is-peeled"); };
      const unpeek = () => { stickerList.classList.remove("is-peeking"); s.classList.remove("is-peeled"); };
      on(s, "pointerenter", peek);
      on(s, "pointerleave", unpeek);
      on(s, "focus", peek);
      on(s, "blur", unpeek);
    });

    /* ---------- First viewport: the one authored entrance ---------- */
    if (!reduce) {
      gsap
        .timeline({ delay: 0.12, defaults: { ease: "expo.out" } })
        .from(nav, { opacity: 0, duration: 0.6 }, 0)
        .from(
          pendulum,
          {
            y: () => -win.innerHeight * 0.95, duration: 0.78, ease: "power3.in",
            onComplete: () => { gsap.set(pendulum, { clearProps: "y" }); render(); kick(58); },
          },
          0.05,
        )
        .from(".stickers .slot-li", { opacity: 0, scale: 1.22, rotation: 9, duration: 0.5, ease: "back.out(1.5)", stagger: 0.075, clearProps: "transform" }, 0.62)
        .from(".lede .line > span", { yPercent: 108, duration: 0.9, stagger: 0.09 }, 0.78)
        .from(".statement .hero-actions .btn", { opacity: 0, y: 14, duration: 0.6, stagger: 0.07 }, 1.0);

      gsap.from("[data-chips] .chip", {
        opacity: 0, scale: 1.3, rotation: "+=10", duration: 0.45, ease: "back.out(1.6)", stagger: 0.045,
        scrollTrigger: { trigger: "[data-chips]", start: "top 82%", once: true },
      });
    }

    /* ---------- Work: leader lines draw to the result ---------- */
    if (!reduce) {
      doc.querySelectorAll<HTMLElement>(".project").forEach((card) => {
        const path = card.querySelector(".leader path");
        const dot = card.querySelector(".lead-dot");
        const pin = card.querySelector(".pin");
        if (!path || !dot || !pin) return;
        gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(dot, { opacity: 0 });
        gsap.set(pin, { opacity: 0, y: 10, scale: 0.96 });
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 72%", once: true } })
          .fromTo(dot, { scale: 0 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" })
          .to(path, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, 0.05)
          .to(pin, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, 0.62);
      });
    }

    /* ---------- Achievements: the badge collection fans out ---------- */
    const fan = doc.querySelector<HTMLElement>("[data-fan]");
    if (fan) {
      const items = [...fan.querySelectorAll<HTMLElement>(".fan-item")];
      const caption = doc.querySelector<HTMLElement>("[data-fan-caption]")!;
      const prev = doc.querySelector<HTMLButtonElement>("[data-fan-prev]")!;
      const next = doc.querySelector<HTMLButtonElement>("[data-fan-next]")!;
      let active = Math.min(Number(fan.dataset.active ?? 0), items.length - 1);
      let fanned = false;
      const setCaption = () => {
        const cur = items[active];
        if (!cur) return;
        const b = doc.createElement("b");
        b.textContent = `${cur.dataset.title}.`;
        caption.replaceChildren(b, ` ${cur.dataset.what ?? ""}`);
        prev.disabled = active === 0;
        next.disabled = active === items.length - 1;
      };
      const layout = (dur = 0.7) => {
        const spread = Math.min(Math.max(win.innerWidth * 0.135, 150), 220);
        items.forEach((el, i) => {
          const d = i - active;
          const ad = Math.abs(d);
          gsap.to(el, {
            x: d * spread, y: ad * 26, rotation: d * 7.5, scale: 1 - ad * 0.075, opacity: ad > 2 ? 0 : 1, zIndex: 10 - ad,
            duration: reduce ? 0 : dur, ease: "expo.out", overwrite: "auto",
          });
          el.setAttribute("aria-current", d === 0 ? "true" : "false");
        });
        setCaption();
      };
      const go = (i: number) => { active = Math.max(0, Math.min(items.length - 1, i)); if (fanned) layout(); else setCaption(); };
      const enableFan = () => {
        if (fanned || !wide()) return;
        fanned = true;
        fan.classList.add("is-fanned");
        gsap.set(items, { x: 0, y: 60, rotation: 0, scale: 0.9, opacity: 0 });
        ScrollTrigger.create({ trigger: fan, start: "top 78%", once: true, onEnter: () => layout(reduce ? 0 : 0.95) });
        ScrollTrigger.refresh();
      };
      enableFan();
      if (!fanned && items[active]) {
        const w = items[active];
        fan.scrollLeft = w.offsetLeft - fan.offsetLeft - (fan.clientWidth - w.offsetWidth) / 2;
      }
      setCaption();
      on(win, "resize", () => { enableFan(); if (fanned) layout(0); });
      on(prev, "click", () => go(active - 1));
      on(next, "click", () => go(active + 1));
      items.forEach((el, i) => on(el, "click", () => { if (!fan.dataset.dragged) go(i); }));
      on(fan.parentElement!, "keydown", (ev) => {
        const e = ev as KeyboardEvent;
        if (!fanned) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
      });
      let fx: number | null = null;
      on(fan, "pointerdown", (ev) => { if (fanned) { fx = (ev as PointerEvent).clientX; delete fan.dataset.dragged; } });
      on(win, "pointerup", (ev) => {
        if (fx === null) return;
        const dx = (ev as PointerEvent).clientX - fx;
        fx = null;
        if (Math.abs(dx) > 48) {
          fan.dataset.dragged = "1";
          go(active + (dx < 0 ? 1 : -1));
          timeouts.push(win.setTimeout(() => { delete fan.dataset.dragged; }, 0));
        }
      });
    }

    /* ---------- Activities: the agenda, photo trails the cursor ---------- */
    const agenda = doc.querySelector<HTMLElement>("[data-agenda]");
    const preview = doc.querySelector<HTMLElement>("[data-preview]");
    if (agenda && preview) {
      const pimg = preview.querySelector("img")!;
      const rows = [...agenda.querySelectorAll<HTMLElement>(".row")];
      rows.forEach((r) => { if (r.dataset.photo) { const im = new Image(); im.src = r.dataset.photo; } });
      const xTo = gsap.quickTo(preview, "x", { duration: reduce ? 0 : 0.55, ease: "power3" });
      const yTo = gsap.quickTo(preview, "y", { duration: reduce ? 0 : 0.55, ease: "power3" });
      const show = (row: HTMLElement) => {
        rows.forEach((r) => r.classList.toggle("is-active", r === row));
        agenda.classList.add("is-hovering");
        const src = row.dataset.photo;
        if (!src) { gsap.to(preview, { opacity: 0, duration: reduce ? 0 : 0.2, overwrite: "auto" }); return; }
        if (pimg.getAttribute("src") !== src) pimg.src = src;
        gsap.to(preview, { opacity: 1, scale: 1, rotation: gsap.utils.random(-4, 4), duration: reduce ? 0 : 0.4, ease: "expo.out", overwrite: "auto" });
      };
      const hide = () => {
        rows.forEach((r) => r.classList.remove("is-active"));
        agenda.classList.remove("is-hovering");
        gsap.to(preview, { opacity: 0, scale: 0.85, duration: reduce ? 0 : 0.25, ease: "power2.in", overwrite: "auto" });
      };
      rows.forEach((r) => {
        on(r, "pointerenter", () => show(r));
        on(r, "focus", () => {
          const b = r.getBoundingClientRect();
          xTo(Math.min(b.right - preview.offsetWidth - 180, win.innerWidth - preview.offsetWidth - 24));
          yTo(b.top + b.height / 2 - preview.offsetHeight / 2);
          show(r);
        });
        on(r, "blur", hide);
      });
      let px = -1;
      let py = -1;
      on(agenda, "pointermove", (ev) => {
        const e = ev as PointerEvent;
        px = e.clientX;
        py = e.clientY;
        xTo(px + 28);
        yTo(py - preview.offsetHeight / 2);
      });
      on(agenda, "pointerleave", hide);
      const recheck = () => {
        if (px < 0 || !finePointer) return;
        const row = doc.elementFromPoint(px, py)?.closest<HTMLElement>("[data-agenda] .row");
        if (row) { if (!row.classList.contains("is-active")) show(row); }
        else if (agenda.classList.contains("is-hovering")) hide();
      };
      ScrollTrigger.create({ trigger: agenda, start: "top bottom", end: "bottom top", onUpdate: recheck, onLeave: hide, onLeaveBack: hide });
    }
  });

  return () => {
    ac.abort();
    tickers.forEach((fn) => gsap.ticker.remove(fn));
    timeouts.forEach((t) => win.clearTimeout(t));
    lenis?.destroy();
    gsap.ticker.lagSmoothing(500, 33);
    ctx.revert();
  };
}
```

- [ ] **Step 4: Implement `src/components/home/HomeMotion.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { initHomeMotion } from "./home-motion";

/** Attaches all home-page motion to the server-rendered DOM. Renders nothing. */
export function HomeMotion() {
  useEffect(() => initHomeMotion(document), []);
  return null;
}
```

- [ ] **Step 5: Mount it in `src/components/home/HomePage.tsx`**

Add the import and render it as the last child of the fragment, after `</main>`:

```tsx
import { HomeMotion } from "./HomeMotion";
```

```tsx
      </main>
      <HomeMotion />
    </>
```

- [ ] **Step 6: Run tests**

```bash
pnpm typecheck
pnpm e2e tests/e2e/motion.spec.ts tests/e2e/home.spec.ts
```

Expected: 6 passed.

- [ ] **Step 7: Manual check in the browser (motion cannot be fully asserted by tests)**

Run `pnpm dev`, open http://localhost:3000, and confirm against the mockup (`mockup/index.html` served the same way):
- The badge drops, swings, and settles. Dragging swings it.
- Stickers slap in and peek on hover.
- Leader lines draw on scroll.
- The fan deals out.
- Agenda photos trail the cursor.
- The cord fills as you scroll.

With macOS "Reduce motion" on, everything shows in its final state.

- [ ] **Step 8: Commit**

```bash
git add src/components/home/home-motion.ts src/components/home/HomeMotion.tsx src/components/home/HomePage.tsx tests/e2e/motion.spec.ts
git commit -m "feat: port mockup motion to a client island with cleanup"
```

---

### Task 12: Mobile menu

**Files:**
- Modify: `src/components/home/MobileMenu.tsx` (replace stub)
- Test: `tests/e2e/mobile.spec.ts`

**Interfaces:**
- Consumes: `SECTIONS` passed from `Nav`; `.menu-btn`, `.menu-sheet` styles (Task 9).
- Produces: a `Menu`/`Close` toggle button with `aria-expanded` and `aria-controls`. The sheet lists the section links plus Download CV; Escape closes it and returns focus to the button. It only shows under 860px.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/mobile.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });

test("menu opens with section links and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  const sheet = page.locator(".menu-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Work" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
});

test("section headings fit inside a 390px viewport", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Selected work", "Achievements", "Activities", "Experience and education"]) {
    const box = await page.getByRole("heading", { name }).boundingBox();
    expect(box, name).not.toBeNull();
    expect(box!.x + box!.width, name).toBeLessThanOrEqual(390);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm e2e tests/e2e/mobile.spec.ts`
Expected: the first test FAILS (no Menu button). The second may pass.

- [ ] **Step 3: Replace `src/components/home/MobileMenu.tsx`**

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";

type Section = { href: string; label: string };

export function MobileMenu({ sections }: { sections: readonly Section[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="btn btn-line menu-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <div id={id} className="menu-sheet on-stock" hidden={!open}>
        <nav aria-label="Sections">
          {sections.map((s, i) => (
            <a key={s.href} ref={i === 0 ? firstLink : undefined} href={s.href} onClick={() => setOpen(false)}>
              {s.label}
            </a>
          ))}
        </nav>
        <a className="btn btn-ink" href="/cv" onClick={() => setOpen(false)}>Download CV</a>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm e2e tests/e2e/mobile.spec.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/home/MobileMenu.tsx tests/e2e/mobile.spec.ts
git commit -m "feat: mobile section menu"
```

---

### Task 13: CV page

**Files:**
- Create: `src/app/cv/page.tsx`, `src/app/cv/cv.css`, `src/components/cv/CvDocument.tsx`, `src/components/cv/PrintButton.tsx`
- Test: `tests/e2e/cv.spec.ts`

**Interfaces:**
- Consumes: `getCvContent`, `CvContent`, `Inline`, `displayUrl`, `Icon`.
- Produces: `GET /cv` renders the default CV profile in fixed section order (Summary, Experience, Selected projects, Achievements, Activities, Education, Skills). Print CSS gives one A4 page. `<CvDocument cv />` is reused by Plan 3 for `/admin/cv/print/[slug]` and the PDF.

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/cv.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("CV lists sections in order, ranks achievements, and prints to one A4 page", async ({ page }) => {
  await page.goto("/cv");
  await expect(page.locator(".cv-sec h2")).toHaveText([
    "Summary", "Experience", "Selected projects", "Achievements", "Activities", "Education", "Skills",
  ]);
  await expect(page.locator(".cv-sheet h1")).toHaveText("Dimas Arkana");
  const achievements = page.locator(".cv-sec", { has: page.locator("h2", { hasText: "Achievements" }) });
  await expect(achievements.locator("li").first()).toContainText("Winner, Nusantara Code Cup");
  await expect(page.locator(".cv-sheet")).not.toContainText("DevDays");

  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  expect(pages).toBe(1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm e2e tests/e2e/cv.spec.ts`
Expected: FAIL (404 on `/cv`).

- [ ] **Step 3: `src/app/cv/cv.css`** (scoped port of the `<style>` block in `mockup/cv.html`)

```css
.cv-page { --paper: #ffffff; min-height: 100vh; background: var(--ground); color: var(--ink); }
.cv-bar {
  position: sticky; top: 0; z-index: 5; display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 14px clamp(16px, 4vw, 48px); background: rgba(26, 39, 173, 0.94); color: var(--stock);
}
.cv-bar .back { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-weight: 650; text-decoration: none; color: var(--stock); }
.cv-bar .back:hover { text-decoration: underline; }
.cv-bar .note { font-size: 14px; color: var(--on-ground-2); }
.cv-stage { padding: clamp(24px, 4vw, 56px) 16px 80px; }
.cv-sheet {
  width: 210mm; min-height: 297mm; margin: 0 auto; background: var(--paper); color: var(--ink);
  padding: 12mm 15mm 11mm; box-shadow: 0 30px 70px -20px rgba(10, 11, 18, 0.6);
  font-size: 9.4pt; line-height: 1.33;
}
.cv-sheet ::selection { background: var(--ground); color: var(--stock); }
.cv-sheet :focus-visible { outline-color: var(--ink); }
.cv-head { padding-bottom: 8px; border-bottom: 2.5pt solid var(--ground); }
.cv-head h1 { font-size: 27pt; line-height: 1; font-weight: 900; font-variation-settings: "wdth" 120; letter-spacing: -0.02em; }
.cv-head .role { margin-top: 5px; font-size: 12pt; font-weight: 700; }
.cv-head .contact { display: flex; flex-wrap: wrap; gap: 3px 16px; margin-top: 8px; font-size: 9.2pt; color: var(--ink-2); }
.cv-sec { margin-top: 9px; }
.cv-sec h2 { margin-bottom: 4px; font-size: 9pt; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; font-variation-settings: "wdth" 85; color: var(--ground); }
.cv-entry { margin-bottom: 6px; }
.cv-entry:last-child { margin-bottom: 0; }
.cv-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.cv-row b { font-weight: 750; }
.cv-row .org { color: var(--ink-2); font-weight: 500; }
.cv-sheet .when { flex: none; font-size: 9pt; color: var(--ink-2); font-feature-settings: "tnum" 1; }
.cv-points { margin-top: 3px; padding-left: 14px; list-style: disc; }
.cv-points li { margin: 1px 0; }
.cv-points li::marker { color: var(--ink-2); }
.cv-stack { color: var(--ink-2); font-size: 9pt; }
.cv-lines li { display: flex; justify-content: space-between; gap: 12px; padding: 1px 0; }
.cv-skills p { margin-bottom: 2px; }
.cv-skills b { font-weight: 750; }
@media (max-width: 860px) {
  .cv-stage { padding: 16px 0 48px; overflow-x: auto; }
  .cv-bar .note { display: none; }
}
@page { size: A4; margin: 0; }
@media print {
  body, .cv-page { background: #fff; min-height: 0; }
  .cv-bar { display: none; }
  .cv-stage { padding: 0; }
  .cv-sheet { box-shadow: none; margin: 0; width: auto; min-height: 0; }
  .cv-sheet a { text-decoration: none; }
  .cv-sec, .cv-entry { break-inside: avoid; }
}
```

- [ ] **Step 4: `src/components/cv/CvDocument.tsx`**

```tsx
import { Inline } from "@/components/Inline";
import type { CvContent } from "@/content/cv";
import { displayUrl } from "@/lib/url";

export function CvDocument({ cv }: { cv: CvContent }) {
  const p = cv.profile;
  return (
    <article className="cv-sheet" aria-label="Curriculum vitae">
      <header className="cv-head">
        <h1>{p.firstName} {p.lastName}</h1>
        <p className="role">{p.role}</p>
        <ul className="contact">
          <li>{p.cvLocationLine}</li>
          <li><a href={`mailto:${p.email}`}>{p.email}</a></li>
          <li>{displayUrl(p.siteUrl)}</li>
          <li>{displayUrl(p.githubUrl)}</li>
          <li>{displayUrl(p.linkedinUrl)}</li>
        </ul>
      </header>

      <section className="cv-sec">
        <h2>Summary</h2>
        <p>{cv.summary}</p>
      </section>

      {cv.experiences.length > 0 ? (
        <section className="cv-sec">
          <h2>Experience</h2>
          {cv.experiences.map((e) => (
            <div key={e.id} className="cv-entry">
              <div className="cv-row">
                <span><b>{e.role}</b>, <span className="org">{[e.org, e.location].filter(Boolean).join(", ")}</span></span>
                <span className="when">{e.cvPeriod}</span>
              </div>
              {e.cvBullets.length > 0 ? (
                <ul className="cv-points">{e.cvBullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {cv.projects.length > 0 ? (
        <section className="cv-sec">
          <h2>Selected projects</h2>
          {cv.projects.map((pr) => (
            <div key={pr.id} className="cv-entry">
              <div className="cv-row">
                <span><b>{pr.name}</b>, {pr.cvTitle}</span>
                <span className="when">{pr.period}</span>
              </div>
              <ul className="cv-points">
                <li>{pr.cvLine} <span className="cv-stack">{pr.tags.join(", ")}</span></li>
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {cv.achievements.length > 0 ? (
        <section className="cv-sec">
          <h2>Achievements</h2>
          <ul className="cv-lines">
            {cv.achievements.map((a) => (
              <li key={a.id}><span><Inline text={a.cvLine} /></span><span className="when">{a.cvYear}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {cv.activities.length > 0 ? (
        <section className="cv-sec">
          <h2>Activities</h2>
          <ul className="cv-lines">
            {cv.activities.map((a) => (
              <li key={a.id}><span>{a.cvLine}</span><span className="when">{a.year}</span></li>
            ))}
          </ul>
        </section>
      ) : null}

      {cv.education.length > 0 ? (
        <section className="cv-sec">
          <h2>Education</h2>
          {cv.education.map((e) => (
            <div key={e.id} className="cv-entry">
              <div className="cv-row"><span><b>{e.degree}</b></span><span className="when">{e.period}</span></div>
              <div>{e.cvNote}</div>
            </div>
          ))}
        </section>
      ) : null}

      {cv.skillGroups.length > 0 ? (
        <section className="cv-sec cv-skills">
          <h2>Skills</h2>
          {cv.skillGroups.map((g) => (
            <p key={g.group}><b>{g.group}:</b> {g.names.join(", ")}</p>
          ))}
        </section>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 5: `src/components/cv/PrintButton.tsx`**

```tsx
"use client";

import { Icon } from "@/components/Icon";

/** Plan 3 replaces this with a link to /cv.pdf. */
export function PrintButton() {
  return (
    <button className="btn btn-stock" type="button" onClick={() => window.print()}>
      Download CV <Icon name="download" />
    </button>
  );
}
```

- [ ] **Step 6: `src/app/cv/page.tsx`**

```tsx
import type { Metadata } from "next";
import { CvDocument } from "@/components/cv/CvDocument";
import { PrintButton } from "@/components/cv/PrintButton";
import { Icon } from "@/components/Icon";
import { getCvContent } from "@/content/cv";
import { getDb } from "@/db/client";
import "./cv.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const cv = getCvContent(getDb())!;
  return { title: `${cv.profile.firstName} ${cv.profile.lastName}, CV` };
}

export default function CvPage() {
  const cv = getCvContent(getDb())!;
  return (
    <div className="cv-page">
      <div className="cv-bar">
        <a className="back" href="/"><Icon name="left" />Back to the site</a>
        <span className="note">Generated from the same records as the site.</span>
        <PrintButton />
      </div>
      <main className="cv-stage">
        <CvDocument cv={cv} />
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Run tests**

```bash
pnpm typecheck
pnpm e2e tests/e2e/cv.spec.ts
```

Expected: 1 passed.

- [ ] **Step 8: Commit**

```bash
git add src/app/cv src/components/cv tests/e2e/cv.spec.ts
git commit -m "feat: CV page from the default CV profile, one A4 page"
```

---

### Task 14: Visual comparison captures, README, full verification

**Files:**
- Create: `tests/e2e/visual.spec.ts`, `README.md`
- Test: whole suite

**Interfaces:**
- Produces: `VISUAL=1 pnpm e2e tests/e2e/visual.spec.ts` writes `test-results/visual/{desktop-full,mobile-full,cv}.png` (reduced motion, full page) for side-by-side comparison with `.impeccable/review/*.png` from the mockup review.

- [ ] **Step 1: `tests/e2e/visual.spec.ts`**

```ts
import { test } from "@playwright/test";

test.skip(!process.env.VISUAL, "Set VISUAL=1 to write comparison captures");
test.use({ reducedMotion: "reduce" });

test("desktop full page", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/visual/desktop-full.png", fullPage: true });
});

test("mobile full page", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3100/");
  await page.screenshot({ path: "test-results/visual/mobile-full.png", fullPage: true });
  await ctx.close();
});

test("cv", async ({ page }) => {
  await page.goto("/cv");
  await page.screenshot({ path: "test-results/visual/cv.png", fullPage: true });
});
```

- [ ] **Step 2: Capture and compare**

```bash
VISUAL=1 pnpm e2e tests/e2e/visual.spec.ts
open test-results/visual/desktop-full.png .impeccable/review/desktop-full.png
```

Expected: 3 passed. Check by eye that the captures match the mockup review captures in composition, palette, type, stickers, cards, fan, agenda, itinerary, and closing. Differences allowed:
- The mock-note chip is gone.
- "Case study" buttons are hidden because no case study exists yet.
- Footer year is the current year.
- Links use `*.example` domains.

Anything else is a defect to fix before committing.

- [ ] **Step 3: `README.md`**

````markdown
# Portfolio + CV

A personal portfolio site that is also the single source of truth for the owner's CV.

- Product context: `PRODUCT.md`
- Visual system: `DESIGN.md`
- Spec: `docs/superpowers/specs/2026-11-14-portfolio-cv-design.md`
- Approved mockup: `mockup/` (serve it with `python3 -m http.server -d mockup 5178`)

## Develop

```bash
pnpm install
pnpm db:seed            # sample content into ./.data (use --force to reset)
pnpm dev                # http://localhost:3000
```

## Test

```bash
pnpm test               # unit (vitest)
pnpm e2e                # end-to-end (playwright, seeds .data-e2e, serves :3100)
VISUAL=1 pnpm e2e tests/e2e/visual.spec.ts   # comparison captures in test-results/visual
```

## Data

- `DATA_DIR` (default `./.data`) holds `portfolio.db` and `uploads/`. It is never committed.
- The schema lives in `src/db/schema.ts`. After changing it, run `pnpm db:generate` and commit `drizzle/`.

All seeded content is sample data. It must be replaced before launch; see the list in `DESIGN.md`.
````

- [ ] **Step 4: Full verification**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

Expected: no type or lint errors; all unit tests pass (env 2, inline 5, safe-path 11, db 1, cv-resolve 3, seed 1, content 5, media-route 5); all e2e specs pass. The visual spec is skipped without `VISUAL`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/visual.spec.ts README.md
git commit -m "docs: README, visual comparison captures"
```
