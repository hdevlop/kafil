# Najm Upgrade Acceptance and Release Handoff

Status: **READY TO EXECUTE**  
Date: **2026-07-23**  
Repository: `C:\Users\hdevlop\Desktop\kafil`  
Branch at handoff: `main`

## 1. Mission

Validate the newly published Najm/Diject packages inside Kafil's real Next.js
16 production bundle, document the evidence, and prepare one reviewable Kafil
commit. Do not republish packages from this repository and do not deploy to the
VPS until every local acceptance gate below passes and the user explicitly
approves deployment.

The upstream fixes being accepted are:

- Diject resolves injectables by constructor identity even when production
  minification gives different classes the same runtime name.
- Najm role guards keep their own role context and do not execute another
  same-named guard.
- Najm transaction discovery is fail-closed and no longer treats non-method
  metadata as a transactional handler.

## 2. Confirmed Starting State

At the time this plan was written, the package upgrade is present but not
committed. Preserve these user changes:

```text
M apps/web/package.json
M bun.lock
M package.json
M packages/seed/package.json
M packages/server/package.json
```

Expected resolved versions:

| Package | Required resolved version |
| --- | --- |
| `diject` | `0.1.8` |
| `najm-core` | `2.0.4` |
| `najm-auth` | `2.0.3` |
| `najm-database` | `2.0.3` |
| `najm-kit` | `2.1.23` |
| Next.js | `16.2.10` |

`package.json` overrides intentionally force the first four package versions.
`apps/web/next.config.ts` currently has no `serverMinification`,
`turbopackMinify`, or equivalent workaround. Keep normal Next.js production
minification enabled. Do not add class-name preservation, app-local DI forks,
manual guard renaming, or other workarounds.

`docs/plans/NAJM-STACK.md` contains stale version numbers and must be corrected
as part of this acceptance slice.

## 3. Non-Negotiable Safety Rules

1. Use Bun `1.3.14` only. Do not use npm, Yarn, or pnpm.
2. Preserve unrelated working-tree changes. Inspect diffs before every edit and
   before committing.
3. Never point database integration or browser tests at the demo/production
   VPS database. Use the existing disposable local/test PostgreSQL database.
   The E2E runner creates temporary browser users and removes them afterward.
4. Do not run `setup`, `seed:full`, `seed:demo`, database reset, or destructive
   seed commands during acceptance.
5. Never edit an existing migration. This dependency-only upgrade should not
   require a new migration.
6. Do not weaken authorization expectations to make a test pass. Correct-role
   requests must succeed and cross-role requests must remain denied.
7. Do not push, deploy, change DNS/Caddy/firewall/SSH, or touch VPS data without
   a separate explicit user approval.

## 4. Phase A - Dependency Integrity

- [ ] Record `git status --short --branch` and review the five package/lockfile
      diffs listed above.
- [ ] Run `bun install --frozen-lockfile`. It must succeed without changing
      `bun.lock`.
- [ ] Confirm `bun.lock` resolves exactly one copy of each required package
      version in the table above.
- [ ] Confirm all Kafil workspaces that directly consume `najm-core`,
      `najm-auth`, or `najm-database` use the intended versions.
- [ ] Confirm there are no `file:`, `link:`, or checkout-local resolutions for
      Diject or published Najm packages.
- [ ] Confirm `najm-core@2.0.4` resolves `diject@0.1.8`.
- [ ] Recheck `apps/web/next.config.ts` and prove minification has not been
      disabled.

Stop and report if the frozen install changes the lockfile, multiple Diject or
core versions resolve, or a package is coming from a local checkout. Do not
silently regenerate dependency state.

## 5. Phase B - Kafil Acceptance Gate

Run these in order from the repository root and capture exit codes and useful
counts. Do not claim success from a partial command.

### B1. Static, unit, and production build gate

```bash
bun run check
```

This must pass lint, typecheck, all workspace unit tests, and the Next.js 16
production build. Review the complete build log. There must be no DI collision,
wrong guard, decorator discovery, or transaction metadata warning.

Specifically search captured output for unexpected messages containing:

```text
Transaction
non-method
duplicate
collision
inject
guard
```

A substring by itself is not automatically a failure; inspect its context and
record the conclusion. Any transaction-on-non-method warning or DI/guard
collision is a blocker.

### B2. Database integration gate

Using only the disposable local/test PostgreSQL database:

```bash
bun run test:db
```

The reservation/concurrency integration test must pass. If it fails, preserve
the failing output and determine whether the failure is setup, application, or
transaction behavior. Do not retry against production.

### B3. Migration drift gate

```bash
bun run db:generate
```

Expected result: no schema changes and no new migration. If Drizzle proposes or
creates a migration, stop and investigate. A package-only upgrade must not
smuggle in a schema change.

### B4. Exact production-bundle browser gate

`bun run check` must have completed the production build before these commands:

```bash
bun run --cwd apps/web test:e2e
bun run --cwd apps/web smoke:phase6
```

The existing Playwright suite must prove:

- family login and workflow succeed;
- operator login and workflow succeed;
- sponsor login and workflow succeed;
- family direct access to operator pages is denied;
- family API calls to operator/sponsor resources are denied;
- sponsor direct access to family pages and cart API is denied;
- public routes return `200`, protected unauthenticated routes redirect to
  login, and an unknown route returns `404`.

Treat unexpected `401`, `403`, or `500` on a correct-role workflow as a
blocker. Cross-role denial is expected and must not be loosened.

### B5. Focused regression decision

First inspect the passing tests and production logs. Add a Kafil regression
test only if one of the upstream failure modes is not exercised through Kafil's
real bundle. Prefer a small test that proves observable route behavior; do not
copy Diject or Najm internals into Kafil.

If coverage is needed, the minimum new regression is a production-bundled role
matrix where two guards/controllers may have the same minified name and still
resolve by identity. Assert both directions:

- the allowed role reaches its handler;
- the wrong role is denied and the allowed role's guard is not substituted.

Re-run every affected gate after any test or application edit.

## 6. Phase C - Documentation and Evidence

- [ ] Update only the version inventory and version-specific prose in
      `docs/plans/NAJM-STACK.md` to match the lockfile. Do not rewrite its
      architecture contracts.
- [ ] Create
      `docs/reports/NAJM-UPGRADE-ACCEPTANCE-2026-07-23.md` with:
  - starting and final Git status;
  - direct dependency and override matrix;
  - lockfile resolved versions;
  - every command, exit code, and pass/fail result;
  - test counts and production route count from actual output;
  - role/cross-role results;
  - database integration and migration-drift results;
  - relevant warning search and conclusion;
  - changed files;
  - remaining risks or blockers;
  - final verdict: `ACCEPTED` or `BLOCKED`.
- [ ] Update `docs/PLAN.md` only if this work closes or changes an existing
      Phase 7 checklist item. Do not mark the full release or staging gate done
      merely because the package upgrade passes locally.

Use evidence from this run. Do not copy old pass counts as if they are current.

## 7. Phase D - Reviewable Kafil Commit

Only after the report verdict is `ACCEPTED`:

- [ ] Review `git diff --check`.
- [ ] Review `git diff --stat` and the complete diff.
- [ ] Confirm no `.env`, credentials, databases, storage content, generated
      build output, Playwright artifacts, or temporary users are included.
- [ ] Confirm the final diff is limited to the intended dependency upgrade,
      any justified regression test, and documentation/evidence.
- [ ] Prepare one commit with a clear message such as:

```text
fix: accept minification-safe Najm dependency updates
```

Do not push the commit unless the user explicitly requests it. Return the
commit hash if committed, plus `git status --short --branch`.

## 8. Failure Protocol

When a gate fails:

1. Preserve the exact failing command and first useful stack trace.
2. Reduce it to the smallest focused Kafil test or route reproduction.
3. Classify the owner: Kafil integration, published package contents,
   dependency resolution, database state, or test environment.
4. Do not patch generated `dist`, `.next`, or `node_modules` files.
5. Do not introduce an app workaround that bypasses constructor identity,
   guard authorization, or transaction safety.
6. If the published package is at fault, stop with a precise upstream
   reproduction and required package/version. Do not publish from Kafil.
7. Mark the report `BLOCKED`, list what passed before the failure, and leave the
   working tree reviewable.

## 9. Deployment Boundary After Acceptance

Local package acceptance does **not** make Kafil production-ready. The Docker,
Compose, CI, readiness, backup/restore, and operations artifacts described in
`docs/plans/VPS-DOCKER-DEPLOYMENT.md` are not present yet. Phase 7 also still
lists readiness, production cache, rate limits, security headers, structured
logs, recovery procedures, the full release suite, and staging smoke as open.

After the user approves the accepted Kafil commit, the next separate task is to
execute `docs/plans/VPS-DOCKER-DEPLOYMENT.md`, beginning with a fresh audit of
the live VPS. Preserve these deployment rules:

- use immutable Git-SHA images;
- reuse the host's existing Caddy rather than starting a second Caddy service;
- bind Kafil only to `127.0.0.1:3000`;
- never expose PostgreSQL or Redis publicly;
- persist PostgreSQL data and Kafil storage;
- run migrations before replacing the application;
- use a database-aware readiness check;
- retain the previous image and release metadata for rollback;
- never put setup, reset, or demo seeding in automatic deployment.

The prior VPS snapshot is historical context only. Re-audit listeners,
services, DNS, credentials, firewall, backup destination, recovery-console
access, and a second SSH session before making any live change.

## 10. Required Final Response

Return a compact result with this exact shape:

```text
Verdict: ACCEPTED | BLOCKED

Dependency resolution:
- diject: ...
- najm-core: ...
- najm-auth: ...
- najm-database: ...
- najm-kit: ...

Gates:
- frozen install: PASS | FAIL
- bun run check: PASS | FAIL
- bun run test:db: PASS | FAIL
- bun run db:generate: PASS | FAIL
- production E2E: PASS | FAIL
- production smoke: PASS | FAIL

Changed files:
- ...

Evidence report:
- docs/reports/NAJM-UPGRADE-ACCEPTANCE-2026-07-23.md

Commit:
- <hash or NOT CREATED>

Not done:
- push/deployment status
- remaining blockers
```

Do not use `ACCEPTED` if any required gate was skipped, failed, ran against an
unsafe database, or lacks current evidence.
