# Najm application provider unification

Status: **IMPLEMENTED AND PUBLISHED - shared packages and both consumers pass
their non-browser gates; browser/manual acceptance remains explicitly deferred.**

Date: **2026-09-15**

Canonical location: the Kafil repository root. This plan coordinates shared
Najm changes, Kafil and School adoption, and future application scaffolding.
The 2026-09-16 implementation request authorized local source implementation
without browser tests. The 2026-09-17 follow-up authorized package publication,
persistent Kafil and School adoption, and Git publication. Deployment remains a
separate boundary.

## 1. Goal and relationship to existing work

Give Next applications one recommended provider API that accepts `authClient`,
`snapshot`, `location`, Query policy, extensions, and normal UI props directly.
Applications should configure their differences and reuse the same execution
flow, without authoring Auth/Query/UI/Branding wrapper stacks.

This is a follow-up to [NAJM-APP-INTEGRATION-DX-PLAN.md](NAJM-APP-INTEGRATION-DX-PLAN.md).
That plan remains the owner of the existing server bootstrap, CSP, preferences,
location rollout, and their pending acceptance. This document owns the next
provider API consolidation; its proposed contracts do not describe exports
already available in published packages. Earlier completion boxes do not prove
this follow-up complete.

Success means one implementation of provider ordering and Query lifetime, a
direct provider API used by both consumers, and generated apps using that API.

## 2. Inspected baseline

Source inspected on 2026-09-15; recheck revisions, installed declarations,
patches, package versions, and working trees before implementation.

| Surface | Current behavior | Issue to address |
| --- | --- | --- |
| Najm `packages/najm-next/src/app/client.tsx` | `createNajmAppProvider` manually composes Auth, Query, Kit UI, Theme branding, and Location | Duplicates the generic composer's ordering and Query lifetime; no extension slots |
| Najm `packages/najm-next/src/app/react.tsx` | `NajmNextAppProvider` composes structural provider bindings and extension slots | Keep this as the shared composition engine and advanced public API |
| Najm `packages/najm-kit/src/adapters/app.tsx` | `NajmAppProvider` handles UI/i18n/formatting/preferences; delegates to Kit's Next adapter | Its name is easily confused with the full application provider |
| Kafil `apps/web/src/providers/AppProviders.tsx` | Uses the factory with `auth.client` and a typed location selector | Replace the factory call with the direct provider |
| School `apps/dashboard/src/app/providers.tsx` | Uses the generic composer, explicit bindings, and `beforeUi` keyboard extension | Adopt the same direct API while retaining extension placement and policy |
| Najm `packages/najm-cli/src/nextIntegration.ts` | Separate generic and full-stack generated provider paths | Generate from the consolidated contracts; preserve minimal installations |

At planning time Kafil has a pre-existing edit in `AppProviders.tsx`, Najm has
uncommitted integration/CLI work including the new factory, and School reports
a clean working tree. Preserve existing work and review overlapping changes.
These observations do not establish publication or deployment status.

## 3. Ownership

| Owner | Responsibilities |
| --- | --- |
| `najm-auth` | Session state, hydration, recovery, authorization primitives, auth proxy behavior |
| `najm-kit` | UI contexts, translations integration, formatting, preferences, controls, location adapters and label catalogs |
| `najm-theme` | Appearance/branding loading, branding assets and React provider |
| `najm-next` | Next integration, server snapshot orchestration, shared provider composition, Query adapter, CSP coordination |
| Application | Routes/roles, public settings projection, currency, catalogs, fonts, metadata, provider/geocoder policy and custom extensions |

Keep `najm-next -> najm-kit` as the dependency direction. Kit must never import
or re-export the full provider from `najm-next`: doing so would introduce a
reverse dependency and risk a cycle. Existing Kit Next-specific adapters remain
in place for this slice; relocating all adapters is a separate migration.

## 4. Target request flow

```text
App configuration
  |-- proxy.ts: auth proxy + CSP, including selected map origins
  |-- najm.server.ts: bind Auth, Theme, preferences and public settings
  `-- providers.tsx: client imports and application integration choices

Browser request -> proxy -> server layout -> loadUiSnapshot()
  -> public snapshot -> AppProviders -> application feature components
```

Server/client/proxy modules retain separate import boundaries. The root layout
owns document markup and metadata and passes the serializable snapshot once.
Only public session/display data crosses that boundary; clients, callbacks,
provider components, environment objects and backend services do not.

## 5. Proposed public API

### 5.1 Direct full application provider

Add a named `NajmAppProvider` export at `najm-next/app/client`. It accepts:

- `snapshot`: typed full public snapshot, retaining application settings types.
- `authClient`: the existing application Auth client.
- `query`: existing `defineNajmTanStackQuery` integration, or `false`; omitted
  uses the existing Najm defaults.
- `location`: optional `{ Provider, selectProps }` integration, with inferred
  props and access to the typed snapshot.
- `extensions`: optional typed provider bindings at `beforeUi` and `insideUi`,
  reusing the existing binding contract.
- Kit UI props such as `i18n`, `appName`, `badgeDefaults`, `currency`, preference
  endpoint overrides, and controlled design props where already supported.
- `children`.

Kafil example (proposed API; existing app imports/constants omitted):

```tsx
"use client";

import { NajmAppProvider } from "najm-next/app/client";

const location = {
  Provider: KafilLocationProvider,
  selectProps: (snapshot: KafilUiSnapshot) => ({
    config: snapshot.settings.locationConfig,
  }),
};

export function AppProviders({ children, snapshot }: {
  children: React.ReactNode;
  snapshot: KafilUiSnapshot;
}) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      location={location}
      i18n={kafilUiI18n}
      appName={APP_NAME}
      badgeDefaults={KAFIL_BADGE_DEFAULTS}
      currency={KAFIL_CURRENCY}
    >
      {children}
    </NajmAppProvider>
  );
}
```

School uses the same provider with its existing Query settings, institution
currency from `snapshot.preferences.currency`, Google location integration,
and `extensions={{ beforeUi: keyboardBinding }}`. Create `keyboardBinding`
once at module scope with the existing `bindNajmNextProvider` helper.

The full entry imports its Auth/Query/Kit/Theme peers. `query={false}` disables
mounting Query; it does not promise the full entry can load without the Query
package installed. Minimal apps continue to use `najm-next/app/react`, whose
imports remain independent of those optional peers. Map SDKs stay in their
respective lazy adapter entrypoints.

### 5.2 One composition implementation

The direct provider and compatibility factory both delegate to the existing
generic composer or a single internal core extracted from it. Preserve:

```text
Auth -> Query -> beforeUi -> Kit UI -> Theme branding -> insideUi -> Location
     -> children
```

- Create internal components/bindings with stable identity. Recreating an
  options object during a parent render must not remount descendant state.
- Own one QueryClient per mounted provider, never a server-global client.
- Initialize Query policy once per mount. Document that switching Query on/off,
  its constructor, or the auth client requires an intentional remount; reject
  unsupported identity changes clearly instead of mixing new providers with
  an old client. Ordinary snapshot/UI changes remain supported.
- Preserve auth hydration semantics from Najm Auth; a later stale snapshot
  must not recreate a logged-out session through new integration behavior.
- Recompute location props from the current snapshot without recreating the
  Location component type.
- Preserve all existing UI prop precedence and initial-versus-controlled
  semantics. Snapshot updates must not accidentally reset user theme/language.
- Keep one physical instance of every package context in built exports and
  preserve the existing Theme-to-Kit branding update bridge.

### 5.3 Reactive UI integration

The existing factory accepts a captured `useUiProps` hook. Preserve its existing
behavior for compatibility, including explicit JSX props winning over derived
values. Do not expose an arbitrarily replaceable hook callback on the direct
component. If reactive UI derivation is needed there, define a stable component
slot that runs inside Auth/Query and above Kit UI, and prove its use with a
concrete fixture before adding the API. A hook must never run in a context
above the providers it needs, or change hook order when an optional prop changes.

### 5.4 Kit naming and compatibility

- Add `NajmKitProvider` and matching types in `najm-kit/app` for its existing UI
  implementation. It remains a Next-aware UI adapter in this slice.
- Retain Kit's `NajmAppProvider` as a deprecated alias to that same Kit
  implementation, with unchanged behavior and no new package dependency.
- Retain `createNajmAppProvider` as a deprecated wrapper around the consolidated
  Next provider, preserving its generics and hook option semantics.
- Keep `NajmNextAppProvider` and `bindNajmNextProvider` supported for advanced
  and minimal stacks. No third public composer name is needed.
- Update exports, declarations, build configuration, API checks, examples and
  CLI references together. Remove aliases only in a separately scheduled
  breaking release after consumer acceptance.

## 6. Location, snapshot and configuration simplification

### Included: common labels and Query policy

Use Kit's `getNajmLocationLabels(language)` for matching common map labels and
keep Kafil's family-specific wording as overrides. Compare current text and
placeholders across en/fr/ar/es before deleting any app translation keys.
Switching language must update open controls and accessibility announcements.
Keep a small app wrapper where it supplies domain translation or map policy.

Retain Kafil's Leaflet-only entry and `geocoder={null}`. Retain School's Google
Places search/reverse behavior, session handling and provider metadata. Keep
the existing runtime resolver as the common source for snapshot configuration
and CSP contributions; the two execution contexts need not share a cached object.

Reuse `defineNajmTanStackQuery` and explicit overrides. Preserve all effective
School defaults, including cache lifetime, rather than adopting Kafil's policy
incidentally when changing wrappers. Do not reintroduce Kafil's retired form helper.

### Deferred: standard integrations snapshot

The earlier proposal `snapshot.integrations.location` remains a possible later
improvement. For this slice keep `snapshot.settings.locationConfig` and the typed
selector; no snapshot migration is required to achieve the direct API.

Before standardizing an integrations field, establish a server-owned public
projection, optional/no-map types, precedence and compatibility rules, and
prove both consumers benefit. Never maintain two editable location values or
embed a required Leaflet/Google dependency into the generic snapshot contract.

Keep the current scoped `kafilUiI18n` definition and its locale metadata as the
single application translation source. Do not move business catalogs into Najm
Next or introduce another translation provider.

## 7. Implementation phases

### Phase 0 - Confirm contracts

- [x] Record all repository revisions/status and installed/patched contracts.
- [x] Read applicable AGENTS, skills and installed Next server/client guides.
- [x] Reconcile existing dirty provider, Kit and CLI work before editing.
- [x] Freeze direct props, type inference, extension placement, compatibility,
  reactive UI handling and mount-lifetime behavior using typed fixture examples.

Exit: Kafil, School and a minimal app are represented without ownership cycles.

### Phase 1 - Shared provider and compatibility

- [x] Consolidate ordering and Query lifetime into one implementation.
- [x] Export the direct provider and implement stable internal bindings.
- [x] Add extension support and preserve factory behavior through delegation.
- [x] Add the Kit name/alias without changing its context identity.
- [x] Update exports, type declarations, API surfaces, README and changelogs.
- [x] Pass the relevant package and built-export tests in section 8.

Exit: old consumers remain compatible; new consumers need no factory call.

### Phase 2 - Reusable examples and scaffolding

- [x] Add/update Playground examples for a minimal app, Kafil-style Leaflet,
  and School-style Google/keyboard configuration.
- [x] Update existing CLI generator paths and candidate package minimums.
- [x] Generate disposable examples, typecheck/build them against packed candidate
  artifacts, and preserve no-overwrite/idempotent generation behavior.
- [x] After release, repeat the generated-app checks against registry artifacts.

Exit: new apps follow the same documented flow and minimal apps stay minimal.

### Phase 3 - Package release and application adoption

- [x] Prepare reviewed candidate artifacts with recorded version/integrity.
- [x] Publish scoped packages through the authorized release workflow and verify
  registry exports; use published versions for persistent consumer adoption.
- [x] Migrate Kafil to the direct API after a published package is available.
  Exact four-locale comparison moved only Close, Cancel, and Zoom in to Kit's
  common catalog. Family-specific and textually different localized copy stays
  application-owned to avoid wording or accent regressions.
- [x] Migrate School with keyboard placement, Google policy, currency, preference
  precedence, Query settings and F8 behavior preserved.
- [x] Update consumer architecture checks to assert the new ownership contract.
- [x] Run independent consumer source gates. Browser/manual acceptance is
  intentionally deferred by the explicit no-browser-test instruction.

Exit: both applications use the direct provider with independent evidence.

### Phase 4 - Handoff and future removal

- [x] Record provider/import reductions and remaining intentional app wrappers.
- [x] Document the factory/Kit alias migration and future removal release.
- [x] Record remaining acceptance work and any separately authorized Git or
  deployment outcomes without carrying over success from the earlier plan.

## 8. Verification and evidence

| Requirement | Meaningful evidence |
| --- | --- |
| Shared ordering | Hook probes at each extension/location position see the intended contexts |
| Stable lifetime | Re-render with fresh prop objects and changed snapshots; child state and QueryClient survive |
| Isolation | Independent mounts/requests never share session data or Query caches |
| Compatibility | Existing factory, Kit alias and low-level usage retain behavior and type compatibility |
| Types | Infer location/snapshot types; reject mismatched selector props and invalid Query combinations |
| Dynamic UI | Translation changes, theme edits and branding updates reach all relevant consumers |
| Imports | Built client exports contain no server/backend/env imports; contexts remain shared across entries |
| Optional packages | Minimal imports/build succeed without Auth/Theme/Query/maps; Leaflet-only build needs no Google loader |
| Next integration | Production fixture proves server render, hydration and subsequent navigation without remount regressions |
| Kafil | Auth recovery/logout, preferences, family location save -> fresh read -> reopen, no geocoder traffic |
| School | Keyboard/F8 behavior, institution currency, Query failures, Google selection/cancel/reopen including metadata |
| CLI | Fresh minimal and full apps compile from actual package exports and reruns preserve user files |

Use source tests for behavior, DOM re-render tests for lifetime, and built Next
fixtures for import/hydration guarantees. A static render test alone cannot
prove re-render stability or browser acceptance. Use synthetic records in
acceptance; keep private addresses, coordinates and secrets out of evidence.

The following command groups define the implementation gates. The source and
packed-candidate gates that apply to this local slice are recorded in
`docs/evidence/najm-app-provider-unification/source-validation.md`:

- Najm: affected package typechecks/tests/builds, `bun run api:check`, and the
  relevant `najm-next`/Kit Next integration fixtures. Run Kit DOM tests from
  `packages/najm-kit` so its preload applies. Run CLI tests/build for generator work.
- Kafil: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`,
  `bun run db:generate`; no new migration is expected. Investigate drift.
- School: its verified dashboard lint/tests/build and relevant acceptance;
  re-read School AGENTS and scripts before adopting. Preserve unrelated schema work.
- Respect the earlier plan's manual-browser boundary until superseded; record
  deferred browser evidence and provide runnable examples/manual steps.

Store execution evidence under `docs/evidence/najm-app-provider-unification/`.
Track source verification, package publication, each consumer's acceptance,
Git publication and deployment separately. Browser evidence is explicitly
deferred by the 2026-09-16 implementation request.

## 9. Scope and rollback

No auth protocol, authorization rule, database schema, business UI redesign,
provider/geocoder policy, cookie name or preference endpoint change belongs to
this slice. Backend financial commands and persistence remain with their owners.

Retain old APIs throughout the compatibility window. A consumer rollback reverts
its scoped provider adoption and package pins/lock together, preserving unrelated
work. No database rollback is expected. Package removal and deployment are
separate authorized operations, not implied by writing or implementing this plan.
