# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js + SQLite (user's choice). Self-hosted on the owner's Mac mini at home; the public site is exposed through Tailscale Funnel. Data lives locally on that machine.

## Users

- **Primary: tech/software recruiters and hiring managers.** They land from a CV link, LinkedIn, or a job application, often on a laptop between other candidates, and decide within seconds whether this engineer is worth a closer look. They scan for role, stack, shipped work, impact, and credibility signals (achievements, experience).
- **Owner (the engineer).** Logs in to `/admin` to add and edit projects, achievements, activities, experience, and education, then picks which items go into a CV and exports it as PDF for a specific application.

## Product Purpose

A personal portfolio that is also the single source of truth for the owner's CV. The public site shows projects (with strong visuals), achievements, activities, experience, and education. The same records feed a printable, recruiter-standard CV that the owner tailors per application and exports to PDF. Success: a recruiter understands who this is and what they've shipped within one viewport, can reach proof (live links, repos, case studies) in one click, and can download a clean CV at any point.

## Positioning

One content source, two outputs: a showcase site with personality and a plain, ATS-friendly CV generated from the same records. Achievements and activities are first-class, not a footnote under projects.

## Operating Context

- Recruiter path: open link → scan hero → featured projects → achievements → experience → download CV or contact.
- Owner path: `/admin` login → edit records → choose items for CV → preview `/cv` → export PDF → (site updates live).
- Content language: English.

## Capabilities and Constraints

- Public pages: home, project detail (`/projects/[slug]`), CV preview (`/cv`).
- `/admin` behind a server-checked login (the site is publicly reachable via Funnel, so auth must be real).
- CV export to PDF; CV layout must stay ATS-readable (real text, single column, no text inside images).
- All text must be real DOM text: selectable, indexable, screen-reader readable. No canvas/WebGL-rendered copy.
- Must work on mobile; interactive/playful pieces need a plain scroll path.
- Undecided: auth method details, PDF engine (print CSS vs headless browser), image storage layout.

## Brand Commitments

User-pinned direction "A: structured with creative moments", from the user's own references (`REFERENCES.md`):
- Structure and impact-led case-study cards + timeline: whyramachandran.design
- Hero collage of floating project UI fragments with hover caption pill: nataliealmosa.ca
- Achievements as a fan / coverflow of cards: spencergabor.work
- Activities as a large typographic list with hover image preview (DOM, not WebGL): dionpieters.dev
- Smooth, deliberate motion graphics and animation are wanted.

## Evidence on Hand

None yet. No real projects, screenshots, metrics, certificates, or photos have been provided. Project screenshots/mockups will exist later (owner expects most projects to have UI). The design mockup uses clearly labelled synthetic content for a full-stack web engineer; every name, metric, and achievement in it must be replaced before launch. Never present synthetic metrics as real.

## Product Principles

1. Scannable first, delightful second: every creative moment has a plain, readable path beside it.
2. Proof over claims: metrics, links, and artifacts beat adjectives.
3. One record, two renders: anything shown on the site can be emitted into the CV without re-typing.
4. Achievements and activities earn real estate, not a bullet list.
5. The owner must be able to keep it current in minutes.

## Accessibility & Inclusion

WCAG 2.2 AA target: contrast, keyboard access to every interaction (collage, fan cards, list previews), visible focus, and `prefers-reduced-motion` rendering every section in its final readable state.
