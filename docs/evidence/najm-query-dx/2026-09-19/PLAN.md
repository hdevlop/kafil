# Najm Query DX and Consumer Adoption Plan

## Objective

Provide one tested Najm Kit query layer for common TanStack Query key, read,
command, invalidation, feedback, and CRUD wiring, then adopt it in Kafil and
School without moving application domain policy into the package.

This plan owns source implementation, package validation, registry release,
consumer migration, and source verification. Browser acceptance, Git
publication, deployment, and production acceptance remain separate outcomes.

## Repositories and ownership

- `C:\Users\hdevlop\Desktop\najm`
  - owns the reusable `najm-kit/query` client hooks;
  - owns the server-safe `najm-kit/query/keys` entry point;
  - owns package tests, declarations, exports, documentation, and release.
- `C:\Users\hdevlop\Desktop\kafil`
  - adopts the shared hooks and keys;
  - retains Kafil API error normalization and cross-feature invalidation policy;
  - retains `catalogWriteKeys` as application-owned catalog behavior.
- `C:\Users\hdevlop\Desktop\school`
  - adopts the shared query layer;
  - removes the duplicated `useEntityCRUD` implementation;
  - retains School endpoint selection, translations, response shaping, and
    feature-specific invalidation.

## Constraints

- Preserve unrelated dirty work in all three repositories.
- Use Bun only.
- Do not make School consume a sibling checkout, `file:` dependency, workspace
  link, or unpublished tarball.
- Keep `najm-kit`'s root entry independent of the optional React Query peer.
- Keep query-key construction server-safe and separate from client hooks.
- Do not weaken or broaden application authorization, privacy, or cache
  invalidation policy.
- Do not claim registry, Git, browser, deployment, or production completion
  without direct evidence for that boundary.

## Target public API

### `najm-kit/query/keys`

- `entityKeys.all(entity)`
- `entityKeys.list(entity, filters?)`
- `entityKeys.detail(entity, id)`
- `createEntityKeys(entity)` for a bound namespace

This entry is pure and server-safe: no React, browser, toast, or runtime
TanStack Query imports.

### `najm-kit/query`

- `useEntityQuery` and `EntityQueryOptions`
- `useEntityCommand` and `EntityCommandOptions`
- existing responsive offset-list exports remain unchanged

### `najm-kit/query/crud`

- `useEntityCRUD` as an i18n-aware compatibility bridge for School's
  established feature hooks

The separate leaf keeps `najm-kit/query` usable without loading the optional
Najm i18n peer.

The command contract must:

- await every requested invalidation before completing success handling;
- preserve TanStack mutation callbacks and context;
- accept success and error messages as values or resolvers, where a string
  error message is only a fallback and a resolver's answer wins outright;
- normalize common `Error`, `body`, and `response.data` message shapes;
- permit an application-specific error-message resolver;
- use Najm Kit toast feedback without requiring consumers to import Sonner.

The CRUD compatibility contract must preserve School's current behavior while
delegating reads and commands to the shared primitives. It is not allowed to
invent School endpoints or domain invalidation relationships.

## Phases

### Phase 0 - Audit and plan

- [x] Inspect Kafil's shared hook folder and all consumer references.
- [x] Inspect School's root hooks, `useEntityCRUD`, and feature consumers.
- [x] Verify current Najm Kit query/package entry points and optional peers.
- [x] Record dirty worktrees and avoid overlapping unrelated work.
- [x] Add this root plan and index it from `docs/plans/README.md`.

### Phase 1 - Najm Kit shared implementation

- [x] Add the server-safe entity-key module and bound key factory.
- [x] Add the client query wrapper with complete TanStack generics.
- [x] Add the command hook with awaited invalidation and feedback policy.
- [x] Add the School-compatible CRUD bridge on top of the shared primitives in
  its own optional-i18n leaf.
- [x] Export client hooks only from `najm-kit/query`.
- [x] Export keys from the distinct `najm-kit/query/keys` entry.
- [x] Preserve the client directive in built `dist/query.mjs`.
- [x] Document both entry points and migration examples.

### Phase 2 - Najm Kit verification and release readiness

- [x] Add focused key tests, including server-safe import coverage.
- [x] Add DOM tests for reads, messages, callbacks, and awaited invalidation.
- [x] Add CRUD compatibility tests for list and mutation behavior.
- [x] Run Najm Kit lint, tests, build, RSC/import-isolation checks, and public
  API snapshot validation.
- [x] Prepare the next patch version without publishing it implicitly.

### Phase 3 - Registry publication

- [x] Obtain explicit publication authority.
- [x] Commit or otherwise satisfy the clean-candidate requirement without
  discarding unrelated work.
- [x] Pack and inspect the candidate.
- [x] Publish the new exact `najm-kit` version.
- [x] Wait for the registry artifact to resolve and verify its integrity.

### Phase 4 - Kafil adoption

- [x] Pin the published Najm Kit version in root overrides, manifests, and lock.
- [x] Replace local key imports with `najm-kit/query/keys`.
- [x] Replace local query/command imports with `najm-kit/query`.
- [x] Preserve Kafil's API error and invalidation behavior.
- [x] Delete `apps/web/src/hooks/queryKeys.ts`.
- [x] Delete `apps/web/src/hooks/useEntityQuery.ts`.
- [x] Delete `apps/web/src/hooks/useEntityCommand.ts`.
- [x] Keep `catalogWriteKeys.ts` application-owned; it stayed in
  `apps/web/src/hooks/` because it composes three feature key modules and
  belongs to no single one.
- [x] Update focused tests to assert the published package surface.
- [x] Run Kafil lint, typecheck, tests, build, and `db:generate`.

### Phase 5 - School adoption

- [x] Pin the same published Najm Kit version in exact root/app pins and lock.
- [x] Replace local `useEntityCRUD` imports with `najm-kit/query/crud`.
- [x] Preserve School translation fallbacks, response envelope shaping, the
  shared file-cache invalidation, and feature-specific keys.
- [x] Delete `apps/dashboard/src/hooks/useEntityCRUD.tsx`.
- [x] Replace local `useDelayedLoading` imports with `najm-kit` and delete the
  duplicate hook.
- [x] Leave School-only language, enum, confirmation, form, and feature hooks
  local.
- [x] Run School lint, dashboard tests, i18n parity, and production build.

### Phase 6 - Closure

- [x] Confirm no Kafil import references the three removed hook files.
- [x] Confirm no School import references the removed CRUD/delayed-loading files.
- [x] Confirm both consumers resolve exactly the published package artifact.
- [x] Record source/package/registry/consumer/Git/browser/deployment verdicts
  independently.

## Non-goals

- Replacing React Query itself or hiding all TanStack Query capabilities.
- Moving Kafil catalog, family, budget, or order invalidation policy into Najm.
- Moving School endpoint maps, locale keys, or response DTOs into Najm.
- Refactoring every direct application `useQuery` or `useMutation` call.
- Browser, responsive, RTL, deployment, or production acceptance for this
  non-visual query-layer slice.

## Rollback

- Consumers can restore their local wrappers while leaving the additive package
  exports in place.
- The new package entry points are additive; rollback does not require removing
  or rewriting existing Najm Kit query exports.
- Never roll back by resetting unrelated working-tree changes.

## Current status

Complete through Phase 6. Verdicts are recorded per boundary, each from its own
evidence.

- **Source (Najm Kit):** verified. Lint, the 1,333-test package suite, the
  9-test RSC suite, the distribution-shape checks, and the public API snapshot
  check all passed against the committed source.
- **Package:** verified. Two defects were found and fixed during adoption
  rather than shipped: an `errorMessage` resolver was being demoted to a
  fallback, which would have replaced Kafil's localized order-limit denials and
  School's translated CRUD errors with the raw server message; and the CRUD
  bridge defaulted its response payload to `unknown`, which broke every
  unannotated read in the endpoint-map consumer it exists to serve. Both are
  pinned by tests.
- **Registry:** verified. `najm-kit@2.16.2` is published and resolves with
  integrity
  `sha512-OZ+qQgHBs37mlD5eS5TS/GMQKLoxJBftYxhvuNp7Aq0s7rXmRvBdnXp+/QZdq66mbWqhgv3KZqe30+12xsFKNw==`.
  `2.16.1` was published first and superseded by `2.16.2`; nothing consumes it.
- **Consumers:** verified. Both lockfiles record that exact integrity hash, and
  both installed trees report `2.16.2`. Kafil's root `node_modules/najm-kit` was
  a stale `2.14.0` directory left by an older install — outside the lockfile and
  serving `packages/server`'s settings modules — and was removed and reinstalled.
  Kafil passed lint, typecheck, 462 + 505 + 90 tests, the production build, and
  `db:generate` with no new migration. School passed lint (3 pre-existing
  `no-img-element` warnings), 77 dashboard tests, i18n parity with no missing
  keys across `ar`/`en`/`es`/`fr`, and the production build.
- **Git:** partial. The three Najm Kit commits are on local `master` and are not
  pushed. Kafil and School changes are unstaged working-tree edits.
- **Browser:** not claimed. This slice is non-visual and no browser run was made.
- **Deployment and production:** not claimed. Neither was attempted.
