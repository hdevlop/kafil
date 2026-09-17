# Najm optional provider DX evidence

Date: 2026-09-17

## Outcome

- Najm now derives optional location snapshot and CSP state from one app definition.
- `NajmAppProvider` owns the standard lazy Leaflet/Google runtime and explicit Query opt-in.
- Kafil uses `location: true`; its local resolver, CSP callback, selectors, and wrapper were removed.
- School uses the same flow with its existing Google/Places policy, query client, keyboard extension, and place identity fields.
- Browser and Playwright tests were intentionally not run. The family save/reopen and visual/RTL acceptance items remain open in the plan.

## Released packages

| Package | Version | Purpose |
| --- | --- | --- |
| `najm-next` | `0.7.0` | Optional app integrations, automatic snapshot/CSP resolution, direct provider composition |
| `najm-kit` | `2.15.2` | Neutral location labels and installed lazy map adapter loaders |
| `najm-cli` | `2.2.0` | Updated full-app templates |

Najm source commits: `9c8a24be848e24b61d4733c837fc0c687f0bdbd8` and `e1459befbfed9f6581d96320627a08aa17cd9e8c`.

Registry shasums: `najm-next@0.7.0` `5df25413b5b08e7ab0af77d4b05efcf7dd4df511`; `najm-kit@2.15.2` `4f636a1c058bbb61dcb54d0a76f7f6f4020c99db`; `najm-cli@2.2.0` `0aacddaf883f235aa2db00b77666e0bd21deb578`.

## Validation

- Najm: Kit 1292 tests passed and 14 skipped, RSC 7 passed; Next unit/DOM/RSC suites and both Next 16 production fixtures passed; CLI unit suite, package builds, and public API checks passed.
- Kafil: lint, typecheck, full web/server/seed tests, production build, and `db:generate` were run. No schema migration was produced.
- School: lint completed with three pre-existing `no-img-element` warnings and no errors; 77 dashboard, 1,166 server, and 9 seed tests, localization parity, and the production build passed.
- The Kafil production build exposed the undeclared Google loader edge in `najm-kit@2.15.1`; `najm-kit@2.15.2` corrected the package dependency graph and the build was rerun against the published patch.

## Deliberately pending

- No Playwright or other browser suite was started.
- No manual desktop/mobile, Arabic RTL, keyboard, map error/retry, or family persistence/reopen acceptance was claimed.
- No deployment was performed.
