# Shared Server UI Bootstrap Plan

Status: **SUPERSEDED BY `najm-theme@0.2.0`**

Last updated: 2026-08-11

Current status:

- [x] The original pure and React-server adapters shipped in `najm-kit@2.9.0`.
- [x] Their Kafil-specific factory/parser wiring was removed by the
  `najm-theme@0.2.0` definition bootstrap.
- [ ] Complete the manual Kafil Phase 2 browser and PostgreSQL acceptance in
  root `PLAN.md`.

This file is retained as design history. Do not execute its old
`createReactServerUiBootstrap` or app-owned factory-parser moves. The active
contract is `packages/server/theme/` plus `kafilTheme.react(...)`, documented in
root `PLAN.md` and `AGENTS.md`.

This plan moves the reusable appearance and branding bootstrap mechanics into
a published `najm-kit` server adapter, then adopts that contract in Kafil and a
second Najm application. The goal is one tested server-render bootstrap
solution without making Najm Kit aware of either application's backend,
database, factory files, or deployment.

Root `PLAN.md` remains Kafil's authoritative roadmap. Kafil's adoption in this
plan must complete before the Phase 2 branding acceptance gate is closed.
`AUTH-SESSION-PLAN.md` remains independent: the session adapter and UI
bootstrap may use the same package pattern, but they must not share state,
errors, caching, or release gates.

## 1. Planning-time verified baseline

### Najm Kit

- At planning time, the Najm source checkout contained `najm-kit@2.8.2`;
  re-check the version immediately before any later implementation or
  publication.
- `najm-kit` already owns `NajmDesignConfig`, `parseNajmDesignConfig()`,
  `NBrandingPayload`, `normalizeBranding()`, `NBrandingStateProvider`, and
  `NajmAppProvider`.
- `NajmAppProvider` accepts server-resolved initial design and branding, but
  Najm Kit does not currently fetch, parse, fall back, or memoize a server UI
  bootstrap.
- Existing browser-facing entry points must remain free of server-only code.
  A React Server Component adapter therefore needs its own explicit export.

### Kafil

- `apps/web/src/lib/loader.ts` currently owns the public appearance and
  branding endpoint paths, response parsing, diagnostics, factory fallbacks,
  and parallel bootstrap composition.
- `apps/web/src/lib/serverTheme.ts` adds `server-only`, one module-level
  `React.cache()` instance, and Kafil's lazy internal `server.fetch()` binding.
- `apps/web/src/app/layout.tsx`, the auth layout, and the first-login layout
  consume the server-resolved appearance or branding snapshot.
- Kafil's public branding contains expanded and collapsed sidebar marks,
  authentication logo, authentication hero, and a positive revision.
- Kafil's appearance validation is intentionally narrower than Najm Kit's
  general design parser. CSS safety, editable-field allowlists, payload-size
  limits, persistence, revision locking, storage, authorization, audit, and
  fallback projection remain Kafil backend responsibilities.

### Second consumer

- The second application is expected to use the same server-rendered design
  and branding bootstrap pattern.
- Before freezing the public package types, inspect that application's current
  `AGENTS.md`, framework/package versions, provider tree, branding fields,
  appearance fields, API envelope, fallback assets, and dirty worktree.
- Standardize only the intersection that both consumers genuinely share.
  Consumer-specific fields must remain supported through typed parsers rather
  than becoming mandatory Najm Kit policy.

## 2. Final architecture

Najm Kit provides two separate server entry points:

```text
najm-kit/server        pure loader contracts and fallback orchestration
najm-kit/server/react  React Server Component request memoization
```

Each application retains one stable module singleton:

```text
src/lib/serverTheme.ts   application fetcher + factory fallbacks + adapter instance
```

The intended consumer shape is:

```ts
import "server-only";

import { createReactServerUiBootstrap } from "najm-kit/server/react";

export const serverUi = createReactServerUiBootstrap({
  fetcher: fetchFromThisApplication,
  appearance: {
    path: "/api/appearance",
    fallback: getFactoryAppearance,
    parse: parseThisApplicationAppearance,
  },
  branding: {
    path: "/api/branding",
    fallback: getFactoryBranding,
    parse: parseThisApplicationBranding,
  },
  onDiagnostic: reportUiBootstrapDiagnostic,
});

export const {
  loadUiBootstrap,
  loadAppearance,
  loadBranding,
} = serverUi;
```

The exact names may change during API review, but the ownership boundary must
not change.

## 3. Package contract requirements

### 3a. Pure loader contract

- Add a pure `najm-kit/server` entry that does not import React, Next.js,
  `server-only`, Node-only APIs, `@kafil/server`, or another consumer.
- Accept a caller-supplied `(path: string) => Promise<Response>` fetcher.
- Accept separately configurable appearance and branding resources with:
  - endpoint path;
  - factory fallback function;
  - parser from `unknown` into the consumer's public type.
- Understand the shared `{ data: unknown }` response envelope only if both
  consumers use it. Otherwise accept an envelope selector as configuration.
- Run appearance and branding loads concurrently.
- Fall back independently: an appearance failure must not discard valid
  branding, and a branding failure must not discard valid appearance.
- Treat non-success responses, invalid JSON, invalid envelopes, parser
  rejection, and fetch failures as distinct diagnostic reasons.
- Keep fallback failures visible. A broken factory theme or missing factory
  asset is an application configuration error and must not be swallowed by a
  second fallback attempt.
- Return immutable-by-convention snapshots and never mutate a fallback object
  supplied by the application.

### 3b. Shared UI types

- Reuse `NajmDesignConfig` and `parseNajmDesignConfig()` for the generic design
  surface.
- Review whether a shared positive-revision appearance type belongs in Najm
  Kit. Do not duplicate Kafil's backend-only validator or editable-field
  allowlist.
- Compare the two consumers before expanding `NBrandingPayload`.
- If both consumers use the same four resolved asset paths, publish a shared
  resolved branding snapshot containing:
  - `sidebarLogoExpandedPath`;
  - `sidebarLogoCollapsedPath`;
  - `authLogoPath`;
  - `authHeroImagePath`;
  - positive `revision`.
- If the second consumer does not share all four fields, keep the loader generic
  over `TBranding` and leave Kafil's full branding parser application-owned.
- Do not expose persistence DTOs such as `expectedRevision`, upload commands,
  managed-storage paths, database rows, or administrative draft state from the
  server bootstrap entry.

### 3c. Diagnostics and fallback semantics

- Provide a structured optional diagnostic callback rather than hard-coding
  Kafil-specific `console.warn` messages in the package.
- Diagnostics may include resource, reason, path, and HTTP status. They must
  never include response bodies, cookies, headers, tokens, private settings, or
  thrown values that have not been safely normalized.
- The default behavior remains resilient public UI rendering: use the supplied
  factory value when the public endpoint cannot produce a valid snapshot.
- Applications choose how diagnostics are logged or observed.
- Document that fallback is appropriate for public appearance and branding; it
  is not a generic rule for authenticated, financial, or privacy-sensitive
  server data.

### 3d. React Server Component adapter

- Add `najm-kit/server/react` as a dedicated export and build entry.
- Mark it server-only so importing it from a Client Component fails at build
  time.
- Use React's `cache()` inside the adapter, not in the pure loader.
- Create the memoized loader once per imported application module. Calling the
  factory inside a component, layout, or page is invalid because it creates a
  different cache identity.
- Share one pending or settled bootstrap across root and nested layouts during
  one React server render.
- Keep requests isolated. Do not use a module `Map`, module promise,
  `unstable_cache`, Next.js `"use cache"`, Redis, or a durable Najm cache.
- A saved appearance or branding mutation must update the client provider and
  refresh or navigate into a new render. The current render intentionally keeps
  one stable snapshot.
- Keep `najm-kit`, `najm-kit/app`, and other client-capable outputs free of
  static imports from the new server entries.

## 4. Move 1 - design and implement the Najm Kit pure loader

Repo: `C:\Users\hdevlop\Desktop\najm`.

- [ ] Audit both consumers and record the exact shared and application-specific
  fields before naming exported types.
- [ ] Add the pure loader source and public types under a feature-owned server
  adapter directory.
- [ ] Add `najm-kit/server` to the package export map and tsup entries.
- [ ] Reuse existing Najm Kit design parsing instead of adding a second design
  schema.
- [ ] Add typed resource configuration, envelope selection, fallback, and
  diagnostic contracts.
- [ ] Keep the implementation independent of Next.js and both application
  servers.
- [ ] Document the public contract in the Najm Kit README and changelog.

Required pure-loader tests:

- [ ] Valid appearance and branding return one combined snapshot.
- [ ] Both resources begin before either is awaited serially.
- [ ] Non-success status falls back only for the failed resource.
- [ ] Invalid JSON, missing data, invalid revision, and parser rejection each
  fall back safely.
- [ ] Fetch rejection falls back and emits one sanitized diagnostic.
- [ ] Failure of one resource preserves the valid other resource.
- [ ] Factory fallback failure remains a visible error.
- [ ] Returned values do not share mutable fallback state unexpectedly.
- [ ] No test or built artifact imports either consumer repository.

## 5. Move 2 - add the React-server adapter

Repo: `C:\Users\hdevlop\Desktop\najm`.

- [ ] Add `createReactServerUiBootstrap()` under the dedicated React-server
  entry.
- [ ] Return combined and per-resource accessors from one cached bootstrap.
- [ ] Add the `server-only` boundary without leaking it into client entries.
- [ ] Add `najm-kit/server/react` to exports, build entries, declarations, and
  packed files.
- [ ] Add a minimal Next.js 16 fixture that imports the adapter from a root
  layout and nested layout.
- [ ] Document the module-level singleton requirement, request isolation, and
  mutation refresh behavior.

Required React-server tests:

- [ ] Concurrent combined and per-resource calls share one pending resolution
  during a render.
- [ ] Root and nested layout reads see the same resolved snapshot.
- [ ] Separate server requests do not share snapshots, failures, or diagnostics.
- [ ] A failed resource remains stable within one render and is retried on a
  later request.
- [ ] Importing the React-server entry into a Client Component fails clearly.
- [ ] Existing client entry bundles contain no server adapter or `server-only`
  import.
- [ ] The Next.js production fixture builds successfully.

Najm pre-publication gate:

```bash
bun run lint:ui
bun run test:ui
bun run build:ui
bun run build:playground
bun run api:check
bun scripts/publish-package.ts najm-kit --dry-run
```

Inspect the built JavaScript, declarations, export map, packed file list, and
complete Najm worktree. Any client-bundle contamination, cross-request cache,
consumer import, missing declaration, or unplanned public export blocks the
release.

## 6. Move 3 - publish the shared Najm Kit contract

- [ ] Treat the new explicit server subpaths as an additive minor release.
- [ ] Determine the version from the current registry and source immediately
  before release; do not rely on the planning-time `2.8.2` checkout.
- [ ] Prepare the version and changelog in a reviewable commit using Najm's
  existing publication workflow.
- [ ] Repeat tests, builds, API check, secret scan, and dry-run packing at the
  exact candidate commit.
- [ ] Publish only after explicit user authorization.
- [ ] Verify registry version, dist-tag, tarball exports, declarations, and
  exact source commit before changing either consumer.

Do not consume unpublished Najm workspace source from Kafil or the second app.

## 7. Move 4 - adopt the published adapter in Kafil

Repo: `C:\Users\hdevlop\Desktop\kafil`.

- [ ] Schedule the adoption from root `PLAN.md` before closing Phase 2.
- [ ] Align root overrides, manifests, and `bun.lock` to the exact published
  Najm Kit version.
- [ ] Replace Kafil's reusable loader implementation with one module-level
  `createReactServerUiBootstrap()` instance in `serverTheme.ts`.
- [ ] Keep Kafil's lazy internal `server.fetch()` binding, endpoint choices,
  factory theme, factory branding, strict appearance validator, and full public
  branding parser application-owned through adapter options.
- [ ] Preserve the existing `loadServerUiBootstrap`, `loadServerAppearance`,
  and `loadServerBranding` imports temporarily so layouts do not require a broad
  mechanical rewrite.
- [ ] Delete `loader.ts` if it becomes empty; otherwise retain only Kafil-owned
  factory or parsing configuration and give it an ownership-specific name.
- [ ] Move generic loader behavior tests to Najm Kit and retain focused Kafil
  tests for configuration, full branding fields, factory assets, and layout
  integration.
- [ ] Confirm Settings mutations still update the client provider immediately
  and a refresh observes the persisted next server snapshot.
- [ ] Generate no database migration; any DDL indicates unrelated schema drift
  and blocks this move.

Kafil acceptance:

- [ ] Root, auth, first-login, and dashboard layouts share one bootstrap during
  a render.
- [ ] Valid persisted appearance and all four branding assets reach their
  current consumers.
- [ ] Appearance failure preserves branding; branding failure preserves
  appearance.
- [ ] Invalid or unavailable endpoints render factory design and assets without
  broken-image UI.
- [ ] A later request retries after a transient failure rather than reusing a
  process-global fallback.
- [ ] Save, reload, reset, replace, clear-to-fallback, and production restart
  continue to satisfy root `PLAN.md` Phase 2.

Kafil gate:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Run the focused branding browser workflow and the Phase 2 PostgreSQL revision
test before marking Kafil adoption accepted.

## 8. Move 5 - adopt in the second application

- [ ] Read that repository's `AGENTS.md` and active plan before editing.
- [ ] Preserve unrelated dirty worktree changes and identify the exact provider
  and layout boundaries.
- [ ] Upgrade to the same published Najm Kit contract through that repository's
  normal dependency and lockfile workflow.
- [ ] Implement compatible public appearance and branding endpoints in that
  application's backend only if they do not already exist. Storage, validation,
  authorization, audit, uploads, and revision locking remain app-owned.
- [ ] Create one local `serverTheme.ts` singleton with that application's
  fetcher, factory theme, factory assets, parsers, paths, and diagnostics.
- [ ] Seed `NajmAppProvider` from the server snapshot without adding a second
  client-side source of truth.
- [ ] Add focused source, production-build, and browser tests matching Kafil's
  valid, partial-failure, fallback, refresh, and request-isolation cases.
- [ ] Run the second repository's complete local gate and prove no unexpected
  database change during an adapter-only slice.

If the second application requires new persistence or upload infrastructure,
record that as a separate app-owned migration move. Do not widen Najm Kit into
a branding or settings backend to avoid that work.

## 9. Future application contract

- [ ] Document the standard provider/bootstrap structure in Najm Kit.
- [ ] Add the server loader facade to any future Najm application template only
  after both real consumers pass production-build and browser acceptance.
- [ ] Keep app configuration local: fetcher, endpoint paths, factory values,
  diagnostics, parsers, persistence, and authorization.
- [ ] Keep reusable mechanics shared: resource loading, envelope handling,
  independent fallback, parallel composition, structured diagnostics, and
  request-scoped React memoization.
- [ ] Require every new consumer to test valid bootstrap, partial failure,
  factory failure, request isolation, mutation refresh, and client-bundle
  isolation.

The app-level `serverTheme.ts` file is intentional. React consumers must reach
the same memoized instance to share one render snapshot, while the application
must still provide its own backend and factory configuration.

## 10. Execution order and completion

| Move | Repo | Dependency | Completion boundary |
|---|---|---|---|
| 1 - pure loader | Najm | consumer contract audit | source, tests, docs, build |
| 2 - React adapter | Najm | Move 1 | request isolation and Next 16 fixture |
| 3 - publication | Najm | Moves 1-2 | verified registry version and tarball |
| 4 - Kafil adoption | Kafil | Move 3 | local, browser, PostgreSQL, no DDL |
| 5 - second app adoption | second app | Move 3 | app-local gate and browser acceptance |
| 6 - future template/docs | Najm | Moves 4-5 evidence | documented stable pattern |

Report Najm implementation, Najm publication, Kafil adoption, second-app
adoption, GitHub state, and deployments as separate pass/fail outcomes. Do not
combine package publication with either consumer deployment.
