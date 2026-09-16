# Najm application provider unification - source validation

Date: 2026-09-16

This pre-release record is superseded for publication and consumer status by
`release-and-adoption.md`; its source-candidate results remain historical
evidence for the implementation commit.

## Repository baseline

| Repository | Branch | Revision before implementation | Baseline worktree |
| --- | --- | --- | --- |
| Kafil | `main` | `8bd141a43bd9a6b804e4fa356832f2bd54099bf8` | Existing `AppProviders.tsx`, plan-index, and untracked plan edits preserved |
| Najm | `master` | `a531ff17224b680059418abc00ed68ec69af87fb` | Existing app-integration, Kit, Next, Query, and CLI generator work preserved and extended |
| School | `feat/trusted-proxy-rate-limit-hardening` | `df380b92642dfa09116dc956f989d6be016d4037` | Clean; left unchanged because it accepts published exact Najm versions only |

Kafil and School both currently pin `najm-auth@4.0.4`, `najm-kit@2.14.0`,
`najm-next@0.5.0`, and `najm-theme@0.2.1`. Those published packages do not yet
contain the direct provider added by this source candidate.

The local release candidates are `najm-kit@2.15.0`, `najm-next@0.6.0`, and
`najm-cli@2.1.0`. They have not been published or installed persistently into
either consumer.

## Implemented source candidate

- `najm-next/app/client` exports a direct `NajmAppProvider` accepting
  `authClient`, `snapshot`, Query policy or `false`, typed location integration,
  extensions, Kit UI props, and children.
- Direct and compatibility-factory paths delegate provider ordering and Query
  ownership to `NajmNextAppProvider`.
- Stable internal bindings survive fresh integration/props objects and snapshot
  updates. Each mount owns its Query client. Auth-client and Query lifetime
  changes fail with a remount-required error.
- `najm-kit/app` exports `NajmKitProvider`, `NajmKitProviderProps`, and
  `NajmKitSnapshot`; the old names remain deprecated aliases to the same
  component implementation.
- CLI full profiles emit the direct provider. Minimal/partial profiles retain
  the optional-dependency-free low-level composer and no-overwrite behavior.
- Playground now uses the direct provider, with compiled minimal, Leaflet, and
  Google/keyboard examples documented in `apps/playground/PROVIDER-EXAMPLES.md`.
- Kafil now seeds map labels from `getNajmLocationLabels(language)`. Exact
  four-locale comparison removed only the equivalent Close, Cancel, and Zoom
  in keys; family-specific and textually different localized overrides remain.
  Leaflet-only loading and `geocoder={null}` are unchanged.

## Non-browser validation

All commands below completed successfully:

### Najm

- `bun run --cwd packages/najm-next typecheck`
- `bun run --cwd packages/najm-next build`
- `bun run --cwd packages/najm-next test`
  - source/static suites passed;
  - the isolated happy-dom rerender suite passed;
  - the React-server suite passed under `react-server` conditions.
- `bun run --cwd packages/najm-next test:next16`
  - CSP/proxy fixture passed;
  - app/server fixture passed and built the new `/direct` full-provider route.
- `bun run --cwd packages/najm-kit lint`
- `bun run --cwd packages/najm-kit test` (`1292` DOM/source tests and `7`
  React-server tests passed; only the suite's pre-existing conditional skips
  remained).
- `bun run --cwd packages/najm-kit build`
- `bun run --cwd packages/najm-kit test:next16` passed.
- `bun run --cwd packages/najm-cli test` (`23` tests passed).
- `bun run --cwd packages/najm-cli build` passed.
- Packed-candidate Next 16 fixtures passed for minimal, Leaflet, and Google
  profiles using the actual `najm-next@0.6.0` and `najm-kit@2.15.0` tarballs.
  The Google dependency install used Bun's offline cache after the online
  resolver stalled; its production build then passed.
- The packed `najm-cli@2.1.0` executable loaded successfully and exposed the
  `init next` integration command.
- `bun run api:check` reported the public API snapshot current.
- `bunx tsc --noEmit -p apps/playground/tsconfig.json` passed.
- `bun run --cwd apps/playground build:next` passed after proving the locale
  definition remains on the server side of the client boundary.

### Kafil

- `bun test packages/server/test/locale-parity.test.ts` passed (`5` tests,
  `9812` assertions).
- `bun run check` passed lint, typecheck, web/server/seed tests, and the
  production Next build.
- `bun run db:generate` reported no schema changes and created no migration.

## Intentionally pending

- No Playwright, in-app browser, Chrome DevTools, or other browser acceptance
  was run, per the implementation request.
- Candidate versions were assigned and tarballs were packed locally. No package
  was published, committed, pushed, or deployed.
- Kafil and School were not changed to import an unpublished API. Their direct
  provider adoption, package pins/lockfiles, architecture assertions, and
  consumer acceptance must follow an authorized Najm package release.
- CLI registry-artifact generation/build checks remain pending until those
  package versions exist in the registry; packed-artifact checks passed.

## Candidate artifacts

Artifact directory: `C:\Users\hdevlop\Desktop\najm-provider-unification-candidates`

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `najm-cli-2.1.0.tgz` | 99,796 | `09C1211D2350CFBDDAC90E7A9B5056EDB1E206AA821862341A0376AD3E89C3BE` |
| `najm-kit-2.15.0.tgz` | 391,337 | `4C764ACAC3287A8A7ECD69216976BA2493280E8DE6B8991674849CEED1F25CDB` |
| `najm-next-0.6.0.tgz` | 44,455 | `F0BE1A813E09A62B8D541B001B25F6AFCF5E673E338D8EA38F7FBE721F9974D1` |
