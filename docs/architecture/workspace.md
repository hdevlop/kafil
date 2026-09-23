# Kafil workspace architecture

Kafil is one Bun workspace. A single Next.js process serves the web app and
the API; the notification worker, contribution expiry, migrations and seed
commands are separate Bun processes that reuse server code. Package
directories describe code ownership and reuse. They are not process or
security isolation.

This is the shared standard for Bun + Next.js + Najm applications. School
implements the same contract with `apps/dashboard` and `@sms/*`.

## Ownership

| Package | Owns | Exports |
| --- | --- | --- |
| `apps/web` (`@kafil/web`) | Routes, UI, feature-owned client state, product policy, Najm composition (`AppProviders.tsx`, `najm.config.ts`, `najm.auth.ts`, `najm.server.ts`) | Nothing; it is the application |
| `packages/contracts` (`@kafil/contracts`) | Browser-safe shared code: the locale catalog, profile phone normalization, the currency constant | `./locales`, `./phone`, `./money/constants` (no root barrel) |
| `packages/server` (`@kafil/server`) | Persistence, domain services and DTOs, backend configuration, workers, the factory theme directory | `.`, `./theme`, `./config`, `./database`, `./database/schema`, `./managed-images`, `./modules` |
| `packages/seed` (`@kafil/seed`) | Setup, fixtures and maintenance commands | Commands only |

Private workspaces export TypeScript source. Next compiles the server and
contracts for the web/API application, and Bun runs worker and CLI source
directly. The server's test runner still compiles tests to
`packages/server/dist` for decorator metadata. That output is test-only: it
is cleared before every run, and nothing at runtime reads it. Backend
validation that wraps a shared helper stays in the server. `phoneDto` wraps
`normalizePhone`, and the money DTOs use `KAFIL_CURRENCY`.

## Dependency direction

| Consumer | May import |
| --- | --- |
| Browser code: every `"use client"` module and everything it imports | `@kafil/contracts` and browser-safe packages |
| Server components, route handlers, `najm.server.ts` | Contracts and `@kafil/server` exports |
| `@kafil/server`, including workers | Contracts; never web or seed |
| `@kafil/seed` | Server and contracts exports |
| `@kafil/contracts` | No workspace package; only `najm-i18n/define` |

Every cross-package import names the package and one of its declared
`exports`, and the importing package declares the dependency. Relative paths,
aliases and unexported subpaths into another package are rejected.

`bun run test:boundaries` runs `scripts/check-workspace-boundaries.mjs` with
the policy in `scripts/workspace-boundaries.config.mjs`. The checker file and
its tests are the same files School uses.

- It resolves every import the way TypeScript does: tsconfig paths, relative
  files and package `exports`. It covers static and side-effect imports,
  re-exports, literal dynamic imports and `require`.
- From each `"use client"` module it follows runtime edges through workspace
  files. It fails on server or seed code, `server-only` modules, Node or Bun
  built-ins, server-only packages, and computed module loading, and it prints
  the full import chain.
- Type-only edges still obey package direction. A type-only import from a
  browser graph into the server is reported separately.
- `scripts/tests/workspace-boundaries.test.mjs` runs the real checker and
  policy against fixture workspaces for every rule.

ESLint's `no-restricted-imports` blocks in `eslint.config.mjs` stay as fast
editor-time hints for the same direction.

## Root command contract

| Command | Outcome |
| --- | --- |
| `bun install --frozen-lockfile` | Installs the committed workspace graph. |
| `bun run dev` / `dev:https` | Starts Next directly; server, contracts and catalog edits reach the running app. |
| `bun run build` | Produces the production Next.js build. |
| `bun run start` | Starts the existing production build without compiling. |
| `bun run lint` | Lints web, contracts, server, seed and the boundary checker. |
| `bun run typecheck` | Typechecks contracts, web (after `next typegen`), server and seed. |
| `bun run test` | Safe package tests, then `test:boundaries`; browser and database suites stay explicit. |
| `bun run check` | Lint, typecheck, safe tests and build. |
| `bun run db:generate` | Kafil's required schema gate: it must produce no migration for non-schema work. |

Database, seed, backfill, expiry, notification and connected-acceptance
commands are operational and keep their documented effects. They are never
folded into `check`.

## Environment and packaging

`apps/web/.env.local` is the sole local file, and its placeholder template
sits beside it. Next loads it from the app directory, and root operational
commands pass the same path explicitly. Existing process variables win, and
CI and production may inject every value without a local file. Production
keeps `/opt/kafil/env/app.env` through Compose.

The image installs from every workspace manifest, including contracts, carries
the whole installed tree forward (Kafil uses Bun's isolated linker, so every
workspace has its own `node_modules` links), and builds only the Next app.
The runtime stage carries the web build plus the contracts, server and seed
workspaces needed by the web, worker, migration and scheduled commands.

## Checklist for a new application

1. Create `apps/web` (routes, UI, `providers/AppProviders.tsx`,
   `najm.config.ts`, `najm.auth.ts`, `najm.server.ts`) and
   `packages/{contracts,server,seed}`. Use `tsconfig.base.json` at the root.
   Create files only for responsibilities you actually have.
2. Give each private package explicit source `exports` (`types` and `default`
   pointing at `src/*.ts`), one subpath per real consumer.
3. Put catalogs, shared domain values and pure helpers in contracts. Put
   persistence, services, DTOs, configuration and workers in server.
4. Mount one `NajmAppProvider`. Define auth once, and keep one module-scope
   session adapter and one preference source. `next.config.ts` re-exports
   `najm-next/config`.
5. Keep one env file, `apps/web/.env.local`, with a tracked template.
   Operational scripts pass it explicitly, and injected values win.
6. Expose the root commands above, adding only product gates that have
   meaning.
7. Copy `scripts/check-workspace-boundaries.mjs` and its tests, write the
   app's policy file, and run it in `test`.
8. In the image, copy every workspace manifest into the install stage, carry
   the installed tree forward, and list exactly what each runtime command
   reads.
