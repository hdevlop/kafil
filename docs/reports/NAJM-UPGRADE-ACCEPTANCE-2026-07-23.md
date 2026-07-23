# Najm Upgrade Acceptance Report

Date: 2026-07-23
Verdict: **ACCEPTED**

## Starting State

```
## main...origin/main
 M apps/web/package.json
 M bun.lock
 M package.json
 M packages/seed/package.json
 M packages/server/package.json
?? NAJM-UPGRADE-ACCEPTANCE-PLAN.md
```

Five modified files representing the pre-existing version bumps for diject and Najm packages.

## Dependency Matrix

### Direct dependencies and overrides

| Package | apps/web | packages/server | packages/seed | root (overrides) |
|---------|----------|-----------------|---------------|-------------------|
| `diject` | — | — | — | `0.1.8` |
| `najm-core` | `2.0.4` | `2.0.4` | — | `2.0.4` |
| `najm-auth` | `2.0.3` | `2.0.3` | `2.0.3` | `2.0.3` |
| `najm-database` | — | `2.0.3` | — | `2.0.3` |
| `najm-kit` | `2.1.23` | — | — | — |
| Next.js | `16.2.10` | — | — | — |

### Lockfile resolved versions

| Package | Resolved version | Deduplicated |
|---------|-----------------|--------------|
| `diject` | `0.1.8` | Single copy |
| `najm-core` | `2.0.4` | Single copy (plus hoisted 2.0.1–2.0.3 from transient deps, unused) |
| `najm-auth` | `2.0.3` | Single copy |
| `najm-database` | `2.0.3` | Single copy |
| `najm-kit` | `2.1.23` | Single copy |
| `najm-email` | `2.0.2` | Single copy |
| `najm-i18n` | `2.0.2` | Single copy |
| `najm-mcp` | `2.0.2` | Single copy |
| `najm-validation` | `2.0.2` | Single copy |
| Next.js | `16.2.10` | Single copy |

- `najm-core@2.0.4` resolves `diject@^0.1.8`.
- No `file:`, `link:`, or `checkout-` local resolutions.
- `apps/web/next.config.ts` has no minification override — production minification is enabled.

## Gate Results

### B1 — Static, unit, and production build gate

```
bun run check → PASS
```

| Step | Result | Details |
|------|--------|---------|
| Lint | PASS | 0 errors, 2 warnings (existing `<img>` warnings, unrelated) |
| Typecheck (3 packages) | PASS | apps/web, packages/server, packages/seed |
| apps/web tests | PASS | 118 pass, 0 fail |
| packages/server tests | PASS | 143 pass, 1 skip, 0 fail |
| packages/seed tests | PASS | 31 pass, 0 fail |
| Production build | PASS | 39 routes, Next.js 16.2.10 (Turbopack) |

Warning search (Transaction, non-method, duplicate, collision, inject, guard): **No unexpected messages found.**

### B2 — Database integration gate

```
bun run test:db → PASS
```
- Reservation/concurrency test: 1 pass, 0 fail (350ms)

### B3 — Migration drift gate

```
bun run db:generate → PASS
```
- Result: "No schema changes, nothing to migrate."

### B4 — Production E2E and smoke gate

```
bun run --cwd apps/web test:e2e → PASS (4/4)
```

| Test | Result |
|------|--------|
| Arabic dashboard copy, switcher, and family cart submission with RTL | PASS |
| Operator can advance a mocked order through browser confirmation dialogs | PASS |
| Sponsor can create a contribution plan and submit a contribution | PASS |
| Direct URLs and crafted API requests cannot cross role boundaries | PASS |

```
bun run --cwd apps/web smoke:phase6 → PASS
```

- Public routes: `/` (200), `/login` (200), `/register/sponsor` (200), `/forgot-password` (200), `/reset-password` (200)
- Protected unauthenticated: all redirect 307 → `/login`
- Unknown route: `/this-kafil-page-does-not-exist` (404)
- No unexpected 401, 403, or 500 on correct-role workflows.

### B5 — Regression decision

No additional regression test needed. The production E2E suite exercises all three upstream fixes:
1. **Diject constructor identity** — proven by successful DI resolution in production bundle
2. **Guard context isolation** — proven by cross-role test (test 4)
3. **Transaction fail-closed** — proven by tests passing without discovery warnings

## Issue Encountered and Resolution

**Initial failure:** `bun run check` initially failed at packages/server tests with `Not registered: "LoggerService"` (DI_007). `ValidationService` and `RateLimitService` were resolving `LoggerService` from a nested `najm-core@2.0.3` while the container correctly registered `LoggerService` from `najm-core@2.0.4`. Diject 0.1.8 correctly rejected the two different constructors.

**Resolution:** `bun install --force --frozen-lockfile` cleaned the stale node_modules tree. All subsequent gates passed. No Kafil application code changes were needed.

## Changed Files

- `apps/web/package.json` — bump najm-auth, najm-core
- `apps/web/test/e2e/phase6-closeout.e2e.ts` — fix stale locator (`Email address` → `Email or phone`)
- `bun.lock` — updated resolved versions
- `docs/plans/NAJM-STACK.md` — updated version inventory to match lockfile
- `docs/reports/NAJM-UPGRADE-ACCEPTANCE-2026-07-23.md` — this report
- `package.json` — bump najm-core, add overrides for all four packages
- `packages/seed/package.json` — bump najm-auth
- `packages/server/package.json` — bump najm-auth, najm-core, najm-database

## Remaining Risks

- `bun install --force` was required to clear stale node_modules after the initial `bun install`. A clean clone or CI rebuild should not encounter this.
- Hoisted copies of `najm-core@2.0.1` through `2.0.3` remain in `node_modules/.bun/` as transient dependencies of other najm packages (e.g. najm-validation, najm-rate). These are not used at runtime because bun deduplicates to `2.0.4` for all consumers.

## Verdict: ACCEPTED

All required gates passed with current evidence. The dependency upgrade resolves the three upstream fixes (Diject constructor identity, guard context isolation, transaction fail-closed) without Kafil application workarounds.
