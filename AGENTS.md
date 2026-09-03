<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kafil

Accountability-first sponsorship platform. Bun workspace with a single Next.js 16 runtime.

## Required project skills

These repository-local skills are mandatory implementation instructions:

- **Frontend:** read `.agents/skills/kafil-najm-frontend/SKILL.md` completely
  before changing or reviewing routes, pages, components, forms, tables,
  dialogs, state, frontend authorization presentation, localization, or browser
  workflows in `apps/web`.
- **Backend:** read `.agents/skills/kafil-najm-backend/SKILL.md` completely
  before changing or reviewing controllers, DTOs, guards, services,
  repositories, schemas, migrations, auth/permissions, MCP, audit/outbox,
  storage, seed definitions, or backend/database tests.
- **Browser acceptance:** read
  `.agents/skills/kafil-playwright-testing/SKILL.md` completely before changing
  or reviewing Playwright specs, E2E runners, browser diagnostics, connected
  acceptance journeys, or responsive/RTL/keyboard browser evidence.
- **Full stack:** read the frontend and backend skills before a slice touches
  both layers; add the browser-acceptance skill when that slice includes E2E.

Follow the relevant skill throughout the task, not only during planning. If a
skill conflicts with an explicit user instruction, follow the user and report
which skill validation or convention was intentionally skipped.

## Toolchain

- **Package manager:** `bun@1.3.14`. Use `bun install`, `bun run`, `bun test`. Never use npm/yarn/pnpm.
- **`.env`** is loaded explicitly via `--env-file=.env` in root workspace scripts. Next.js does not auto-load it. The file is in `.gitignore`; the committed template beside it is the root **`.env.example`**, and `deploy/env/app.env.example` plus `deploy/env/infrastructure.env.example` cover deployment. Both are `bun --env-file=.env` wrappers, but a missing file is tolerated rather than fatal: `bun run db:generate` needs nothing from it (`drizzle.config.ts` falls back to a local URL and `generate` never connects), and `bun run build` only needs values — supply the same throwaway set the Dockerfile build stage uses and it completes offline. The guarded remote acceptance runner is the one path that genuinely requires a real root `.env`.
- **Runtime:** single Next.js process. There is no second API server.
- **Next.js config:** `apps/web/next.config.ts` is one line, `export { default } from "najm-next/config"`. `najm-next` owns `distDir` (`NAJM_NEXT_DIST_DIR ?? ".next"`), the workspace root pinned for both `turbopack.root` and `outputFileTracingRoot` (a parent `bun.lock` otherwise wins automatic detection), the `/sw.js` headers, `poweredByHeader: false`, the image cache TTL, and `reflect-metadata` externalization. `allowedDevOrigins` is empty unless `NAJM_NEXT_DEV_ORIGINS` names hosts — that is the phone-testing knob. Do not add keys to the file; an app that genuinely diverges uses `defineNajmNextConfig` from `najm-next/configurable`, and deployment CSP/HSTS stays at the edge.
- **UI library:** `najm-kit`. Najm packages are pinned by root `overrides` (`najm-core`, `najm-auth`, `najm-database`, `najm-mcp`, `najm-next`, `najm-storage`, `najm-theme`, `diject`). Read installed declarations for contracts — `docs/plans/NAJM-STACK.md` lists older versions and is not authoritative for version numbers.

## Workspace layout

```
apps/web/          Next.js landing, dashboards, catch-all /api
packages/server/   Najm backend (controllers, services, repos, Drizzle schema)
packages/seed/     CLI for roles, permissions, admin, and demo fixtures
```

- `apps/web` depends on `@kafil/server` and `@kafil/seed` via `workspace:*`.
- `packages/seed` depends on `@kafil/server` via `workspace:*`.

## Commands

```bash
bun run dev          # Start Next.js dev server (loads .env)
bun run dev:https    # Same, with --experimental-https for phone testing
bun run start        # Serve the production build (loads .env)
bun run check        # lint → typecheck → test → build
bun run lint         # eslint across all three packages
bun run typecheck    # tsc --noEmit across all three packages
bun run test         # bun test across all three packages
bun run build        # production build (apps/web only)
```

`check` does **not** run `db:generate`. Use the full gate at the bottom of this
file to close an implementation slice.

Never run `next dev` directly inside `apps/web` — it bypasses the root `.env`
loader and leaves email and other services unconfigured.

Run just one package's gate:

```bash
bun run --cwd apps/web test
bun run --cwd packages/server typecheck
```

The DB integration test requires PostgreSQL and an opt-in env var:

```bash
bun run test:db     # sets KAFIL_RUN_DB_INTEGRATION=1, runs concurrency tests
```

Browser tests are Playwright, live in `apps/web/test/e2e/`, and are **not** part
of `bun run test`. Their runner boots its own Next.js server on `127.0.0.1:3210`
and needs a real database:

```bash
bun run --cwd apps/web test:e2e             # full browser suite
bun run --cwd apps/web test:e2e:form-fill   # F8 form-fill workflow only
bun run --cwd apps/web smoke:phase6         # fast smoke pass
```

Operational scripts:

```bash
bun run contributions:expire   # batch-expire contributions (also a systemd timer)
bun run images:backfill        # normalize/backfill existing managed images
bun run theme:backfill         # dry-run the najm-theme data move; --apply writes
```

## Database and migrations

- **ORM:** Drizzle (`drizzle-orm` + `drizzle-kit`), dialect `postgresql`.
- **Schema entrypoint:** `packages/server/src/database/schema.ts` — composition only, re-exports from feature modules.
- **Migrations dir:** `packages/server/migrations/`.
- **Golden rule:** never edit a deployed migration. Generate a new one after schema changes:

```bash
bun run db:generate   # runs drizzle-kit generate inside packages/server
bun run db:migrate    # applies pending migrations
bun run db:studio     # opens Drizzle Studio
```

`db:generate` may require interactive input if Drizzle detects a rename vs. create ambiguity. Record the decision in the phase evidence.

## Server tests

`packages/server` tests compile first to `dist/`, then run from there:

```
tsc -p tsconfig.test.json && bun test --preload ./dist/test/setup.js ./dist/test
```

This means **`packages/server/dist/` is a build artifact** — don't edit files there. `tsconfig.test.json` emits to `outDir: "./dist"` with `rootDir: "."`, so test files end up at `dist/test/`.

## Seed CLI

Commands: `full`, `setup`, `demo`, `remove`, `migrate`, `admin`, `categories`,
`products`, `verify`, `images`.

```bash
bun run seed              # interactive Clack menu (TTY required)
bun run seed -- setup     # non-interactive: migrate + seed auth (use --yes to skip confirm)
bun run seed -- demo --families=10 --contributions=0
```

Most commands also have a direct root script, which is the preferred form:

```bash
bun run setup         # migrate + seed auth, already passes --yes
bun run seed:full     # migrate + seed auth + demo data, already passes --yes
bun run seed:demo     # demo fixtures (families, sponsors, operators, contributions)
bun run seed:remove   # remove demo data
bun run seed:migrate  # migrations only
bun run seed:admin    # bootstrap admin identity
bun run seed:products # catalog products
bun run seed:images   # fixture images
bun run seed:verify   # verify roles, permissions, and grants
```

Count args (`--families=5`) work with or without the `--` separator.

`full`, `setup`, and `remove` clear application data. In non-interactive (non-TTY) environments they require `--yes` or they throw.

## Architecture patterns

### API routing

`apps/web/src/app/api/[...route]/route.ts` is the single backend entrypoint. It imports `server` from `@kafil/server` and passes it to Najm's `handle(server)`. All HTTP methods (GET/POST/PUT/PATCH/DELETE) are exported. The route runs as `nodejs` runtime with `force-dynamic`.

### Backend module structure

Each feature module in `packages/server/src/modules/<feature>/` follows Najm conventions:

```
<feature>Controller.ts    # decorated route handlers
<feature>Dto.ts           # validation schemas (zod)
<feature>Guards.ts        # access control
<feature>Repository.ts    # database queries
<feature>Schema.ts        # Drizzle table definitions
<feature>Service.ts       # transactional business logic
<feature>Validator.ts     # domain validation
index.ts                  # barrel export
```

The `najm-core` framework owns auth, RBAC, PBAC, sessions, and ownership. Do not duplicate these in the application layer.

### Frontend feature structure

Route files under `apps/web/src/app` stay thin. Feature code lives in
`apps/web/src/features/<Feature>/`:

```
components/    page + form + dialog components
hooks/         useX data hooks, useXTableFilters, useXWorkspace
lib/           view-model builders and feature-local helpers
config/        column/field/table definitions
types.ts       feature types (may split, e.g. familyTypes/sponsorTypes)
index.ts       barrel export
```

Cross-feature code goes to `apps/web/src/shared` (Authorization, DashboardShell,
PageState, StatusBadge, ProtectedImage), `src/hooks` (`useEntityQuery`,
`useEntityCommand`, query keys), `src/lib` (formatters, pagination, session), and
`src/services` (typed API clients).

One page component per product surface. Do not fork admin/operator/family/sponsor
copies of the same page — gate controls inside it instead.

### Naming conventions

- **Backend modules, hooks, helpers, and identifiers:** camelCase
- **Frontend feature directories and React components:** PascalCase (`features/SupportAssignments/components/SupportAssignmentForms.tsx`)
- **PostgreSQL tables and columns:** snake_case
- **Schema files:** re-export tables from feature modules; `packages/server/src/database/schema.ts` composes them

### Financial invariants

- All money is integer **minor units** (MAD). Floating-point money is forbidden.
- `availableMinor >= 0`, `reservedMinor >= 0`, `spentMinor >= 0` always.
- Ledger entries are append-only with unique idempotency keys.
- Budget mutations lock the account row (`FOR UPDATE`) in one transaction with the ledger append.
- **Never expose a generic update that lets callers set balances or statuses.** Use explicit command methods (e.g. `approve()`, not `updateStatus("approved")`).

### Cross-resource lock order

When a mutation touches both inventory and budget, always lock **inventory first, then budget**. This avoids deadlocks between concurrent transactions.

### Role model

- `admin` — hidden bootstrap super-role (emergency only)
- `operator` — manages families, sponsors, assignments, contributions, catalog, orders
- `family` — self-service for budget, cart, orders (profile created by operators)
- `sponsor` — self-registration, contributions to supported families, privacy-safe usage views

Public registration creates pending applicant identities only. Approval later
creates the sponsor account and profile. Family accounts are created by
operators via Najm `provisionUser` (no stored password).

`staff` is a **profile entity**, not a role — staff records carry delivery
assignment and are managed by operators under the `staff` permissions.

### Localization

Four locales: `en`, `fr`, `ar`, `es`. Server strings live in
`packages/server/src/locales/*.json` and are covered by a parity test
(`packages/server/test/locale-parity.test.ts`) — add a key to every locale or the
suite fails. Arabic means RTL must be verified for any layout change.

### Managed images and storage

Uploaded images (product, category, child, family, sponsor, staff, order
evidence) are normalized through `packages/server/src/storage/managedImages.ts`
and written under the gitignored root `/storage/` directory. Delivery is
protected — routes return raw bytes with explicit MIME and cache headers, never
a public static path. Use `bun run images:backfill` after changing normalization.

**Branding assets are not in that list.** They belong to `najm-theme`, which
writes them through `najm-storage` into the `theme-branding-platform`
namespace under the same `/storage/` root. Do not point `images:backfill`,
`managedImages`, or any Kafil cleanup job at them — the package records each
asset's MIME type and byte count and serves it under an immutable cache, so
re-encoding a file behind it leaves the slot record describing something else.
`POST /api/branding/assets/reconcile` is the branding equivalent.

### Platform theming

Appearance, theme presets, and branding assets are `najm-theme@0.2.0`.

The factory theme is one directory, `packages/server/theme/`:

```
theme/index.ts                    defineTheme(import.meta.url)
theme/theme.json                  the design the build ships with
theme/sidebar-logo-expanded.webp  the four fixed names, PNG or WebP
theme/sidebar-logo-collapsed.webp
theme/auth-logo.webp
theme/auth-hero.webp
```

The file names are the package's contract — do not rename them, and do not add
a fifth. Both `packages/server` and `apps/web` import the definition as
`@kafil/server/theme`; **never by a relative path**. `defineTheme` resolves the
directory from `import.meta.url`, and `packages/server`'s test runner compiles
to `dist/`, so a relative import would emit a copy next to no assets and fail
at boot. The bare specifier survives compilation and resolves to the source.

The three logo files are byte-identical on purpose: 0.2.0 requires a file per
slot, replacing the `inheritFrom` graph that used to give the collapsed rail
and the sign-in page the expanded mark for free.

Kafil owns only configuration: `packages/server/src/config/themeConfig.ts`
(guards, ceilings, storage, audit, MCP, `basePath`),
`packages/server/theme/index.ts` (the directory above),
`apps/web/src/lib/serverTheme.ts` (one module-scope RSC bootstrap), and the
composition inside `GlobalSettingsSheet`.

Branding marks render with `<NThemeImage slot="..." />` from `najm-theme/react`,
under the single `NThemeBrandingProvider` mounted in `AppProviders`. There is no
Kafil branding-image component and no public factory path: factory bytes are
served from `/api/branding/factory/<slot>-<hash>.<ext>` by the definition
itself, under an immutable cache. Do not reintroduce a `BrandingImage` wrapper,
a `FACTORY_*_PATH` constant, or a `public/` brand file.

Do not reintroduce an appearance/branding/preset controller, service,
repository, DTO, validator, API client, query key, hook, or editor context.
`apps/web/test/theme-adoption.test.ts` and
`packages/server/test/theme-adoption.test.ts` pin that boundary.

Routes are `/api/appearance`, `/api/branding`, and `/api/presets` — the plugin
is mounted with an empty `basePath` so the first two keep the paths Kafil
already published. `/api/theme-presets` and `/api/branding/assets/serve/:f`
redirect for the rollback window and are removed with the legacy column drop.

The seven legacy `platform_settings` theme columns and the `theme_presets`
table are still in the schema on purpose and are read by nothing. Run
`bun run theme:backfill` (dry) then `--apply` to move the data.

## Security notes

- Authorization lives in the backend (`@Can*` decorators, guards). Do not rely on hiding UI buttons.
- Family guardian CIN, address, and documents are sensitive. They must never appear in sponsor responses, audit outbox metadata, or logs.
- `NAJM_ENCRYPTION_KEY` is 64 hex characters. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be ≥32 characters.

## Form-fill shortcut

The persisted F8 form-fill shortcut is disabled by default. Operators and admins can enable it from `/operator/settings`; supported browser forms then fill with Moroccan-friendly test data without a Docker rebuild or restart.

## Deployment

Production is Docker on a VPS: `Dockerfile` (multi-stage, `oven/bun:1.3.14`),
`compose.production.yml`, and `deploy/` (Caddyfile, env templates, systemd units
for backup and contribution expiry). Shell helpers live in `scripts/`
(`deployVps.sh`, `backupVps.sh`, `bootstrapVpsSecrets.sh`,
`verifyVpsDeployment.sh`, `restoreRehearsalVps.sh`).

The build stage supplies throwaway secrets so `bun run build` can run without a
real environment. Never treat those values as valid at runtime.

## Roadmap

There is **no root `PLAN.md`** and no root `PAGINATION-PLAN.md`. Both were
deleted in `b60f493`. Do not recreate either one, infer a phase status from a
document that is not present, or claim root-roadmap completion.

The only plan at the root is
**`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`**, the active guarded remote VPS
acceptance journey. Do not add a second root plan or companion sub-plan; keep
current status, recovery instructions, and browser evidence boundaries in that
one document.

`docs/plans/` holds only `NAJM-STACK.md` and a `README.md` index. That index
still links `docs/PLAN.md`, the root `PLAN.md`, `DECISIONS.md`, and
`sections/*.md`, none of which exist — treat every one of those links as dead.

Screenshot and browser evidence for completed work lives in `docs/evidence/`.

## Verification gate (run after every implementation slice)

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

`db:generate` must produce no new migration for a frontend-only change. If it
does, stop and investigate schema drift.
