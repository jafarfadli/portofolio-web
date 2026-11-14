# Portfolio + CV: design spec

Date: 2026-11-14
Status: draft for owner review
Related: [PRODUCT.md](../../../PRODUCT.md) (product truth), [DESIGN.md](../../../DESIGN.md) (visual system, authoritative), [mockup/](../../../mockup/) (approved visual mockup)

## 1. Summary

A personal portfolio site for a full-stack engineer that doubles as the single source of truth for their CV. The public site shows projects, achievements, activities, experience, and education in the "Lanyard & Badge" visual world approved in the mockup. The owner edits everything in an admin area and exports tailored CVs as PDF. The site is self-hosted on the owner's Mac mini. The public site is exposed through Tailscale Funnel, and the admin area is reachable only inside the owner's tailnet.

## 2. Goals and non-goals

Goals:
- A recruiter understands who the owner is and what they've shipped within one viewport, and can download the CV from anywhere on the page.
- The owner adds or edits content in minutes, without touching code, and the public site updates within seconds of saving.
- The owner can build multiple CV variants ("CV profiles") from the same records and export each as a one-page, ATS-readable PDF.
- The public site matches the approved mockup and DESIGN.md, including motion and reduced-motion behaviour.

Non-goals (v1):
- Blog or writing section, multiple users or roles, comments, i18n (content is English only), and third-party CMS.
- Analytics. A privacy-friendly option can come later.
- Project motion videos (see section 13).

## 3. Architecture

```
                 Internet                                  Owner's tailnet only
                    |                                              |
          Tailscale Funnel :443                         tailscale serve :8443
                    |                                              |
        +-----------v-----------+                     +------------v-----------+
        | next start  :3000     |                     | next start  :3001      |
        | ROLE=public           |                     | ROLE=admin             |
        | /, /projects/[slug],  |  <-- revalidate --- | /admin/**, server      |
        | /cv, /cv.pdf, /media  |   (localhost only)  | actions, PDF export    |
        | admin routes => 404   |                     | (Playwright Chromium)  |
        +-----------+-----------+                     +------------+-----------+
                    |                                              |
                    +---------------> DATA_DIR <-------------------+
                                     portfolio.db (SQLite, WAL)
                                     uploads/ (originals + derived sizes)
                                     cv/ (generated PDFs)
```

- There is one Next.js (App Router) codebase and one build, started twice with different `ROLE` environment values.
- With `ROLE=public`:
  - Middleware returns 404 for `/admin/**` and `/api/admin/**`.
  - Server actions that mutate data throw immediately.
  - The admin code path is unreachable, not merely hidden.
- With `ROLE=admin`:
  - The process binds to `127.0.0.1:3001`.
  - It is published only via `tailscale serve`, never Funnel.
  - Middleware also requires the `Tailscale-User-Login` header to equal the owner's login. This is defense in depth.
  - The password login still applies.
- SQLite runs in WAL mode. Both processes open it, the public one effectively read-only. Write volume is one person, so contention is not a concern.
- Content freshness: after any save, the admin process calls `POST http://127.0.0.1:3000/api/revalidate` with a shared secret. The public process then calls `revalidatePath` for the affected routes. That endpoint accepts only requests from loopback that carry the secret.

Stack:
- Next.js (App Router, React Server Components) and TypeScript.
- Drizzle ORM on better-sqlite3.
- Plain CSS: `mockup/styles.css` is ported verbatim as one global stylesheet with its class names preserved, so the markup matches the mockup 1:1. A component moves to a CSS Module only when it outgrows the shared sheet. No Tailwind, because the mockup's CSS is already the reference implementation of DESIGN.md.
- GSAP 3 with ScrollTrigger, and Lenis, inside client-only leaf components.
- sharp for images, Playwright (Chromium) for PDF, and argon2 for password hashing.
- Archivo (variable, `wdth` 62–125) self-hosted via `next/font/local`.

## 4. Data model

Every content table has `id`, `createdAt`, `updatedAt`, `sortOrder`, `showOnSite` (bool), and `showInCv` (bool).

| Table | Key fields |
|---|---|
| `profile` (single row) | firstName, lastName, role, stackLine, location, remoteOk, openToWork (bool), availabilityNote, email, websiteUrl, githubUrl, linkedinUrl, aboutText, statementLine1, statementLine2, cvSummary |
| `projects` | slug, name, impactHeadline (with **bold** name part), year/yearRange, roleLine, tags (json), fieldColor, heroMediaId, stickerMediaId, metricValue, metricLabel, metricIsSample, pinAnchor {x,y} + pinSide, liveUrl, codeUrl, caseStudyMd, cvLine, featured (bool), layout (`wide`/`half`) |
| `achievements` | title, rank (`winner`/`finalist`/`award`), rankLabel, category, description, year, mediaId, cvLine |
| `activities` | title, subtitle, role (`speaker`/`organizer`/`mentor`/`host`/`volunteer`), year, photoMediaId, url, cvLine |
| `experiences` | role, org, location, startDate, endDate (nullable = present), summary (one line, `**metric**` allowed), cvBullets (json array) |
| `education` | degree, institution, startYear, endYear, gpa, note |
| `skills` | group (`Languages`/`Web`/`Data and infra`/...), name |
| `media` | path, kind (`screenshot`/`photo`/`logo`), width, height, alt, provenance, variants (json of derived sizes) |
| `cv_profiles` | name, slug, isDefault, summaryOverride (nullable) |
| `cv_profile_items` | profileId, itemType, itemId, sortOrder |
| `admin_user` (single row) | passwordHash (argon2id), totpSecret (nullable, reserved) |
| `sessions` | id (random 256-bit), expiresAt, createdAt, userAgent |
| `login_attempts` | at, ok (bool) |

Rules:
- `featured` projects (max 4, ordered) drive the Selected work grid. Layout follows the mockup rhythm: wide, half, half, wide.
- The hero stickers use `featured` projects plus the top `winner` achievement as the seal sticker.
- Fallback works per section: when a CV profile has no picks of a given type (for example achievements), that section shows every `showInCv` item of that type in `sortOrder`. Picked items are shown in pick order, even if their `showInCv` flag is off.
- Any metric marked `metricIsSample` renders "(sample)", and the admin shows a warning badge until it is cleared.

## 5. Public surfaces

- **`/`**: a 1:1 port of the approved mockup, rendered from DB records.
  - Static markup lives in Server Components.
  - Motion lives in one client island (`HomeMotion`, a port of `mockup/main.js` with full cleanup), mounted only on `/`.
  - The first-name size on the badge is fitted to the badge width at render (scaled by the rendered `scrollWidth`/`clientWidth` ratio on the client, re-run on resize and after fonts load, with a CSS size fallback).
- **Mobile navigation (new)**: below 860px a "Menu" pill opens a sheet listing the section links plus Download CV. Its design follows DESIGN.md (stock sheet on the ground, pill controls).
- **`/projects/[slug]`**: the case study page.
  - Not mocked yet. It will be designed in the same world before implementation (section 13).
  - Content: hero print, the impact headline, role/year/stack, metric tags, case study markdown, links, and next project.
- **`/cv`**: HTML CV preview using the mockup's `cv.html` rules (single column, one A4 page, ATS-readable text). Revised 2026-11-14: navy strap bands, section tabs, the owner's cut-out portrait and tagged ranks; see DESIGN.md.
  - Always renders the default profile. It takes no profile parameter, so non-default profiles are never public.
- **`/cv.pdf`**: serves the pre-generated PDF of the default profile from `DATA_DIR/cv/`. The public process never launches Chromium.
- **`/media/*`**: serves upload variants with long cache headers. Filenames are content-hashed.
- **SEO**: metadata, OpenGraph image (the badge front rendered to PNG at build or on save), and JSON-LD `Person`.

## 6. Admin surfaces and flows (ROLE=admin only)

- **Login**: password only, behind the tailnet.
  - argon2id hash.
  - Session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`, 14-day rolling expiry.
  - After 5 failed attempts in 15 minutes, a 15-minute lockout.
  - A first-run setup page sets the password when `admin_user` is empty.
- **Dashboard**:
  - Content counts.
  - Warnings: sample metrics present, missing alt text, missing screenshots (shown as designed empty states), no CV PDF generated yet.
  - "Open public site" link.
- **Editors**: one list + form per table.
  - Inline validation with errors next to the field.
  - Drag to reorder.
  - Toggles for `showOnSite` / `showInCv`.
  - Markdown editor with preview for case studies.
  - Media picker with upload. sharp makes 480/960/1600 WebP variants, rejects non-images, and caps uploads at 15 MB.
- **CV builder**:
  - Pick a profile or create one.
  - Check items per section and drag to order.
  - The live preview pane is `/admin/cv/print/<slug>` (same CV template, admin role only) in an iframe, with a one-page overflow indicator.
  - "Export PDF" runs Playwright against the admin process's own `http://127.0.0.1:3001/admin/cv/print/<slug>`. It authenticates with a one-time internal render token header, which is accepted only from loopback. The result is saved to `DATA_DIR/cv/<slug>.pdf` and downloaded.
  - Setting a profile as default regenerates `/cv.pdf`.
- **After every save**: revalidate the public routes, and regenerate the default CV PDF in the background if any `showInCv` content changed.

## 7. CV generation

- One template, the HTML from `mockup/cv.html`, as a shared Server Component, with print CSS for A4 and `@page { margin: 0 }`. It renders at `/cv` (public, default profile) and `/admin/cv/print/<slug>` (admin role, any profile).
- Playwright `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })`. Fonts are embedded because Chromium renders the self-hosted Archivo.
- Section order: Summary, Experience, Selected projects, Achievements, Activities, Education, Skills.
- The admin builder blocks export when the preview overflows one page, unless the owner overrides it.

## 8. Security

- The admin is unreachable from the internet: it is a separate process, bound to loopback, published via `tailscale serve` only, and returns 404 in the public role.
- Identity headers are checked in admin middleware, in addition to the password session.
- Mutations use server actions with `SameSite=Strict` cookies and an origin check.
- Uploads: MIME sniffing with sharp, re-encoding (which strips EXIF), and a filename that never comes from the user.
- Headers on the public role:
  - A CSP allowing self plus `https://fonts.gstatic.com` only if fonts are not self-hosted. The target is self only.
  - HSTS.
  - `X-Content-Type-Options`.
  - `Referrer-Policy`.
- Secrets (`REVALIDATE_SECRET`, `SESSION_SECRET`) live in `.env.local`, are git-ignored, and are generated at setup.

## 9. Design system and motion

- DESIGN.md is authoritative for tokens, components, states, motion constants, mobile rules, and the DO/DON'T lists. This spec does not restate them.
- Port order:
  1. Tokens (CSS custom properties).
  2. Static components.
  3. Client islands.
  4. Reduced-motion paths.
- The mockup's behaviour is the acceptance reference.
- Performance budget:
  - LCP under 2.5 s on the hero (badge and statement are text, so the screenshots load lazily except the first two stickers).
  - INP under 200 ms.
  - CLS under 0.1, with every image carrying its dimensions.
  - Motion code loads only on the client and only for the islands present.
- Accessibility:
  - WCAG 2.2 AA.
  - Every interaction reachable by keyboard: flip button, fan buttons with arrow keys, agenda rows on focus, sticker links.
  - `prefers-reduced-motion` renders final states, as the mockup does.
- Content replaced at launch: every sample name, metric, screenshot, photo, and the QR target (the list is in DESIGN.md).

## 10. Deployment and operations (Mac mini)

- Node LTS, then `pnpm build`.
- Two launchd agents, `com.portfolio.public` and `com.portfolio.admin`, both with `KeepAlive` and logs in `~/Library/Logs/portfolio/`.
- `tailscale funnel --bg 3000` publishes the public site. `tailscale serve --bg --https=8443 http://127.0.0.1:3001` makes the admin available on the tailnet only.
- `DATA_DIR` lives outside the repo, for example `~/portfolio-data`.
- Nightly backup at 02:30 by a launchd timer: `sqlite3 portfolio.db ".backup ..."` plus an rsync of `uploads/` and `cv/` to a backup folder that is also covered by Time Machine. The last 14 backups are kept.
- Update procedure: `git pull && pnpm install && pnpm build && pnpm db:migrate`, then restart both agents.
- Health: `/api/health` on each role. An optional launchd check restarts a process on failure.

## 11. Testing

- **Unit (Vitest)**:
  - Data access and CV profile resolution (fallback, ordering, show flags).
  - Slug generation.
  - Upload validation.
  - Session and lockout logic.
- **Integration**: role guard. Admin routes and actions return 404 or throw in `ROLE=public`. The revalidate endpoint rejects non-loopback requests and requests without the secret.
- **E2E (Playwright)**:
  - Public home renders seeded content.
  - Flip, fan, and agenda work by keyboard.
  - `/cv.pdf` downloads and is one page.
  - Admin flow: login, edit a project, public page shows the change after revalidate, build a CV profile, export PDF.
- **Visual**: desktop 1440, mobile 390, and the CV page compared against the mockup review captures, with reduced motion for full pages.

## 12. Milestones

1. **Scaffold + design system port**: Next.js app, tokens, fonts, static home from seed JSON matching the mockup, plus the mobile menu.
2. **Data layer**: Drizzle schema, migrations, and seed from the mockup's sample content. The home page renders from the DB.
3. **Public surfaces**: `/cv`, `/projects/[slug]` (after its mockup is approved), media route, SEO.
4. **Admin**: role split, tailnet guard, auth, editors, media upload, revalidation.
5. **CV builder + PDF**: profiles, preview, Playwright export, default `/cv.pdf`.
6. **Deploy**: launchd agents, Funnel/Serve, backups, runbook in README.
7. **Content swap**: real content entered via admin, sample flags cleared, and a final review against DESIGN.md.

## 13. Open items

- Case study page (`/projects/[slug]`) needs a mockup in the same world before milestone 3.
- Project motion clips (inspired by prompt-motion.com product UI videos): optional short muted loops per project, made from real screenshots with HTML + Playwright or Remotion, shown on hover with a still poster under reduced motion. Planned after real screenshots exist; out of v1 scope.
- The DESIGN.md ceiling notes (satin ribbons, real clip hardware) need raster assets if pursued.
- The availability dot stays as a real-state indicator driven by `profile.openToWork`. It is the single non-ultramarine hue and is documented as an exception.

## 14. Amendments (Plan 2)

Plan 2 (`docs/superpowers/plans/2026-11-14-plan-2-admin.md`) changed these points. This section wins over the text above where they differ.

- **No revalidate endpoint.** Public routes render per request and read SQLite directly, so the admin process does not call `/api/revalidate`, and `REVALIDATE_SECRET` is not used. If a public route is ever made static, it needs revalidation again.
- **No session secret.** Sessions are random 256-bit tokens stored as sha256 digests in `sessions`, so `SESSION_SECRET` from section 8 is not used. Like `REVALIDATE_SECRET`, it does not exist.
- **Migrations only from the CLI.** No process migrates at boot; `pnpm db:migrate` (and `pnpm db:seed`) do. The public role opens the existing file with `fileMustExist` and `PRAGMA query_only = ON`.
- **Tailnet identity.** The admin role compares `Tailscale-User-Login` with `ADMIN_TAILSCALE_LOGIN`, case-insensitively, and fails closed when it is unset. `next dev` skips the header check.
- **Reordering.** Uses Move up and Move down buttons, which are keyboard friendly and meet WCAG 2.2 SC 2.5.7. Drag can be added later on the same store call.
- **Selected work layout.** Follows position (wide, half, half, wide); `projects.layout` is stored but not edited.
- **Deferred columns.** `profile.remoteOk`, `achievements.category`, `achievements.mediaId` and `admin_user.totpSecret` wait until a surface uses them.
- **Case study content.** It is structured in the approved mockup (`mockup/project.html`), so its fields, editor and `/projects/[slug]` are built together in Plan 3. `caseStudyMd` is not edited in Plan 2.
- **Uploads.** They use a server action. `serverActions.bodySizeLimit` and `proxyClientMaxBodySize` are both `16mb`.
- **Security headers.**
  - CSP is set per request in `src/proxy.ts`: scripts by nonce plus `'strict-dynamic'`, styles `'self' 'unsafe-inline'` (React style attributes), and `frame-ancestors 'self'` for the Plan 4 CV preview.
  - HSTS, `nosniff`, `Referrer-Policy` and `Permissions-Policy` apply to both roles.
- **Milestones.** Plan 3 is the case study page plus SEO and the OpenGraph image. Plan 4 is the CV builder and PDF. Plan 5 is the deploy.
