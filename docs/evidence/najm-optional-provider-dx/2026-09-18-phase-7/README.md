# Najm optional provider DX phase 7 evidence

Date: 2026-09-18

## Outcome

- Najm Kit now owns the status vocabulary end to end: thirteen added lifecycle,
  payment and attendance tokens, an en/fr/ar/es label for every packaged status,
  a conventional `status.<token>` catalog lookup, the provider-supplied active
  language, and soft/pill as the status-badge appearance default.
- `najm-kit/format` exports `formatStatusLabel` and the rest of the resolver, so
  plain text and badges cannot drift. The leaf stays server-safe: the built
  `format.mjs` imports no React and creates no context, proven under the
  `react-server` condition.
- Kafil deleted `KAFIL_BADGE_DEFAULTS`, `statusTranslationKeys` and
  `getStatusTranslationKey`. `AppProviders` forwards no badge policy. Its
  `formatStatusLabel` is now a four-line binding that hands the shared resolver
  the app translator.
- Kafil's own wording is preserved through the catalog convention rather than a
  sixteen-entry map. `in_preparation` still reads "Purchasing and preparation"
  in English and "Achat et préparation" in French.
- Statuses Kafil never declared — `completed`, `draft`, `overdue`,
  `partially_paid`, `present` — are now translated in all four languages
  instead of rendering as humanized English.
- School adopted the release unchanged, keeping its own color map, its
  camelCase catalog keys and its business semantics.
- Browser, Playwright, deployment and live acceptance were **not** run and are
  not claimed. The configured Playwright and Chrome DevTools MCP servers failed
  to connect for this session.

## Package source and artifacts

Najm source commit: `d36db8668129805c8fa0561dfc03e8d086449300`

Packing commit: `bb512f9eea0447fde392939b0bef387ddc5ec725`

| Package | Version | Tarball SHA-256 | Registry shasum |
| --- | --- | --- | --- |
| `najm-kit` | `2.16.0` | `46aa2962a1429e275c5d4ed9a914834a4bb285830fd463a0b2b6809e66e98030` | `8d434173bbf8676b09c9432f532ceb86255cd25d` |

Registry integrity:
`sha512-8yI5jnOo/WkrY2bN7IdCkiX8rPdSjv/61oKnuQRHUX4krV+puWCsnumL0THmjhycIm1mibH+ddeM94BUdNcLAQ==`

The exact packed tarball was published; the sidecar names the packing commit.
Registry integrity, shasum and canonical tarball URL were fetched and verified
independently after publication.

## Shared validation

- `najm-kit`: lint (source and test typecheck) passed; 1,323 tests passed, 14
  skipped, 0 failed across 135 files; 9 RSC tests passed; the Next 16 production
  consumer fixture passed; the public API snapshot is current and additive only.
- 26 new rendering and resolution tests cover override precedence, regional
  locale fallback, live language switching without a remount, unknown statuses,
  missing translations, standalone badges with no provider, appearance defaults,
  and two provider trees keeping separate policies and languages.
- The built `dist/format.mjs` and its chunk were inspected: no React import, no
  `createContext`, and the four-language table present.

## Consumer validation

- Kafil installed `najm-kit@2.16.0` and passed lint, typecheck, all web, server
  and seed tests (459 web, 422 server with 83 skipped, 90 seed), and its Next.js
  production build. `db:generate` reported no schema changes and produced no
  migration.
- School installed the same release and passed lint with its three existing
  `no-img-element` warnings, all 77 dashboard tests, and its Next.js production
  build.

## Version and migration policy

`2.16.0` is a minor release. The vocabulary, labels, catalog convention and
`najm-kit/format` exports are additive, but soft and pill becoming the default
for status badges is an observable appearance change for any application that
configured neither. Such an application restores the previous look with
`badgeDefaults={{ look: 'solid', shape: 'default' }}`. Content badges are
unaffected, and an explicit or provider `look`/`shape` still wins.

School is the affected consumer: it supplied a color map and label keys but no
look or shape, so its badges now render soft pills. That is the intended new
default and was left in place.

## Incidental fixes

- `apps/playground/tsconfig.json` in the Najm repository aliased bare `najm-kit`
  to `src/index.ts` while `najm-kit/app` and `najm-kit/next` still resolved to
  `dist`. The package therefore loaded as two module trees and every React
  context existed twice, so provider-supplied badge defaults reached no badge in
  that harness. Measured by comparing module-scope identities between the
  writing provider and the reading consumer. The aliases were removed. No Kit
  packaging change was needed, and neither Kafil nor School was ever affected.
- `packages/server/src/locales/ar.json` was missing `ui.status.expired`, so
  Arabic fell back to the English "Expired" and shadowed the packaged Arabic
  label. The key was added.

## Separate boundaries

- Package source and release: committed in Najm, published and verified.
- Kafil and School source adoption: validated and uncommitted.
- Git push and deployment: not performed.
- Browser/manual acceptance: not performed and not claimed.
