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

`better-sqlite3` is pinned to `^12` on purpose: the v13 prebuilt binary segfaults on Node 23.1. On this Mac, building v12 from source needs the SDK's C++ headers on the include path:

```bash
CXXFLAGS="-isystem $(xcrun --show-sdk-path)/usr/include/c++/v1" pnpm rebuild better-sqlite3
```

Moving to Node LTS (planned for the Mac mini deploy) should let v13 be used.

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
