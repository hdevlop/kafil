# Najm optional provider DX phase 6 evidence

Date: 2026-09-17

## Outcome

- `NajmAppDefinition` now accepts validated `appName` and `currency` display
  defaults and projects only those values through `snapshot.app`.
- The direct full `NajmAppProvider` now mounts one stable Query client when its
  `query` prop is omitted. It accepts a custom integration but rejects the old
  `false` and boolean activation forms; lower-level composition still supports
  applications without Query.
- Kafil declares its app name and MAD currency once in `kafilApp`. Its client
  provider retains the auth client, translation catalog, badge defaults, and
  snapshot without repeating display or Query activation props.
- School declares its product name in its app definition, keeps its custom
  Query retry/cache policy, and continues to take institution-owned currency
  from the preferences snapshot.
- Browser, Playwright, deployment, and live family persistence acceptance were
  outside this continuation and were not run.

## Package source and artifacts

Najm source commit: `48ccf419847a0723a481d0e693c18afa23c9e78f`

| Package | Version | Tarball SHA-256 | Registry shasum |
| --- | --- | --- | --- |
| `najm-kit` | `2.15.3` | `42ed9d6b09f782b09bbf85c1fd8a9b9240d3e912058fbe78357280c25e4a36ce` | `6d1600e714c1a9d6c78ed5f97fb8bedce71e6470` |
| `najm-next` | `0.8.0` | `6599dd195daaaf8e62b0be59ab6bb2b9ab06cc774133e29171405390725a74c1` | `8952317e4b6ac0b6d330635371fe56966fa9db7c` |
| `najm-cli` | `2.3.0` | `d9901c759f2fd21cbce185d4a53e55170cbcd82b2dad5fe2a62bc0ffcadf7d2f` | `1759e49f9d32c886da3a4384b0ac158f978a4c0d` |

Each artifact has a sidecar naming the same source commit. The exact tarballs
were published to npm in dependency order. Independent registry verification
matched the published integrity, shasum, and canonical tarball URL for every
version.

## Shared validation

- `najm-kit`: lint passed; 1,293 tests passed, 14 skipped, 0 failed; seven RSC
  tests passed; the Next 16 production consumer fixture passed.
- `najm-next`: 139 unit tests passed and six skipped; three DOM and seven RSC
  tests passed; CSP/proxy and app/server Next 16 production fixtures passed.
- `najm-cli`: 23 tests and build passed.
- Public API snapshots passed.
- Exact packed candidates passed generated minimal, Leaflet, and Google Next
  16 production builds.

## Consumer validation

- Kafil installed the registry releases and passed lint, typecheck, all web,
  server, and seed tests, and its Next.js production build. `db:generate`
  reported no schema changes and produced no migration.
- School installed the registry releases with one resolved version per
  workspace. Lint passed with its three existing `no-img-element` warnings,
  all 77 dashboard tests passed, and its Next.js production build passed. The
  build retained the existing `najm-chatbot/pg` deprecation notice.

## Requirement traceability

- `DX-06`: app display defaults are allowlisted into the public snapshot;
  explicit props and legacy snapshots retain deterministic precedence.
- `DX-07`: no currency is inferred. Kafil imports a dependency-free currency
  constant leaf, while School retains snapshot preference currency.
- `QUERY-01`: omission creates one stable default Query client per provider.
- `QUERY-02`: custom Query policy and isolated app instances are covered.
- `QUERY-03`: direct-provider `false` is rejected at type/runtime boundaries;
  the lower-level no-Query path remains supported.
- `PKG-01`: minimal, Leaflet, and Google generated production fixtures passed
  against the exact packed artifacts.

## Separate boundaries

- Package source: committed in Najm.
- npm publication: complete and independently verified.
- Kafil and School source adoption: validated and uncommitted.
- Git push and deployment: not performed.
- Browser/manual acceptance: not performed and not claimed.
