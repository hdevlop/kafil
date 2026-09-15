# Najm app integration DX: Kafil and School

Status: **KAFIL DEPLOYED — School rollout and manual browser acceptance remain open.**

Plan date: **2026-09-12**

Canonical plan: `C:\Users\hdevlop\Desktop\kafil\NAJM-APP-INTEGRATION-DX-PLAN.md`.
This task-specific root plan coordinates Najm package work and adoption in both
applications. It is not a root `PLAN.md` or a claim of project-wide completion.

## 1. Outcome

New Najm applications should declare their routes, branding, preferences,
backend connection, and optional integrations without recreating session,
theme, settings, CSP, reporting, and provider plumbing.

Deliver:

1. Shared request-time CSP/proxy composition and report handling.
2. A typed Next.js server bootstrap that composes existing Najm owners.
3. Client provider integration with optional features and app extensions.
4. Configurable preference resolution that serves both Kafil and School.
5. Location runtime integration for Kafil's Leaflet and School's Google use.
6. Shared CSP-compatible client initialization where the installed runtime
   actually requires it.
7. Migration of both applications to the published APIs, removing superseded
   helpers rather than leaving permanent compatibility wrappers.
8. Updated Najm CLI Next templates so subsequent apps start with this setup.

Success means less application-owned behavior and fewer places to configure
one concern. Merely putting all existing implementations in one large file is
not sufficient.

## 2. Scope and execution boundaries

| Repository | Responsibility |
| --- | --- |
| `C:\Users\hdevlop\Desktop\najm` | Shared APIs, package tests, integration fixtures, documentation, release artifacts, CLI templates |
| `C:\Users\hdevlop\Desktop\kafil` | First consumer migration, family-location parity, settings and auth preservation |
| `C:\Users\hdevlop\Desktop\school` | Second consumer migration, institutional preferences, Google location and keyboard-extension parity |

The initial request authorized planning only. Later user instructions authorized
implementation and continuation. This document now tracks the resulting source,
package-release, and consumer work. It still does not authorize commits, pushes,
deployment, or database mutations. Per the execution instruction, browser tests
were intentionally not run; the user owns visual acceptance.

Out of scope:

- New auth protocols, roles, financial commands, schemas, or settings tables.
- A generic Najm business-settings service replacing School or Kafil models.
- Changing School's currency semantics or Kafil's money representation.
- Changing Kafil's approved no-geocoder policy.
- Replacing School's Google behavior with Leaflet to make integration easier.
- Redesigning application pages, changing hosting topology, or globally
  applying new production security headers without compatibility evidence.

## 3. Verified baseline

Recheck this table before implementation; these are the inspected local
versions, not statements about the latest registry release.

| Dependency | Kafil | School |
| --- | --- | --- |
| Next.js | 16.2.12 | 16.2.12 |
| `najm-auth` | 4.0.2 | 4.0.2 |
| `najm-theme` | 0.2.1 | 0.2.1 |
| `najm-kit` | 2.13.1 | 2.11.19 |
| `najm-next` | 0.4.0 | 0.3.0 |

Kafil and Najm were clean at planning preflight. School contains extensive
uncommitted notification, auth/CSP, provider, dependency, deployment, and
migration work. Some School CSP files are untracked. Treat the inspected
School baseline as a working-tree snapshot, not an accepted release.

### 3.1 Kafil inventory

`apps/web/src/lib` contains eight files and 330 lines including comments:

| File | Lines | Current behavior | Planned disposition |
| --- | ---: | --- | --- |
| `auth.ts` | 54 | `defineAuth` plus routes, role routes, optimistic proxy policy | Move app policy into shared-safe configuration; retain Najm Auth ownership |
| `session.ts` | 7 | Singleton `createReactServerAuth(auth)` | Absorb initialization into server composition |
| `serverTheme.ts` | 12 | `kafilTheme.react` and loader aliases | Absorb binding into server composition |
| `preferences.ts` | 20 | `defineNajmPreferences`, locale/timezone/cookies | Consolidate declarative configuration |
| `locationConfig.ts` | 15 | `defineNajmLocationRuntime`, Leaflet policy | Consolidate server runtime configuration |
| `contentSecurityPolicy.ts` | 57 | Nonce, policy, provider origins | Move mechanics to `najm-next`; retain app exceptions |
| `cspReports.ts` | 137 | Bounded body reader and report sanitizer | Remove after shared report handler adoption |
| `serverSettings.ts` | 28 | Retired browser-helper setting loader and fallback | Remove after the browser form helper is retired |

Also inspect and simplify:

- `apps/web/src/app/layout.tsx` and `src/providers/AppProviders.tsx`.
- `src/providers/QueryProvider.tsx`, `src/proxy.ts`, and
  `src/instrumentation-client.ts`.
- `src/app/api/[...route]/route.ts`, the three `ui-*` routes, and `csp-report`.
- Login, service HTTP client, and all layouts/pages importing auth/session.
- Location label configuration; the former browser form-helper subscription is retired.

### 3.2 School inventory and differences

Primary files under `apps/dashboard/src`:

- `lib/auth.ts`, `lib/session.ts`, `lib/serverTheme.ts`.
- `lib/serverSettings.ts`, `lib/serverPreferences.ts`.
- `lib/contentSecurityPolicy.ts`, `lib/cspReports.ts`.
- `preferences/index.ts`, `preferences/cookies.ts`,
  `preferences/clearUiPreferences.ts`.
- `app/layout.tsx`, `app/providers.tsx`, `providers/QueryProvider.tsx`,
  `providers/KeyboardProvider.tsx`, `proxy.ts`.
- `app/api/[[...route]]/route.ts`, the three `ui-*` routes, and `csp-report`.
- `components/location/LocationPickerDialog.tsx`, its field consumers, and
  `components/location/types.ts`.

Preserve these explicit differences:

| Concern | Kafil | School |
| --- | --- | --- |
| Proxy session mode | `optimistic` | `authoritative` |
| Routing | Explicit public/protected/role routes | Public auth pages, protected root and remaining paths |
| Remember Me cookie | `kafil.remember` | `sms.remember` |
| Preference cookies | `kafil-ui-*` | `school-ui-*` |
| Preference resolution | Existing Najm resolver with user-language and Accept-Language inputs | Valid cookie, then user, then school setting, then typed fallback |
| Currency | App-configured MAD | School settings, then typed fallback; not user language |
| Location | Leaflet, runtime server config, no geocoder | Google Maps, Places autocomplete/reverse geocoding, optional `placeId` |
| Browser form helper | Removed from Kafil on 2026-09-15 | School policy remains independently owned |
| Query retry | One retry for network/server failures, no mutation retry | No query or mutation retry |
| Extensions | Location and settings subscription | School keyboard shortcuts |

School's root layout currently propagates operational session failures;
Kafil's root layout catches session failures as anonymous. This difference
must be addressed explicitly under section 7, never hidden by a universal
bootstrap fallback.

### 3.3 Existing shared capabilities to reuse

- `najm-auth/client/server`: `defineAuth`, proxy and route-handler composition.
- `najm-auth/client/server/react`: singleton request-scoped auth accessor.
- `najm-theme`: theme definition, server bootstrap, independent appearance and
  branding fallbacks, branding React provider, managed image components.
- `najm-kit/server`: preference definitions and generic public UI loaders.
- `najm-kit/server/react`: RSC public UI bootstrap with request memoization.
- `najm-kit/app`: UI/i18n/preferences/design composition.
- `najm-next`: Next config, PWA, and Leaflet/disabled runtime location config.
- `najm-cli`: existing `NextCommand` and auth/session/proxy templates.

Do not build a second generic UI loader, session cache, theme context,
translation provider, or location dialog to implement this plan.

## 4. Ownership and package design

`najm-next` becomes the optional Next integration layer. It wires package-owned
capabilities; it does not take over their domain implementations.

| Owner | Responsibility |
| --- | --- |
| `najm-auth` | Sessions, verification, recovery, auth cookies, auth route methods, auth-specific prefetch fixes |
| `najm-theme` | Theme/branding loading, factory fallback, asset serving and provider |
| `najm-kit` | UI, generic preferences/public UI loaders, provider-neutral location controls and optional adapters |
| `najm-next` | Request CSP, report route adapter, Next bootstrap, optional provider composition, client initialization bridge |
| `najm-cli` | Minimal scaffold using published contracts |
| Applications | Roles/routes, public settings projection, fonts/metadata, currency, domain labels, integrations and policy |

### 4.1 Proposed public surfaces

These names are design proposals, not existing exports. Freeze names and
types in phase 0 before implementation; update examples and API snapshots
together if names change.

| Proposed entrypoint | Proposed responsibility |
| --- | --- |
| `najm-next/app` | Pure typed app definition and shared-safe configuration |
| `najm-next/app/server` | `createNajmServerApp`: singleton wiring, request snapshot and session accessors |
| `najm-next/app/client` | `createNajmAppProvider`: one full-stack client provider accepting the typed snapshot and Kit UI props |
| `najm-next/app/react` | Low-level optional provider composition for minimal or unusual stacks |
| `najm-next/security` | Policy definition, nonce generation, auth/proxy composition |
| `najm-next/security/reports` | `createCspReportHandler`: bounded report processing and sanitized sink |
| `najm-next/instrumentation/client` | Minimal CSP-compatible client initialization, if required by verified Zod contract |
| `najm-next/location/server` | Extend existing runtime definition for explicitly enabled Google support |

Extend existing `najm-kit/server` preferences and location subpaths rather
than inventing parallel preference or map APIs in `najm-next`.

### 4.2 Dependency and import boundaries

- Shared-safe configuration must not read secrets, environment objects,
  cookies, backend modules, filesystem assets, or React request state.
- Server composition imports `server-only`. Backend loading remains lazy and
  explicit through the app's package exports, including `@kafil/server/theme`
  and `@sms/server/theme`; never infer a backend from the current directory.
- Proxy/security imports must not initialize theme, database, or RSC bootstrap.
- Client integration is a separate `use client` entry. It receives only the
  existing public session projection and public UI configuration.
- Never serialize the app definition, server callbacks, auth instance, secrets,
  raw School settings, or a QueryClient into the client snapshot.
- Optional packages remain optional peers/leaf imports. Config-only consumers
  must not need Auth, Theme, Query, Leaflet, or Google installed.
- Check cycles before making `najm-next` depend on Kit adapters; use structural
  interfaces or separate leaf adapters where necessary.
- Preserve one physical copy of each React context in emitted package output.
  Keep Kit code splitting and RSC/browser guards intact.

## 5. Target application shape

Target three setup modules per app, plus framework-required entrypoints:

```text
src/
  najm.config.ts          # Shared-safe app policy; no environment/backend reads
  najm.server.ts          # Server bindings, runtime config, public settings reader
  providers.tsx           # Client-only policies and app extensions
  proxy.ts               # Shared handler plus locally static matcher
  instrumentation-client.ts  # Thin shared initialization import if needed
  app/
    layout.tsx           # Fonts, metadata, document markup, one bootstrap call
    api/
      ...                # Thin route exports preserving existing URLs
```

Keep existing provider file locations if moving them adds churn. A separate
small client configuration leaf is acceptable when import boundaries require
it. Do not achieve the file target by importing server code into clients.

The layout should load one typed initial-state snapshot and pass it to provider
composition, without manually unpacking and re-forwarding every theme field.
It still renders app-owned `html` attributes, body classes, fonts and metadata.

Use one factory at module scope per application, never a factory per layout
render. Nested layouts should be able to call the returned session accessors
without triggering unrelated settings or theme loading.

Next's proxy matcher and route segment constants must stay statically
analyzable in the app entrypoint. Do not promise their elimination through
dynamic package configuration. Preserve Kafil's catch-all and School's optional
catch-all shapes and all existing methods/cookie behavior.

## 6. Shared behavior contracts

### 6.1 CSP and report processing

- Generate a fresh nonce for every handled document request. Forward its CSP
  and nonce headers into rendering and apply the matching response policy.
- Wrap the existing auth proxy without losing redirects, cookies, status,
  request headers, or auth errors. Do not reconstruct a response in a way that
  drops multiple `Set-Cookie` values.
- Provide an explicit nonce policy preset. Nonce-based rendering remains
  dynamic; do not silently force nonce mode on future static applications.
- Offer typed directive overrides and validated provider contributions.
  Deduplicate origins and reject header injection or malformed directives.
- Preserve each app's required sources first. Audit unnecessary hard-coded
  origins separately: Kafil currently includes CDN/OSM sources beyond runtime
  contributions; School has Google-specific connect/font/frame/image rules.
- Allow dev tooling only in development. Verify HTTP development behavior for
  upgrade-insecure-requests and WebSocket connections before selecting defaults.
- Do not introduce production `unsafe-eval` or broad wildcards to pass tests.
  Retain/document current style requirements until a compatible tightening is
  separately proven.
- Keep request-time CSP outside `next.config.ts`. Reconcile package docs that
  currently describe CSP as edge-owned: app nonce policy is request-owned;
  deployment HSTS/TLS remains edge-owned. Check existing edge headers so two
  enforcing CSP policies do not unexpectedly intersect.
- Keep `/api/csp-report` directly reachable without booting the Najm backend.
- Preserve legacy CSP and Reporting API envelopes, the 8 KiB streamed read
  limit, bounded fields, cancellation on overflow, and stable 204 responses.
- Harden URL redaction: remove credentials, query and fragment from absolute
  and relative URLs; redact data/blob payloads; do not retain secrets in path
  segments. Make safe path retention explicit, or reduce to origins/keywords.
- Never log raw JSON, raw exceptions, source samples, tokens, family addresses,
  coordinates, or Google credentials. A failing diagnostic sink must not fail
  a report response. Do not create an unbounded global reporting cache.

### 6.2 Server bootstrap and settings

- Compose the existing session and theme loaders. Retain independent theme
  fallbacks and request-scoped memoization; no module-global user snapshot or
  promise that survives across requests.
- Start independent session, cookie/header, theme and public-settings reads
  concurrently. Only preference selection waits for its actual inputs.
- Preserve distinguishable anonymous session versus operational auth failure.
- Public display settings may use typed fallbacks and sanitized diagnostics.
  Protected, financial or account reads must not use that fallback mechanism.
- Reuse existing public UI loader primitives where applicable. Add a narrow
  callback adapter only where a direct settings reader is not fetch-shaped.
- Kafil no longer reads a public browser-helper setting. School returns only
  the existing `SchoolUiSettings` projection needed for initial UI.
- Scope caching so repeated reads in one render agree, but a subsequent request
  observes saved settings. Include multi-user/request-isolation tests.
- Build/factory fallback must not cache an outage as a permanent success.

### 6.3 Preferences and preference routes

- Extend the established preference definition with typed ordered fallback
  sources/guards. Avoid a second resolver owned solely by School.
- Preserve Kafil's existing `defineNajmPreferences` semantics, including
  Accept-Language handling and its configured default timezone.
- Preserve School's valid cookie -> user -> institution -> fallback order
  independently for language, theme and timezone; skip invalid candidates.
- Keep School currency institution-owned. Do not derive it from locale or allow
  a cookie/user value to override the institution without product authorization.
- Preserve School's allowed timezone list, formatting locales and direction.
- Preserve cookie names, paths, lifetimes and client endpoint configuration.
  Existing browsers must keep their choices across migration.
- Replace repeated preference route mechanics using shared handlers only after
  matching POST/DELETE, validation, response bodies and cookie options. Add
  DELETE capability to the shared owner if the current contract lacks it.
- Preserve School's best-effort preference cleanup on logout without allowing
  a display-cookie failure to prevent auth logout. Do not automatically change
  Kafil's logout preference policy.

### 6.4 Provider composition

- Full applications mount one generated `NajmAppProvider`; it composes each
  enabled auth/query/UI/branding/location owner once and introduces no new
  theme state. Keep the low-level binding API for minimal or unusual stacks.
- Preserve provider order and allow explicit extension placement. School's
  KeyboardProvider currently sits inside Query and outside the UI provider.
  Kafil's location labels need i18n.
- QueryClient lifetime is per mounted application, never server-global.
  App-specific retry functions remain in client code and are not serialized.
- Kafil's former persisted browser form helper is intentionally removed.
- Preserve School's existing F8 opt-in/development behavior. Moving it to a
  persisted runtime setting is a separate product change.
- Resolve common location labels through shared translation defaults with app
  overrides. Retain feature-specific labels and four-locale parity.
- Keep metadata, fonts, branding assets, badges, currency and business-specific
  keyboard shortcuts app-owned.

### 6.5 Location integration

This plan consumes the existing location controls; it does not reopen their
visual design. `NAJM-LOCATION-PICKER-PLAN.md` owns the Kafil location baseline
and its separate acceptance history.

- Reuse `defineNajmLocationRuntime` for one runtime resolution shared by CSP
  and the public UI snapshot. Read environment values on the server at runtime.
- Preserve Kafil's prefix, Leaflet tiles/attribution, center, zoom, disabled
  fallback and no-geocoder policy. Never silently enable Google or Nominatim.
- Add an optional Google runtime/adapter bridge for School after auditing the
  actual Kit Google exports. Current Najm Next runtime supports only Leaflet
  and disabled; Google runtime support is new work.
- Preserve School autocomplete, reverse lookup, coordinate selection, locale,
  address and `placeId` persistence. Confirm downstream transport DTO use before
  deleting any local control or adapter.
- The common Kafil location value has no persisted `placeId`. Define a typed
  optional provider-selection result/metadata callback for School, kept
  separate from the common address/coordinate value. Maintain selection and
  cancellation atomically; clear stale provider metadata on manual changes as
  required by School's current data contract. Never persist raw provider blobs.
- Where current School behavior differs from the shared control's address
  overwrite behavior, record and resolve that UX decision before migration.
  Do not lose manually entered address details accidentally.
- Keep Google loader/search code in optional leaf exports and load only when
  required. A disabled/no-map app must make no provider requests.
- Browser API keys are intentionally public restricted keys, not server
  credentials. Project only approved public fields; never serialize environment
  objects. Support the existing School key variable during a documented runtime
  config transition; prove restart/config changes without a rebuild where the
  new runtime contract promises it.
- Verify current official Google loader/Places contracts before implementation.
  Use synthetic records for connected tests; keep provider keys and personal
  data out of screenshots and reports.

## 7. Fixes and investigations included in migration

| ID | Evidence from source | Required action and proof |
| --- | --- | --- |
| FIX-01 | Both apps duplicate nonce policy and report code | Extract behavior once; compare request/response headers and report outputs in both consumers |
| FIX-02 | Both report sanitizers preserve some relative fragments/data and path content | Add adversarial redaction tests and safe report output contract before extraction |
| FIX-03 | School uses an inline beforeInteractive Zod script; Kafil uses instrumentation-client | Verify installed Zod initialization timing, reproduce School hydration/CSP behavior, migrate to shared initialization with no duplicate script |
| FIX-04 | School bypasses its proxy for certain prefetches when a refresh cookie is present | Characterize actual prefetch/recovery behavior; cookie presence is not authorization; move any necessary auth behavior to Najm Auth with direct-navigation, tampering and logout-race tests |
| FIX-05 | Kafil root layout catches all session errors; School preserves operational faults | Remove blanket failure masking where verified safe; use package error classification so anonymous state and backend outage remain distinct |
| FIX-06 | Kafil settings fallback logs a raw thrown value | Use sanitized structured diagnostics while preserving the disabled fallback |
| FIX-07 | School handwrites preference resolution and cookie handlers | Extend the existing preference API and prove full precedence/cookie/logout parity |
| FIX-08 | School has older Kit/Next packages and local Google control | Upgrade through registry releases, then migrate without dropping Google capabilities or placeId |

The table records source findings and required validation, not claims that a
runtime defect was reproduced or fixed. Do not remove School's prefetch branch
until its replacement is tested. Preserve app session modes unless evidence
supports an explicitly documented change.

## 8. Implementation phases

Every phase has a concrete exit condition. Keep all boxes open until evidence
exists. Source completion and publication/acceptance completion are separate.

### Phase 0 — Freeze contracts and baselines

- [x] Re-read each repo's AGENTS and applicable package/feature skills.
- [x] Record all three branch/HEAD/status baselines, installed resolutions,
  relevant patch files, current CLI and package scripts.
- [x] Preserve School's existing dirty files and migration 0046; use scoped
  changes or an isolated checkout when needed, never reset unrelated work.
- [x] Read installed Next guides for proxy, CSP, instrumentation-client,
  server/client boundaries and cookies; inspect existing package declarations.
- [x] Trace both settings readers and all School location consumers/DTO mappings.
- [x] Freeze public entrypoints, client/server import graph, optional peers,
  preference source types and provider-metadata contract.
- [x] Capture representative current auth, preference, theme and location
  behavior against synthetic local fixtures, including known failures.

Exit: agreed API contract and a source/behavior baseline covering both apps;
no unresolved dependency cycle or secret-bearing client configuration.

### Phase 1 — Shared security and client initialization

- [x] Implement security policy and auth/proxy composition in `najm-next`.
- [x] Implement the report handler and redaction hardening.
- [x] Add shared client initialization only after verifying the installed
  initialization contract; preserve early execution before form schemas run.
- [x] Resolve FIX-04 in the owning package if reproduction confirms a package
  gap; keep this change separately reviewable from file moves.
- [x] Add Next production fixtures with Kafil-style and School-style policies.
- [x] Update exports, builds, public API snapshots, docs and compatibility notes.

Exit: behavior tests and production fixtures pass; redirects/cookies/nonce
propagation and report redaction are proven for both configurations.

### Phase 2 — Preferences and server bootstrap

- [x] Extend existing preference contracts without breaking old consumers.
- [x] Implement server integration using Auth/Theme/Kit owners.
- [x] Add public settings callback binding, typed projection and diagnostics.
- [x] Expose lightweight session accessors and one public initial UI snapshot.
- [x] Verify request isolation, resource independence and fallback precedence.
- [x] Cover School logout cleanup and exact cookie/route compatibility.

Exit: one composed bootstrap supports both app fixtures with no duplicated
loader/resolver implementation or cross-request leakage.

### Phase 3 — Client providers and location integration

- [x] Implement optional provider composition and typed extension slots.
- [x] Preserve per-app QueryClient options and School keyboard/helper behavior.
- [x] Reuse Leaflet runtime and add tested Google runtime/metadata integration.
- [x] Add shared default labels with app overrides and en/fr/ar/es coverage.
- [x] Verify one context instance, emitted CSS, closed-dialog lazy loading,
  server import safety and no-map installation without map dependencies.
- [x] Add Playground examples for minimal, Kafil-style and School-style apps.

Exit: all three examples work from built package exports; Google capabilities
are validated separately from mocked/no-provider behavior.

### Phase 4 — Release the shared candidate

- [x] Review additive versus breaking changes and select explicit versions.
- [x] Run changed-package gates and relevant Next production integration suites.
- [x] Update version pins, peer ranges, API snapshots, changelogs and docs.
- [x] Prepare a reviewed committed candidate and clean release checkout under
  the authorized release workflow; do not clean School by discarding edits.
- [x] Pack one artifact per changed package, record commit/version/hash, and
  inspect exports, declarations, peer metadata, shared chunks and CSS.
- [x] Test packed artifacts in a disposable integration fixture.
- [x] Publish those exact artifacts in dependency order when authorized, then
  verify registry integrity. Do not publish every Najm package unnecessarily.

Exit: exact registry versions and artifact identities are available for apps.
Do not make School consume workspace links, file dependencies, copied package
source or tarballs; its consumer policy requires published versions.

### Phase 5 — Kafil migration

- [x] Install verified published versions with exact overrides and lockfile.
  Audit existing Najm patches before changing affected package versions.
- [x] Add app/server/client composition; migrate auth imports, session users,
  layout, providers, proxy and thin routes incrementally.
- [x] Preserve auth routes/role rules/Remember Me and request cookie handling.
- [ ] Preserve Leaflet runtime/CSP and family create/edit/reopen; Kafil's browser form helper is retired.
- [x] Resolve applicable FIX items with targeted regression evidence.
- [x] Delete obsolete eight-file helpers when their consumers are migrated;
  retain only actual app policy or justified boundary modules.
- [x] Update architecture tests and docs to assert ownership and behavior,
  rather than requiring old filenames.
- [ ] Complete Kafil source gates, no-schema-drift check and local acceptance.

Exit: Kafil uses published shared integration and passes all required evidence;
School migration does not inherit a claim of success from this result.

### Phase 6 — School migration

- [x] Re-audit dirty work and reconcile changes against the phase 0 baseline.
- [x] Install exact registry versions and verify one resolved package copy.
- [x] Migrate server theme/session/settings/preferences to shared integration.
- [x] Preserve cookie priority, supported timezone list, institutional currency,
  logout cleanup, authoritative session mode and `sms.remember`.
- [x] Preserve Query and KeyboardProvider behavior and School F8 policy.
- [x] Migrate Google control only after metadata/Places parity passes.
- [x] Remove duplicated CSP/report/preference/provider helpers after replacement.
- [x] Preserve optional API catch-all behavior and all HTTP methods.
- [x] Update School contract documentation and adoption tests to describe the
  new ownership without allowing duplicate providers or caches.
- [ ] Run School source and browser gates; record schema drift independently
  from existing notification migration work.

Exit: School independently passes theme, auth, preference, shortcut and Google
location acceptance with no lost settings or provider metadata.

### Phase 7 — Future-app scaffolding

- [x] Update existing `najm-cli` Next templates; do not add a competing generator.
- [x] Generate minimal configuration, server binding, provider and thin Next
  entrypoints using the final published contracts.
- [x] Offer optional Auth/Theme/location choices without mandatory map SDKs.
- [x] Preserve static matcher literals and explicit server/client separation.
- [x] Refuse destructive overwrites; provide a preview/idempotent update path
  for existing projects. No generated real secrets or hidden database resets.
- [x] Generate a fresh minimal app and both feature profiles into disposable
  directories; install from registry and run their meaningful gates.
- [x] Document configuration, extension examples, upgrades and package minimums.

Exit: a new app no longer requires manually copying the reviewed helper files.
If the CLI is published later, record its separate release evidence and do not
mark this phase complete based only on template source.

### Phase 8 — Publication, rollout and completion

- [ ] Publish each consumer's scoped Git changes when authorized.
- [ ] Verify each app's CI/image output and exact deployed revision separately.
- [ ] Verify runtime config/CSP consistency and key user journeys on the intended
  deployment using its approved acceptance workflow.
- [x] Record file/line/import reductions and remaining intentional app modules.
- [x] Verify rollback instructions and update the final evidence ledger.

Exit: all in-scope source, package, consumer and explicitly requested deployment
boundaries are evidenced. Deferred/unrequested deployment stays clearly marked.

## 9. Required validation matrix

| ID | Scenario | Required evidence |
| --- | --- | --- |
| DX-01 | Minimal app, no Auth/Theme/maps | Imports/build work without optional dependencies |
| DX-02 | Client/server isolation | Built client graph contains no backend, filesystem, environment object or server-only entry |
| DX-03 | Singleton/context identity | One auth/query/UI/branding context; nested consumers share the intended instance |
| AUTH-01 | Anonymous, valid, expired and invalid sessions | Correct navigation and recovery for each app mode |
| AUTH-02 | Operational auth failure | Failure remains distinguishable from anonymous; no blanket fallback |
| AUTH-03 | Login/logout/refresh/credential setup | Multiple Set-Cookie headers, Remember Me and public setup route preserved |
| AUTH-04 | Prefetch, forged cookie, delayed response after logout | No authorization from cookie presence; no stale session resurrection |
| CSP-01 | Document, redirect, denied route, production hydration | Matching request/response nonce policy with preserved auth headers |
| CSP-02 | Development versus production | Necessary development tooling works; production has no unsafe-eval |
| CSP-03 | Legacy/batch reports, malformed/oversized streams | 204 behavior, bounded reads/cancellation, safe URL redaction and sink failure |
| CSP-04 | Existing edge policy | No conflicting duplicate CSP blocks intended app/provider resources |
| BOOT-01 | Root/nested/page reads and second request | Once per resource per render; new request observes updates |
| BOOT-02 | Appearance or branding or settings unavailable | Independent typed public fallback; safe diagnostics |
| PREF-01 | Valid/invalid cookies, user and institution values | Exact per-field precedence for both apps |
| PREF-02 | Language/theme/timezone save and reload/logout | First paint, cookies, formatting, RTL and cleanup preserved |
| PREF-03 | School currency | Institution value unaffected by language/user cookie |
| UI-01 | Branding/settings/theme changes | Initial and subsequent UI reflects persisted changes |
| UI-02 | School keyboard/helper and query failure | School keeps its shortcut policy; Kafil has no browser form helper |
| LOC-01 | Kafil Leaflet/disabled/invalid config | Address retained, complete coordinate pair, no geocoder traffic |
| LOC-02 | School search/reverse/manual selection/cancel | Correct address, coordinates and placeId after save and reopen |
| LOC-03 | Google/Leaflet absent, closed dialog | No unwanted SDK scripts, tiles or search requests |
| LOC-04 | Runtime config change | Public config and CSP agree after required restart; no key leakage |
| UI-03 | Desktop/mobile, Arabic RTL, keyboard dialog flow | Focus, scrolling, error/loading states and labels remain usable |
| PKG-01 | Packed exports and installed consumers | Same tested artifact, declarations, CSS, peer compatibility, no duplicates |
| CLI-01 | Fresh generation and rerun | Runnable app from registry; no overwritten user files |

Mocked tests establish deterministic contracts. They do not establish real
Google availability, actual persistence, production hydration, registry
publication, or deployment. Use save -> fresh read -> reopen for location and
settings acceptance; a successful PUT status alone is insufficient.

## 10. Commands and evidence

Recheck scripts at execution time. Run commands sequentially and stop on
failure. Use each repo's Bun/toolchain; do not assume Najm has Kafil's root
lint/typecheck scripts. No commands in this section were run for planning.

### 10.1 Najm

For changed packages only, run their actual lint/typecheck/test/build scripts.
Relevant verified entrypoints include:

```powershell
bun run --cwd packages/najm-next lint
bun run --cwd packages/najm-next typecheck
bun run --cwd packages/najm-next test
bun run --cwd packages/najm-next build
bun run lint:ui
bun run test:ui
bun run build:ui
bun run --cwd packages/najm-kit test:next16
bun run test:auth
bun run test:auth:next16
bun run lint:theme
bun run test:theme
bun run build:theme
bun run --cwd packages/najm-theme test:next16
bun run api:check
```

Add an explicit production integration test script for the new Next app
composition; do not claim the existing pure Next tests already cover it.
Run Kit DOM tests from the package context so happy-dom preload applies.
Keep RSC tests in their react-server condition suites. Run broader monorepo
checks when the actual changed dependency graph warrants them.

For phase 7, run `bun run --cwd packages/najm-cli test` and
`bun run --cwd packages/najm-cli build`, then validate the generated projects
against published dependencies. CLI source tests alone do not prove a usable
generated application.

Verified release tool forms, using the final selected package/version/path:

```text
bun scripts/publish-package.ts <package> --pack-only
bun scripts/publish-package.ts <package> --publish-tarball <exact-path>
bun scripts/publish-package.ts <package> --verify-published <version>
```

Follow current release scripts, version/commit requirements and dependency
order. Pack after final version/commit; a later change invalidates the artifact
and its evidence. Compare registry integrity with the actual published artifact.

### 10.2 Kafil

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Use the root `.env` wrapper for dev/runtime. Before browser work, read the
required Kafil Playwright skill and select existing runner work units for auth,
preferences and family location. Respect any current manual-only or
no-build instruction; record unperformed gates instead of claiming completion.
No schema change is expected; investigate any new generated migration.

### 10.3 School

```powershell
bun run lint
bun run test:dashboard
bun run build
```

Run `bun run test:server` and `bun run test:seed` when backend bindings or
dependency upgrades affect those graphs. Run `bun run i18n:check` for locale
changes. School has no verified root typecheck script; inspect and use its
actual package/build checks rather than inventing one.

Use `bun run test:e2e:najm-upgrade` with the established local configuration and
synthetic records; confirm targets before invoking any broader acceptance
runner. School uses `apps/dashboard/.env.local`, not Kafil's root loader.

Compare schema/migration files before and after any generation check. Existing
School notification migration 0046 and journal edits are not this plan's work.
Do not run migration application, db push, reset or full seed as a DX check.

### 10.4 Evidence storage

Maintain the canonical ledger under:

```text
docs/evidence/najm-app-integration-dx/YYYY-MM-DD/README.md
```

Record per phase: repository/HEAD, scoped diff, installed versions, requirement
IDs, exact command, exit status, artifacts and remaining limitations. Link
School/Najm evidence by repository-relative path plus commit when portable
cross-repository links are needed. Avoid duplicate editable copies of this plan.

Use a table with separate columns for Najm source, package publication, Kafil
source/local acceptance, School source/local acceptance, each app's Git/CI,
deployment revision and live acceptance. Mark unknown/pending explicitly.
Never store raw environment files, cookies, tokens, private settings, real
addresses/coordinates or provider keys in evidence.

## 11. Rollback and compatibility

- Ship additive package entrypoints first; preserve old exported contracts for
  the migration window. Do not remove them before both apps pass acceptance.
- Keep migrations small enough to revert per consumer. Revert that consumer's
  scoped adoption and exact package/lock changes together, preserving unrelated
  work. Do not reset a repository to a historical commit.
- No database rollback should be necessary because this plan adds no schema.
- Preserve existing cookies, API URLs, theme asset slots and factory bindings.
- Retain the prior working deployment image/config revision for each app;
  restore both together if runtime policy and bundled client behavior diverge.
- Location rollback preserves saved address/coordinates/placeId. Kafil may use
  its approved disabled fallback; do not silently switch School providers.
- Never treat a relaxed CSP or disabled auth verification as rollback.

## 12. Completion checklist

- [x] Shared behavior lives in the correct existing Najm owners.
- [x] Both apps have compact setup modules and thin framework entrypoints.
- [x] Removed helpers have no remaining consumers or duplicate replacements.
- [x] Auth failures, cookies, request caches and context identity are preserved.
- [ ] School institutional preferences and Google metadata survive migration.
- [ ] Kafil private manual-address/Leaflet workflow survives; its persisted browser form helper is removed.
- [ ] Both apps pass the relevant source and real workflow validation matrix.
- [x] Exact package artifacts are published and independently consumed.
- [x] Fresh-app scaffolding uses the final published integration.
- [x] Documentation and architecture guards describe the new boundaries.
- [x] Before/after file counts, lines and wiring imports demonstrate the DX gain.
- [x] Publication/deployment/acceptance status is stated separately for each app.

Implementation starts with phase 0. No checkbox is complete merely because its
API was proposed here or a related feature passed in an earlier plan.
