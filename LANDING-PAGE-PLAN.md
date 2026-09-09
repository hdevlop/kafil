# Landing page plan — Kafil adaptation of the SadaqaHub mockup

Status: **DEPLOYED — the 2026-09-09 static-hero refinement passes focused browser acceptance, repository gates, publication, live revision verification, and read-only production checks. Final asset-provenance acceptance remains on hold for three legacy hero bases and five mascots, and the unrelated complete legacy E2E suite is not green.**

> **2026-09-09 implementation override:** the refinement replaces the carousel
> with one static, locale-aware 4:3 hero image. This supersedes the
> carousel-specific design, timing, controls, tests, and acceptance requirements
> retained below as historical planning context. The current contract is
> `LandingHeroImage`, one manifest entry per locale, no timer or carousel
> controls, and a text-free project-generated Spanish family illustration.

Source mockup: `C:\Users\hdevlop\Desktop\landing.png` (hero, trust strip,
family-card grid, CTA, and footer). The mockup is a visual reference only; it is
not an implementation asset or a source of factual Kafil statistics.

Target: rebuild the public `/` route under `apps/web/src/app/(landing)/`, with
Kafil branding, four-language localization, responsive behavior, dark mode,
and Arabic RTL.

This is a task-specific root plan indexed by `docs/plans/README.md`. It is not
the project roadmap and must not create a root `PLAN.md`.

## 1. Phase boundary and confirmed decisions

### Phase A — current implementation scope

- Build a static, localized landing page with no new API, database table,
  migration, email workflow, or external service.
- Use images under `apps/web/public/hero/` for a locale-aware hero carousel.
  Select a slide list from the active UI language, and rotate only within that
  language every 5 seconds. Never cycle English, French, Arabic, and Spanish
  artwork together as if language variants were different slides.
- Reuse the text-free artwork under `apps/web/public/mascots/` across locales.
  `mascot-heart-gift.png` replaces the mockup's yellow hands icon in the CTA
  banner. Mascots support the surrounding message; they do not replace real
  headings, copy, labels, or accessible names.
- Render the first locale-matched slide deterministically, then start rotation
  after hydration. If the active locale has fewer than two valid slides, show
  its first slide statically and hide carousel controls rather than falling
  back to artwork containing another language.
- Use only destinations that exist in Phase A: `/`, `/apply`, `/login`, and
  the in-page anchors `#families`, `#how-it-works`, and `#contact`.
- Preserve the mockup's eight-card visual rhythm with fictional, visibly
  labelled **illustrative family profiles**. They are examples of how support
  is presented, not registered Kafil families and not claims about current
  beneficiaries.
- Do not publish invented counts such as verified-family, order, or partner
  totals. The five-cell trust strip uses qualitative product guarantees such
  as reviewed eligibility, tracked orders, approved procurement, goods-based
  support, and privacy-first reporting. Phase A renders no percentages or
  operational totals without separately recorded product evidence.
- The family-card action leads to `/apply`; there is no public family-detail
  route in Phase A. “View all” scrolls to `#families` or is omitted when it
  would be redundant.
- The footer contains only real routes, in-page anchors, and verified external
  contact/social destinations. Do not render `#` placeholders or links to
  absent `/families`, `/catalog`, `/contact`, legal, careers, or social pages.
- Do not render a newsletter form in Phase A. A fake success toast, client-only
  email collection, or unowned submission is forbidden.

### Deferred Phase B — separately authorized work

Phase B is not required to close Phase A. It may add one or more of:

1. A privacy-safe, read-only public family-preview endpoint and public detail
   routes.
2. Truthful aggregate statistics derived from an explicitly reviewed source.
3. Newsletter subscription backed by a named provider or Kafil-owned endpoint.

Load `.agents/skills/kafil-najm-backend/SKILL.md` before Phase B. Define DTOs,
authorization/public access, privacy projection, rate limiting, consent,
idempotency, duplicate handling, retention/deletion, audit behavior, provider
failure semantics, and acceptance tests before implementation. Guardian CIN,
precise address, documents, private notes, contact details, and sensitive
household data must never appear in public/sponsor payloads, logs, analytics,
or outbox metadata.

## 2. Mandatory skills and authoritative contracts

Read completely and follow throughout:

1. `.agents/skills/kafil-najm-frontend/SKILL.md` for all Phase A work.
2. `.agents/skills/kafil-playwright-testing/SKILL.md` before changing or
   running the landing E2E, runner, or browser evidence.
3. `.agents/skills/kafil-najm-backend/SKILL.md` only when an authorized Phase B
   slice touches backend, seed, storage, or database behavior.

Also re-read root `AGENTS.md`, this plan, and the relevant Next.js 16 guides
under `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/` for
layouts/pages, linking/navigation, server/client components, images, and
metadata.

Installed declarations are authoritative:

```text
node_modules/najm-kit/README.md
node_modules/najm-kit/dist/index.d.ts
node_modules/najm-kit/dist/adapters/next.d.ts
apps/web/node_modules/najm-theme/dist/react/index.d.ts
apps/web/node_modules/najm-auth/dist/**/*.d.ts
```

Do not invent exports or props from memory. Current verified details include:

- `NNextImage` uses `fallbackSrc`, not `fallback`.
- `NSection` requires an icon and title and is a card-like information surface;
  it is not the generic wrapper for every editorial landing section.
- `NPageLayout` is the page frame; semantic `header`, `main`, `section`, `nav`,
  `ul`, headings, paragraphs, and footer structure remain native HTML.
- `NThemeImage` requires an explicit slot and alt text. Header and footer use
  `slot="sidebarLogoExpanded"`; decorative art uses `alt=""`.
- `NNextImage` accepts public string paths when explicit dimensions are
  supplied. The currently inspected hero images are 1448 × 1086 (4:3).

## 3. Verified current state

- `apps/web/src/app/(landing)/page.tsx` and `layout.tsx` are thin route files;
  localized page content and shared landing chrome live under
  `apps/web/src/features/Landing/`.
- Public application and sign-in routes exist at `/apply` and `/login`.
  Public `/families`, `/catalog`, `/contact`, and public family-detail routes do
  not exist, so Phase A uses verified in-page anchors and the two real routes.
- There is no newsletter API/client/provider in Kafil.
- `AppProviders` already mounts `NajmAppProvider` and the single
  `NThemeBrandingProvider` with `KAFIL_BADGE_DEFAULTS`, Kafil currency, and the
  four-language UI catalog.
- `apps/web/scripts/run-phase6-e2e.ts` includes `landing.e2e.ts` in its explicit
  default spec list, and `KAFIL_E2E_FILES=test/e2e/landing.e2e.ts` supports a
  focused work-unit run through the same managed runner.
- `apps/web/public/hero/` contains two documented 1448 × 1086, locale-pure
  family illustrations for each of English, French, Arabic, and Spanish plus a
  language-neutral fallback. English, French, and Arabic slide 2 plus both
  Spanish slides are text-free project-generated family scenes. Their versioned
  filenames prevent a stale optimized-image cache from restoring the rejected
  abstract product panels. Origin/license records for the three legacy first
  slides remain unresolved and block final asset acceptance.
- `apps/web/public/mascots/` already contains five 1122 × 1402 transparent PNGs:
  `mascot-grocery-basket.png`, `mascot-heart-gift.png`, `mascot-idea.png`,
  `mascot-thumbs-up.png`, and `mascot-waving.png`. They contain no language
  text and may be shared by all locales. The CTA uses the heart-gift mascot, but
  the assets' source/license record still needs to be documented before final
  acceptance.

## 4. Target information architecture

The route layout owns `LandingHeader` and `LandingFooter`. `LandingPage` owns
only the main sections, preventing duplicate chrome.

| # | Surface | Phase A content and destinations |
|---|---------|----------------------------------|
| 0 | Header | Kafil mark via `NThemeImage slot="sidebarLogoExpanded"`; Home → `/`; Family examples → `#families`; How it works → `#how-it-works`; Contact → `#contact`; language selector; theme toggle using the existing preference contract; Sign in → `/login` |
| 1 | Hero | Localized eyebrow, H1 “Transparent giving. Real goods. Real impact.”, paragraph, Sponsor a family → `/apply`, See examples → `#families`, trust row, and a locale-matched Kafil family/groceries carousel sourced from `/hero/*` |
| 2 | Compact proof strip | Five qualitative guarantees in one shallow bordered surface; it owns the real `#how-it-works` navigation target without adding a separate tall section; no fabricated operational totals |
| 3 | Family examples | Eight fictional illustrated cards immediately below the proof strip under a visible “Illustrative examples” disclosure; each card has a neutral Example badge, fictional name/city, members, illustrative monthly need in integer MAD minor units, and Apply to sponsor → `/apply` |
| 4 | CTA banner | `mascot-heart-gift.png` in place of the mockup's yellow hands icon; “Be the reason a family smiles.”; Sponsor a family → `/apply`; See families → `#families` |
| 5 | Footer | Kafil mark/tagline, existing routes and in-page anchors only, a `#contact` region with localized guidance and `/apply`/`/login` actions (plus a contact address only if verified from configuration), and copyright; newsletter/social/legal controls are omitted until their destinations are real |

Authenticated presentation may replace Sign in with a verified existing
dashboard destination after inspecting the installed Najm Auth/session
contract. UI gating is presentation only; backend authorization remains
authoritative. Do not fork role-specific landing pages.

## 5. Najm Kit and semantic component map

Use Najm Kit for interactive controls and available visual primitives. Native
HTML is correct for document semantics and content for which no Kit primitive
exists.

| Surface | Required approach | Forbidden |
|---------|-------------------|-----------|
| Page frame | `NPageLayout as="main"`; use its published gutter/gap behavior and deliberate full-bleed sections only where the mockup needs them | an unrelated ad-hoc page container |
| Document structure | Native `header`, `footer`, `section`, `nav`, `ul`, headings, and paragraphs; `NSectionHeader` where its composition fits | forcing card-like `NSection` onto every editorial section |
| Links/actions | `NButton asChild` with Next `Link`; `IconButton`/`NButton size="icon"` for icon-only controls | styled raw buttons or anchor pills |
| Header preferences | Reuse or extract the existing language/theme preference behavior into a shared control; preserve async persistence, pending state, accessible names, and localized errors | a second persistence mechanism or duplicated raw controls |
| Trust strip | `NStatCard` using truthful qualitative values, or `NCard` + `NCardInfo` when the editorial cell does not fit `NStatCard` | invented counts |
| Family example | `NCard`, `NCardMedia`, `NCardInfo`/`NDetailList`, `NBadge` with an explicit localized Example label and neutral semantic color | `status="verified"` or real-family wording for fictional data |
| Family art | `NNextImage` from `najm-kit/next` with `width`/`height` or `fill` + `sizes`, plus `fallbackSrc`; use `getPersonImage({ role: "family" })` only as an intentional fallback | raw `<img>`, layout-shifting images, or unlabelled real-person photography |
| Hero carousel | `LandingHeroCarousel` composed from `NNextImage`, `NButton size="icon"`, and semantic status/control markup; use a stable 4:3 box, `fill`, responsive `sizes`, and `fallbackSrc`; only the initial LCP slide is `priority` | a third-party carousel, raw `<img>`, mixed-language rotation, or remounting the entire hero copy every five seconds |
| CTA mascot | `NNextImage` with the existing 1122 × 1402 intrinsic ratio, responsive `sizes`, `object-contain`, and lazy loading inside a logical CSS grid | rebuilding the yellow hands icon, a raw `<img>`, stretching/cropping the mascot, or marking below-fold art as `priority` |
| Lists | Semantic `ul`/`li` with Lucide icons in the verified `NIconSource` shape; `NDetailList` only when its label/value contract fits | emoji/string icons |
| Grid | `NGrid` + `NGridItem` with verified breakpoint props | duplicated arbitrary grid systems |
| Feedback states | `NLoadingState`, `NEmptyState`, or `NErrorState` only for a future live-data slice | fake loading/error states for static content |
| Overlays | `NDialog`/`NSheet` only if a separately scoped interaction requires one | hand-built modals |

Fix a genuinely missing reusable primitive in Najm Kit itself. Do not add a
Kafil-local copy of shared behavior.

### Hero carousel behavior

- `heroSlidesByLanguage` is a typed
  `Record<KafilLocale, readonly HeroSlide[]>` in
  `config/landingHeroSlides.ts`. Every slide declares `id`, `src`,
  `fallbackSrc`, intrinsic `width: 1448`, `height: 1086`, and a localized
  accessibility description key. Do not discover files dynamically in the
  browser or construct paths from unchecked locale input.
- Use `/hero/hero-family-neutral.webp` as the first-slide fallback because it
  contains no embedded language. Later slides may fall back to their own
  locale's first slide. A fallback must never display text from another locale.

The manifest shape is explicit and reviewable:

```ts
const heroSlidesByLanguage = {
  en: ["/hero/hero-family_en.png", "/hero/hero-family_en-02-v2.png"],
  fr: ["/hero/hero-family_fr.png", "/hero/hero-family_fr-02-v2.png"],
  ar: ["/hero/hero-family_ar.png", "/hero/hero-family_ar-02-v2.png"],
  es: ["/hero/hero-family_es-01-v2.png", "/hero/hero-family_es-02-v2.png"],
} as const satisfies Record<KafilLocale, readonly string[]>;
```

The actual `HeroSlide` objects add IDs, dimensions, fallbacks, and translation
keys; the abbreviated example above fixes the locale-to-path contract.
- Resolve the active list directly from `useTranslation().language`. Reset to
  slide 0 when language changes; do not carry an index from a longer language
  list into a shorter one.
- Keep hero heading, copy, CTAs, and trust content stable. Rotate only the image
  frame so the user can read and operate the hero without content moving under
  them.
- When two or more slides exist, advance to the next slide after 5,000 ms of
  fully visible time and wrap at the end. Use one cleanup-safe, resettable timer;
  do not accumulate intervals during re-renders or React Strict Mode.
- Pause automatic rotation while the document is hidden, the carousel is
  hovered, keyboard focus is inside it, or the user has pressed Pause. Resume
  from the current slide with a fresh five-second interval; never “catch up” by
  skipping slides.
- Provide localized Previous, Next, and Pause/Play icon buttons plus labelled
  slide-position dots whenever there is more than one slide. Manual navigation
  resets the five-second timer. Pause is a real toggle with `aria-pressed` and
  an accessible name describing the available action.
- Transition with a 600–700 ms opacity crossfade plus a very subtle scale
  (`1.02 → 1`) and optional logical-direction translation. Use token-backed
  styling and `motion-safe`/`motion-reduce`; never flash an empty frame or
  animate layout dimensions.
- Under `prefers-reduced-motion: reduce`, render a static first slide by
  default, disable auto-rotation and scale/translation, and retain manual
  Previous/Next controls only when multiple slides exist.
- Do not announce automatic slide changes through a live region. Expose the
  current position as visually hidden descriptive text associated with the
  carousel, and update it for manual navigation without stealing focus.
- Keep only the current and outgoing transition layers in the DOM. Preload or
  decode the next optimized image after the initial slide is ready; do not mark
  every hero image `priority` or eagerly download every locale's images.

### Mascot placement contract

- Define a small typed `landingMascots` manifest in
  `config/landingMascots.ts`; do not build mascot paths from translated text or
  unchecked input. The CTA entry is fixed to
  `/mascots/mascot-heart-gift.png`, intrinsic `width: 1122`, `height: 1402`,
  and the banner placement.
- The CTA mascot is decorative because the adjacent heading and copy carry the
  full message. Render it with `alt=""` and keep it out of the accessibility
  tree; do not announce the filename, superhero costume, or gift as duplicate
  content.
- Use a three-area logical layout on wide screens: mascot at inline-start,
  copy in the flexible middle, and actions at inline-end. Let this mirror in
  Arabic RTL. On narrow screens, center the mascot above the copy and stack or
  wrap the actions without changing their reading or tab order.
- Reserve the mascot's aspect-ratio box to avoid layout shift. Cap its rendered
  size so it supports rather than dominates the reference's shallow banner
  (approximately 80 px high on mobile and 96 px on desktop), preserve transparent
  space, and verify that no part overlaps text, controls, or focus rings.
- A subtle one-time entrance or pointer hover lift may be used with existing
  CSS utilities. Do not add an animation dependency or a second perpetual loop
  that competes with the five-second hero carousel. Under reduced motion, the
  mascot is completely static.
- Secondary use is intentionally limited to at most two additional sections:
  `mascot-grocery-basket.png` may reinforce goods-based support,
  `mascot-idea.png` may reinforce a future explanatory surface,
  `mascot-thumbs-up.png` may reinforce the qualitative trust strip, and
  `mascot-waving.png` may welcome users in the contact/footer region. Select
  only placements that improve hierarchy after responsive review; never place
  multiple mascots in one section or repeat the CTA mascot elsewhere.

## 6. Tokens, theming, branding, and assets

- Use token-backed classes: `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `border-border`, primary/accent tokens, and semantic
  status tokens. Remove `emerald-*` and `stone-*` from the landing route.
- Rebrand through the existing design/theme providers. Do not fork radii,
  shadows, raw Radix styling, or `apps/web/next.config.ts`.
- Render Kafil marks through `NThemeImage` under the existing root provider.
  Do not add a public brand file, BrandingImage wrapper, `FACTORY_*_PATH`, or
  run `images:backfill` against branding assets.
- Do not reintroduce appearance/branding/preset controllers, services, DTOs,
  query hooks, or editor contexts.

Landing illustrations are content assets, not branding assets. The hero must
use `apps/web/public/hero/` (served as `/hero/...`). Preserve the three existing
base filenames as each locale's first slide and add at least one more slide for
every supported language before enabling rotation:

```text
apps/web/public/hero/
  README.md                    # origin/license or generation record
  hero-family-neutral.webp     # required language-neutral failure fallback
  hero-family_en.png           # existing English slide 1
  hero-family_en-02-v2.png     # generated English family slide 2
  hero-family_fr.png           # existing French slide 1
  hero-family_fr-02-v2.png     # generated French family slide 2
  hero-family_ar.png           # existing Arabic slide 1
  hero-family_ar-02-v2.png     # generated Arabic family slide 2
  hero-family_es-01-v2.png     # generated Spanish family slide 1
  hero-family_es-02-v2.png     # generated Spanish family slide 2
apps/web/public/mascots/
  README.md                    # required origin/license or generation record
  mascot-grocery-basket.png    # existing; optional goods-support placement
  mascot-heart-gift.png        # existing; required CTA banner artwork
  mascot-idea.png              # existing; optional how-it-works placement
  mascot-thumbs-up.png         # existing; optional trust placement
  mascot-waving.png            # existing; optional contact/footer placement
apps/web/public/landing/
  README.md                    # family-example asset record
  family-example-01-v2.png
  family-example-02-v2.png
  family-example-03-v2.png
  family-example-04-v2.png
  family-example-05-v2.png
  family-example-06-v2.png
  family-example-07-v2.png
  family-example-08-v2.png
```

Additional hero slides follow `hero-family_<locale>-NN.<ext>` and are added to
the explicit manifest; the implementation does not assume filesystem globbing.
All slides within a locale must share the 4:3 ratio and equivalent crop/safe
areas. The current PNGs may remain source files, but measure optimized delivery
and convert future assets to an efficient browser format when visual fidelity
is unchanged. Do not rename or recompress the existing files without checking
their references and visual output.

Each asset README records source, license/generation method, output dimensions,
compression, whether people are fictional or consented, embedded language,
locale ownership, and the intended accessibility description. Prefer
illustrations or explicitly licensed/consented photography. Do not imply that
a fictional person is a Kafil beneficiary. Hero slides may contain embedded
localized text only when it matches their declared locale; all essential
meaning must also exist as real localized HTML outside the image. Verify every
rendered image with `complete && naturalWidth > 0`. The mascot README also
records that the current files are text-free transparent PNGs, their shared
1122 × 1402 source dimensions, approved placements, and whether each use is
decorative or meaningful.

## 7. File structure and client boundaries

```text
apps/web/src/app/(landing)/page.tsx       # metadata + thin <LandingPage />
apps/web/src/app/(landing)/layout.tsx     # <LandingHeader /> + children + <LandingFooter />
apps/web/src/features/Landing/
  components/LandingHeader.tsx
  components/LandingHero.tsx
  components/LandingHeroCarousel.tsx       # client-only rotation/control island
  components/LandingTrustStrip.tsx         # compact proof strip + #how-it-works target
  components/LandingFamilyExampleCard.tsx
  components/LandingFamilyExamples.tsx
  components/LandingCtaBanner.tsx
  components/LandingFooter.tsx
  components/LandingPage.tsx
  config/landingContent.ts
  config/landingHeroSlides.ts              # explicit locale-to-slide manifest
  config/landingMascots.ts                 # explicit mascot-to-placement manifest
  hooks/useLandingHeroCarousel.ts           # timer/pause/visibility state machine
  lib/buildLandingViewModel.ts            # optional pure builder; receives t/money dependencies
  types.ts
  index.ts
apps/web/test/landing-feature.test.ts
apps/web/test/landing-hero-carousel.test.tsx
apps/web/test/e2e/landing.e2e.ts
apps/web/public/hero/README.md
apps/web/public/hero/hero-family_<locale>[-NN].<ext>
apps/web/public/mascots/README.md
apps/web/public/mascots/mascot-*.png
apps/web/public/landing/README.md
apps/web/public/landing/*-v2.png
```

- Keep route files thin and retain one feature implementation.
- Put static machine values, anchor IDs, and asset paths in
  `config/landingContent.ts`; put the typed image manifest in
  `config/landingHeroSlides.ts`; put user-visible strings in the locale catalog.
- Components using `useTranslation`, `useNajmFormat`, theme state, or session
  state are explicit Client Components. Keep metadata and any static
  server-safe composition out of those client modules.
- A pure view-model builder must receive translator and formatter functions;
  it must not call React hooks or import the client-only Najm Kit root.
- Use `useNajmFormat().money` for illustrative integer minor-unit amounts. Do
  not store or format floating-point money.
- Do not add React Query or Zustand in Phase A because all landing content is
  static. A future live Phase B uses `useEntityQuery`; a future owned mutation
  uses `useEntityCommand`.
- Keep carousel index, pause reasons, and transition state local to the hero
  client island. Do not persist the slide index and do not add global Zustand
  state for it.

## 8. Localization and metadata

- All visible copy and accessible names use `useTranslation()` through the
  existing `NajmAppProvider i18n={kafilUiI18n}`.
- Add every `ui.landing.*` key explicitly to
  `packages/server/src/locales/{en,fr,ar,es}.json`. This is the one expected
  Phase A change under `packages/server`; it changes the shared catalog only,
  not backend behavior, schema, or migration state.
- Include localized carousel names, Previous, Next, Pause, Play, “slide X of Y,”
  and one concise description for every slide in that locale. Image selection
  follows the active `KafilLocale`; translated UI strings do not alter or infer
  an asset filename.
- The required CTA mascot remains decorative and therefore needs no localized
  alt key. If a secondary mascot is later judged meaningful rather than
  decorative, add a concise alt key to all four raw dictionaries before it is
  rendered; do not reuse English alt text in another locale.
- Do not rely only on `locale-parity.test.ts`: non-English dictionaries are
  completed from English at runtime. Add a focused landing source test that
  enumerates the required landing keys against the raw `en`, `fr`, `ar`, and
  `es` dictionaries and rejects missing or untranslated prose except declared
  language-neutral values.
- Add route-specific landing metadata using Next.js 16's Metadata API: title,
  description, Open Graph/Twitter text, and canonical `/`. Do not invent an OG
  image; use one only after a repository asset with the correct dimensions is
  added and verified.
- Format money/numbers through Najm formatters and apply `dir="auto"` to
  mixed-direction values where needed.

## 9. Accessibility, responsive behavior, and RTL

- One H1; ordered heading hierarchy; labelled landmark navigation; skip link
  to the main content; visible focus; keyboard-operable controls.
- Icon-only controls have localized accessible names and correct pressed/state
  semantics. Await language/theme persistence and expose pending state.
- The auto-rotating hero provides Pause/Play and manual navigation, pauses on
  hover/focus and hidden tabs, and never moves keyboard focus when a slide
  changes.
- Every in-page link lands on a unique ID and preserves visible focus. Account
  for sticky-header offset if the header becomes sticky.
- Mobile-first behavior at 375 px, 768 px, and 1440 px. No horizontal overflow,
  clipped focus rings, overlapping CTA controls, or unsafe fixed/floating UI.
- Verify Arabic RTL across header, hero, trust strip, how-it-works section,
  family examples, CTA, and footer. Use logical properties (`ms`, `me`,
  `start`, `end`) instead of left/right layout assumptions.
- Each hero slide uses its locale-specific concise description; baked-in slogans
  and checklist text are duplicated as real localized HTML so the image is
  never the only carrier of meaning. Family-example illustrations use concise
  localized alt text for their active locale.
- The CTA mascot has empty alt text, preserves its aspect ratio, mirrors through
  layout rather than image transformation in Arabic, and never overlaps the
  banner heading, copy, actions, or their focus rings.
- Reduced-motion preferences disable hero auto-rotation, crossfade movement,
  scale, mascot movement, and other nonessential animation; manual slide
  controls remain usable.

## 10. Source tests and browser acceptance

### Focused source tests

`apps/web/test/landing-feature.test.ts` must prove:

- the route delegates to `LandingPage` and the layout owns exactly one header
  and one footer;
- all Phase A links resolve to allowed routes or declared in-page anchors;
- absent `/families`, `/catalog`, `/contact`, detail, newsletter, and placeholder
  links are not emitted;
- fictional cards have an explicit localized Example disclosure and never use
  Verified wording/status;
- numeric operational claims are absent unless separately evidence-backed;
- every required raw locale key exists in all four source dictionaries;
- branding uses `NThemeImage`, actions use Kit controls, images use
  `NNextImage` with the required sizing/fallback contract, and arbitrary landing
  palette classes are absent;
- the explicit manifest has a non-empty, locale-pure list for `en`, `fr`, `ar`,
  and `es`; every referenced file exists under `apps/web/public/hero`, matches
  its declared dimensions, and never falls back to another locale;
- the mascot manifest references only existing files under
  `apps/web/public/mascots`, declares the 1122 × 1402 intrinsic dimensions, and
  fixes `mascot-heart-gift.png` as the CTA artwork; the banner emits one
  decorative mascot and does not render the mockup's yellow hands icon;
- only the initial locale slide is eligible for priority loading and no runtime
  path/glob discovery is used; below-fold mascot art is never priority-loaded.

`apps/web/test/landing-hero-carousel.test.tsx` uses the configured DOM test
environment and fake timers to prove:

- 4,999 ms does not advance and 5,000 ms advances exactly one slide;
- manual Previous/Next wraps and restarts a fresh timer;
- language changes reset to slide 0 and replace the full slide list;
- user pause, hover, focus-within, hidden-document state, and reduced motion
  stop auto-rotation without losing the current slide;
- timer cleanup is stable across rerender, unmount, and React Strict Mode;
- one-slide locales render no redundant controls or timer;
- outgoing/current layers have the intended transition states without changing
  the hero frame's dimensions.

### Browser spec and runner wiring

Add `apps/web/test/e2e/landing.e2e.ts` and add that exact path to the default
spec list in `apps/web/scripts/run-phase6-e2e.ts`. Confirm Playwright discovery
includes the landing tests before treating `test:e2e` as coverage.

Run the focused spec first:

```powershell
$env:KAFIL_E2E_FILES='test/e2e/landing.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

The spec uses the runner-owned server and real application; do not use
`page.route()` or mocked APIs. Attach diagnostics as each page is created and
fail on unexpected page errors, console errors, failed requests, or HTTP error
responses.

Browser assertions cover:

- signed-out `/` renders one H1 and all major sections;
- `/apply` and `/login` navigate correctly;
- every header/footer in-page link reaches its section and no link returns 404;
- the language control changes to Arabic through the product UI and the root
  document plus section layouts are RTL; the hero switches from the English to
  the Arabic manifest, resets to slide 1, and never displays English/French
  embedded-text artwork while Arabic is active;
- theme control persists across reload;
- keyboard-only traversal, skip link, focus visibility, and focus after
  in-page navigation;
- 375 px, 768 px, and 1440 px layouts with no horizontal overflow;
- all landing images decode successfully after each lazy image is scrolled into
  view;
- the CTA loads `/mascots/mascot-heart-gift.png` after it is scrolled into view,
  exposes no duplicate image accessible name, and has no mascot/text/action
  bounding-box overlap at 375 px, 768 px, or 1440 px;
- Arabic RTL mirrors the CTA's logical mascot/copy/action placement while DOM
  reading order and keyboard order remain heading/copy/actions; the mascot
  itself is not horizontally flipped;
- with normal motion and at least two English assets, the hero advances once
  within the bounded five-second contract, exposes the updated position, and
  Pause prevents the next advance; manual Next/Previous still work;
- with `reducedMotion: "reduce"`, the hero remains on slide 1 beyond the
  five-second boundary while manual navigation remains available and computed
  transition/animation motion is disabled;
- example disclosures are visible and no fabricated counts, Verified badges,
  newsletter form, or dead placeholder links appear.

After the focused spec passes, run the complete default `test:e2e` suite once.
Store responsive/RTL screenshots and a short value-free acceptance record under
`docs/evidence/landing-page/<date>/`. Evidence must not contain secrets,
private family data, generated account identifiers, or unrelated runtime data.

`bun run --cwd apps/web smoke:phase6` remains a route-status smoke gate only;
it is not landing visual or interaction acceptance.

## 11. Verification and closure

Run focused checks while iterating, then close Phase A with the repository gate:

```bash
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

`db:generate` must create no migration. Stop and investigate schema drift if it
does. Browser acceptance and source/build gates are separate results; neither
substitutes for the other. The plan originally contained no publication or
deployment authorization; the user separately authorized commit, push,
deployment, and read-only production verification on 2026-09-08.

## 12. Implementation order

1. [x] Preflight skills, installed declarations, Next.js 16 guides, current
       landing files, providers, preference controls, locale catalogs, tests,
       runner, and mockup.
2. [ ] Audit and document the existing `/hero` and `/mascots` assets; add the
       missing Spanish base image plus at least one additional 4:3 slide for
       each of `en`, `fr`, `ar`, and `es`; add the language-neutral failure
       fallback; record mascot provenance; produce the fictional/approved
       family-example assets.
3. [x] Add `ui.landing.*` translations in all four raw locale dictionaries and
       focused raw-catalog coverage.
4. [x] Scaffold `features/Landing`; make the page/layout thin and assign header
       and footer ownership to the layout only.
5. [x] Implement the typed locale slide manifest and carousel state machine,
       including deterministic first render, five-second rotation, manual
       controls, all pause reasons, reduced-motion behavior, and optimized
       image loading.
6. [x] Implement header preferences, stable hero copy, a compact qualitative
       proof strip owning the how-it-works anchor, visibly illustrative family cards, and the CTA
       banner with `mascot-heart-gift.png` replacing the yellow icon; complete
       the footer using real destinations and add no more than two reviewed
       secondary mascot placements.
7. [x] Add metadata, source-contract tests, and fake-timer carousel tests.
8. [x] Complete responsive, dark-mode, reduced-motion, accessibility, and RTL
       review.
9. [x] Add `landing.e2e.ts`, wire it into the runner allowlist, prove focused
       discovery, and pass the focused browser work unit with diagnostics.
10. [ ] Pass the complete default E2E suite, smoke gate, and full source/build/
       schema-drift gate.
11. [x] Record evidence below and update status without claiming publication,
        deployment, production acceptance, or deferred Phase B work.

## 13. Final acceptance checklist

- [x] Every rendered Phase A route/anchor exists and no landing action returns
      404.
- [x] Fictional profiles are unambiguously disclosed and no invented impact
      totals or Verified claims are rendered.
- [x] Header/footer branding uses the resolved theme slot and no new public
      brand path or app-owned branding wrapper exists.
- [ ] `/hero` contains a documented, locale-pure 4:3 slide set with at least two
      valid images for each of English, French, Arabic, and Spanish; every
      manifest entry and the language-neutral fallback resolve and decode.
- [ ] `/mascots` has a provenance README; the CTA uses the text-free
      `mascot-heart-gift.png` as decorative, non-priority artwork instead of the
      yellow hands icon, and its layout passes responsive and Arabic RTL
      non-overlap checks.
- [x] English, French, Arabic, and Spanish source catalogs contain translated
      landing copy with focused raw-catalog evidence.
- [x] Money is integer minor units and formatted through Najm.
- [x] Responsive, dark, reduced-motion, keyboard, image-decode, and Arabic RTL
      assertions pass in the focused landing spec.
- [x] The carousel rotates only within the active language every five seconds,
      resets on language change, pauses correctly, provides manual controls,
      and becomes static by default under reduced motion.
- [ ] The landing spec is present in the default E2E runner and the complete
      suite passes with no unexpected diagnostics.
- [x] App tests, root gate, production build, and no-schema-drift generation
      pass with native exit code 0.
- [x] Evidence paths and exact commands/results are recorded below.
- [x] Newsletter, live family data/details, and real aggregate statistics
      remain deferred; separately authorized publication, deployment, and
      read-only production acceptance are recorded below.

## 14. Evidence record

Do not check items until the named command or artifact exists.

| Boundary | Status | Evidence |
|----------|--------|----------|
| Phase A implementation | IMPLEMENTED (pending final acceptance) | `features/Landing/`, locale catalogs, static locale-aware hero, and source/browser specs in workspace |
| Hero asset readiness | PARTIAL — static hero ready, legacy provenance on hold | One 4:3 image per locale; en/fr/ar use legacy bases and Spanish uses a text-free generated family illustration. Legacy `hero-family_{en,fr,ar}.png` origin/license remains unrecorded. See `apps/web/public/hero/README.md` |
| Mascot asset readiness | BLOCKED (provenance hold) | Five text-free 1122 × 1402 transparent PNGs exist; CTA uses `mascot-heart-gift.png` decoratively. Origin/license unrecorded — final acceptance blocked until cleared. See `apps/web/public/mascots/README.md` |
| Family-example art | PASS (2026-09-08) | Eight distinct Imagegen-produced fictional 1448 × 1086 illustrations with no embedded text/UI/claims; provenance, exclusions, dimensions, and fingerprints recorded in `apps/web/public/landing/README.md` |
| Focused source tests | PASS (2026-09-09) | `bun test test/landing-feature.test.ts test/sponsor-families.test.ts` in `apps/web`: 19 pass, 0 fail, 1626 expects |
| Focused landing browser spec | PASS (2026-09-09 static-hero revision) | `KAFIL_E2E_FILES=test/e2e/landing.e2e.ts bun run test:e2e` in `apps/web`: 11 pass, 0 fail (6.1m); isolated users removed. |
| Complete local E2E suite | FAIL / INTERRUPTED (2026-09-08) | Default runner exposed unrelated pre-existing selector/readiness failures in applicant decision, family create wizard, family order limits, and funding-cap specs; stopped after repeated failures and isolated users were removed. This is not a landing-spec failure |
| Root lint/typecheck/test/build | PASS (2026-09-08) | Required sequential gate exit 0: web 430 pass, server 400 pass + 77 skip, seed 89 pass, 0 fail; production build success with 44 routes |
| Schema drift (`db:generate`) | PASS — no migration (2026-09-08) | `bun run db:generate`: "No schema changes, nothing to migrate" |
| PostgreSQL integration | PASS (2026-09-08) | `bun run test:db`: 55 pass, 0 fail across 13 files |
| Git publication | PASS (2026-09-09) | Static-hero implementation commit `3891358900e005cec7ae971436f4130f6a2c171b` pushed to `origin/main`; local, tracking, and remote SHAs matched. |
| Deployment | PASS (2026-09-09) | GitHub Actions run `34292843128` passed verify, GHCR publication, and Dokploy trigger. Dokploy recreated app + notification worker together; both healthy on identical image content with OCI revision `3891358900e005cec7ae971436f4130f6a2c171b`. |
| Production browser acceptance | PASS — read-only (2026-09-09) | Root, liveness, and readiness returned 200; static landing marker present, carousel markup absent, and CSP plus HSTS headers present. |
| Deferred Phase B | OUT OF SCOPE | Separate authorization and plan update required |
