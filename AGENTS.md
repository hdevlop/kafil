<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kafil

Accountability-first sponsorship platform. Bun workspace with a single Next.js 16 runtime.

## Toolchain

- **Package manager:** `bun@1.3.14`. Use `bun install`, `bun run`, `bun test`. Never use npm/yarn/pnpm.
- **`.env`** is loaded explicitly via `--env-file=.env` in root workspace scripts. Next.js does not auto-load it. The file is in `.gitignore`; copy `.env.example` when setting up.
- **Runtime:** single Next.js process. There is no second API server.
- **Next.js 16 quirks:** `next.config.ts` (not `.mjs`), `serverExternalPackages: ["reflect-metadata"]`, `distDir` defaults to `.next`.

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
bun run check        # lint → typecheck → test → build (the full gate)
bun run lint         # eslint across all three packages
bun run typecheck    # tsc --noEmit across all three packages
bun run test         # bun test across all three packages
bun run build        # production build (apps/web only)
```

Run just one package's gate:

```bash
bun run --cwd apps/web test
bun run --cwd packages/server typecheck
```

The DB integration test requires PostgreSQL and an opt-in env var:

```bash
bun run test:db     # sets KAFIL_RUN_DB_INTEGRATION=1, runs concurrency tests
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

```bash
bun run seed              # interactive Clack menu (TTY required)
bun run seed -- setup     # non-interactive: migrate + seed auth (use --yes to skip confirm)
bun run seed -- demo      # seed demo fixtures (families, sponsors, operators, contributions)
bun run seed:full         # migrate + seed auth + demo data, non-interactive with --yes
bun run seed -- demo --families=10 --contributions=0
```

SMS-style count args (`--families=5`) work with or without the `--` separator.

The `full` and `setup` commands clear application data. In non-interactive (non-TTY) environments they require `--yes` or they throw.

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

### Naming conventions

- **TypeScript files and identifiers:** camelCase
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

Public registration creates sponsor accounts only. Family accounts are created by operators via Najm `provisionUser` (no stored password).

## Security notes

- Authorization lives in the backend (`@Can*` decorators, guards). Do not rely on hiding UI buttons.
- Family guardian CIN, address, and documents are sensitive. They must never appear in sponsor responses, audit outbox metadata, or logs.
- `NAJM_ENCRYPTION_KEY` is 64 hex characters. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be ≥32 characters.

## Form-fill shortcut

In dev mode (`NEXT_PUBLIC_FORM_FILL_ENABLED` not `false`), pressing `F8` in a dashboard data-entry form fills it with Moroccan-friendly test data. Production builds disable this automatically.

## Roadmap

The active roadmap is `docs/PLAN.md`. Only Phase 7 (Reports, Operations, and Release) remains open. See `docs/plans/README.md` for section plans.

## Verification gate (run after every implementation slice)

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```
