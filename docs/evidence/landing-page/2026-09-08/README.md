# Landing page evidence — 2026-09-08

Slices: close the earlier carousel/artwork review findings, then align the
implemented landing page with the user-supplied `landing.png` reference while
preserving truthful claims, localization, accessibility, and real routes.

> Historical record: the carousel correction and screenshots below describe
> the 2026-09-08 deployed revision. A 2026-09-09 refinement subsequently
> replaced the carousel with a static locale-aware hero and removed its
> generated slide assets. These screenshots are not acceptance evidence for
> the current static-hero revision.

Current revision proof (2026-09-09): the two corrected browser work units
passed 2/2, then the complete focused `landing.e2e.ts` spec passed 11/11 in
6.1 minutes. The runner removed its isolated users.

## Family-carousel correction

- Replaced the abstract rice/oil slide with a distinct fictional family scene
  for English, French, and Arabic, and replaced both abstract Spanish slides
  with two family scenes.
- New cache-busted manifest paths:
  `hero-family_en-02-v2.png` (`541fd0cd0def`),
  `hero-family_fr-02-v2.png` (`98c210ec7107`),
  `hero-family_ar-02-v2.png` (`d897f8d1470d`),
  `hero-family_es-01-v2.png` (`54426e47029d`), and
  `hero-family_es-02-v2.png` (`6b228dd10e9f`). Every file is 1448 × 1086,
  text-free, and generated for this project with OpenAI Imagegen.
- Removed the five superseded abstract assets and
  `apps/web/scripts/generate-landing-hero-slides.mjs`, which would have
  regenerated them. Added a source regression that rejects their known hashes.
- Updated localized image descriptions in English, French, Arabic, and Spanish.
- Added a browser assertion that manually selects slide 2 in every locale,
  verifies its localized alt text, cache-busted URL, and successful decode, and
  captures the four carousel screenshots listed below.
- Focused source result: 33 pass, 0 fail, 1728 expects. The corrected
  four-locale browser range passed 4/4 (3.3m). The complete affected landing
  spec then passed 17/17 (13.2m), with no unexpected diagnostics.

## Earlier changed files (superseded asset slice)

- `apps/web/scripts/generate-landing-hero-slides.mjs` — en/fr/ar slide 2 is
  now separate synthetic locale-pure artwork (headline + goods panel) instead
  of a detail crop; Spanish generation output is byte-identical.
- `apps/web/public/hero/hero-family_en-02.png` (`1481c1e78e05`, 100901 B),
  `hero-family_fr-02.png` (`31ffcf2c9215`, 102810 B),
  `hero-family_ar-02.png` (`efef29bc9470`, 86711 B) — regenerated, 1448x1086.
  Untouched: `hero-family_{en,fr,ar}.png` bases, `hero-family_es{,-02}.png`
  (`f0cf77a5dea3`, `5c70deb3f135`), `hero-family-neutral.webp`
  (`878419185b25`).
- `apps/web/public/hero/README.md` — slide-2 rows, generation record, and a
  two-class provenance section (project-owned synthetics cleared; three
  legacy bases explicitly on hold).
- `apps/web/public/mascots/README.md` — provenance marked as an explicit
  hold blocking final acceptance.
- `apps/web/src/features/Landing/components/LandingHeroCarousel.tsx` —
  removed the raw-path `new Image()` probe; the next slide is now warmed
  through the same `NNextImage` optimizer at low priority in a hidden
  `aria-hidden` sibling outside the carousel region.
- `apps/web/test/landing-feature.test.ts` — comment only (crop wording).
- `LANDING-PAGE-PLAN.md` — status line and section 14 evidence record.

## Reference-alignment continuation

- The large standalone how-it-works section was removed. Its real
  `#how-it-works` navigation target now belongs to the compact five-cell proof
  strip, placing the family grid immediately below it like the reference.
- Hero, header, family section, CTA mascot banner, and footer spacing were
  tightened. Family actions use outlined controls and the cards retain their
  visible illustrative disclosure rather than copying the reference's
  unsupported Verified claims or numeric impact totals.
- Eight distinct fictional 1448 × 1086 family illustrations were generated
  with OpenAI Imagegen from the supplied image's visual direction. Exact
  provenance, exclusions, dimensions, and hashes are recorded in
  `apps/web/public/landing/README.md`.
- The previous eight unused 800 × 600 solid-color placeholder WebPs were
  removed after confirming no source or test references remained.
- `LandingHeroCarousel` now de-duplicates a transient outgoing/current layer
  during rapid reverse navigation, with a DOM regression test.

## Verification (exact commands, 2026-09-08)

| Command | Result |
|---------|--------|
| `bun test test/landing-feature.test.ts test/landing-hero-carousel.test.tsx test/landing-hero-carousel-dom.test.tsx` (in `apps/web`) | 33 pass, 0 fail, 1720 expects |
| `$env:KAFIL_E2E_FILES='test/e2e/landing.e2e.ts'; bun run test:e2e` (in `apps/web`) | 17 pass, 0 fail (13.2m); isolated users prepared and removed |
| `bun run lint` (root) | exit 0 (web, server, seed) |
| `bun run typecheck` (root) | exit 0 (web, server, seed) |
| `bun run test` (root) | web 430 pass / 0 fail (61 files); server 400 pass / 77 skip / 0 fail (52 files); seed 89 pass / 0 fail (16 files); exit 0 |
| `bun run build` (root) | success, 44 static pages |
| `bun run db:generate` (root) | "No schema changes, nothing to migrate" |
| `bun run test:db` (root) | 55 pass, 0 fail across 13 PostgreSQL integration files |
| Focused affected browser rerun (`landing static content|landing responsive layout|Arabic RTL mirrors`) | 6 pass, 0 fail; screenshots regenerated after final card styling |

## Separate boundaries

- The complete default E2E runner was attempted and interrupted after repeated
  unrelated pre-existing selector/readiness failures in applicant decision,
  family create wizard, family order limits, and funding-cap specs. Its
  isolated users were removed. The focused landing work unit independently
  passes all 17 tests.
- Git publication, deployment, and read-only production verification were
  separately authorized on 2026-09-08 and are reported below, apart from local
  source and browser acceptance.

## Remaining final-acceptance blockers

1. Legacy hero bases `hero-family_{en,fr,ar}.png`: origin/license unrecorded
   (see `apps/web/public/hero/README.md`).
2. All five `public/mascots/*.png`: origin/license unrecorded
   (see `apps/web/public/mascots/README.md`).

## Browser artifacts

- `landing-en-375px.png`
- `landing-en-1440px.png`
- `landing-ar-rtl-1440px.png`
- `landing-en-carousel-family-02-1440px.png`
- `landing-fr-carousel-family-02-1440px.png`
- `landing-ar-carousel-family-02-1440px.png`
- `landing-es-carousel-family-02-1440px.png`

## Publication and production evidence

- Implementation commit: `4220079f828ac893e5f8f45560758144d8fb832f`,
  pushed to `origin/main`.
- GitHub Actions run `34261680802`: Verify passed, GHCR image publication
  passed, and the Dokploy trigger passed.
- Dokploy recreated the app and notifications worker together at
  `2026-09-08T18:20:49Z`; both became healthy on image ID `ed4d6f4…` with the
  exact OCI revision above. Their ports remain internal-only. Redis and
  Postgres are healthy; five notification tables exist and migration `0045`
  is recorded.
- Public read-only checks: root, login, liveness, readiness, one generated
  family illustration, one localized hero image, and the CTA mascot returned
  HTTP 200. The new English title, family section, and illustrative disclosure
  are present; the former headline is absent.
- The committed security-header verifier passed the public root and health
  endpoint. No authenticated production mutation was performed.
