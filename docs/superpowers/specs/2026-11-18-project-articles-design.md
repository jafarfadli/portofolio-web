# Project articles (`/projects/[slug]`)

Date: 2026-11-18. Owner-approved direction, from a prototype reviewed on the 8448 preview. It supersedes the case-study parts of `2026-11-14-portfolio-cv-design.md` (sections 5, 13 and 14) and the case-study rules in DESIGN.md that were based on `mockup/project.html`.

## 1. Goal

Each featured project gets an article page that makes a visitor curious first and then shows how the thing works. The selling point is the architecture: a detailed diagram the reader can follow.

The agent that works on each project in clinky writes the article content, because it knows the code. The owner corrects the content in the admin and decides when each article goes public.

## 2. What the owner decided

- **No cards.** Sections are full-width bands that alternate navy and concrete, like the home page; the owner called the stock-page cards of the old mockup "AI slop".
- **Short version.** Four sections: Problem, Approach, Architecture, Results. My role, Demo, Gallery and Next steps are dropped.
- **Top: curiosity first.** It opens with one large question; the name runs past as a marquee; the device photo follows. There are no Live site or Code buttons. Year, role, team and stack move to the side of the Problem section (option 1 of two shown; the owner chose it).
- **No floating section bar.** This is in line with the standing rule against floating controls.
- **Detailed architecture.** The diagram has zones, parts with their tech, labelled wires, and scenarios whose steps light up their path.
- **Content is written by each project's own agent**, as one JSON file in that project's repo. It is then imported here.
- **Reference:** whyramachandran.design/Case-study-1, for the big numbered labels and statements, the full-bleed media and the large result numbers.

## 3. The page, top to bottom

| # | Band | Content |
|---|------|---------|
| 1 | navy | "← All work"; the **hook**: one question at `clamp(40px, 6.2vw, 104px)`, weight 800, with `_phrases_` set at weight 250 and wdth 125. A dashed stitch line, then the **name marquee**: the name repeated with ✦, 900 weight, wdth 125, alternating solid and outlined, scrolling at 26s per loop. The `h1` is the name (the marquee copies are `aria-hidden`); under reduced motion the marquee is still. |
| 2 | field colour | **The room**: the project's Blender scene (`DEVICE_SCENES[slug]`) full-bleed, with the live screens and the same screenshot rotation as the work card. A project without a scene shows its main screenshot as a full-width print. |
| 3 | concrete | **PROBLEM (01)**. Left column: the label, then the facts (Year, Role, Team, Stack chips). Right column: the statement (`clamp(32px, 4.2vw, 64px)`, 800, with `_em_` at 300 and wdth 125), then 2 to 4 points with `**bold**` key phrases. |
| 4 | navy | **Screen**: an extra screenshot, full width, with a caption. Shown only when the article has a first shot. |
| 5 | concrete | **APPROACH (02)**: the statement, then 2 or 3 numbered decisions, each with a title, a body and "Gave up: …". |
| 6 | navy | **ARCHITECTURE (03)**: the statement, then the diagram and its scenarios (section 4). |
| 7 | concrete | **Screen**: the second extra screenshot, if there is one. |
| 8 | navy | **RESULTS (04)**: the statement, then 2 or 3 large numbers (`clamp(96px, 13vw, 210px)`, 900, wdth 125), each with its label. A sample number shows "(sample)". |
| 9 | concrete | **Next project**: "Next project", the next published article's name at 900 weight with an arrow, and its room photo. The whole band is one link. It is omitted when no other article is published. |

The bands alternate exactly as listed. When a screen band (4 or 7) is missing, the bands that follow keep their colours, and the seam rule (a dashed stitch where two colourways meet) applies as on the home page.

The nav is the home page's nav: solid from load, Work marked current, its section links pointing at `/#work` and so on (with `withBase`).

Below 860px:
- The section grid becomes one column, with the label and facts above the statement.
- The decisions and the results stack.
- The room uses its mobile frame.
- Screens run edge to edge with no radius.
- There is no horizontal scroll: every band clips its own sides, as `.section` does.

## 4. The architecture diagram

### Data

Written by the agent (section 5):

- `zones`: 2 to 4 names, shown left to right (top to bottom on a phone).
- `nodes`: 4 to 12. Each has `{ id, zone, row (0 to 3), name, tech, note, kind? }`, where `kind` is one of `person`, `store` or `ext`. Two nodes may not share a zone and row.
- `edges`: `{ from, to, label }`. Both ends must be existing node ids. Labels are 1 to 3 words.
- `flows`: 1 to 3 scenarios, `{ title, steps: [{ at: [node ids and "from>to" edge ids], text }] }`, with 2 to 5 steps each. Every id in `at` must exist.

### Layout

- Grid, one column per zone, `column-gap: 64px; row-gap: 52px`.
- The first grid row (24px) holds the zone names.
- A dashed stitch line runs between zones.

### Parts

| Kind | Look |
|------|------|
| default | stock label, 10px radius |
| `person` | green inset bar on the left |
| `store` | `metal-light` fill |
| `ext` | navy fill with a 2px stock ring |

Each part shows its name (17px, 800), its tech on a small ink chip, and its note (13.5px).

### Wires

- SVG, measured from the parts' boxes on the client, re-measured on resize and once fonts load.
- Wires only ever run in the gaps:
  - The same zone: a straight vertical line.
  - The next zone: an elbow in the gutter between the two zones.
  - Further: out into the gutter beside the source, along the row gap above the higher part, then in from the gutter beside the target.
- Each label is a small pill at the wire's middle.

### Interaction

- **Scenario tabs** (`role=tablist`) sit on the left and **steps** (buttons with `aria-pressed`) on the right.
- The first step of the first scenario is on at load.
- A lit step lights its parts and wires: green #5ee08c (the site's one accent), with a running dash on the wires. Everything else dims to `brightness(0.5)`.
- Hovering or focusing a part lights it and its wires.
- Clicking the step that is on turns it off.

On a phone:
- The zones stack.
- Only lit wires are drawn, routed along the left edge.
- The tabs become a scrolling row.

### Accessibility

- Parts are focusable.
- The steps carry the explanation as text, so the diagram is not the only carrier of meaning.
- Under reduced motion the dash does not run.

## 5. Content: the article file

### The file

Each project's agent writes `portfolio-article.json` at the root of its own repo, plus optional screenshots in `portfolio-article/`:

```json
{
  "version": 1,
  "slug": "clinky",
  "hook": "What if every coding agent I run lived in _one room,_ and _called me_ when it got stuck?",
  "facts": { "year": "2026", "role": "Solo, design to deploy", "team": "Just me" },
  "problem": { "say": "...", "points": ["... **key phrase** ..."] },
  "approach": { "say": "...", "calls": [{ "title": "...", "body": "...", "gaveUp": "..." }] },
  "architecture": { "say": "...", "zones": [], "nodes": [], "edges": [], "flows": [] },
  "results": { "say": "...", "stats": [{ "value": "12", "label": "projects side by side", "source": "how this number is known", "sample": false }] },
  "shots": [{ "file": "portfolio-article/session.png", "alt": "...", "caption": "..." }]
}
```

### Rules

- **Inline markup:** only `_em_` (the thin wide style) and `**bold**`, the site's existing parser (`src/lib/inline.ts`). No links, no HTML.
- **Lengths:**
  - hook: 60 to 140 characters.
  - each `say`: at most 140 characters.
  - each point: at most 160 characters.
  - each call: title at most 60 and body at most 200 characters.
- **Results:**
  - Every stat needs a `source`: a measurement, a log or a count from real use. A number that is not measured is `"sample": true`.
  - The importer refuses a stat without a source.
  - `value` is a short figure (`12`, `4x`, `-38%`, `<1s`).
- **Shots:** 0 to 2.
  - PNG or JPEG, at least 1440px wide, of the real app.
  - Any name, number or record that belongs to a client or a real person is replaced by dummy data before the capture.
  - When there are none, the article uses the project's own screenshots 2 and 3.
- **Disguise:** no client names, internal hostnames, secrets, real repo names or personal data. A government client is named by its kind (for example "a government finance team"), as the CV already does.
- **Language:** English, in the site's voice: short, concrete, no superlatives.

### Brief and validation

A brief for the agents lives at `docs/article-brief.md`. It holds the schema, the rules above, the full Clinky example and the steps:
1. Read your own code.
2. Write the file in your own repo.
3. Capture shots with dummy data.
4. Validate with the schema.

The owner gives the brief to each project's session in clinky; when that session is running on this Mac, this repo's session can also send it. The agents write only in their own repo.

One zod schema in `src/lib/article.ts` is used by the importer, the admin and the page. It enforces every count, length and reference rule above. A JSON Schema is generated from it for the brief.

## 6. Import, storage and admin

### Storage

Migrations `0007` and `0008`:
- `0007` drops `projects.case_study_md`, which is unused and always empty.
- `0008` adds `projects.article` (JSON, nullable) and `projects.article_published` (boolean, default false).
- Article shots are rows in `media`; the article stores their ids.
- Article screenshots count as media uses (`mediaUsage`), so the media list never deletes one an article shows.

### Importer

`pnpm article:import <path-to-repo> [--slug x]`:
- Reads `portfolio-article.json` read-only.
- Validates it.
- Turns the shots into media variants through the existing `sharp` pipeline.
- Writes the article to the project with that slug, leaving it unpublished.
- Refuses screenshots under 1440px wide, symlinks, and files that are not readable images.
- Prints what it changed.

Re-importing replaces the article, and an article that was published stays published. On any error it writes nothing and prints each problem with its JSON path.

### Admin

The project editor gets an **Article** section after the flags:
- **Publish the article**, a switch. Publishing a project that has no article is refused, whatever the payload.
- **Words and structure**:
  - a word field for every piece of text: hook, facts, statements, points, calls, stats with their source and sample flag, part names, tech, notes, wire labels, scenario titles and step texts;
  - shot alt text and captions, and the shot pickers;
  - a **Structure** JSON box for the diagram's structure (zones, rows, ids, edges and the ids in each step), since it comes from the agent and rarely changes. Zones are labelled "Area" in the editor.
- A **Preview** link to `/admin/preview/<id>`, which renders the same page component in the admin role, published or not.

Saving runs the same zod schema and shows errors next to the fields.

### Public

- `/projects/[slug]` renders only a published article, and is a 404 otherwise.
- On the home page, a work card whose article is published gets an ink **"Read the story"** pill, replacing the old "Case study" button condition.
- Metadata:
  - title: `"<Name>: <hook without markup>"`
  - description: the Problem statement
  - No canonical link: the app sets no `metadataBase`.
- The OpenGraph image stays out of scope, as before.

## 7. Motion

- **Marquee:** CSS only.
- **Room screens:** they turn every 2.8s like the work card. The card's show logic is reused, either factored out of `home-motion.ts` or as a small client island.
- **Diagram:** its own client component.
- **Bands:** no entrance animation in this version.
- **Agent swarm:** stays home-only.
- **Reduced motion:** everything holds still.

## 8. Testing

- **Unit:**
  - The schema accepts the Clinky example.
  - It rejects a stat without a source, an edge to an unknown part, a step id that does not exist, two parts in one zone and row, and over-long text.
  - Inline markup renders only `em` and `strong`.
  - The importer writes nothing on an error.
- **e2e:**
  - An unpublished article is a 404 and the home card has no "Read the story".
  - Once published, the page shows the four section labels in order, the hook and the `h1`.
  - Clicking a scenario step lights its parts.
  - At 390px there is no horizontal scroll.
  - The axe check passes.
  - "Next project" links to the next published article.
- **Visual:** a screenshot of the article at 1440 and 390, added to `visual.spec.ts`.

## 9. Rollout

1. Build the page, the schema, the importer and the admin panel, using the Clinky example as dummy content, behind `article_published = false`. Preview on 8448.
2. The owner hands the brief to the Clinky agent. Import its file, then the owner reviews and corrects in the admin.
3. Publish Clinky. Then the other featured projects, one at a time.

## 10. Out of scope

- Writing the articles here.
- My role, Demo, Gallery and Next steps.
- A floating section bar.
- Per-article OpenGraph images.
- Entrance animations for the bands.
- Migrating `mockup/project.html`, which is superseded: DESIGN.md's case-study rules are rewritten to this spec when the page ships.
