# Plan 1 follow-ups

These items were deferred during Plan 1 (Foundation + Public Site) execution and its reviews. Read this before writing Plan 2 and Plan 3.

**Status after Plan 2.** Every item under "Start of Plan 2" is done except these:
- `profile.remoteOk`, `achievements.category` and `achievements.mediaId` are deferred (spec section 14).
- FK and cascade tests: `deleteItem` now removes CV picks. A database-level foreign key is still not possible, because `cv_profile_items.item_id` points at six tables.

The "Plan 3 (CV builder + PDF)" section now belongs to Plan 4.

## Start of Plan 2 (admin)

- **Migrations.**
  - Split `openDb` into `openDb` and `migrateDb`, and add a `pnpm db:migrate` script (spec §10).
  - Open the DB read-only in the public role (`{ readonly: true, fileMustExist: true }`) so two processes never race migrations at boot (spec §3).
  - Migrations currently resolve from `process.cwd()/drizzle`, so deploy must keep cwd = repo root.
- **Server boundaries.** Add `import "server-only"` to `src/db/client.ts` and `src/content/*`.
- **First run.** An empty DB currently returns 500 on `/` and `/cv` (`getProfile` throws). Create a blank profile at setup, or render a minimal empty state.
- **Schema additions vs spec §4** (each is an additive migration):
  - `media.variants`
  - `profile.remoteOk`
  - `achievements.category` and `achievements.mediaId`
  - `activities.role` has no `host` value; it is handled by `roleLabel`.
- **Work grid layout.** `projects.layout` is stored per project, but the grid rhythm is wide/half/half/wide by position. Either derive the layout from position or validate it in the editor.
- **Input validation in the editors:**
  - `fieldColor` must be a hex colour.
  - `cardArt` must be numeric, and its path syntax checked.
  - URLs must be http(s) only.
  - Copy must contain no em or en dashes.
  - Normalise `displayUrl` input (uppercase scheme, repeated slashes).
- **Tests to add:**
  - An e2e tripwire that fails on `pageerror` or console errors for `/` and `/cv`. `HomeMotion` swallows init failures by design.
  - `@axe-core/playwright` scans at 1440 and 390.
  - A keyboard test for agenda rows.
  - Content tests that prove the 4-project cap and `showOnSite` filtering for every list.
  - FK and cascade tests once editors delete rows.
- **Uploads.**
  - `safeJoin` is lexical only. Uploads must use generated names and never follow symlinks.
  - Add a one-line rationale or rule override for the 5 `@next/next/no-img-element` warnings when media variants land.
- **Dev only.** `getDb` uses a module cache, which may reopen under HMR. A `globalThis` cache fixes it.

## Plan 3 (CV builder + PDF)

- **`CvDocument` styles.**
  - `CvDocument` depends on `src/app/cv/cv.css`, the `site.css` tokens (`--ground`, `--ink`, `--ink-2`) and the root-layout font. Move the sheet rules into `src/components/cv/cv.css`, imported by `CvDocument`.
  - Define the needed tokens on `.cv-sheet`, or keep the print route under the root layout.
- **CV profiles in the DB.**
  - Add a unique index on `cv_profile_items (profile_id, item_type, item_id)` and an index on `profile_id`.
  - Add a partial unique index so only one CV profile can be the default.
- **CV tests.** Add `getCvContent` tests for `summaryOverride`, a non-default slug, and the no-default-profile path.
- **Hero seal.** The hero seal uses the first achievement with `sealText`. The spec says "top winner", so constrain it in the editor.

## Plan 5 deploy checks (from Plan 2)

- **Host forwarding.** `tailscale serve` must forward the browser's host with its port (`Host` or `X-Forwarded-Host` equal to `<node>.<tailnet>.ts.net:8443`). Otherwise both `sameOrigin` (`src/auth/admin.ts`) and Next's own server-action origin check refuse every action. Verify it on the Mac mini. If the port is dropped, set `serverActions.allowedOrigins` accordingly.
- **Bind address.** Start the admin process with `-H 127.0.0.1`. Any local process can forge `Tailscale-User-Login`, so locally the password is the real barrier.
- **Shared hostname.** Cookies ignore ports, so `pf_admin` is also sent to the Funnel-facing public process on :443 of the same hostname. That is harmless (the cookie is HttpOnly and the public role ignores it). Possible hardening: a separate admin hostname, or a `__Host-` cookie prefix.
- **Rebuilds.** A rebuild or restart with a new build invalidates open editor tabs, because server action ids and bound-argument encryption are per build. Reload the tab after a deploy. Optionally set `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` so bound arguments survive a rebuild.

## Polish (any later plan)

- **Motion.**
  - Handler-created tweens accumulate in the GSAP context (`ctx.data`) during long resize or hover sessions. Prune them in a gsap-native way, and keep the Task 11 cleanup guarantees.
  - A soft navigation from `/cv` to `/` skips the head `motion-pending` script, so the old brief hero flash can still appear there.
  - Nothing tests the pre-paint hold or the 2.5s no-JS fallback.
  - The entrance drop can race the physics ticker. The mockup has the same race.
  - A resize re-announces the fan live caption. Only call `setCaption` when `active` changes.
- **Nav and mobile menu.**
  - `.nav:focus-within` keeps the nav shown after a mouse click on a link. Consider `:has(:focus-visible)`.
  - The mobile menu does not reset when the viewport widens past 860px, and it has no click-outside close.
  - The menu label swaps between Menu and Close while also setting `aria-expanded`.
- **CV page.**
  - `.cv-bar` is defined in two rules.
  - The CV button keeps the `.btn-stock` shadow.
  - `cv.css` has global `@page` and `body` print rules.
- **Seed data.**
  - The seed-data comment "by rank, then recency" does not match the order (AWS is placed second).
  - The seed test does not assert pick type, pick order, or `metricIsSample`.
- **Native module.** `better-sqlite3` is pinned to ^12 because v13 crashes on Node 23.1. Move to Node LTS at deploy (Plan 5) and retry v13.
