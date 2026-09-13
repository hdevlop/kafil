# Najm app integration DX — implementation evidence

Date: 2026-09-13

This ledger records shared-package release, Kafil adoption, School adoption,
and future-app CLI scaffolding separately. Per the user's instruction, no
Playwright suite, browser automation, or browser acceptance was run. Visual and
connected acceptance remain user-owned and are not inferred from source tests
or production builds.

## Result

| Boundary | Result | Remaining |
| --- | --- | --- |
| Najm shared packages | Implemented, packed, published, and registry-verified | None for Auth/Kit/Next release candidate |
| Kafil consumer | Published versions adopted; source gate and no-schema-drift gate pass | Manual visual/connected acceptance; consumer commit/push/deploy |
| School consumer | Published versions adopted; source tests, build, i18n, and schema check pass | Manual Google/visual/connected acceptance; consumer commit/push/deploy |
| Najm CLI | Non-destructive generator implemented; three registry-backed Next 16 fixtures pass | CLI version/release is intentionally separate and unpublished |

## Published shared artifacts

All three artifacts came from Najm commit
`ba1fb327e367e8552824e1c6447a2de413631efa` and were verified from the npm
registry after publication.

| Package | Version | Packed SHA-256 | Registry integrity |
| --- | --- | --- | --- |
| `najm-auth` | `4.0.4` | `9b5638eb0296048844c01bee7b6fa6a131cd84d9b0d8aa6673f08db12a45e5a5` | `sha512-559UKeS4TCiT6t5l2GSQtOadXUPTRpYBRxNWhI7C3W9ojMGkuKDsK9JnPFr4CpC2EP+ZhFvnACD1Qh9nluiAeQ==` |
| `najm-kit` | `2.14.0` | `ee1e83a9ab82bab1fa6e9f38340c5972e74b7bbcae5673c9f3a51c51858fbbfd` | `sha512-r4Rq3LU4hMNoAoaG9tSelJBQ1wmjkx2YbOPNJuGnc+X7F+b4aqBlcqGjQKnB2yuih95OVX8dVjlebcwddzbDTg==` |
| `najm-next` | `0.5.0` | `9e874e62281cf3f1e450efaa682506b14a7f14824a45ee926436def8f31224c6` | `sha512-UbY+PsnJsqOXb00WPIc6/mTMX7z+1GMt3GTJmm2PvDnDPTnyOYoZwJi5uThDF6v3lY1oYf1Lt6LTniq4B5zv/A==` |

`najm-auth@4.0.3` was deprecated after its corrected successor `4.0.4` was
published. Shared package tests, builds, API snapshots, packed-artifact checks,
and the relevant Next production fixtures passed before publication.

## Kafil adoption

- Added `src/najm.config.ts` and one module-scope `src/najm.server.ts` bootstrap.
- Composed Auth, Query, UI, Branding, and Leaflet through
  `NajmNextAppProvider` while retaining Kafil's retry and live F8 policies.
- Moved proxy/CSP/reporting, thin preference routes, session accessors, runtime
  location configuration, and Zod client initialization to published owners.
- Removed the obsolete local session/theme/settings/location/CSP/report/query
  helpers and the old Auth patch.
- Exact dependency pins resolve one copy: Auth `4.0.4`, Kit `2.14.0`, Next
  `0.5.0`.

Verified non-browser gate:

| Command | Outcome |
| --- | --- |
| `bun run lint` | Exit 0 |
| `bun run typecheck` | Exit 0 |
| `bun run test` | Web 438 pass; server 408 pass with 77 DB-only skips; seed 90 pass |
| `bun run build` | Next production build passed |
| `bun run db:generate` | No schema changes |
| focused CSP initializer test after final import cleanup | 19 pass, 0 fail |

## School adoption

- Added the shared app definition/server bootstrap and retained authoritative
  auth mode, `sms.remember`, exact preference cookies, School time zones,
  institution-only currency, Keyboard placement, and build-time F8 policy.
- Replaced the custom Google location dialog with `NLocationInput`, retaining
  address/coordinates plus separate Google `placeId` metadata and lazy Places
  loading.
- Preserved the optional catch-all route and all seven HTTP methods.
- Removed duplicate session/theme/settings/preferences/CSP/report/query and
  custom location helper files after their consumers moved.
- Exact dependency pins resolve one copy: Auth `4.0.4`, Kit `2.14.0`, Next
  `0.5.0`; Google loader `2.1.1` replaces the old React Maps dependency.
- Existing notification work and migration `0046` were preserved and were not
  treated as schema drift caused by this migration.

Verified non-browser gate:

| Command | Outcome |
| --- | --- |
| `bun run test:dashboard` | 77 pass, 0 fail |
| `bun run lint` | Exit 0; three pre-existing `no-img-element` warnings |
| `bun run build` | Next production build passed |
| `bun run test:server` | 1,166 pass, 0 fail |
| `bun run test:seed` | 9 pass, 0 fail |
| `bun run i18n:check` | No missing keys; 89 dynamic calls remain for manual review |
| `bun run db:check` | Everything is fine |
| focused CSP initializer test after final import cleanup | 7 pass, 0 fail |

## Future-app CLI scaffolding

The existing `najm init next` command now previews one integration plan and
asks independently about Auth, Theme, and disabled/Leaflet/Google location. It
generates the shared-safe config, server-only binding, client providers, static
proxy matcher, strict-CSP initializer, root layout, API catch-all, CSP report
route, and preference routes where Kit is enabled.

- Conflicting existing files abort before any write or package installation.
- Exact reruns classify every file as unchanged and write nothing.
- Generated paths reject absolute paths and traversal.
- No real secret or database-reset action is generated.
- Optional SDKs remain profile-local: Leaflet builds without Google's loader;
  Google builds without Leaflet; the minimal profile installs neither Auth,
  Theme, Kit, Query, nor a map SDK.

Verified non-browser gate:

| Command | Outcome |
| --- | --- |
| `bun run --cwd packages/najm-cli test` | 23 pass, 0 fail |
| `bun run --cwd packages/najm-cli build` | Exit 0 |
| `bun run --cwd packages/najm-cli test:next16` | Minimal, Leaflet, and Google disposable projects installed from registry and passed Next 16 production builds |

The CLI source remains at `2.0.2` in the Najm working tree. It was not packed or
published; a future CLI release needs its own reviewed commit, artifact, and
registry evidence.

## Wiring reduction

The count is deliberately limited to retired integration helpers and their two
replacement setup modules; it is not presented as a whole-application LOC
claim.

| Consumer | Retired helper inventory | Replacement setup inventory | Old helper imports |
| --- | --- | --- | --- |
| Kafil | 7 files / 259 lines | 2 files / 142 lines | 22 → 0 |
| School | 9 files / 417 lines | 2 files / 126 lines | 20 → 0 |

Kafil intentionally retains app-owned `auth.ts`, preference policy, domain
labels, retry/F8 policy, and the feature-facing provider binding. School keeps
the same kinds of app policy plus its keyboard extension, institutional
settings projection, and lazy Google Places adapter.

## Rollback boundary

- Do not unpublish shared npm versions. A consumer rollback pins its previous
  exact versions and restores its retired helpers from that consumer's prior
  reviewed revision.
- Roll Kafil and School back independently; never reset School's unrelated
  notification work or migration `0046` as part of this integration rollback.
- No schema migration belongs to this integration. A source rollback therefore
  requires no database down migration.
- A provider incident can be contained through the app-owned runtime location
  setting (`*_LOCATION_MAP_PROVIDER=disabled`) followed by the normal process
  restart, without changing shared package code.

## Acceptance and rollout boundary

Unverified by design: browser navigation/recovery, responsive and Arabic RTL
interaction, production hydration in the real apps, real Google availability,
location save → fresh read → reopen, live settings refresh, and deployed
runtime/CSP consistency. No consumer or CLI commit, push, image build,
deployment, or live revision verification was performed in this continuation.
