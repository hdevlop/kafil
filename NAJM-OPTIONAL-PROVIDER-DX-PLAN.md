# Najm optional provider DX and Kafil default location

Date: **2026-09-17**

Status: **Shared implementation/releases and Kafil/School source migrations
are recorded through phase 7. Browser/manual acceptance remains open and was
intentionally not run. Git publication and deployment remain separate.**

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
- Other optional integrations are enabled by configuration presence. Consumers should
  not need a list of `false` flags to avoid providers they never requested.
- Declare `appName` and `currency` in `kafilApp`; Najm projects these public
  values into the snapshot and consumes them without repeated provider props.
- The full `NajmAppProvider` always includes Query with shared defaults.
  Omit the `query` prop for defaults; supply custom options only when needed.
  There is no Query disable flag on this full provider.
- Preserve explicit runtime bindings such as `auth.client` and the app's
  translation catalog. They cannot be reconstructed from serialized data.
- Put reusable status colors, translated labels and status-badge appearance
  defaults in Najm Kit. Remove `KAFIL_BADGE_DEFAULTS` and its provider prop;
  applications supply only genuinely custom statuses, wording or appearance.

Do **not** introduce `defineNajmClientApp`. It was a discussion proposal, not an
existing export. The installed `createNajmAppProvider` factory is already
deprecated in favor of the direct `NajmAppProvider`. This plan improves that
existing direct API and its one composition engine.

## 2. Scope and current evidence

The 2026-09-17 execution implemented the shared contracts, published the
packages, and migrated Kafil and School. Deployment and browser/manual
acceptance were not part of the execution.

The subsequent display configuration and Query work is completed in phase 6
below and recorded in a distinct follow-up evidence ledger. It is not folded
into or substituted for the earlier release evidence.

Phase 7 is implemented and independently recorded in the phase 7 evidence
ledger. Its package, Kafil and School source checks are complete; its browser
and manual acceptance checkbox remains open by explicit request.

| Repository | Planned responsibility |
| --- | --- |
| `../najm` | Shared contracts, runtime, optional composition, translations, fixtures, documentation and CLI templates |
| Kafil | First adoption with `location: true`, removal of location wiring, independent validation |
| `../school` | Compatibility review and later independent adoption, retaining Google behavior |
| Future agriculture app | Minimal fixture proving reuse; no new application or GIS feature implementation |

Historical Kafil baseline before the initial implementation:

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

That initial worktree included retirement of earlier root plans and the test
documentation split. Preserve the resulting organization; do not restore
retired plans or create a generic root `PLAN.md`.

Follow-up baseline verified on 2026-09-17:

- Kafil now uses `theme: true`, `branding: true`, and `location: true` with no
  consumer location wrapper or selector.
- `AppProviders.tsx` still passes `appName={APP_NAME}`,
  `currency={KAFIL_CURRENCY}`, and `query={true}` explicitly.
- Installed `NajmAppDefinition` does not define the two display fields; the
  server/client contracts do not provide the desired automatic display flow.
- The direct provider currently treats omitted Query as disabled. The target
  below intentionally changes that contract; it is not current behavior.
- An existing uncommitted formatting edit in `AppProviders.tsx` belongs to the
  user. This documentation update leaves it untouched.

## 3. Configuration semantics

### 3.1 One declaration per integration

| Integration | Declaration or binding | Omitted behavior |
| --- | --- | --- |
| Auth | Existing app auth policy plus server/client auth bindings | No Najm auth provider in a deliberately unauthenticated composition |
| Query | Built into the full `NajmAppProvider`; optional custom query configuration | Shared Query defaults; exactly one QueryClient/provider |
| i18n | App translation catalog supplied to the client provider | No app-wide Najm i18n provider |
| Theme | `theme: true` or supported theme options in the app definition, plus required server binding | No Najm theme integration |
| Branding | `branding: true` or supported branding options, plus required server binding | No Najm branding integration |
| Location | `location: true` or a location configuration object | No location integration or location network requests |

For optional configuration flags, `true` means use the integration's documented defaults; an object means
customize it. Runtime dependencies remain explicit once at their proper
boundary. Do not add duplicate `auth: true` or `i18n: true` switches alongside
bindings that already declare those integrations.

Query is a required part of the full application provider, not an optional
integration inferred from snapshot fields. Remove `query={true}` from ordinary
consumers. The direct API must not accept `query={false}` or use `false` as a
runtime bypass; invalid untyped input must fail clearly. Custom configuration
must preserve app-owned retry/cache policy, especially School's stricter retry
behavior. Retain one stable QueryClient per mounted app and request-safe server
construction; never create a global client carrying user data across requests.

Consumers needing no Query use the existing lower-level composition API. Do not
add a new full-provider factory or a second composition implementation. Query
is a documented dependency of the full entrypoint; a no-Query installation
fixture applies only to the lower-level/config-only entrypoints.

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

### 3.3 Display configuration through the snapshot

Add optional typed `appName` and `currency` fields to `defineNajmApp`. These are
serializable app defaults, unlike runtime auth clients or translation functions.
Validate supplied values; do not guess currency from language, app ID or a
package-wide monetary default. Omitted currency preserves the existing explicit
unconfigured-currency behavior in the formatting owner.

Proposed public projection: `snapshot.app = { appName?, currency? }`. This field
contains only an allowlisted display projection, never the full `kafilApp`, auth
route policy, environment or callbacks. Freeze the precise structural type in
the shared package and update both server and client declarations together.
Do not reuse `snapshot.settings` as a manually assembled forwarding object.

The shared server composition derives that projection automatically from its
existing `app` binding. The shared client/Kit integration consumes it internally:

```text
kafilApp display defaults -> public snapshot.app -> NajmAppProvider -> Kit owners
```

Explicit provider display props remain optional overrides for advanced or
legacy consumers. For currency, precedence is explicit prop > existing resolved
institutional preference (where configured) > app default. Preserve School's
institution-owned currency instead of replacing it with a static default.
For app name, retain the existing persisted-branding/name precedence; the app
value supplies the configured fallback, not a branding reset. Test precedence
against the actual Kit/theme owners before migration.

Use `APP_NAME` and the same `KAFIL_CURRENCY` source used by backend monetary
validation when declaring Kafil's defaults. Do not introduce a second `"MAD"`
literal or make backend modules import the web app's config. Audit the existing
money export: it currently also loads Zod validators. Expose the constant through
a lightweight shared-safe leaf if necessary so proxy/config imports do not load
validation or backend runtime. Preserve the old monetary export for consumers.

Neither `appName={kafilApp.appName}` nor `currency={kafilApp.currency}` in
`AppProviders` satisfies the target: it still repeats consumer forwarding.
Phase 6 kept `auth.client`, the translation catalog and `badgeDefaults` as
explicit client bindings. Phase 7 removes the ordinary Kafil badge binding by
making its reusable presentation package-owned; auth and translations remain
explicit runtime bindings.

### 3.4 Shared status badges and labels (implemented in phase 7)

Build on the existing `najm-kit` Badge implementation, not a new Kafil wrapper,
app preset, provider factory or second status registry. Verified source baseline:

- `components/Badge/status.ts` already exports `NAJM_STATUS_COLORS`, token
  normalization, color resolution and text-color helpers.
- `components/Badge/defaults.tsx` already supports provider overrides for
  appearance, colors, literal labels and translation keys.
- `Badge.tsx` resolves explicit labels/string children, then application label
  mappings, then humanized text. Shared multilingual status labels are missing.
- Kafil repeats 16 token-to-`status.*` mappings and supplies soft/pill appearance
  through `KAFIL_BADGE_DEFAULTS`. Plain-text consumers also use its
  `formatStatusLabel` helper.
- School has its own color map and camelCase translation keys alongside stored
  snake_case status values. Some choices differ from Najm defaults, including
  `processing`, `in_progress` and `draft`; preserve deliberate overrides.

#### Shared vocabulary and colors

Extend the existing semantic-token map with reusable lifecycle, review,
fulfilment, payment and attendance statuses found in actual consumers.
Inventory both apps before freezing the list. Candidate additions include:

| Semantic color | Candidate common statuses absent from the current map |
| --- | --- |
| `success` | `present`, `success` |
| `warning` | `pending_funding`, `partial`, `partially_paid`, `late`, `warning` |
| `info` | `info` |
| `neutral` | `ended`, `absent` |
| `destructive` | `overdue`, `unpaid`, `error` |

These are presentation defaults, not domain rules. Keep existing shared colors
unless a deliberate, documented migration is needed. School's assessment types,
audiences and role names are not automatically generic lifecycle statuses.
Per-instance maps override provider maps, which override the shared map; changing
one key must not replace unrelated defaults. Unknown tokens remain neutral.

#### Labels, language and plain text

Provide shared en/fr/ar/es labels for the packaged vocabulary, with base-language
resolution for regional tags and documented English fallback. The existing UI
integration supplies the active language internally; applications should not
forward label maps merely to enable standard translations. Language changes
update mounted badges without remounting them. Standalone badges work with
English defaults, without requiring Najm Auth, Next, Query or app-wide i18n.

Preserve this label precedence: explicit `label`/children > explicit application
literal or mapped translation override > matching application status-catalog
entry > packaged localized label > humanized unknown token. Detect catalog
presence through the existing i18n contract or a supported optional adapter;
do not display untranslated keys or silently catch translator failures. Freeze
snake_case/camelCase lookup and normalization rules with compatibility tests.

The conventional catalog lookup should preserve existing Kafil `status.*`
wording without reintroducing its 16-entry map. In particular, existing copy
such as "Purchasing and preparation" is not a universal translation of
`in_preparation`; retain it as an app override while the shared default stays
generic. External i18n consumers may use the existing explicit key mappings.

Expose a shared plain-text status label resolver through an appropriate
server-safe leaf (prefer the existing `najm-kit/format` surface if compatible).
It must use the same vocabulary, normalization, locale fallback and override
rules as badges. Migrate Kafil's plain-text callers to it, with at most a thin
app translator binding where necessary. Remove `statusTranslationKeys` and
`getStatusTranslationKey` once their consumers/tests are migrated; do not retain
a second standard vocabulary. Keep locale keys still used by filters, tables
or other app copy rather than deleting all `status.*` translations blindly.

#### Appearance and Kafil adoption

Make soft/pill the package defaults for status badges (`<NBadge status="..." />`).
Explicit per-badge/provider look, shape, size and icon settings still win.
Content badges such as `<NBadge>Beta</NBadge>` retain their own existing defaults.
This changes the appearance of existing unconfigured status badges in other
apps; audit affected examples, choose the appropriate release/version and
document how a consumer preserves a different style.

Kafil must have no `KAFIL_BADGE_DEFAULTS` constant, import or provider prop after
adoption. Do not relocate the same default object to `kafilApp`, the snapshot
or a renamed wrapper. Shared defaults belong to Kit; custom overrides remain
available to consumers that need them. School compatibility is required, but
removing all School-specific maps or changing its business semantics is not.

## 4. Target Kafil code

These examples show the implemented phase 7 badge cleanup. Existing auth routes, role policies,
cookie names, timezone and CSP settings remain in the actual app definition.

```ts
// apps/web/src/najm.config.ts — relevant configuration excerpt
export const kafilApp = defineNajmApp({
  id: "kafil",
  appName: APP_NAME,
  currency: KAFIL_CURRENCY,
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
import { auth } from "@/najm.auth";
import type { KafilUiSnapshot } from "@/najm.server";
import { kafilUiI18n } from "@kafil/server/locales";

export function AppProviders({ children, snapshot }: Readonly<{
  children: React.ReactNode;
  snapshot: KafilUiSnapshot;
}>) {
  return (
    <NajmAppProvider
      authClient={auth.client}
      snapshot={snapshot}
      i18n={kafilUiI18n}
    >
      {children}
    </NajmAppProvider>
  );
}
```

Query mounts automatically with shared defaults. No `app` prop or per-field
mapping is needed to re-forward app name, currency, theme, branding or location
already represented by the server snapshot. The config excerpt references the
existing name/currency constants; its currency import must use the audited
shared-safe leaf described in section 3.3.
Standard status badges inherit Kit defaults, so no badge prop or snapshot
mapping is needed. The target provider receives only auth, snapshot and i18n.

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
6. Project display defaults from the existing server `app` binding automatically.
   No Kafil `readSettings`, snapshot spread or selector should be added for them.
   Steps 1-5 describe the initial slice; this display projection is follow-up work.

## 5. Shared implementation boundaries

| Owner | Required work |
| --- | --- |
| `najm-next/app` | Pure optional integration definitions, display defaults, normalization and typed validation |
| `najm-next` server/security | One location resolver contract for snapshot and CSP; optional server bindings and fallback semantics |
| `najm-next` client/composer | Automatic display/integration snapshot consumption, always-on full-provider Query, stable Query lifetime, one composition core |
| `najm-kit` | Generic location labels/controls/adapters, shared badge status colors/labels/appearance, plain-text status resolution and override contracts |
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

Skip absent optional integrations without conditional hooks or duplicate contexts.
Query remains present in the full provider regardless of snapshot contents.
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
packages. Also test supported compositions without Auth, Theme and app-wide
i18n. Test absence of Query dependencies through the lower-level/config-only
entrypoints, not through the full `NajmAppProvider`.

The target ordinary Kafil import remains `najm-next/app/client`, without manual
adapter registration. If this conflicts with genuinely optional dependencies,
resolve package exports/build generation in phase 0 and document any required
import adjustment before consumer migration. Do not conceal mandatory SDKs or
restore per-app wrappers to bypass the issue. No-map apps must make no map
requests; map apps must not load unused Google/Leaflet SDKs on first paint.

## 6. Implementation phases

The checked items in phases 0-5 record the original 2026-09-17 execution, under
the original contracts. They do not establish completion of the corrected Query
or display behavior. Phase 6 records the completed follow-up. Browser/manual
acceptance items remain open because both executions excluded browser tests.

### Phase 0 — Freeze contracts and prove optional packaging

- [x] Record live versions, existing patches, branches, HEADs and scoped dirty work.
- [x] Audit existing composer, Kit aggregate provider, server snapshot types,
  proxy resolver, CLI templates and School custom integrations.
- [x] Freeze original omitted/true/object semantics, original Query compatibility, snapshot shape,
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

### Phase 6 — Display defaults and always-on full-provider Query

- [x] Recheck installed/shared package contracts and dirty worktrees; preserve
  the existing Kafil provider edit and prior release evidence.
- [x] Add typed, validated `appName` and `currency` app defaults and an
  allowlisted public snapshot projection in the existing server composition.
- [x] Consume display defaults internally, retaining explicit overrides and
  existing branding/institutional-currency precedence; support legacy snapshots
  without the new projection.
- [x] Enable Query by default and require it in the direct full provider.
  Remove boolean activation/disable options from that direct contract; retain
  custom query configuration and the lower-level no-Query composition path.
- [x] Prove one stable QueryClient, isolated app instances, default retry/cache
  policy and School's custom policy; reject `false` at type and runtime boundaries.
- [x] Audit the shared currency constant export and remove unnecessary runtime
  dependencies from its config import without duplicating monetary policy.
- [x] Run shared package gates, type/behavior tests, built Next fixtures and
  public API checks; test the exact packed artifacts and choose appropriate versions.
- [x] Publish the revised packages when authorized; verify registry integrity
  independently from earlier releases before consumer adoption.
- [x] Set `kafilApp.appName` and `kafilApp.currency` from the shared constants.
  Remove the corresponding provider imports/props and `query={true}`; preserve
  `authClient`, `i18n`, `badgeDefaults` and the existing layout flow.
- [x] Run Kafil's source gates and no-schema-drift check; verify displayed app
  name, branding fallback and MAD formatting alongside existing query behavior.
- [x] Check School compatibility and generated examples; preserve institutional
  currency and custom Query policy, and omit redundant Query activation props.
- [x] Update CLI/docs and append separate follow-up evidence. Keep any browser
  acceptance pending until actually performed under the execution instructions.

Exit: Kafil declares display defaults once in `kafilApp` and passes only its
snapshot to convey them. The full provider always supplies Query without a
boolean flag. Package release, consumer validation and browser evidence remain
separately reported; earlier evidence is not a substitute for these checks.

### Phase 7 — Shared badge defaults and Kafil cleanup

- [x] Re-audit installed/source Badge contracts, Kafil label consumers/tests,
  School vocabulary/overrides and existing dirty work in all affected repositories.
- [x] Freeze the common color/label vocabulary and appearance defaults in the
  existing Badge owner; document ambiguous statuses and preserve app overrides.
- [x] Implement packaged en/fr/ar/es labels, active-language propagation and
  compatible app catalog lookup without consumer token-to-key boilerplate.
- [x] Add the shared plain-text resolver using the same label implementation,
  with a server-safe public export and no duplicate context or vocabulary.
- [x] Test override precedence, regional locales, language switching, unknown
  statuses, missing translations, standalone badges and app-context isolation.
- [x] Apply soft/pill defaults only to status badges; verify explicit styling,
  icons and existing content badges remain correct.
- [x] Add Playground examples for common lifecycle/payment/attendance badges,
  plain-text parity, all four languages and application-specific overrides.
- [x] Run Kit source/test/build/API gates and built consumer fixtures; audit
  the observable default-style change and document version/migration policy.
- [x] Pack and validate the exact candidate, publish when authorized, and verify
  registry integrity before adopting it in Kafil. No copied sibling source.
- [x] Remove Kafil's `KAFIL_BADGE_DEFAULTS` import/constant/prop. Replace the
  standard translation map/helper with shared resolution, preserving custom
  app wording and unrelated locale-key consumers.
- [x] Update meaningful Kafil tests for rendered/translated behavior rather
  than asserting the existence of the deleted defaults object.
- [x] Run Kafil's required source gates and no-schema-drift check; verify School
  overrides against the new package separately and record independent results.
- [ ] Verify responsive/RTL/status appearance through the authorized browser or
  manual workflow and append phase 7 evidence; do not inherit a prior pass.

Exit: common status badges work directly from Najm Kit across apps, and Kafil
no longer defines or forwards standard badge defaults. Custom statuses remain
supported; business transitions and backend authorization remain app-owned.

`najm-kit@2.16.0` is published and independently verified, and Kafil and School
are migrated and validated against it. The one item left open is browser
acceptance, which was not run: the configured Playwright and Chrome DevTools MCP
servers failed to connect. Do not inherit an earlier pass for it.

The version is minor rather than patch: the vocabulary, labels, catalog
convention and `najm-kit/format` resolver are additive, but soft/pill as the
status default is an observable appearance change for any application that
configured none. School is that application and now renders soft pills.

One harness defect was found and fixed during validation, in the Najm
repository rather than in Kit. `apps/playground/tsconfig.json` aliased bare
`najm-kit` to `src/index.ts` while `najm-kit/app` and `najm-kit/next` still
resolved to `dist`, so the package loaded as two module trees and every React
context existed twice. Provider-supplied badge defaults reached no badge *in
the playground only*. The aliases were removed so the playground resolves the
package exactly as Kafil and School do. No Kit packaging change was required,
and `badgeDefaults` was never broken in either consumer.

## 7. Validation and evidence

| ID | Required evidence |
| --- | --- |
| DX-01 | Default `location: true` works without a consumer wrapper, selector or client location prop |
| DX-02 | Omitted optional integrations mount no corresponding owner; the full provider always mounts Query |
| DX-03 | Null session, empty data and theme/branding outage preserve configured ownership |
| DX-04 | Type errors catch missing bindings and unsupported combinations; external adapters avoid duplicate contexts |
| DX-05 | App definition imports stay pure; client bundles contain no backend, environment object or server-only modules |
| DX-06 | App name/currency flow from config through an allowlisted snapshot into UI without selectors or repeated props; legacy snapshots and precedence remain correct |
| DX-07 | Currency is not inferred from locale; Kafil reuses its backend currency constant and School retains institutional currency |
| QUERY-01 | Omitted query prop mounts exactly one stable QueryClient/provider with shared defaults; rerenders do not reset the cache |
| QUERY-02 | Custom options retain School retry policy; separate app/server instances do not share user cache |
| QUERY-03 | Full-provider false is rejected by types/runtime; lower-level composition still works without Query dependencies |
| BADGE-01 | Shared status colors cover agreed Kafil/School common tokens; per-instance/provider overrides merge without losing defaults |
| BADGE-02 | Shared en/fr/ar/es labels, regional fallback, normalization and live language changes work without an application label map |
| BADGE-03 | Explicit labels/children, literal/key overrides and existing app catalog wording retain precedence; unknown tokens humanize without exposing keys |
| BADGE-04 | Soft/pill applies to status badges only; content badges, explicit styles/icons and separate provider trees remain correct |
| BADGE-05 | Plain-text and badge labels agree through one resolver; its leaf export is server-safe and standalone badges need no app integrations |
| BADGE-06 | Kafil has no KAFIL_BADGE_DEFAULTS or duplicate standard status map; remaining locale consumers and School custom mappings remain valid |
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

Phase 6 follow-up evidence: [`docs/evidence/najm-optional-provider-dx/2026-09-17-phase-6/README.md`](docs/evidence/najm-optional-provider-dx/2026-09-17-phase-6/README.md).

That ledger covers the initial execution. Phases 6 and 7 have distinct follow-up
entries with their own package versions and checks; historical results remain
intact.

Phase 7 evidence: [`docs/evidence/najm-optional-provider-dx/2026-09-18-phase-7/README.md`](docs/evidence/najm-optional-provider-dx/2026-09-18-phase-7/README.md).

Phase 7 establishes the badge implementation, release and source-level consumer
adoption. It does not establish visual acceptance; that checkbox remains open.

For the implementation run, source/package gates and database generation were
required. Browser tests remained explicitly excluded and are not claimed.

## 8. Compatibility, rollback and completion

The initial omission-based composition release changed required fields and Query
behavior. The follow-up deliberately changes the direct full-provider default
again: omission now enables Query, and disabling it is unsupported. Version and
document this behavior change explicitly. Move consumers requiring no Query to
the existing lower-level API; do not preserve a disable escape hatch on the
new direct contract. Keep deprecated API compatibility separately documented.

Phase 7 retains existing badge override APIs and unknown-status fallback.
Shared default labels and soft/pill styling are observable changes: choose an
appropriate release and document opt-out styling for consumers. Verify School's
custom maps and Kafil's app wording before removing consumer defaults. Roll back
Kafil's badge cleanup together with its package pin if acceptance fails.

Display fields/projection should be additive: legacy snapshots without them
continue to use explicit props and existing owner fallbacks. No default currency
is invented. Do not infer old/new Query behavior from transient snapshot fields.
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
