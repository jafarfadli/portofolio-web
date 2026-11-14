---
version: 1
slug: "mockup-project-html"
primary_target: "mockup/project.html"
related_targets: []
---

## Scope

Project case study page (mockup `mockup/project.html`, later Next.js `/projects/[slug]`). Visitor mode: Read. Inherits the Lanyard & Badge world from DESIGN.md unchanged.

## Audience and job

Recruiters skim the header (what, outcome, role, stack, links); technical hiring managers read the story to judge decisions. Reader's question: "What did this engineer actually build, what did they decide, and did it work?" Content depth: standard, 2 to 3 minute read. Sections: Problem, My role, Approach (key decisions), Architecture (diagram), Results (before/after metrics), Demo (short muted video), Gallery (screens), What I'd do next, then the next project. All sample content is synthetic and labelled.

## Chosen structure

"Event program" (user-locked, dealt structure 2 of the surface roll; seed: none (unavailable)):
- Header on the ground: back link to all work, the project name in closing-display scale, the outcome sentence, meta (year, role, duration, team), stack tags, Live site and Code actions, hero screenshot print at top right.
- Body: a sticky agenda-style index on the left (condensed uppercase rows like the activities agenda; the active row carries a printed "Reading" tag), one stock reading page per section on the right.
- The cord on the left is the reading progress for the whole case study.
- Architecture is drawn from data as booth cards joined by ink cords (DOM text, SVG connectors only).
- Demo video autoplays muted only when visible and motion is allowed; otherwise a poster with a play button.
- Gallery uses screenshot prints in the existing print grammar.
- Under 860px the index becomes a sticky horizontal row of section pills under the nav.
- Under 860px the architecture keeps its cords: the booths re-hang in two columns in flow order (people, front doors, API across both columns, data and payments, worker and messages) and the cords run vertically between rows.
- Under 860px the result tags hang in one horizontal scroll-snap row under the one rail.
- Each result tag prints its "before" as a legible line ("from 13.1 days"), never as struck-out text.
- The demo shows a centred printed pill ("Play demo, 6 s") until it first plays, then docks to the corner pause button. The poster is a mid-flow frame, not the hero screenshot.
- No screenshot appears twice on the page.
- Live site and Code render only when the project has those URLs (the mockup uses reserved `.example` addresses).
- The last section is "What I'd do next" (index label "Next steps"), so it never reads as the next project.

## Memorable moment

The program index that tracks your place like an event schedule, and the architecture booths wired together by cords that draw in as you reach them.

## Constraints

Read surface: restrained motion that explains state (index, progress, cords). No eyebrow labels above headings; printed labels only on physical objects. Metric explanations in plain words; every metric marked "(sample)" until real. No em dashes.

## Direction contract

THESIS: A case study is an event program you can hold: a printed schedule on the lanyard that tells you where you are, with each part of the story on its own sheet. It refuses the default long-scroll article with a floating table of contents and a hero banner.

OWN-WORLD: Inherited Lanyard & Badge. Ultramarine twill ground, stock sheets with neutral hang shadows, ink type in Archivo moving along the width axis, pills and punched slots, die-cut ink tags on a webbing rail, booths on the deep twill joined by stock cords. State by form and printed words, never by a second hue.

STORY: A recruiter learns in one viewport what Ledgerly is, what changed, the role, the stack and where to click. A technical reader follows Problem, Role, Approach, Architecture, Results, Demo, Gallery and next steps, and leaves believing the engineer made deliberate trade-offs and measured the outcome.

FIRST VIEWPORT: Left seven columns: back link, "Ledgerly" at display scale, the outcome sentence, facts row, stack tags, Live site and Code. Right five columns: the hero print tilted on the ground. The program index and the first sheet start at the fold.

FORM: Event program, dealt structure 2 of the surface roll, inside the Lanyard & Badge world (world seed:033c5acd86a80b35). Structure seed: none (unavailable).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
