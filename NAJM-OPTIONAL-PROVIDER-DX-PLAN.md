# Najm optional provider DX and Kafil default location

Date: **2026-09-17**

Status: **Shared implementation and releases complete; Kafil and School source
migrations complete. Browser/manual acceptance was intentionally not run.**

## 1. Agreed outcome

Keep Kafil's existing `AppProviders` component, `NajmAppProvider`, and
`loadUiSnapshot()` layout flow. Extend those contracts so applications declare
integrations once and Najm handles their standard composition.

- `location: true` selects the shared default Leaflet preset, including in Kafil.
- Omitted location configuration means no location integration.
- A location configuration object customizes the default or selects a supported
  alternative provider.
- The server resolves location into the snapshot and derives matching CSP.
- The existing client provider consumes the standard snapshot automatically.
- Remove ordinary consumer `selectProps`, `selectConfig`, location wrappers,
  and repeated generic translation mapping.
- Other integrations are optional by configuration presence. Consumers should
  not need a list of `false` flags to avoid providers they never requested.
- Preserve explicit runtime bindings such as `auth.client` and the app's
  translation catalog. They cannot be reconstructed from serialized data.

Do **not** introduce `defineNajmClientApp`. It was a discussion proposal, not an
existing export. The installed `createNajmAppProvider` factory is already
deprecated in favor of the direct `NajmAppProvider`. This plan improves that
existing direct API and its one composition engine.

## 2. Scope and current evidence

The 2026-09-17 execution implemented the shared contracts, published the
packages, and migrated Kafil and School. Deployment and browser/manual
acceptance were not part of the execution.

| Repository | Planned responsibility |
| --- | --- |
| `../najm` | Shared contracts, runtime, optional composition, translations, fixtures, documentation and CLI templates |
| Kafil | First adoption with `location: true`, removal of location wiring, independent validation |
| `../school` | Compatibility review and later independent adoption, retaining Google behavior |
| Future agriculture app | Minimal fixture proving reuse; no new application or GIS feature implementation |

Inspected Kafil baseline:

- Root overrides pin `najm-next@0.6.0`, `najm-kit@2.15.0`,
  `najm-auth@4.0.4`, and `najm-theme@0.2.1`; Leaflet is `1.9.4`.
  Recheck these at implementation time.
- `apps/web/src/najm.config.ts` uses the existing `defineNajmApp`. It separately
  constructs `kafilLocation` with `defineNajmLocationRuntime`.
- `apps/web/src/najm.server.ts` resolves that runtime and manually forwards
  `locationConfig` through both `readSettings` and `fallbackSettings`.
- `apps/web/src/proxy.ts` separately supplies a `resolveLocationCsp` callback.
- `apps/web/src/providers/AppProviders.tsx` passes a local location integration
  object with `Provider` and `selectProps` to `NajmAppProvider`.
- `KafilLocationProvider.tsx` binds translated labels and `geocoder={null}` to
  the shared `NLeafletLocationRuntimeProvider`.
- The layout already loads one snapshot and renders
  `<AppProviders snapshot={snapshot}>`. Theme and branding composition already
  exist; do not present them as a newly built capability.
- Installed app declarations currently require auth, preference, CSP and
  location policies. The full client contract requires auth and branding;
  the Next server adapter requires theme/auth bindings. Optionality therefore
  needs real contract and implementation changes, not just removing JSX props.
- The installed Leaflet runtime already lazy-loads its adapter. Its adapter
  identity is memoized by the config object; equivalent new objects must be
  considered during the remount audit.

The worktree contains the user's retirement of ten earlier root plans, changes
to `docs/plans/README.md`, and new `docs/tests/` documents. Preserve this work.
Do not restore retired plans or create a generic root `PLAN.md`.

## 3. Configuration semantics

### 3.1 One declaration per integration

| Integration | Declaration or binding | Omitted behavior |
| --- | --- | --- |
| Auth | Existing app auth policy plus server/client auth bindings | No Najm auth provider in a deliberately unauthenticated composition |
| Query | Explicit `query: true` or query options in the new optional composition contract | No query provider in a minimal new composition |
| i18n | App translation catalog supplied to the client provider | No app-wide Najm i18n provider |
| Theme | `theme: true` or supported theme options in the app definition, plus required server binding | No Najm theme integration |
| Branding | `branding: true` or supported branding options, plus required server binding | No Najm branding integration |
| Location | `location: true` or a location configuration object | No location integration or location network requests |

`true` means use the integration's documented defaults; an object means
customize it. Runtime dependencies remain explicit once at their proper
boundary. Do not add duplicate `auth: true` or `i18n: true` switches alongside
bindings that already declare those integrations.

Query is included explicitly to avoid hiding an always-on dependency in the
minimal contract. Kafil will opt into its current shared Query defaults once.
Legacy APIs must retain their current default Query behavior during the
compatibility window; see section 8 for versioning.

Presence refers to configured capability, not successful data loading:

- `session: null` is an anonymous session, not disabled Auth.
- Theme/branding failures retain their configured provider and typed fallback.
- Empty translations do not silently change the mounted provider topology.
- A default `preferences.theme` string alone does not activate theme ownership.
- `location: { provider: "disabled" }` retains the shared manual-address
  context while disabling the map. Omitted location mounts no location context.
- Invalid enabled location configuration follows the existing validated disabled
  fallback with sanitized diagnostics; it must not switch to an unapproved
  provider or enable geocoding.

Reject incompatible bindings clearly. An auth policy without its required
runtime binding must not silently become an unauthenticated app. Custom auth,
i18n or theme providers require compatible adapters for Najm components that
consume their contexts; arbitrary third-party providers are not interchangeable.
Mount each context once and document valid combinations, including branding
without theme and location without app-wide i18n.

### 3.2 Default location preset

The shared preset must be complete and documented, not a hidden Kafil-specific
branch. The proposed initial preset preserves Kafil's current map baseline:

| Setting | Proposed default |
| --- | --- |
| Provider | Leaflet |
| Allowed providers | Leaflet and the disabled fallback; no implicit Google |
| Initial center | Latitude `33.5731`, longitude `-7.5898` |
| Initial zoom | `12` |
| Tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Attribution | Visible, linked OpenStreetMap contributor attribution |
| Geocoder | None |
| Language | Active app language, or shared English labels without app-wide i18n |
| Loading | On map use, not at provider mount |

Document the initial center as a regional default, not a detected user location
or a saved value. It must never create persisted coordinates. Applications can
override it; stored coordinates take precedence when displaying a saved pin.
Freeze this preset in phase 0 and treat later default changes as observable
behavior changes. If a different shared center is selected, document the Kafil
viewport change rather than silently claiming parity.

Derive the default environment prefix from the validated app ID:
`kafil` -> `KAFIL_LOCATION`. Define deterministic normalization for separators,
reject unsupported IDs or ambiguous prefixes, and permit an explicit override.
Preserve Kafil's existing environment variable suffixes and validation rules.
Precedence: valid runtime overrides > explicit configuration > shared preset.
Invalid values follow the existing resolver's safe fallback contract.

Keep tile URL and attribution configurable. Public OSM tiles require visible
attribution, normal cache behavior and browser identification; do not add bulk
prefetch or offline downloads. Availability has no SLA. Source checked for this
plan: [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
Use controlled tile fixtures for automated network tests.

## 4. Target Kafil code

These examples describe the new contract. They are not valid replacements
against the currently installed package. Existing auth routes, role policies,
cookie names, timezone and CSP settings remain in the actual app definition.

```ts
// apps/web/src/najm.config.ts — relevant configuration excerpt
export const kafilApp = defineNajmApp({
  id: "kafil",
  // Existing auth, preferences and CSP properties remain here.
  theme: true,
  branding: true,
  location: true,
});
```

```tsx
// apps/web/src/providers/AppProviders.tsx — target complete component
"use client";

import { NajmAppProvider } from "najm-next/app/client";
import { KAFIL_BADGE_DEFAULTS } from "@/features/StatusLabels";
import { auth } from "@/najm.auth";
import type { KafilUiSnapshot } from "@/najm.server";
import { APP_NAME } from "@/types/branding";
import { kafilUiI18n } from "@kafil/server/locales";
import { KAFIL_CURRENCY } from "@kafil/server/money";

export function AppProviders({ children, snapshot }: Readonly<{
  children: React.ReactNode;
  snapshot: KafilUiSnapshot;
}>) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      query={true}
      snapshot={snapshot}
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

The single explicit Query opt-in preserves today's policy while allowing other
apps to omit it. No `app` prop is needed here solely to re-forward theme,
branding or location activation already represented by the server snapshot.

```tsx
// Existing layout flow stays intact.
const snapshot = await loadUiSnapshot();

<AppProviders snapshot={snapshot}>
  {children}
  <NajmClientRoot />
  <NajmPwaRegistration />
</AppProviders>
```

Retain Kafil's actual `snapshot.preferences` document attributes, fonts,
metadata, PWA registration and client-root behavior. Do not replace the layout
with the earlier illustrative `snapshot.language`/`snapshot.direction` fields.

Server and proxy changes:

1. Extend the existing `createNajmNextServerApp` to resolve enabled integrations
   from `app`; retain Kafil's real auth, theme factory, theme options,
   preferences and diagnostic bindings.
2. Infer `KafilUiSnapshot` from `loadUiSnapshot` as today. Keep canonical
   `snapshot.settings.locationConfig` for location, with a typed optional shape
   when omitted. Never require consumer mapping into another location field.
3. Remove Kafil's standalone `kafilLocation`, manual runtime resolution and the
   settings reader/fallback whose only purpose was forwarding location.
4. Extend `composeNajmProxy` to derive location CSP from the same normalized
   app policy and resolver. Remove the standard-case callback. Keep static
   matcher literals and existing auth proxy behavior.
5. Delete `KafilLocationProvider.tsx` after migrating generic labels to the
   shared integration. Keep necessary family-specific wording on the feature's
   location control, not a global application provider.

## 5. Shared implementation boundaries

| Owner | Required work |
| --- | --- |
| `najm-next/app` | Pure optional integration definitions, default normalization, typed validation |
| `najm-next` server/security | One location resolver contract for snapshot and CSP; optional server bindings and fallback semantics |
| `najm-next` client/composer | Automatic snapshot consumption, optional integration graph, stable Query lifetime, one composition core |
| `najm-kit` | Generic location labels, provider-neutral controls, existing optional Leaflet/Google adapters and context bridges |
| `najm-theme` / `najm-auth` | Continue owning their existing behavior; extend contracts only where needed |
| `najm-cli` | Generate the final optional setup from published APIs |
| Applications | Domain policy, catalogs, runtime bindings, persistence, feature wording and map-service overrides |

Keep `defineNajmApp` serializable and safe for proxy/config imports. Do not
place translation functions, React components, theme definitions, auth clients,
environment reads or backend imports into that shared definition.

The normalized snapshot must distinguish omitted integrations from configured
ones with fallback data. Prefer existing payload fields; add a derived,
serializable capability discriminator only where payload presence is ambiguous.
Freeze that shape with type tests before implementation. It is generated by
Najm, not another set of app-maintained flags. Snapshot metadata is not an
authorization boundary; backend authorization remains authoritative.

Preserve enabled-provider order:

```text
Auth -> Query -> beforeUi -> Kit UI integrations -> Theme/branding
     -> insideUi -> Location -> children
```

Skip absent integrations without conditional hooks or duplicate contexts.
Refactor Kit's aggregate provider where necessary so disabling i18n or theme
really disables that owner. Shared controls may need minimal fallback values
without mounting an app-wide replacement provider. Validate all supported
combinations rather than assuming existing hooks tolerate missing contexts.

Reuse the existing location runtime and lazy loader. Resolve default labels
from the active locale automatically and react to locale changes. Make shared
labels neutral: replace defaults such as "Delivery location selected" with
"Location selected" across en/fr/ar/es. Preserve feature overrides and manual
address details when pins move.

Avoid remounting a map when only labels or an equivalent configuration object
changes. Deliberate provider/tile changes must update the map correctly. Cache
SDK loading, never user locations or cross-request snapshots. Measure loading
and remount behavior; do not claim a performance gain from fewer wrapper lines.

### Optional dependency feasibility gate

Dynamic import alone does not prove an SDK can be absent: bundlers may resolve
disabled branches. Before freezing package exports, build real installed
fixtures for no maps, Leaflet only and Google only, including missing optional
packages. Also test compositions without Auth, Theme, Query and app-wide i18n.

The target ordinary Kafil import remains `najm-next/app/client`, without manual
adapter registration. If this conflicts with genuinely optional dependencies,
resolve package exports/build generation in phase 0 and document any required
import adjustment before consumer migration. Do not conceal mandatory SDKs or
restore per-app wrappers to bypass the issue. No-map apps must make no map
requests; map apps must not load unused Google/Leaflet SDKs on first paint.

## 6. Implementation phases

The checked items below were completed on 2026-09-17. Browser/manual acceptance
items remain open because this execution explicitly excluded browser tests.

### Phase 0 — Freeze contracts and prove optional packaging

- [x] Record live versions, existing patches, branches, HEADs and scoped dirty work.
- [x] Audit existing composer, Kit aggregate provider, server snapshot types,
  proxy resolver, CLI templates and School custom integrations.
- [x] Freeze omitted/true/object semantics, Query compatibility, snapshot shape,
  supported integration combinations, default preset and environment prefix.
- [x] Prove optional package installation and production bundling with fixtures.
- [x] Select the versioning strategy for omission semantics; no silent breaking
  change in a patch release.

Exit: one implementable contract with no unresolved optional-dependency or
snapshot ambiguity. Do not implement a new provider factory.

### Phase 1 — Shared configuration and server resolution

- [x] Add `location: true` and default/object normalization to the existing app API.
- [x] Make integrations optional with discriminated, inferred snapshot types.
- [x] Resolve location/CSP from one shared implementation and environment policy.
- [x] Preserve runtime restart semantics, disabled fallbacks and sanitized diagnostics.
- [x] Support minimal server bootstraps without unrelated auth/theme bindings.

Exit: equivalent app/environment inputs yield matching snapshot/CSP config;
minimal and fallback cases pass without secret or backend client leakage.

### Phase 2 — Existing client composer and shared labels

- [x] Consume normalized snapshot integrations directly in `NajmAppProvider`.
- [x] Implement actual opt-in providers and external-context adapter boundaries.
- [x] Preserve provider order, Query lifetime and existing extension slots.
- [x] Automate locale labels; neutralize shared wording; retain feature overrides.
- [x] Verify lazy SDK loading, config identity, updates, resize and cleanup.
- [ ] Add Playground examples for default Leaflet, custom config, absent maps,
  disabled maps, external i18n/theme and Google compatibility.

Exit: no standard consumer selector/wrapper; supported provider combinations
and lifecycle behavior pass through the single existing composition engine.

### Phase 3 — Package validation and release preparation

- [x] Run affected package lint/typecheck/tests/build and public API checks.
- [x] Validate Next production fixtures, exports, optional peers, emitted CSS
  and single context identity using packed artifacts.
- [x] Document migration from current direct and deprecated factory APIs.
- [x] Prepare exact versioned release artifacts under the shared repo workflow.
- [x] Publish when authorized and verify exact registry artifact integrity.

Exit: consumer-ready published contracts, with source, pack and publication
evidence recorded separately. Do not substitute copied sibling source for release.

### Phase 4 — Kafil adoption

- [x] Update exact package pins/lockfile, preserving the existing auth patch.
- [x] Set `theme: true`, `branding: true`, and specifically `location: true`.
- [x] Preserve Kafil auth/routes/cookies/preferences, badge defaults and MAD currency.
- [x] Remove redundant location resolver, proxy callback, selectors and wrapper.
- [x] Preserve no-geocoder behavior, env overrides, family DTO mapping and labels.
- [x] Run source gates and verify no migration drift.
- [ ] Verify family create/edit/save/fresh-read/reopen and location failure states.

Exit: Kafil uses the published shared flow with its existing component/layout
shape. Saved location behavior, map loading, localization and CSP are evidenced.

### Phase 5 — Reuse and scaffolding

- [x] Verify School's existing Google/Places behavior remains supported; do not
  switch School to Leaflet as part of this DX change.
- [x] Migrate School independently if included in execution scope, preserving
  institutional preferences, keyboard extensions, Query policy and placeId.
- [ ] Update existing CLI templates; generate a minimal app and an agriculture
  point-location fixture with `location: true` from published dependencies.
- [x] Document optional integration and custom-provider examples.

Exit: reuse is proven outside Kafil. School acceptance is independent; farm
polygons, drawing tools, satellite layers and offline maps remain out of scope.

## 7. Validation and evidence

| ID | Required evidence |
| --- | --- |
| DX-01 | Default `location: true` works without a consumer wrapper, selector or client location prop |
| DX-02 | Omitted integrations mount no corresponding owner and require no repeated false flags |
| DX-03 | Null session, empty data and theme/branding outage preserve configured ownership |
| DX-04 | Type errors catch missing bindings and unsupported combinations; external adapters avoid duplicate contexts |
| DX-05 | App definition imports stay pure; client bundles contain no backend, environment object or server-only modules |
| PKG-01 | Real minimal/Leaflet/Google fixtures build with only their documented dependencies |
| LOC-01 | Default prefix preserves KAFIL_LOCATION variables; defaults/object/env precedence and malformed values are tested |
| LOC-02 | Snapshot and CSP agree for default, custom, disabled and invalid config after required restart |
| LOC-03 | Omitted/disabled/closed maps produce no unintended SDK, tile or geocoder traffic |
| LOC-04 | Shared locale labels update across en/fr/ar/es; absent i18n has usable defaults |
| LOC-05 | Equivalent config/label changes do not remount maps; real config changes apply and cleanup completes |
| KAF-01 | Existing auth, theme, branding, Query policy, cookies, badge formatting and MAD behavior remain correct |
| KAF-02 | Synthetic family address/pin survives save, fresh read and reopen; manual address details remain intact |
| UI-01 | Desktop/mobile, Arabic RTL, keyboard/focus and map error/retry behavior have browser or manual evidence |
| REUSE-01 | Google selection/cancel/geocoding/placeId remain compatible; minimal future app installs independently |

For implementation, run the actual scripts in each affected Najm package and
its relevant Next integration fixtures. Verify script names from the current
repository; do not invent a monorepo-wide command. Validate packed artifacts
before registry adoption and record version/integrity separately.

Kafil implementation gate, run sequentially and stop on failure:

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

No schema change is expected. Investigate any generated migration rather than
applying it. Browser acceptance is separate from `bun run test`; read the
Playwright skill and use approved local fixtures. If execution is manual-only,
provide Playground/local steps and record manual acceptance as pending until
observed. Never turn a historical no-browser instruction into a false pass.

Record evidence under `docs/evidence/najm-optional-provider-dx/<date>/README.md`:
repository/commit, versions, scoped diff, requirement IDs, commands/results,
artifacts and unresolved limitations. Separate package source, publication,
Kafil adoption, School adoption, browser acceptance, Git publication and deployment.
Do not store secrets, real family locations, auth cookies or raw provider data.

Execution evidence: [`docs/evidence/najm-optional-provider-dx/2026-09-17/README.md`](docs/evidence/najm-optional-provider-dx/2026-09-17/README.md).

For the implementation run, source/package gates and database generation were
required. Browser tests remained explicitly excluded and are not claimed.

## 8. Compatibility, rollback and completion

Omission-based composition changes today's required fields and default Query
behavior. Choose a breaking version or an explicitly versioned normalized
contract, with old snapshots retaining their established semantics during the
migration window. Do not infer old/new behavior from transient missing data.
Direct and deprecated factory APIs must delegate to the same core; avoid a
second provider stack or permanent new compatibility wrapper in Kafil.

Retain the old explicit location integration as a documented compatibility or
advanced extension until consumers migrate. Define precedence with tests:
an explicit legacy/custom integration overrides automatic location mounting;
never mount both. Standard new consumers require neither that prop nor `false`.

Rollback Kafil's adoption and exact dependency changes together, preserving
unrelated work. No database rollback should be needed. Retain environment
variable names and stored address/coordinate contracts. Restore package and
CSP behavior together; do not relax auth or CSP to mask incompatibility.

Completion requires all in-scope phase exits and validation evidence, not just
a shorter `AppProviders.tsx`. Package publication, consumer Git publication,
deployment and real browser acceptance remain separately reported boundaries.

## 9. Documentation baseline

This plan replaces none of the user's retired root plans. Existing connected
acceptance documentation remains under
[`docs/tests/connected-four-account/`](docs/tests/connected-four-account/README.md).
The active plan index is [`docs/plans/README.md`](docs/plans/README.md).
