---
version: 1
slug: "mockup-index-html"
primary_target: "mockup/index.html"
related_targets: ["mockup/cv.html"]
---

## Scope

Public home page of the portfolio (mockup in `mockup/index.html`, later Next.js `/`). Visitor mode: Experience. Companion surface: `/cv` print preview (`mockup/cv.html`).

## Audience and job

Tech/software recruiters and hiring managers scanning a candidate in seconds; action is reaching proof (case studies, live links) and taking the CV (Download CV). Content is synthetic for a full-stack web engineer until the owner replaces it.

## Direction contract

THESIS: Recruiters meet this engineer the way they meet candidates at a fair: by reading the badge. Refuses the dark terminal dev portfolio and the headline-over-equal-cards page.

OWN-WORLD: Woven ultramarine lanyard (#2132D6, fine twill) is the ground of the whole page. Content prints on off-white PVC badge stock (#F2F2EE, 18px corners, punched pill slot) in near-black ink (#111216). Silver clip metal (#C9CCD6). Project screenshots are die-cut stickers with white kiss-cut borders. Role ribbons are satin strips whose cut shape and printed word carry state. One family, Archivo variable: expanded black for names, normal width for reading, condensed caps for printed labels. Buttons are full pills; cards 18px; stickers 16px.

STORY: Read the badge (name, role, stack, availability) → peel through project stickers → featured case studies with pinned metrics → achievements as a fanned badge collection → activities as the event agenda → experience itinerary → take the CV from the badge's back.

FIRST VIEWPORT: Full-bleed lanyard ground. One-line nav on top, Download CV pill at right. A strap drops from the top edge to a silver clip; the badge (about 360x520) hangs left of centre, first name huge, swings when dragged, flips to a back with QR and Download CV. Five project stickers orbit at varied angles and sizes; hover or focus dims the rest and shows a caption pill. Statement (max 2 lines) and "See the work" sit lower right on the ground.

FORM: Lanyard & Badge, position 3 on the first grounded list, chosen by the user after a re-roll. seed:033c5acd86a80b35. Raises: state by form not hue (jackfield); fixed badge sweep (six-pack); ground committed at page scale (mezzotint); one ribbon ramp for rank (star atlas); metrics pinned on leader lines (tensegrity); one vertical cord rules the page (deep dive).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction and motion grammar

Signature: the badge hangs on a spring pendulum (drag to swing, release settles with damping), click or Enter flips it to the back. Focal entrance: badge drops on its strap and settles (about 800ms), stickers slap down in sequence, statement rises. Supporting: cord line draws with scroll, achievement fan rotates on drag/keys, agenda rows reveal a photo that trails the cursor. All under prefers-reduced-motion render final state.

## Unresolved

Real content, photos, and screenshots; PDF engine; dark mode toggle (scene is a daytime desk; the committed ultramarine ground already reads as one theme).
