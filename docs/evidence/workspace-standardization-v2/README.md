# Workspace standardization v2 — Kafil evidence

Plan: `WORKSPACE-STRUCTURE-STANDARDIZATION-PLAN.md` in the sibling School
repository, which coordinates both repositories. Recorded 2026-09-22 on the
maintainer's Windows workstation. Secret-free: runtime probes used a throwaway
PostgreSQL cluster and synthetic values, and `apps/web/.env.local` was never
read or printed.

Gate states: **passed**, **failed**, **blocked** (the environment cannot run
it), **not run** (deliberately skipped, with the reason).

## Baseline

| Item | Value |
| --- | --- |
| Branch / HEAD | `main` / `a9152ea87e4d0e4bded0824827694fc242411927` |
| Dirty tree at start | 22 paths, all v1 environment-migration work (app-local env file, loaders, runner tests, docs, `workspace-environment.test.ts`). Preserved; nothing reverted or staged. |
| Toolchain | Bun 1.3.14, Node 24.16.0, Next 16.2.12, TypeScript 5.9.2; Najm pins and overrides unchanged |
| Docker | Not installed on this workstation |

Baseline gates on the dirty tree, before any v2 edit: `bun run lint` 0,
`bun run typecheck` 0, `bun run test` 0 (web 516, server 456 pass / 84
skipped, seed 120 pass / 13 skipped).

## What changed

- **`@kafil/contracts`** (new, source exports, no root barrel):
  `./locales` (the catalog and its `index.ts`, moved unchanged from the
  server), `./phone` (`normalizePhone`), and `./money/constants`
  (`KAFIL_CURRENCY`). Its only dependency is `najm-i18n` 2.1.2 for
  `najm-i18n/define`.
- **Server** imports the catalog, `normalizePhone` and `KAFIL_CURRENCY` from
  contracts. `phoneDto` and the money DTOs stay in the server as the backend
  validation boundary. The `./locales`, `./phone`, `./money` and
  `./money/constants` server exports were removed after all 33 web consumers
  and the server tests moved, so no transitional re-export remains.
- **Tests moved with their subject.** `locale-parity.test.ts` and the phone
  normalization case moved to `packages/contracts/test`, and two web tests
  that read catalog files by path now point at contracts. The server test
  scripts now run `rm -rf dist` before compiling: without that, the removed
  parity test kept passing from stale compiled output, which would hide a lost
  or broken test.
- **Boundary checker.** `scripts/check-workspace-boundaries.mjs` and
  `scripts/tests/workspace-boundaries.test.mjs` are byte-identical to School's;
  `scripts/workspace-boundaries.config.mjs` holds Kafil's policy. Root `test`
  runs them through `test:boundaries`. The directory-scoped ESLint
  restrictions stay as editor hints, with contracts added.
- **Root commands.** `lint`, `typecheck` and `test` now include contracts, and
  `lint` includes the checker. ESLint's package config now covers
  `scripts/**/*.mjs`.
- **Dockerfile.** The install stage copies the contracts manifest. The build
  stage carries the whole installed tree forward instead of listing
  per-workspace `node_modules` (Kafil uses Bun's isolated linker, so contracts
  now has its own). The runtime stage copies `packages/contracts`.
- **Lockfile.** Changes only add the contracts workspace entry and its
  declarations; no version changed.
- **Docs.** AGENTS.md (layout, dependency direction, localization, server test
  note; also corrects a stale claim that web depends on seed),
  `docs/architecture/workspace.md` (with the new-app checklist), and a
  contracts README.

## Gates after the change

Working tree:

| Command | Exit | Result |
| --- | --- | --- |
| `bun run lint` | 0 | Web, contracts, server, seed and checker |
| `bun run typecheck` | 0 | Contracts, web (after `next typegen`), server, seed |
| `bun run test` | 0 | Contracts 8; web 516; server 450 pass / 84 skipped; seed 120 pass / 13 skipped; boundary fixtures 23 pass / 1 skipped (School-only lookup rule); real graph 837 files, 212 client entries |

Server 450 equals the 456 baseline minus the five parity tests and one phone
case, which now run in contracts (8 tests, 10,071 assertions).

Clean snapshot (tracked plus untracked non-ignored files; no
`node_modules`, `dist`, `.next` or `.env.local`; CI's throwaway env values
injected). It ran from a short directory, because an isolated-linker install
under the long session scratchpad path exceeds Windows' 260-character path
limit:

| Command | Exit | Result |
| --- | --- | --- |
| `bun install --frozen-lockfile` | 0 | 1,334 packages |
| `bun run check` | 0 | Lint, typecheck, every safe suite and boundaries, production build |
| `bun run db:generate` | 0 | "No schema changes, nothing to migrate"; 48 migration files, the same as tracked |

## Runtime probe (development)

A throwaway PostgreSQL 18 database received all 48 migrations through
`bun src/database/migrate.ts`, run from source. Next dev ran with injected
values and notification delivery disabled:

| Check | Result |
| --- | --- |
| `GET /api/system/readiness` | **passed** — 200, `database: ok`, `cache: ok` |
| Landing server render in en / fr / ar (`kafil-ui-language` cookie) | **passed** — translated hero; Arabic renders `<html dir="rtl" lang="ar">` |
| Catalog edit in `packages/contracts/src/locales/en.json` | **passed** — visible on the next request; restored byte-identical |

## Pending and not run

| Gate | State | Reason |
| --- | --- | --- |
| Image build, in-image resolution, synthetic env-marker exclusion | **blocked** | Docker is not installed |
| Production readiness, authenticated read, worker boot/shutdown with Redis | **blocked** | No Redis on this host; SIGTERM cannot be delivered to a Windows process |
| Browser acceptance (Playwright skill journeys) | **not run** | Kafil's change moves catalogs and helpers only, so the server-rendered locale probe covers it; the connected journeys need seeded accounts |
| `bun run test:db` | **not run** | Opt-in database suites; no persistence code changed |
| Commit, push, deployment | **not run** | Not requested |
