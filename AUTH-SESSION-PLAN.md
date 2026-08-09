# Shared React Server Auth Session Plan

Status: **IN PROGRESS**

Last updated: 2026-08-09

Current status:

- [x] The React-server adapter is published in `najm-auth@3.1.0`.
- [x] Kafil consumes the adapter and passes its local lint, typecheck, unit,
  production-build, and no-DDL gates.
- [ ] Complete Kafil browser acceptance.
- [ ] Upgrade School and adopt the same published adapter there.

This plan moves request-scoped React Server Component session reuse into a
published `najm-auth` adapter, then adopts that contract in Kafil and School.
The objective is to stop copying session lookup and guard logic between apps
while keeping proxy and Edge authentication free of React render concerns.

Root `PLAN.md` remains Kafil's authoritative execution roadmap. This document
is a bounded cross-repository companion and must be scheduled from `PLAN.md`
before implementation. `AUTH-COOKIE-PLAN.md` remains authoritative for Kafil's
credential-setup and cookie migration; this plan must not reopen or combine
those moves.

## 1. Planning-time verified baseline

### Najm

- At planning time, `C:\Users\hdevlop\Desktop\najm` contained
  `najm-auth@3.0.0`.
- `defineAuth()` already owns signed-cookie session resolution, recovery,
  strict unauthenticated handling, login redirects, forbidden redirects, and
  multi-role semantics.
- `auth.getSession()`, `auth.requireSession()`, and `auth.requireRole()` each
  resolve the session through the core server implementation. They do not
  share one React render-scoped result.
- `najm-auth/client/server` is consumed by both Server Components and the
  proxy/Edge boundary. React must not be added to that existing entry point.
- React and Next are optional peers. The new adapter therefore needs its own
  explicit entry point and documented runtime requirements.

### Kafil

- At planning time, Kafil consumed `najm-auth@3.0.0` through exact root
  overrides.
- `apps/web/src/lib/auth.ts` defines the proxy-safe `auth` object.
- `apps/web/src/lib/session.ts` locally wraps `auth.getSession()` with
  `React.cache()` and locally reimplements `requireSession()` and
  `requireRole()` so layouts and pages share one lookup.
- The root layout, auth layout, dashboard layout, dashboard page, and protected
  pages depend on these exports. Preserve those stable app imports during the
  package migration.
- The local wrapper uses lenient `getSession()` for its guards, so operational
  configuration or recovery failures can be converted into login redirects.
  The shared adapter must restore Najm's strict guard semantics.

### School

- `C:\Users\hdevlop\Desktop\school` currently consumes
  `najm-auth@2.0.11`.
- Its root layout and auth layout call `auth.getSession()` directly. Auth routes
  can therefore perform two independent cookie verification or recovery calls
  during one render.
- Its dashboard layout has no Server Component session guard and relies on the
  proxy plus client hydration.
- Its login page assumes the v2 login result and always redirects after
  success. Najm Auth v3 returns a discriminated `LoginResult`.
- Its Drizzle schema exports the older individual auth tables. Najm Auth v3
  requires credential-setup session and requirement tables in consumer
  schemas.
- School has unrelated dirty worktree changes. Preserve them and audit overlap
  before any migration work.

## 2. Final architecture

Every Next.js App Router consumer keeps three boundaries:

```text
src/lib/auth.ts       defineAuth configuration; browser, server, and proxy safe
src/lib/session.ts    one app singleton created by the React-server adapter
src/proxy.ts          imports only auth.ts and calls auth.middleware()
```

Najm provides a separate React Server Component entry point:

```ts
import { createReactServerAuth } from "najm-auth/client/server/react";
```

Applications create exactly one adapter instance:

```ts
import "server-only";

import { createReactServerAuth } from "najm-auth/client/server/react";

import { auth } from "./auth";

export const serverAuth = createReactServerAuth(auth);
```

The returned `ReactServerAuth` contract provides:

```ts
serverAuth.getSession();
serverAuth.requireSession();
serverAuth.requireRole(["admin", "operator"]);
```

Kafil may re-export named functions from this singleton temporarily so its
existing route imports do not need a broad mechanical rewrite.

## 3. Contract requirements

### 3a. Request-scoped resolution

- Use React's `cache()` only inside the dedicated React-server entry point.
- Create the memoized resolver once per imported app module, never inside a
  component, layout, page, or factory call site.
- Share one pending or settled resolution across `getSession()`,
  `requireSession()`, and `requireRole()` during the same React server request.
- Keep requests isolated. Never place sessions in a module `Map`, global
  singleton value, Redis, Najm cache plugin, `unstable_cache`, or Next
  `"use cache"` boundary.
- Document that the adapter is for React Server Components only. Route
  handlers, proxy code, scripts, and non-React runtimes continue to use the
  existing core methods.
- Document that an auth mutation must redirect or refresh into a new render;
  the session snapshot is intentionally stable for the current render.

### 3b. Error and redirect semantics

- `getSession()` preserves the public optional-session contract.
- `requireSession()` preserves Najm's strict behavior:
  - missing, invalid, or revoked authentication redirects to `loginRoute`;
  - authentication transport/configuration failures that are not an
    unauthenticated result remain visible errors;
  - no infrastructure failure is silently rewritten as a login redirect.
- `requireRole()` uses the same resolved session as `requireSession()`.
- `session.roles` remains authoritative when present, with `user.role` as the
  backwards-compatible single-role fallback.
- An authenticated role mismatch redirects to `forbiddenRoute`, never back to
  login.
- Cache the structured resolution outcome so optional and strict consumers can
  interpret the same work without performing a second recovery call.

### 3c. Package and runtime isolation

- Add a new source entry such as
  `packages/najm-auth/src/client/server/react.ts` or an equivalent directory
  entry.
- Add only `najm-auth/client/server/react` to package exports and the tsup entry
  list. Do not re-export it from the root, `client`, `client/react`,
  `client/edge`, or `client/server` entry points.
- Keep the current core and Edge outputs free of static React imports.
- Keep `client/react` marked `"use client"`; the new React-server entry must
  not receive that directive.
- Add a server-only marker or equivalent build guard so client components
  cannot import the adapter accidentally.
- Document that this opt-in subpath requires a React version exposing
  `cache()`; provide a clear build/runtime error for unsupported React versions
  without narrowing unrelated non-React package usage unnecessarily.

## 4. Move 1 - implement the Najm adapter

Repo: `C:\Users\hdevlop\Desktop\najm`.

- [ ] Extract or reuse one internal session-resolution outcome so optional and
  strict guards do not duplicate work or diverge in semantics.
- [ ] Add `ReactServerAuth` and `createReactServerAuth(auth)` to the dedicated
  React-server entry point.
- [ ] Keep redirect routes and error classification owned by Najm rather than
  accepted again as app options.
- [ ] Add declaration coverage for the new factory and returned methods.
- [ ] Add package-surface coverage for exports, built JavaScript, declarations,
  and packed files.
- [ ] Update `packages/najm-auth/README.md`, `NAJM_AUTH.md`, and `CHANGELOG.md`
  with the canonical `auth.ts` / `session.ts` / `proxy.ts` structure.
- [ ] Update the Next 16 integration fixture to exercise a root layout, nested
  layout, and protected page using one shared session adapter.

Required Najm tests:

- [ ] Concurrent repeated `getSession()` calls share one promise and result.
- [ ] `getSession()` followed by `requireSession()` shares one resolution.
- [ ] `getSession()` followed by `requireRole()` shares one resolution.
- [ ] Two separate server requests never share a user, result, or error.
- [ ] Missing/revoked sessions redirect to login under strict guards.
- [ ] Transport/configuration failures remain errors under strict guards.
- [ ] Multi-role sessions and single-role fallback match core Najm behavior.
- [ ] Role mismatch redirects to the configured forbidden route.
- [ ] A failed resolution is stable within one render but not across requests.
- [ ] The existing Edge/proxy entry builds and runs without importing the new
  React-server entry.
- [ ] The built declarations and dry-run tarball expose the exact documented
  subpath and nothing app-local.

Move 1 gate:

```bash
bun run test:auth
bun run build:auth
bun run test:auth:next16
bun run api:check
bun scripts/publish-package.ts najm-auth --dry-run
```

Inspect the full worktree and tarball. Any Edge bundle regression, cross-request
session reuse, strict-error regression, missing declaration, or unplanned
public export blocks the release.

## 5. Move 2 - publish the shared contract

- [ ] Treat the adapter as an additive minor release, targeting
  `najm-auth@3.1.0` unless a newer current version requires another number.
- [ ] Prepare the version in its own reviewable commit using the repository's
  publish workflow.
- [ ] Repeat package tests, build, Next 16 integration, API check, secret scan,
  and dry-run packing at the exact candidate commit.
- [ ] Publish only after explicit user authorization.
- [ ] Verify the registry version, dist-tag, tarball declarations, and exact
  commit before changing either consumer.

Do not consume unpublished workspace source from Kafil or School.

## 6. Move 3 - adopt in Kafil

Repo: `C:\Users\hdevlop\Desktop\kafil`.

- [ ] Schedule this move from root `PLAN.md` without changing the ownership of
  `AUTH-COOKIE-PLAN.md`.
- [ ] Align the root override, web/server/seed manifests, and `bun.lock` to the
  exact published Najm Auth version.
- [ ] Replace the implementation in `apps/web/src/lib/session.ts` with one
  `createReactServerAuth(auth)` singleton.
- [ ] Preserve `server-only` and the existing named exports so route files do
  not need a broad rewrite.
- [ ] Remove local `React.cache`, redirect, role fallback, and error-handling
  logic now owned by Najm.
- [ ] Keep `apps/web/src/lib/auth.ts` proxy-safe and free of React-server
  imports.
- [ ] Confirm `apps/web/src/proxy.ts` still imports only the core auth object.
- [ ] Add focused source and behavior tests for the package-owned boundary.

Kafil browser acceptance:

- [ ] Anonymous dashboard navigation redirects to `/login`.
- [ ] An authenticated user visiting an auth page redirects to `/dashboard`.
- [ ] Root, dashboard layout, and dashboard page observe one session snapshot.
- [ ] Admin/operator multi-role access remains valid.
- [ ] Authenticated wrong-role navigation ends at `/forbidden` without a loop.
- [ ] Expired signed-session recovery succeeds once for the render.
- [ ] Recovery/configuration failures retain the intended strict behavior.
- [ ] Login, logout, refresh, Remember Me, and first-login credential setup
  remain unchanged.

Move 3 gate:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

`db:generate` must produce no migration. Run the focused auth browser flow and
the broader E2E gate required by the active Kafil roadmap before marking the
move accepted.

## 7. Move 4 - upgrade School to the shared Najm baseline

Repo: `C:\Users\hdevlop\Desktop\school`.

This is a prerequisite major-version migration, not part of the small session
adapter change. Preserve School's unrelated dirty files and read its root
`AGENTS.md` before work begins.

- [ ] Audit the complete `2.0.11` to published `3.1.x` changelog, declarations,
  schema, client login result, cookie behavior, and runtime configuration.
- [ ] Pin one exact Najm Auth version consistently in the root manifest,
  dashboard manifest, overrides, server/seed consumers, and `bun.lock`.
- [ ] Add `credentialSetupSessions` and `credentialSetupRequirements` from the
  installed PostgreSQL auth schema to School's Drizzle schema entry point.
- [ ] Generate a new School-owned additive migration. Never copy or edit a
  Kafil migration.
- [ ] Confirm the migration creates only the required Najm v3 auth storage and
  does not alter existing users, roles, permissions, or tokens unexpectedly.
- [ ] Update the login page to handle `LoginResult.nextStep`, forward
  `rememberMe`, and avoid redirecting a credential-setup response into the
  dashboard.
- [ ] Add the standard credential-setup status/change/cancel UI and public
  route needed by v3 provisioned accounts.
- [ ] Wrap the School catch-all POST handler with Najm's standard auth-cookie
  persistence contract where required by the installed declarations.
- [ ] Verify normal admin/staff login, credential setup, refresh, recovery,
  logout, and inactive/revoked-user handling before session-adapter adoption.

Production ordering for School:

1. Back up and verify the intended database.
2. Apply the additive auth-schema migration while the old runtime can still
   ignore the new tables.
3. Deploy the v3-compatible application.
4. Complete login and credential-setup acceptance.
5. Keep database rollback and application rollback as separate decisions.

Move 4 gate:

```bash
bun run lint
bun run test:server
bun run build:all
bun run db:check
```

Also run focused School browser coverage for normal login, setup-required login,
refresh/recovery, logout, and public/protected routing against a real test
database.

## 8. Move 5 - adopt the adapter in School

- [ ] Add `apps/dashboard/src/lib/session.ts` with exactly one
  `createReactServerAuth(auth)` singleton.
- [ ] Keep `apps/dashboard/src/lib/auth.ts` unchanged as the core/proxy-safe
  configuration boundary.
- [ ] Replace direct `auth.getSession()` calls in the root and auth layouts with
  the shared adapter.
- [ ] Make the dashboard layout use `requireSession()` so the root layout and
  protected layout share the same resolution.
- [ ] Add `requireRole()` only at real server presentation boundaries; backend
  authorization remains authoritative.
- [ ] Keep `apps/dashboard/src/proxy.ts` importing only core `auth.ts`.
- [ ] Add focused tests proving the auth route no longer performs two session
  resolutions and that separate requests remain isolated.

Move 5 gate:

```bash
bun run lint
bun run test:server
bun run build:all
bun run db:check
```

No new migration is expected in Move 5. Any schema output belongs to the v3
prerequisite and blocks adapter-only acceptance.

## 9. Future-app contract

- [ ] Add the canonical three-file structure to Najm Auth documentation.
- [ ] If `najm-cli` has or later gains a Next.js application template, generate
  `auth.ts`, `session.ts`, and `proxy.ts` from that template rather than copying
  a consumer implementation.
- [ ] Keep app configuration local: routes, cookie names, recovery URL,
  diagnostics, and role routes remain passed to `defineAuth()`.
- [ ] Keep reusable mechanics shared: request memoization, strict session
  handling, role fallback, and redirect semantics remain in Najm Auth.
- [ ] Require every new app to test request isolation, anonymous redirect,
  forbidden redirect, and recovery at its real Next.js production boundary.

The app-level `session.ts` file is intentional. React requires consumers to call
the same memoized function to share one cache. The package removes duplicated
logic; the app facade provides the one stable module instance.

## 10. Execution order and completion

| Move | Repo | Dependency | Completion boundary |
|---|---|---|---|
| 1 - implement adapter | Najm | none | source, tests, build, Next 16 fixture |
| 2 - publish contract | Najm | Move 1 | verified registry version and tarball |
| 3 - adopt in Kafil | Kafil | Move 2 | local and browser acceptance, no DDL |
| 4 - migrate School to v3 | School | Move 2 | schema and auth-flow acceptance |
| 5 - adopt in School | School | Move 4 | deduplicated render behavior, no DDL |
| 6 - future-app docs/template | Najm | Moves 3 and 5 evidence | documented stable pattern |

Do not combine package publication with either consumer deployment. Do not
combine School's database/auth major migration with its session-adapter
acceptance evidence. Report Najm publication, Kafil adoption, School v3
migration, School adapter adoption, GitHub state, and deployments as separate
pass/fail outcomes.
