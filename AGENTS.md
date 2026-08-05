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
- **Full stack:** read both skills before a slice touches frontend and backend.

Follow the relevant skill throughout the task, not only during planning. If a
skill conflicts with an explicit user instruction, follow the user and report
which skill validation or convention was intentionally skipped.

## Toolchain

- **Package manager:** `bun@1.3.14`. Use `bun install`, `bun run`, `bun test`. Never use npm/yarn/pnpm.
- **`.env`** is loaded explicitly via `--env-file=.env` in root workspace scripts. Next.js does not auto-load it. The file is in `.gitignore` and there is **no root `.env.example`** — the committed templates are `deploy/env/app.env.example` and `deploy/env/infrastructure.env.example`.
- **Runtime:** single Next.js process. There is no second API server.
- **Next.js 16 quirks:** `next.config.ts` (not `.mjs`), `serverExternalPackages: ["reflect-metadata"]`, `distDir` is `KAFIL_NEXT_DIST_DIR ?? ".next"`.
- **UI library:** `najm-kit`. Najm packages are pinned by root `overrides` (`najm-core`, `najm-auth`, `najm-database`, `diject`). Read installed declarations for contracts — `docs/plans/NAJM-STACK.md` lists older versions and is not authoritative for version numbers.

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

Uploaded images (branding, product, category, child, family, sponsor, staff,
order evidence) are normalized through `packages/server/src/storage/managedImages.ts`
and written under the gitignored root `/storage/` directory. Delivery is
protected — routes return raw bytes with explicit MIME and cache headers, never
a public static path. Use `bun run images:backfill` after changing normalization.

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

The active roadmap is the root **`PLAN.md`** ("Kafil Remaining Work Plan").
Its one companion is the root **`PAGINATION-PLAN.md`**, which carries the
cross-repository list continuation, container height, and result total work
owned by `PLAN.md` Phase 2.

`docs/plans/` now holds only `NAJM-STACK.md` and a `README.md` index. That index
still links `docs/PLAN.md`, `DECISIONS.md`, and `sections/*.md`, none of which
exist any more — treat those links as dead and use root `PLAN.md` instead.

Screenshot and browser evidence for completed work lives in `docs/evidence/`.

## Verification gate (run after every implementation slice)

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

`db:generate` must produce no new migration for a frontend-only change. If it
does, stop and investigate schema drift.
