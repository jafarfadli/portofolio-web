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

### Native module note

`better-sqlite3` is pinned to `^12` on purpose: the v13 prebuilt binary segfaults on Node 23.1. On macOS when Node is older than 23.6, building v12 from source needs the SDK's C++ headers on the include path:

```bash
CXXFLAGS="-isystem $(xcrun --show-sdk-path)/usr/include/c++/v1" pnpm rebuild better-sqlite3
```

Moving to Node LTS should let v13 be used.

## Test

```bash
pnpm exec playwright install chromium   # once, for e2e
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm test               # unit (vitest)
pnpm e2e                # end-to-end (playwright, seeds .data-e2e, serves :3100)
VISUAL=1 pnpm e2e tests/e2e/visual.spec.ts   # comparison captures in test-results/visual
```

## Data

- `DATA_DIR` (default `./.data`) holds `portfolio.db` and `uploads/`. It is never committed.
- No server migrates at boot. Run `pnpm db:migrate` after pulling schema changes; `pnpm db:seed` also migrates.
- The public role opens the database query-only; only the editor (`ROLE=admin`) writes.
- The schema lives in `src/db/schema.ts`. After changing it, run `pnpm db:generate` and commit `drizzle/`.

All seeded content is sample data. It must be replaced before launch; see the list in `DESIGN.md`.

## Editor (admin)

One build runs twice. The editor is the same app with `ROLE=admin`, reachable only inside the tailnet (`tailscale serve`, never Funnel).

```bash
pnpm db:seed                 # or pnpm db:migrate on a real database
ROLE=admin pnpm dev -p 3001  # http://localhost:3001/admin
```

- **`next dev`.** It skips the tailnet identity check, so the editor opens in a local browser.
- **`next start`.** The editor needs `ADMIN_TAILSCALE_LOGIN` set to the owner's Tailscale login (for example `you@github`). Every request must carry the `Tailscale-User-Login` header that `tailscale serve` adds. Without both, every `/admin` page is a 404.
- **First run.** `/admin` asks you to set a password (at least 12 characters).
- **Locking.** Five wrong passwords in 15 minutes lock sign-in for 15 minutes.
- **Sessions.** A session lasts 14 days from the last use.
- **Forgot the password.** There is no email reset. On the Mac mini, `DATA_DIR` lives in the launchd environment, not your shell. From the repo root (or with `DATA_DIR` set to the data folder), run `sqlite3 "${DATA_DIR:-./.data}/portfolio.db" "delete from sessions; delete from admin_user;"`, then open `/admin` to set a new one.
- **Uploads.** Images are re-encoded to WebP, with resized copies at 480, 960 and 1600 px (only for widths smaller than the original), under `DATA_DIR/uploads`. Location data is removed.
- **Saving.** A save shows on the public site on the next page load. Public pages read the database on every request.
