# Najm location picker and Kafil adoption plan

Status: **IN PROGRESS - `najm-kit@2.13.1` and `najm-next@0.4.0` are built,
published, registry-verified, and pushed. Kafil consumes those exact releases
through one app-owned Leaflet runtime definition. Focused checks, the full root
source gate, production build, and no-schema-drift gate pass. Manual visual
acceptance confirms online tiles, pin selection, and the intentionally manual
address-plus-pin workflow. Kafil Git publication is next; browser automation,
deployment, and live production acceptance have not run.**

Plan date: **2026-09-11**

This is a task-specific root plan. It does not replace another Kafil plan and
does not claim project-wide completion. It coordinates work in both
`C:\Users\hdevlop\Desktop\najm` and this Kafil checkout.

## 1. Goal

Replace the three visible family household controls for exact address,
delivery latitude, and delivery longitude with one reusable address control:

```text
Household exact address *
[ 10 Test Street, Tangier                              ] [map-pin]
  Delivery location selected
```

The map-pin action opens a responsive dialog matching the supplied reference:

- title, short description, and close action;
- optional address/place search across the top;
- a large interactive map with one selected marker;
- marker summary card;
- zoom and explicit current-location controls;
- Cancel and Confirm address actions;
- desktop bounded-dialog and mobile full-screen layouts;
- complete keyboard, focus, error, loading, RTL, and reduced-motion behavior.

The reusable UI belongs to `najm-kit`. Kafil owns provider selection,
credentials, environment-variable naming, CSP policy composition,
translations, family schema adaptation, and the decision to transmit sensitive
household data to a third party. Generic runtime parsing, provider loading, and
provider-derived CSP-source calculation belong to shared Najm leaf entrypoints
so another application does not have to rebuild the same server/client bridge.

The reusable Najm Kit supports these map engines:

1. `leaflet` - default and required for the first Kafil adoption;
2. `google` - optional for other consumers and playground evaluation when a
   valid, restricted Google Maps browser key and billing are available.

Kafil's first adoption is intentionally **Leaflet-only**. Its runtime contract
supports `leaflet` and the manual-address `disabled` fallback, with no Google
key, Google CSP origins, Places search, or public Nominatim geocoder. This
decision keeps the reusable provider boundary intact without sending sensitive
household locations to a third-party geocoder.

The package contract must allow later MapLibre, MapTiler, self-hosted
Nominatim, or other providers without changing the location field or dialog.
Those extra adapters are not required for the first release.

## 2. Current state and constraints

### 2.1 Kafil

- `apps/web` currently resolves `najm-kit@2.11.23`, Next.js `16.2.12`, React
  `19.2.4`, React Hook Form `7.81.0`, Zod `4.4.3`, and Leaflet `1.9.4`.
- `FamilyHouseholdFields` renders `exactAddress` as a textarea and
  `deliveryLatitudeInput` / `deliveryLongitudeInput` as text inputs.
- `familySchemas.ts` requires `exactAddress`, permits coordinates to be absent,
  validates their ranges, and requires latitude and longitude together.
- `toCreateFamilyInput()` and `toUpdateFamilyInput()` already adapt form
  strings to the existing family DTO fields.
- The server and database already store `exactAddress`, `deliveryLatitude`, and
  `deliveryLongitude`; order creation snapshots the delivery address and
  coordinates. No backend DTO, schema, migration, or database change is needed.
- `DeliveryMap.tsx` already uses Leaflet and configurable OSM raster tiles. Its
  presentation is not the reusable form input and must not be copied into the
  family form.
- `.env.example` and `deploy/env/app.env.example` currently expose
  `NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION`. Direct
  `NEXT_PUBLIC_*` reads are build-time values in Next.js and are unsuitable for
  switching a single Docker image at runtime.
- The root `layout.tsx` is already dynamically rendered because it reads
  cookies and headers. It can read runtime server environment values and pass a
  sanitized, serializable map configuration into `AppProviders`.
- Kafil CSP currently allows only the OSM tile origin for map images and keeps
  `connect-src` at `'self'`. Google or a different tile/search provider will
  require an exact provider-derived CSP allowlist.

### 2.2 Najm Kit

- `FormInput` dispatches one scalar form field through a fixed input-type map.
- `AvatarFormInput` demonstrates the supported pattern for a dedicated form
  wrapper outside the `FormInput` union.
- `WizardForm` already supports object-shaped fields through React Hook Form,
  and `buildFormFill()` recursively produces nested Zod object values.
- `najm-kit` is ESM-only, publishes `dist`, builds package CSS separately, and
  already uses optional subpath exports to keep specialized environments out
  of the root graph.
- `najm-kit` has no map dependency today. Leaflet and Google dependencies must
  remain outside the default root bundle.

### 2.3 Worktree preflight

At plan creation, both repositories contain user-owned uncommitted work.

Kafil overlaps include:

- `apps/web/src/features/Families/components/FamilyForms/CreateFamilyDialog.tsx`;
- form-fill source and tests under `apps/web`, `packages/seed`, and their tests.

Najm overlaps include:

- `packages/najm-kit/src/components/form/multi-step/MultiStepForm.tsx`;
- dialog and wizard tests.

Do not begin implementation by restoring, resetting, moving, or rewriting any
of those files. Before the first implementation slice:

1. record `git status --short` in both repositories;
2. settle or explicitly preserve the ongoing family-wizard and Najm dialog
   work;
3. re-read both repositories' `AGENTS.md` instructions and the required Kafil
   frontend and Playwright skills;
4. inspect the installed Najm declarations in Kafil, not only the sibling Najm
   source checkout;
5. read the installed Next.js environment and server/client component guides
   before modifying runtime configuration flow;
6. stop if the package and installed contracts no longer match this plan.

`MultiStepForm.tsx` is not part of this feature. The household step will list
one `deliveryLocation` object field. If a verified wizard defect blocks that
contract, pause and amend this plan instead of silently modifying the wizard.

## 3. Locked data contract

### 3.1 Form-only value

Najm Kit owns the generic value shape:

```ts
export interface NLocationValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}
```

Rules:

- `address` is editable independently from the map marker;
- coordinates are either both finite and in range or both `null`;
- latitude range is `-90..90`;
- longitude range is `-180..180`;
- Najm Kit must not infer whether the address or coordinates are required;
- candidates may carry an ephemeral provider identifier, but provider payloads
  are not persisted in the form value;
- the package never logs address text, coordinates, search queries, provider
  results, or geolocation results.

Kafil changes its form-only representation to:

```ts
deliveryLocation: {
  address: string;
  latitude: number | null;
  longitude: number | null;
}
```

At the submission boundary Kafil preserves the existing server DTO:

```ts
{
  exactAddress: values.deliveryLocation.address.trim(),
  deliveryLatitude: values.deliveryLocation.latitude,
  deliveryLongitude: values.deliveryLocation.longitude,
}
```

The update default mapping performs the inverse conversion. No server response
or command field is renamed.

### 3.2 Kafil validation policy

- The written address remains required, trimmed, minimum 5 and maximum 1,000
  characters.
- The map pin remains optional for backward compatibility.
- A valid pin always contains both coordinates.
- Clearing a pin sets both coordinates to `null` while retaining the address.
- Editing address text after choosing a pin does not silently discard the pin;
  the control shows a localized reminder to update the pin when the physical
  location changed.
- Requiring a pin for delivery is a separate product-policy change and is out
  of scope.

## 4. Locked Najm public API

### 4.1 Core exports

Add a provider-neutral `najm-kit/location` entrypoint exporting:

```ts
NLocationInput
NLocationDialog
NLocationProvider
useNLocationProvider
FormLocationInput
normalizeLocationValue
isCompleteCoordinatePair
```

and the related public types:

```ts
NLocationValue
NLocationCandidate
NLocationInputProps
NLocationDialogProps
FormLocationInputProps
NLocationProviderProps
NLocationMapAdapter
NLocationMapProps
NLocationGeocoderAdapter
NLocationLabels
NLocationClassNames
```

The root `najm-kit` barrel may re-export the provider-neutral input, dialog,
form wrapper, helpers, and types because they do not import a map SDK. It must
not re-export Leaflet or Google adapter implementations from the root.

Do not add `type="location"` to the existing `FormInput` dispatcher in the
first release. `FormLocationInput` owns one object field and is the explicit
composite-form API, matching the existing dedicated-wrapper precedent.

### 4.2 Provider adapters

Add optional subpath exports:

```text
najm-kit/location/leaflet
najm-kit/location/google
```

Each adapter supplies the same behavior contract:

- render an initial center and zoom;
- display exactly one selected marker;
- select by map click;
- drag or move the marker;
- zoom in/out;
- re-center after a controlled value change;
- expose provider attribution without allowing the consumer to hide required
  attribution;
- report ready, loading, and sanitized error states;
- release listeners, map instances, scripts, and observers on unmount;
- never mutate the form value directly.

The common dialog owns draft state and passes coordinates to the adapter. Map
adapters remain rendering/interaction implementations, not form controllers.

### 4.3 Optional geocoder

Search is an optional capability separate from map rendering:

```ts
export interface NLocationGeocoderAdapter {
  id: string;
  search(query: string, context: NLocationSearchContext):
    Promise<readonly NLocationCandidate[]>;
  reverse?(coordinates: NCoordinates, signal: AbortSignal):
    Promise<NLocationCandidate | null>;
}
```

Requirements:

- hide the search row when no geocoder is configured;
- support explicit-submit search for all adapters;
- autocomplete is opt-in, debounced, abortable, and never the default;
- ignore stale responses after a newer query or dialog closure;
- results are keyboard-operable and use listbox/option semantics;
- selecting a result updates only the dialog draft;
- reverse-geocoded text is a suggestion and never overwrites a manually edited
  address without confirmation;
- Google Places uses a fresh session token and terminates the session according
  to Google's current Places contract;
- the package does not ship a public Nominatim endpoint as a default.

The first Leaflet adapter works without a geocoder. The Google adapter may pair
with Google Places when the consumer explicitly enables search.

### 4.4 Dependency and bundle boundary

- Keep core location UI free of Leaflet, Google, Next.js, and application
  imports.
- Add Leaflet and its types as optional peer/development dependencies for the
  Leaflet subpath, after verifying the exact peer range at implementation time.
- Use Google's supported Maps JavaScript loading mechanism for the Google
  subpath; verify the current official API before choosing whether an extra
  loader package is needed.
- Declare any Google package as optional and isolate it to the Google entry.
- Extend `tsup.config.ts`, `package.json` exports, public API snapshots, and CSS
  generation for the new subpaths.
- Dynamically load only the selected map adapter when the dialog opens. Importing
  `najm-kit` or rendering a closed `FormLocationInput` must not fetch a map SDK,
  inject a script, request a tile, or increase the root server graph.
- Add a dist-shape regression proving root, server, and RSC entrypoints do not
  reference Leaflet, Google globals, browser-only map code, or provider CSS.

## 5. Locked interaction and visual design

### 5.1 Compact field

- Render one single-line address input with a trailing Najm icon button.
- The field spans the full household grid width at desktop and one column on
  mobile.
- Use Najm tokens, variants, borders, focus rings, buttons, dialog, feedback,
  and scroll primitives; do not hard-code Kafil colors in the package.
- The action has a localized accessible name such as "Select location on map";
  the icon alone is never the accessible name.
- Show `not selected`, `selected`, `changed after pin`, `loading`, or
  `unavailable` state in text and iconography without exposing raw coordinates
  by default.
- Disabled and read-only modes prevent opening or editing consistently.
- Manual address entry continues to work if maps are disabled or unavailable.

### 5.2 Dialog transaction

- Opening copies the committed form value into a dialog draft.
- Map clicks, marker moves, searches, and current-location results modify only
  the draft.
- Cancel, Escape, overlay dismissal, or close discards the draft.
- Confirm validates and commits address plus both coordinates atomically through
  one `onChange` call.
- A Clear pin action removes both coordinates but keeps the draft address.
- Reopening starts from the current committed value, not a stale previous draft.
- Confirm is disabled while a provider/search operation is pending or while the
  draft violates the coordinate-pair invariant.
- A provider error leaves the address editable and offers a retry; it does not
  close the dialog or clear the committed location.

### 5.3 Responsive layout

Desktop follows the reference image:

```text
+--------------------------------------------------------------+
| Pick up address                                           [x] |
| Search and select a location for this record                 |
| [ Search by street, city, or postal code                  ]  |
|                                                              |
| [                     interactive map                     ]  |
| [ marker card                                  zoom/location] |
|                                                              |
|                                      [Cancel] [Confirm address]|
+--------------------------------------------------------------+
```

- Use the verified Najm dialog width/height contract rather than fixed pixels.
- Keep one vertical scroll owner when content must scroll.
- The footer remains reachable and visible without document scrolling.
- At phone sizes the dialog becomes full-screen, controls respect safe areas,
  the map keeps a useful minimum height, and footer actions do not cover the
  marker or attribution.
- RTL mirrors logical layout and footer order without reversing map coordinates
  or zoom semantics.

### 5.4 Accessibility

- Restore focus to the invoking map button after close.
- Move initial focus to the search input when present; otherwise focus the map
  instructions or current-location action.
- Announce provider readiness, search result count, selected location, pin
  clearing, geolocation denial, and provider failure through a polite live
  region.
- Support keyboard selection of search results.
- Provide an adapter-neutral keyboard marker adjustment: arrow keys move the
  draft pin by a documented small increment, Shift+Arrow uses a larger
  increment, and the updated selection is announced.
- Preserve visible focus indicators over the map canvas.
- Do not rely on color alone for selected/error state.
- Honor `prefers-reduced-motion` for pan, zoom, and marker transitions.
- Current-location access occurs only after an explicit user action and handles
  unsupported, denied, timeout, and unavailable states without repeated prompts.

## 6. Consumer-owned runtime configuration

### 6.1 Environment contract in Kafil

Add documented runtime variables to `.env.example` and
`deploy/env/app.env.example`:

```env
# leaflet | disabled
KAFIL_LOCATION_MAP_PROVIDER=leaflet

KAFIL_LOCATION_DEFAULT_LATITUDE=33.5731
KAFIL_LOCATION_DEFAULT_LONGITUDE=-7.5898
KAFIL_LOCATION_DEFAULT_ZOOM=12

# Leaflet raster tiles. Any browser-visible key in this URL must be restricted.
KAFIL_LOCATION_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
KAFIL_LOCATION_TILE_ATTRIBUTION=&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors

```

Do not add real values to `.env.example`, deployment templates, source,
screenshots, tests, or logs.

`NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_ATTRIBUTION` remain the legacy
Delivery dashboard configuration during this slice. Do not silently change the
existing Delivery dashboard map. A later map-unification plan may migrate it to
the shared provider after the location input is accepted.

### 6.2 Runtime server bridge

The initial Kafil adoption created a pure parser plus a server-only loader under
`apps/web/src/lib`:

```text
locationConfig.ts        # pure parsing, defaults, serialization and tests
serverLocationConfig.ts  # server-only process.env reads
```

The serialized client configuration contains only:

- selected provider;
- default center and zoom;
- public tile/style URL and attribution;
- capability flags needed by the UI.

It must never contain a server geocoding key, unrestricted credential, cookie,
database value, or other environment entry.

Load this configuration in the dynamic root layout and pass it through
`AppProviders` to the client location provider. Najm Kit does not read
`process.env` or know Kafil variable names.

This runtime bridge is required because Next.js inlines direct
`NEXT_PUBLIC_*` references at build time. Deployment must be able to promote
one image and choose the location provider from runtime environment without a
rebuild.

### 6.4 Shared runtime DX follow-up

The initial bridge proved the boundary but leaves too much repeated wiring for
each Najm application. Extract the generic mechanics before a second consumer
copies them:

- add `najm-kit/location/runtime`, a client-only provider that accepts a
  serializable provider configuration and lazily imports the selected map
  adapter only when the dialog mounts;
- add `najm-next/location/server`, a pure server-safe definition/resolver that
  reads a caller-supplied environment record using an application-owned prefix,
  validates provider values, centers, zoom, tile URLs, and attribution, and
  returns both the public configuration and exact CSP source lists;
- keep environment access at the application call site; neither package reads
  `process.env` or chooses an application prefix;
- keep geocoder selection and privacy approval application-owned; the runtime
  provider accepts an explicitly supplied geocoder and never defaults to a
  public service;
- after both packages are published, replace Kafil's `locationConfig.ts`,
  `serverLocationConfig.ts`, and `KafilLocationProvider.tsx` with one small
  application definition/facade and shared runtime provider usage;
- do not make Kafil consume workspace aliases, sibling source, local copies, or
  unpublished tarballs while waiting for that release.

The shared packages may keep separate internal server/client modules. The DX
goal is one declarative integration surface per application, not collapsing
incompatible Next.js module graphs into one file.

### 6.3 Invalid configuration behavior

- Unknown provider names resolve to `disabled` with one sanitized server
  diagnostic.
- `google` is not a valid Kafil provider value in this adoption and resolves to
  the same safe `disabled` fallback as any unknown value.
- Leaflet without a valid HTTPS tile URL keeps the manual address input and
  disables the map action in production.
- Development may accept loopback HTTP tile origins; production does not.
- Invalid center/zoom values use tested Moroccan defaults.
- Provider configuration is immutable for the current rendered client tree and
  changes on the next request after the runtime environment/deployment changes.

## 7. Provider policy, privacy, and security

### 7.1 Leaflet and OSM-compatible tiles

Leaflet is only the renderer. Tile hosting and search are separate services.

- Keep visible attribution.
- Do not prefetch, bulk download, or implement offline tile downloading.
- Honor tile caching behavior.
- Treat `tile.openstreetmap.org` as a development/low-volume default, not a
  production SLA.
- Before production acceptance, select and document a provider suitable for
  Kafil's traffic or explicitly accept the OSM best-effort risk.
- A tile URL containing a token is browser-visible; restrict it by hostname,
  scope, and quota.

### 7.2 Google

- Google is an optional complete provider adapter, not a Google tile layer
  inside Leaflet.
- Production use requires a standard Google Maps Platform project, enabled
  billing, required APIs, and a browser key.
- Use a distinct browser key for Kafil and restrict it by exact development and
  production website origins plus only the required Maps JavaScript/Places APIs.
- Configure budgets, quotas, and usage alerts before production enablement.
- Do not put a server/web-service key into the client configuration.
- Follow current Google attribution, logo, result-display, session-token,
  caching, and data-retention requirements.
- Provider contract verification must be refreshed immediately before
  implementation and production enablement because pricing and terms can change.

### 7.3 Sensitive family data

Family exact addresses and coordinates are sensitive operational data.

- Keep the existing backend authorization and sponsor/privacy projections
  authoritative.
- Never include address, coordinates, search text, result labels, provider IDs,
  or geolocation results in analytics, audit metadata, outbox metadata, console
  output, error reporting, test titles, traces, screenshots, or plan evidence.
- Do not call public `nominatim.openstreetmap.org` with Kafil household data.
  Its policy forbids client-side autocomplete, limits usage, and asks clients
  not to submit personal or confidential material.
- Search and reverse geocoding are disabled by default for Kafil's Leaflet
  configuration.
- Enabling Google or another third-party geocoder requires an explicit privacy,
  retention, terms, and operational-cost review outside code review.
- Browser geolocation is ephemeral until Confirm; Cancel discards it.
- Do not persist browser accuracy, heading, altitude, or timestamp; Kafil needs
  only latitude and longitude.

### 7.4 CSP

Refactor `createContentSecurityPolicy()` to accept the sanitized provider
policy or derive the exact allowlist from the same validated server config.

- Add only the exact HTTPS origins required by the selected adapter.
- Parse custom tile/search origins rather than interpolating an untrusted raw
  string into the CSP.
- Keep `'self'`, nonce, `strict-dynamic`, object denial, and other existing
  protections intact.
- Tests must prove Leaflet configuration does not enable Google origins,
  malformed URLs add nothing, and development-only loopback behavior cannot
  reach production.

## 8. Najm implementation slices

### Slice N1 - pure contracts and transactional state

1. Add location value, coordinates, candidate, adapter, labels, and class-name
   types.
2. Add pure coordinate normalization/range helpers.
3. Add a reducer or hook for committed value versus dialog draft.
4. Prove Confirm commits one complete value and all close/cancel paths discard
   the draft.
5. Add provider capability and configuration-error models with no app strings.

Focused proof:

```powershell
bun test packages/najm-kit/test/location/location-contract.test.ts
bun run --cwd packages/najm-kit typecheck
```

### Slice N2 - provider-neutral input, dialog, and form wrapper

1. Implement `NLocationInput` from existing Najm inputs/buttons.
2. Implement `NLocationDialog` from verified Najm dialog, feedback, scroll,
   and focus contracts.
3. Implement optional search results, clear-pin, current-location, keyboard pin
   movement, confirmation, and live announcements.
4. Implement `FormLocationInput` as one React Hook Form object field with
   label, description, required, disabled, read-only, error, prefix, variant,
   background, and class-name behavior.
5. Ensure nested Zod errors are presented at the composite field boundary.
6. Add English package fallbacks while allowing every label to be overridden
   or translated through the provider.
7. Add examples to the Najm Kit README/playground.

Focused proof:

```powershell
bun test packages/najm-kit/test/location/location-input.test.tsx
bun test packages/najm-kit/test/location/location-dialog.test.tsx
bun test packages/najm-kit/test/location/form-location-input.test.tsx
bun run --cwd packages/najm-kit typecheck
bun run --cwd packages/najm-kit typecheck:tests
```

### Slice N3 - Leaflet adapter

1. Add the optional Leaflet subpath without importing it from core location UI.
2. Initialize and destroy one map instance per open dialog.
3. Implement selected marker, click, drag, keyboard move, zoom, resize
   invalidation, controlled recentering, attribution, and reduced motion.
4. Use consumer-provided tile URL/attribution; do not hard-code a commercial
   provider or key.
5. Isolate Leaflet CSS and marker assets so consumers do not need fragile global
   imports or broken default image paths.
6. Handle SSR/import without touching `window` until the adapter is loaded in
   the browser.

### Slice N4 - Google adapter

1. Refresh current Maps JavaScript and Places API documentation.
2. Load the official API once per browser document and deduplicate concurrent
   dialog opens.
3. Scope failures by key/library configuration and permit a retry without
   leaking the key in error text.
4. Implement marker selection, movement, zoom, current location, Places search,
   session-token lifecycle, attribution, and cleanup through the same adapter
   contract.
5. Do not reuse Google results on a Leaflet map unless current Google terms
   explicitly permit the exact implementation and the plan is amended.

### Slice N5 - package surface and acceptance

1. Add subpath exports and build entries.
2. Add optional peer metadata and documentation.
3. Update public API snapshots and barrel tests.
4. Verify compiled CSS contains every location-dialog responsive/RTL/state
   selector.
5. Prove closed/root/server/RSC imports do not load provider code.
6. Add a Najm browser acceptance page using deterministic provider adapters for
   UI behavior, plus adapter-specific contract tests that do not depend on paid
   or mutable external services.

### Slice N6 - shared runtime DX

1. Add `najm-kit/location/runtime` with a serializable provider union and a
   client provider that lazily loads Leaflet or Google only when the map mounts.
2. Keep geocoders explicit and application-owned; do not add public Nominatim.
3. Add `najm-next/location/server` with a prefix-based pure definition/resolver,
   safe fallbacks, sanitized issue codes, and exact CSP source output.
4. Publish both as isolated subpaths and document the one-definition consumer
   pattern.
5. Migrate the Najm playground to exercise the runtime provider without
   duplicating lazy map-adapter construction.
6. After explicit version/publication authorization, install the published
   artifacts in Kafil and collapse its integration to one app definition.

Najm gate from `C:\Users\hdevlop\Desktop\najm`:

```powershell
bun run lint:ui
bun run test:ui
bun run build:ui
bun run api:check
bun run --cwd packages/najm-kit test:next16
bun run --cwd packages/najm-kit typecheck:acceptance
bun run --cwd packages/najm-kit test:acceptance
```

Do not substitute the sibling source checkout for a packed consumer check.

## 9. Najm release boundary

The new public API is backward-compatible functionality and should receive a
minor version unless the final diff introduces a breaking change.

1. Start only from a clean Najm worktree after the existing dialog/wizard work
   is resolved.
2. Run the complete Najm Kit gate and inspect the public API diff.
3. Prepare the minor version with the repository's package-release script.
4. Review and commit the version/changelog change before packing.
5. Run a dry-run package publication and inspect the tarball for:
   - core location declarations and JavaScript;
   - Leaflet and Google subpaths;
   - provider CSS/assets;
   - correct optional peer metadata;
   - no source maps, credentials, test fixtures, or unrelated files.
6. Install the exact packed artifact into a disposable Next.js 16 consumer and
   test both the root import and each provider subpath.
7. Publish only after explicit user release authorization. Planning or passing
   a dry run is not publication.
8. Verify the registry version and packed integrity after publication.

Kafil must not consume unpublished sibling source through a path alias,
workspace link, copied component, or app-only implementation. Package source
validation, version preparation, publication, and registry verification are
separate statuses.

## 10. Kafil adoption slices

### Slice K1 - install and runtime provider bridge

1. Update Kafil's pinned `najm-kit` override/dependency to the published exact
   version and run `bun install`.
2. Inspect `node_modules/najm-kit` declarations and package exports to prove the
   installed artifact, not the sibling checkout, supplies the contract.
3. Add pure and server-only Kafil location configuration modules.
4. Pass serialized runtime configuration from `RootLayout` through
   `AppProviders` into `KafilLocationProvider`.
5. Dynamically import only the selected adapter.
6. Add all new variables and safe comments to local and deployment env
   templates.
7. Add provider-aware CSP parsing and exact-origin tests.

Do not add keys to `apps/web/next.config.ts`; Najm Next owns that file.

### Slice K2 - family form migration

1. Replace the three household `FormInput` controls with one full-width
   `FormLocationInput`.
2. Add all visible copy to en/fr/ar/es catalogs and preserve locale parity.
3. Replace the three flat form fields with `deliveryLocation` in create/update
   schemas, step field lists, defaults, types, and submission adapters.
4. Preserve create policy inputs and the edit wizard's no-policy contract.
5. Preserve exact API field names and nullable coordinate behavior.
6. Update F8 form-fill to generate one Moroccan test address with a valid
   coordinate pair without logging it.
7. Reconcile family source tests and the existing create/edit browser specs that
   currently assert raw latitude/longitude labels.
8. Do not modify family backend DTOs, repositories, schema, migrations, order
   snapshots, or authorization.

This slice overlaps the current family-wizard work. Apply it only after that
slice has a stable accepted baseline, or rebase the plan deliberately and
re-run all wizard acceptance. Do not infer completion from the current dirty
source.

### Slice K3 - graceful fallback

Prove these configurations independently:

- `disabled`: manual address entry works and the map action communicates
  unavailability;
- `leaflet` with no geocoder: marker selection and current location work,
  search is absent, and no search request occurs;
- adapter load failure: committed form value is preserved and retry is
  available.

## 11. Test matrix

### 11.1 Najm source and type tests

Cover at minimum:

- null, partial, valid, boundary, NaN, and infinite coordinates;
- one atomic `onChange` on Confirm;
- no change on every dismissal path;
- address edit after a pin preserves coordinates and changes status text;
- clear pin clears both coordinates only;
- form prefix and nested object registration;
- required/read-only/disabled/error behavior;
- search debounce, cancellation, stale-response suppression, result keyboard
  selection, empty state, and error state;
- geolocation success, denial, timeout, unavailable, and late-result discard;
- focus trap, restoration, live announcements, visible names, and keyboard pin
  movement;
- LTR/RTL logical placement and reduced motion;
- no provider import or network action before dialog open;
- repeated open/close cleanup without leaked map objects or listeners;
- root/barrel/server/RSC/dist-shape isolation;
- actual compiled CSS output;
- nested Zod `buildFormFill()` behavior for `deliveryLocation`.

### 11.2 Kafil source tests

Extend focused family tests to prove:

- create/update schemas accept address-only and valid pinned locations;
- partial/out-of-range coordinates are rejected;
- create/update mappers preserve exact API field names and numeric values;
- update defaults reconstruct `deliveryLocation` from a family record;
- policy fields remain create-only;
- both wizards register one household location field;
- no visible latitude/longitude input remains;
- all four locale catalogs contain the new dialog/status/error labels;
- disabled/malformed/Leaflet runtime configuration is parsed without
  exposing unrelated environment data;
- CSP allowlists match only the selected configuration;
- server source and built client chunks contain no unrestricted or server-only
  keys.

### 11.3 Deterministic Kafil browser setup

Add `apps/web/test/e2e/family-location-picker.e2e.ts` and register it in the
explicit default Phase 6 file list.

The normal CI/browser acceptance must not depend on a paid Google account,
public Nominatim, or internet tile availability. Run the real Leaflet adapter
against a runner-owned local tile endpoint/static tile asset, configured before
the managed Next server starts. This is a real application/provider flow; do
not use `page.route()` to mock the family API or map behavior.

Attach deny-all diagnostics immediately to every page:

- page errors;
- console errors;
- failed requests;
- unexpected `4xx`/`5xx` responses.

Use the existing Phase 6 authenticated operator/admin setup, real PostgreSQL,
real family APIs, unique disposable records, and API cleanup in `finally`.
Never print generated identities, addresses, coordinates, request bodies,
cookies, or tokens.

## 12. Browser acceptance work units

### Work unit A - desktop compact field and dialog

- Open create family and reach the household step.
- Prove exactly one visible address control and one map action exist.
- Prove raw latitude/longitude inputs are absent.
- Open the map dialog and assert it lies within viewport bounds.
- Assert title, description, map, marker, controls, attribution, Cancel, and
  Confirm are present.
- Confirm the document does not become the scroll owner and the family wizard
  footer remains recoverable after closing.

### Work unit B - transactional marker behavior

- Type a synthetic address.
- Open the dialog, select/move a pin, and Cancel.
- Reopen and prove the canceled coordinates were not committed.
- Select a pin again and Confirm.
- Prove selected status appears and address plus coordinate pair are present in
  form state without rendering raw coordinate inputs.
- Reopen, clear the pin, Confirm, and prove address remains while both
  coordinates clear.

### Work unit C - keyboard and error behavior

- Open and operate the dialog without pointer actions.
- Move the marker with documented keys and observe a live announcement.
- Exercise Cancel, Escape, close, zoom, current-location denial, Retry, and
  Confirm with keyboard.
- Prove focus returns to the invoking map button.
- Prove a provider failure preserves address and committed coordinates.

### Work unit D - create persistence

- Create one disposable family through the real UI/API with a confirmed pin.
- Register the exact successful request observer before submission.
- Assert one POST and no duplicate mutation.
- Read the created family through the real authorized API and prove address and
  both coordinates persisted.
- Clean up through the authorized API in `finally`.

### Work unit E - edit persistence and regression

- Open an existing disposable family's two-step edit wizard.
- Navigate Previous/Next and prove the nested location survives step changes.
- Change address and pin, save once, and assert one successful PUT.
- Reopen/refetch and prove the persisted values, not only a success toast.
- Prove create policy fields remain visible and edit policy fields remain absent.
- Preserve the family edit dialog's bounded internal-scroll behavior.

### Work unit F - mobile Arabic RTL

At approximately `390 x 844`:

- switch to Arabic and prove RTL direction;
- open the location dialog and prove full-screen containment and safe-area
  footer reachability;
- assert map attribution and controls remain visible and do not overlap;
- operate search when enabled, marker movement, Cancel, and Confirm by keyboard;
- prove localized accessible names, visible focus, live announcements, and
  correct logical button order;
- ensure the underlying wizard/document does not scroll unexpectedly.

### Work unit G - provider selection

Run separate managed-server invocations because runtime configuration is fixed
for one server process:

1. `disabled` fallback;
2. Leaflet with local tiles and no geocoder;
3. malformed provider configuration with no outbound provider request.

Google remains a separate Najm adapter/playground concern and is not part of
Kafil acceptance for this adoption.

## 13. Browser execution ladder

Before every browser invocation, run the existing read-only preflight: confirm
the authorized local PostgreSQL target, required secrets by presence only,
disabled live email, and free port `3210`. Confirm the selected provider config
without printing URLs containing credentials or key values.

Run the smallest work unit with passive diagnostics first:

```powershell
$env:KAFIL_E2E_FILES='test/e2e/family-location-picker.e2e.ts'
$env:KAFIL_E2E_GREP='work unit A|passive diagnostics'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

After focused work units pass, run the complete affected spec:

```powershell
$env:KAFIL_E2E_FILES='test/e2e/family-location-picker.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

Then run the existing family create/edit specs as a dependent range:

```powershell
$env:KAFIL_E2E_FILES='test/e2e/family-location-picker.e2e.ts,test/e2e/family-create-wizard.e2e.ts,test/e2e/family-edit-wizard.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

Finally run the same affected range against one controlled production build:

```powershell
$env:NAJM_NEXT_DIST_DIR='.next-phase6-e2e'
bun run build
$env:KAFIL_E2E_USE_PRODUCTION='1'
$env:KAFIL_E2E_FILES='test/e2e/family-location-picker.e2e.ts,test/e2e/family-create-wizard.e2e.ts,test/e2e/family-edit-wizard.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
Remove-Item Env:KAFIL_E2E_USE_PRODUCTION -ErrorAction SilentlyContinue
Remove-Item Env:NAJM_NEXT_DIST_DIR -ErrorAction SilentlyContinue
```

The implementation must add runner-owned provider variables needed for local
tiles before copying these commands literally. Do not set a real Google key in
shell history or evidence. Promote only after a native exit-code-zero pass.

After a failure, inspect the focused artifact, classify product/package/test/
runner/environment ownership, fix the narrowest layer, and rerun that focused
work unit once. Do not hide provider failures with retries, sleeps, broad HTTP
allowances, forced clicks, or `networkidle`.

## 14. Kafil verification gates

Run focused checks while adopting:

```powershell
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run --cwd packages/seed typecheck
bun run --cwd packages/seed test
bun run build
```

Close the Kafil implementation with the required root gate, sequentially:

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Capture `git status --short` immediately before and after `db:generate`. This
is a frontend/package-adoption change and must create no migration. Existing
unrelated migrations or dirty files are not attributable to this plan and must
not be modified.

Store sanitized screenshots and an assertion-to-requirement mapping under:

```text
docs/evidence/family-location-picker/YYYY-MM-DD/
```

Evidence may show synthetic map UI but must blur or omit addresses,
coordinates, identities, provider keys, query strings, and environment values.

## 15. Publication, deployment, and live acceptance

Track these independently:

1. Najm source implementation and package tests;
2. Najm version preparation;
3. Najm dry-run/tarball verification;
4. npm publication and registry verification;
5. Kafil installed-package migration and source gates;
6. local real-database browser acceptance;
7. production-style local browser acceptance;
8. Kafil Git publication;
9. deployment/image publication;
10. exact live-container revision and health;
11. live provider/CSP/browser acceptance.

This plan does not authorize npm publication, Git push, paid-provider
activation, deployment, remote browser mutation, or production environment
changes. Obtain explicit authorization at each external mutation boundary.

Before a production provider is enabled:

- verify the exact provider account/plan and current terms;
- verify key origin/API restrictions without exposing the key;
- verify quota/budget alerts;
- verify CSP against the chosen provider;
- confirm privacy approval for the data transmitted;
- deploy and verify the exact active image revision;
- run a read-only map-load probe first;
- perform a separately authorized synthetic-address browser acceptance;
- verify rollback by switching to `leaflet` or `disabled` at runtime and
  recreating/restarting the application as required.

A passing build, published package, webhook, healthy old container, or map tile
response alone is not live feature acceptance.

## 16. Rollback

### Configuration rollback

- Set `KAFIL_LOCATION_MAP_PROVIDER=disabled` to retain manual address entry
  while removing map-provider calls.
- Or switch to `leaflet` with an approved tile URL when Google is unavailable.
- Restart/recreate the runtime according to the deployment platform and verify
  the sanitized public config and CSP changed together.

### Application rollback

- Revert Kafil's form adoption while retaining the existing three backend
  fields; no data migration is needed.
- Existing addresses and coordinates remain compatible because the API and
  database contract never changed.

### Package rollback

- Pin Kafil to the previously verified Najm Kit version.
- Do not unpublish an npm version or edit an already published tarball.
- Keep the new package version available for other consumers unless it has a
  confirmed security issue requiring a separately authorized registry action.

## 17. Out of scope

- Changing family backend DTOs, services, repositories, schemas, migrations,
  authorization, audit redaction, or order snapshots.
- Making coordinates mandatory.
- Address validation as proof of residency or delivery eligibility.
- Routing, directions, distance matrices, delivery optimization, geofencing,
  offline maps, or tile prefetching.
- Migrating the existing Delivery dashboard map to Google or the new shared
  provider.
- Shipping MapLibre, OpenFreeMap, MapTiler, or public/self-hosted Nominatim
  adapters in the first release.
- Storing provider result payloads, place details, accuracy, altitude, heading,
  or browser-geolocation timestamps.
- Publishing Najm, pushing Git, enabling billing, changing production
  credentials, deploying Kafil, or running production browser mutations without
  explicit authorization.

## 18. Completion checklist

### Najm Kit

- [x] Core location types and pure helpers implemented.
- [x] Transactional `NLocationInput` / `NLocationDialog` implemented.
- [x] `FormLocationInput` implemented as one object field.
- [x] Leaflet adapter implemented through an isolated optional subpath.
- [x] Google adapter implemented through an isolated optional subpath.
- [x] Search capability remains optional and public Nominatim is not defaulted.
- [x] Accessibility, RTL, responsive, failure, cleanup, and bundle-isolation
      tests pass.
- [x] Najm Kit full gate and Next.js 16 integration pass.
- [x] Minor version prepared, reviewed, committed, packed, and verified.
- [x] npm publication explicitly authorized and registry-verified.
- [x] Shared runtime provider and server resolver implemented in Najm source.
- [x] Najm Kit and Najm Next unit suites plus package typechecks pass.
- [x] Playground source uses the shared runtime provider and passes an isolated
      page typecheck.
- [x] Runtime-DX package builds, dist-shape checks, version preparation, and
      publication are explicitly authorized and pass.

### Kafil

- [x] Published Najm Kit artifact installed and declarations verified.
- [x] Runtime provider config and safe client bridge implemented.
- [x] Provider-aware CSP implemented with exact-origin tests.
- [x] Local and deployment env templates documented without secrets.
- [x] Family create/edit use one `deliveryLocation` form field.
- [x] Backend DTO field names and coordinate semantics remain unchanged.
- [x] Four-locale copy and parity pass.
- [x] F8 form fill supplies a valid nested location.
- [x] Published runtime-DX packages replace the three Kafil-specific runtime
      bridge files with one app-owned definition/facade.
- [x] Focused source, web, seed, root, build, and no-schema-drift gates pass.
- [ ] Deterministic Leaflet browser spec passes.
- [ ] Existing create/edit browser regressions pass.
- [ ] Production-style local browser range passes.
- [ ] Sanitized evidence and assertion mapping are complete.

### External/live boundaries

- [ ] Production tile/search provider approved.
- [ ] Google billing/key restrictions/privacy review complete if Google is used.
- [ ] Kafil Git publication explicitly authorized and verified.
- [ ] Deployment explicitly authorized and exact live revision healthy.
- [ ] Read-only and synthetic live map acceptance pass.
- [ ] Runtime configuration rollback is demonstrated.

Do not change the plan status to complete until every checked item has direct,
current evidence. Keep source validation, package publication, app adoption,
deployment, and live-provider acceptance as separate verdicts.

## 19. References checked while planning

- Next.js installed environment guide:
  `apps/web/node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- Google Maps JavaScript API setup:
  https://developers.google.com/maps/documentation/javascript/get-api-key
- Google Maps Platform security guidance:
  https://developers.google.com/maps/api-security-best-practices
- Google Maps JavaScript usage and billing:
  https://developers.google.com/maps/documentation/javascript/usage-and-billing
- OpenStreetMap tile usage policy:
  https://operations.osmfoundation.org/policies/tiles/
- Nominatim usage policy:
  https://operations.osmfoundation.org/policies/nominatim/
- OpenFreeMap service reference:
  https://openfreemap.org/
- MapTiler current pricing reference:
  https://www.maptiler.com/cloud/pricing/

Refresh external references immediately before implementing or enabling a
provider; pricing, limits, required origins, APIs, and terms are not stable
package contracts.
