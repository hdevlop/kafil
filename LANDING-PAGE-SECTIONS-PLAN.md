# Landing page explanatory sections plan

Status: **READY FOR IMPLEMENTATION — the four content assets are generated,
optimized, named, and visually inspected; section components, localization,
tests, build validation, browser acceptance, publication, and deployment have
not started.**

Reference: the user-provided composite showing the process, transparency,
dignity, and FAQ sections. It is a visual and content reference, not a runtime
asset and not evidence of live Kafil transactions.

This plan extends the already deployed public landing page. It does not replace
the existing hero, qualitative trust strip, illustrative family examples,
sponsorship CTA, footer, static locale-aware hero contract, or their existing
acceptance evidence. `LANDING-PAGE-PLAN.md` remains the historical plan for
that deployed baseline; this document owns only the four-section extension.

## 1. Outcome and scope

Add four real, responsive, localized sections to `/` in this order:

1. **How your support reaches a family** — four process cards.
2. **Every dirham has a purpose** — transparency benefits plus a clearly
   illustrative order and accessible sample-receipt dialog.
3. **Real support. Dignity first.** — a full-width commitment band using the
   generated family illustration.
4. **Questions before you begin?** — a single-open FAQ accordion.

The complete landing sequence becomes:

1. Existing hero.
2. Existing qualitative trust strip.
3. Existing illustrative family examples.
4. New process section.
5. New transparency section.
6. New dignity section.
7. New FAQ section.
8. Existing final sponsorship CTA.
9. Existing footer, still owned by the `(landing)` layout.

The slice is static frontend work plus translation-catalog additions. It needs
no new API, database table, migration, query hook, Zustand store, analytics,
email workflow, or external service. The sample order must never read or
resemble live transaction data.

## 2. Verified baseline and authoritative contracts

Before implementation, read completely and follow:

1. Root `AGENTS.md`.
2. `.agents/skills/kafil-najm-frontend/SKILL.md`.
3. `.agents/skills/kafil-playwright-testing/SKILL.md` before editing or running
   `apps/web/test/e2e/landing.e2e.ts` or collecting browser evidence.
4. This plan and the still-relevant static-hero decisions in
   `LANDING-PAGE-PLAN.md`.
5. Installed Next.js 16 guides for images and client boundaries under
   `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/`.
6. Installed declarations in `node_modules/najm-kit/dist/index.d.ts` and
   `node_modules/najm-kit/dist/adapters/next.d.ts`.

Verified on 2026-09-10:

- `LandingPage.tsx` currently composes `LandingHero`, `LandingTrustStrip`,
  `LandingFamilyExamples`, then `LandingCtaBanner` inside `NPageLayout`.
- `(landing)/layout.tsx` owns exactly one `LandingHeader` and one
  `LandingFooter`; the page must not duplicate either.
- The shared width contract is `max-w-6xl` with `px-4 sm:px-6`.
- The theme already supplies warm light/dark `background`, `card`, `muted`,
  `border`, `primary`, `warning`, foreground, and focus-ring tokens. Use their
  utility classes rather than raw fallback colors.
- The installed `najm-kit@2.11.21` exports `NPageLayout`, `NGrid`, `NGridItem`,
  `NCard`, `NCardInfo`, `NBadge`, `NButton`, dialog primitives, separators, and
  related presentation primitives. It does not export an accordion.
- `NNextImage` is exported from `najm-kit/next` and accepts `fallbackSrc`,
  explicit dimensions, `sizes`, `loading`, and `priority`.
- The current public route set supports `/`, `/apply`, and `/login`; it does
  not include a signed-out `/families`, `/catalog`, `/contact`, public receipt,
  or public transparency route.
- Kafil has privacy-safe sponsor supported-order views and recorded purchase /
  fulfillment states, so the contribution-following answer is supported when
  phrased without promising access to protected receipt bytes.
- Existing landing source and browser tests encode the old contract that the
  trust strip owns `#how-it-works`; those assertions must be updated with the
  anchor move.

## 3. Locked design decisions

- Match the existing landing page, not the screenshot's pixels. Use
  `bg-background`, `bg-card`, `bg-muted`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `text-primary`, `bg-primary/10`,
  `text-warning`, and the configured radius/shadow behavior.
- Keep all essential meaning as HTML. Raster assets are limited to the family
  illustration and three product thumbnails.
- Use the existing serif/heading treatment already established by the landing
  hero and family section; section H2s remain smaller than the H1.
- Keep the shared `max-w-6xl px-4 sm:px-6` edge alignment. Use approximately
  `py-10 sm:py-14 lg:py-16` for the new editorial sections, adjusted only after
  browser review.
- Use `bg-muted/40` or another verified token-backed surface for the full-width
  dignity band. Do not hard-code ivory, teal, amber, charcoal, or sand hex
  values and do not modify `next.config.ts` or the platform theme.
- Use small/moderate configured radii and thin token borders. Reserve the
  strongest soft shadow for the illustrative order card.
- No unnecessary motion. Any hover transition must be `motion-safe`, and all
  information and controls must remain identical with reduced motion.
- Preserve one H1 on the page. Each new section has one H2 and uses H3 only for
  card/benefit titles.

## 4. Information architecture and anchors

Extend `LANDING_ANCHORS` with stable machine IDs and keep all IDs unique:

| Key | ID | Owner and behavior |
|-----|----|--------------------|
| `howItWorks` | `how-it-works` | Move from `LandingTrustStrip` to `HowItWorksSection`; the existing header/footer link now reaches the real four-step explanation |
| `transparency` | `transparency` | `TransparencySection` |
| `illustrativeOrder` | `illustrative-order` | Heading/target inside `ExampleOrderCard`; destination of **Explore transparency** |
| `commitment` | `commitment` | `DignitySection` |
| `faq` | `faq` | `FaqSection` |

Remove `id={LANDING_ANCHORS.howItWorks}` from `LandingTrustStrip`; do not leave
two elements with `id="how-it-works"`. All anchored sections use the existing
sticky-header offset convention (`scroll-mt-24`).

The outlined **Explore transparency** control is `NButton asChild` with a Next
`Link` to `#illustrative-order`. This is a real, local, accessible explanation
and avoids inventing a public route. The target heading is programmatically
focusable if testing shows hash navigation otherwise moves only the viewport.

## 5. Component and file plan

Add:

```text
apps/web/src/features/Landing/
  components/HowItWorksSection.tsx
  components/TransparencySection.tsx
  components/ExampleOrderCard.tsx
  components/SampleReceiptDialog.tsx
  components/DignitySection.tsx
  components/FaqSection.tsx
  config/landingSectionContent.ts
  config/landingSectionAssets.ts
```

Modify:

```text
apps/web/src/features/Landing/components/LandingPage.tsx
apps/web/src/features/Landing/components/LandingTrustStrip.tsx
apps/web/src/features/Landing/config/landingContent.ts
apps/web/src/features/Landing/types.ts
apps/web/src/features/Landing/index.ts
packages/server/src/locales/en.json
packages/server/src/locales/fr.json
packages/server/src/locales/ar.json
packages/server/src/locales/es.json
apps/web/test/landing-feature.test.ts
apps/web/test/e2e/landing.e2e.ts
apps/web/public/landing/README.md
```

Add a focused DOM interaction test such as
`apps/web/test/landing-sections.test.tsx` if the existing test setup supports
the Kit dialog and client components without duplicating the full browser
suite.

Keep repeated steps, benefits, sample products, and FAQ records as typed,
readonly arrays in `landingSectionContent.ts`. Each record stores stable IDs,
Lucide icon components, translation-key references, and integer minor-unit
amounts where relevant. User-visible English must not live in component files.

`landingSectionAssets.ts` is an explicit manifest containing public path,
intrinsic width, intrinsic height, and alt-key/decorative intent. Do not use
runtime filesystem discovery or construct paths from translated labels.

All existing landing components are already inside a client boundary because
they use `useTranslation`. Keep interaction state local:

- `SampleReceiptDialog` owns only its open state through the verified Kit
  dialog contract.
- `FaqSection` owns only `openItemId`, initialized to the first item.
- No new global provider or persisted state.

## 6. How your support reaches a family

### Content

- Eyebrow: **OUR PROCESS**
- Heading: **How your support reaches a family**
- Description: **A clear journey from contribution to delivery.**

| Step | Title | Description | Lucide concept |
|------|-------|-------------|----------------|
| 1 | Choose a family | Support verified needs. | `UsersRound` plus `Heart`, or the closest single verified family/heart icon |
| 2 | Fund essentials | Contribute to useful goods. | `Package` |
| 3 | We handle procurement | Operators purchase approved items. | `ShoppingCart` |
| 4 | Follow the delivery | See order updates and receipt status. | `Truck` |

### Structure and behavior

- Render one semantic ordered list so the visual badges and DOM order agree.
- Use `NGrid`/`NGridItem` for 1 column by default, 2 at the tablet breakpoint,
  and 4 at desktop. Every card is an equal-height `NCard` with a thin border.
- Each card contains a visible numbered badge, a large Lucide line icon in a
  `bg-primary/10 text-primary` circle, centered H3, and supporting paragraph.
- Render three decorative connector arrows only in the unwrapped desktop
  four-column layout. They are `aria-hidden`, sit in the inter-card gaps, never
  overlap a card/focus ring, and reverse visually in RTL. Do not generate icon
  bitmaps.
- At 375 px, cards stack without connectors. At 768 px, use a two-by-two grid
  without connectors. At 1440 px, use four columns with connectors.

The fourth description intentionally says **receipt status**, not that a
sponsor can open a protected receipt file: the current privacy-safe sponsor
projection exposes whether a receipt was recorded, while protected receipt
bytes are not part of the public landing contract.

## 7. Every dirham has a purpose

### Left column

- Eyebrow: **TRANSPARENCY IN ACTION**
- Heading: **Every dirham has a purpose.** Only **purpose.** uses
  `text-warning`; split the phrase by explicit translation keys rather than
  guessing the last word in every language.
- Description: **Follow the goods you fund, from approved purchase to
  confirmed delivery.**

Benefit rows:

1. **Itemized purchases** — **See exactly what's bought.**
2. **Clear order updates** — **Track progress at every step.**
3. **Delivery confirmation** — **Receive confirmation when items arrive.**

Each row uses a Lucide `Check` inside a pale primary circle, an H3-equivalent
title, and supporting text. The outlined **Explore transparency** action links
to `#illustrative-order` as locked above.

### Example order card

Build `ExampleOrderCard` entirely from HTML and Najm Kit primitives:

- The accessible name and visible title are **Illustrative order**.
- Header uses `ReceiptText` and a neutral/primary **School essentials** badge.
- Product list is a semantic `ul`; each row has an `NNextImage`, visible name,
  and right-aligned localized price.
- Product images are decorative (`alt=""`) because the adjacent name already
  identifies each item.
- Store amounts as `25000`, `12000`, and `8000` MAD minor units. Derive the
  `45000` total with `reduce`; do not duplicate a magic total that can drift.
- Format all values with `useNajmFormat().money`. Do not hand-build `DH`, use a
  float, or use locale-insensitive number formatting.
- The three status markers are **Approved**, **Purchased**, and **Delivered**.
  Use an ordered list with check icons, logical connector lines, and no motion.
  The sequence mirrors in layout under RTL without changing DOM order.
- A persistent note such as **Illustrative only — not a real transaction** is
  visible in the card and dialog, not available only to screen readers.

The desktop section is a balanced two-column grid, copy first and card second.
At mobile widths it becomes one column with copy above the card; names and
prices must fit without horizontal scrolling.

### Sample receipt dialog

- **View sample receipt** is an `NButton` trigger, not a dead link.
- Use the installed Kit `Dialog`, `DialogTrigger`, `DialogContent`,
  `DialogTitle`, and `DialogDescription` primitives after rechecking their
  declarations at implementation time.
- Dialog title: **Sample receipt — illustrative only**.
- Repeat the same three product records and the derived total; do not define a
  second copy of the data.
- Do not invent a merchant, receipt number, transaction ID, purchase date,
  payment method, or protected receipt URL.
- Opening moves focus into the dialog, Escape and the close control dismiss it,
  background content is inert while open, and closing restores focus to the
  trigger. These are browser-tested, not assumed from the primitive.

## 8. Real support. Dignity first

- Render a full-bleed token-backed muted band with an inner
  `mx-auto max-w-6xl px-4 sm:px-6` container.
- Desktop uses two columns: generated 4:3 illustration at inline-start and
  copy at inline-end. Mobile stacks illustration above copy and caps its visual
  height without harsh cropping.
- Eyebrow: **OUR COMMITMENT**.
- Heading is split into explicit translation parts: **Real support.** and
  amber **Dignity first.** Do not derive the accent span from word position.

Benefits:

1. `ShieldCheck`: **Verified needs** — **Family profiles and supporting
   information are reviewed before sponsorship is arranged.**
2. `LockKeyhole`: **Privacy by design** — **Sensitive family details stay
   protected.**
3. `Heart`: **Goods-based support** — **Contributions fund practical
   essentials.**

The first description intentionally differs from the supplied mockup. Kafil's
public application flow is for sponsor applicants, while family profiles are
operator-created; saying that family "applications" are reviewed would be
ambiguous and unsupported.

Use `/landing/dignity-family-v1.webp` through `NNextImage` with `width={1448}`,
`height={1086}`, an accurate localized alt string, responsive `sizes`,
`object-contain`, `loading="lazy"`, and no `priority`.

## 9. Frequently asked questions

- Eyebrow: **FREQUENTLY ASKED QUESTIONS**.
- Heading: **Questions before you begin?**

Use these product-truthful answers:

1. **Does the family receive cash?**
   **No. Support funds approved goods ordered for the family rather than a
   direct cash payment.**
2. **Can I support more than one family?**
   **Yes. After sponsor approval, support can be arranged for more than one
   family through separate support assignments.**
3. **How can I follow my contribution?**
   **Your sponsor workspace shows your contributions and privacy-safe order
   updates for the families you support, including purchase and delivery
   status.**
4. **How are families reviewed?**
   **Operators create and review family profiles and supporting information
   before sponsorship is arranged.**

Because the installed Kit has no accordion export, implement a small
landing-owned disclosure rather than importing a new UI framework:

- One item is open at a time; item one is the deterministic default.
- Each question is a semantic `button` with a stable ID, `aria-expanded`, and
  `aria-controls` targeting a stable answer-panel ID.
- Each answer panel uses `role="region"`, `aria-labelledby`, and the `hidden`
  attribute when collapsed.
- Enter/Space toggle. Tab follows DOM order. Arrow Up/Down cycle question
  buttons, and Home/End reach the first/last question.
- The active row uses `bg-primary/5` (or the nearest verified token-backed
  surface), primary text emphasis, and a chevron that changes orientation.
  Chevron motion is disabled under reduced motion.
- Thin `border-border`, configured radius, visible focus rings, and small gaps
  match the rest of the page.

## 10. Localization and RTL contract

Add every visible string and accessible name under `ui.landing` in all four
raw catalogs: `en`, `fr`, `ar`, and `es`. Suggested namespaces:

```text
landing.process.*
landing.transparency.*
landing.sampleOrder.*
landing.receiptDialog.*
landing.dignity.*
landing.faq.*
```

Requirements:

- Add complete, human-readable translations to each raw JSON file; do not rely
  on runtime English fallback or copy English prose into non-English catalogs.
- Use separate `headingLead` and `headingAccent` keys for the two accented
  headings so word order remains correct in Arabic, French, and Spanish.
- Keep sample product amounts as machine data and format through
  `useNajmFormat`; translate names, badges, statuses, labels, dialog controls,
  illustration alt text, and FAQ copy.
- Use logical start/end alignment and spacing. English/French/Spanish text is
  start-aligned; Arabic mirrors layout naturally while preserving semantic and
  tab order.
- Product amounts may use `dir="auto"` when needed to isolate mixed-direction
  numerals/currency.
- Add the new keys to the focused raw-catalog assertion in
  `landing-feature.test.ts`, not only the general locale parity test.

## 11. Generated assets and delivery contract

The required files already exist under `apps/web/public/landing/` and are
documented in that directory's README:

| Public path | Intrinsic size | Use | SHA-256 prefix | Status |
|-------------|----------------|-----|----------------|--------|
| `/landing/dignity-family-v1.webp` | 1448 x 1086 | Dignity illustration | `56da8316625d` | Generated, optimized, inspected |
| `/landing/order-school-bag-v1.webp` | 512 x 512, alpha | Product thumbnail | `2456f87a11ff` | Generated, optimized, inspected |
| `/landing/order-notebooks-v1.webp` | 512 x 512, alpha | Product thumbnail | `1dd740c89f64` | Generated, optimized, inspected |
| `/landing/order-stationery-v1.webp` | 512 x 512, alpha | Product thumbnail | `0ebc360118e3` | Generated, optimized, inspected |

Generation used the built-in OpenAI ImageGen path. The family prompt specified
a warm painterly fictional Moroccan mother and two children with unbranded
groceries, subtle arch/zellige/plants, cream and sand surroundings, restrained
teal accents, no distress, no text, no watermark, and no UI. Each product was
generated as an isolated, consistent editorial cutout with transparent alpha,
soft daylight, no branding, no text, no people, and no UI. The selected PNG
outputs were converted to WebP quality 88; product outputs were reduced to
512 x 512 while preserving alpha.

Final normalized prompt set:

```text
Dignity family: Warm, polished painterly editorial illustration for the Kafil
Moroccan family sponsorship landing page. A fictional Moroccan mother with two
children sharing a calm, happy moment beside an unbranded paper shopping bag,
rice, cooking oil, and plain jars or tins. Soft Moroccan home/courtyard with a
subtle arch, restrained zellige, plants, warm daylight, cream/sand,
terracotta, muted rose, and restrained teal. Landscape 4:3, fully contained,
gentle cream edge fade. No distress, cash, text, letters, numbers, logos,
watermarks, UI, slogans, branded packaging, or identifiable real people.

School bag: Isolated premium editorial product illustration of one unbranded
teal-and-navy school backpack, centered and fully contained in a square frame,
soft warm studio daylight, consistent with the Kafil family artwork, genuine
transparent background and a subtle grounding shadow. No text, logo, people,
extra products, UI, neon colors, or dramatic shadow.

Notebooks: Isolated premium editorial product illustration of four unbranded
closed school notebooks stacked at a slight angle, with restrained teal,
muted coral, warm amber, and navy covers. Centered and fully contained in a
square frame, soft warm studio daylight, genuine transparent background and a
subtle grounding shadow. No text, logo, people, pens, extra products, UI,
neon colors, or dramatic shadow.

Stationery: Isolated premium editorial product illustration of one plain
warm-ivory pencil cup containing a tidy assortment of unbranded colored
pencils, two pens, one ruler, and one pencil in teal, muted coral, amber, and
navy. Centered and fully contained in a square frame, soft warm studio daylight,
genuine transparent background and a subtle grounding shadow. No text, logo,
people, notebooks, UI, scissors, blades, neon colors, or clutter.
```

Implementation rules:

- Never use these files as platform branding or pass them through managed-image
  storage/backfill.
- Keep all below-fold assets lazy and non-priority. The existing static hero is
  the only landing image eligible for priority loading.
- Reserve layout space through explicit width/height or aspect ratio to prevent
  cumulative layout shift.
- Product thumbnails render at roughly 56–72 CSS pixels but keep responsive
  `sizes`; the dignity illustration gets a bounded responsive `sizes` value.
- Assert every manifest file exists, matches declared dimensions, decodes, and
  has non-zero natural dimensions in browser acceptance.
- Do not rename or overwrite the generated files without creating a new
  versioned filename and updating manifest, README, hashes, tests, and visual
  evidence together.

## 12. Source and interaction tests

Extend `apps/web/test/landing-feature.test.ts` to prove:

- `LandingPage` composes each existing and new section exactly once and in the
  locked order, with the CTA after FAQ.
- Layout still owns one header and one footer.
- `#how-it-works` moved to `HowItWorksSection`, is absent from the trust strip,
  and every declared anchor occurs exactly once.
- The four process records, three sample products, three derived status
  markers, three dignity benefits, and four FAQ records exist in typed config.
- Sample amounts are integer minor units, sum to `45000`, and no component
  hard-codes `450 DH`.
- The illustrative label appears in both card and dialog; forbidden real-data
  fields such as merchant, transaction ID, and receipt number are absent.
- All new links resolve to allowed routes/anchors and **Explore transparency**
  targets `#illustrative-order`.
- New UI uses Najm Kit actions/cards/dialog primitives and `NNextImage`; no raw
  `<img>`, new UI dependency, arbitrary palette classes, or priority loading is
  added below the hero.
- Every new translation key exists with non-empty localized content in all four
  raw catalogs.
- The four explicit asset entries resolve under `public/landing`, match their
  manifest dimensions, and have the recorded format/alpha intent.

Focused DOM tests, where supported, prove:

- FAQ starts with item one open, opens only one item, toggles using click and
  Enter/Space, supports Arrow/Home/End focus movement, and exposes correct
  ARIA relationships.
- Receipt dialog opens from its trigger, displays the shared three rows and
  derived total, closes by Escape/close control, and restores trigger focus.
- No separate sample-order data copy can drift between card and dialog.

Do not weaken the existing static-hero, fictional-family disclosure, route,
theme, image-delivery, or localization tests to make the new slice pass.

## 13. Browser acceptance

Read the Playwright skill before editing or running the spec. Extend the
existing `apps/web/test/e2e/landing.e2e.ts`; do not create a disconnected
browser runner. The focused work unit remains:

```powershell
$env:KAFIL_E2E_FILES='test/e2e/landing.e2e.ts'
bun run --cwd apps/web test:e2e
Remove-Item Env:KAFIL_E2E_FILES -ErrorAction SilentlyContinue
```

Test through the real local app with the runner-owned server. Keep diagnostics
for page errors, console errors, failed requests, and HTTP error responses.
Cover:

- One H1 and every major section visible in the locked order.
- Header **How it works** navigation reaches the new process section, not the
  trust strip; no duplicate IDs exist.
- 4/2/1 process-card layouts and connector visibility at approximately 1440,
  768, and 375 px.
- **Explore transparency** reaches the illustrative order target.
- Product names, localized prices, and the derived 450 MAD total remain legible
  with no horizontal scrolling.
- Receipt dialog keyboard open/close/focus restoration and visible
  **illustrative only** language.
- FAQ default state, single-open behavior, keyboard focus movement, ARIA state,
  and readable answer panels.
- Dignity image and all product thumbnails decode only after the below-fold
  content is approached; none is eagerly priority-loaded.
- No horizontal overflow, clipped copy, connector overlap, cropped focus ring,
  or CTA displacement at 375, 768, and 1440 px.
- English LTR and Arabic RTL layout, logical connector/status direction,
  product price alignment, dialog, FAQ, and preserved DOM/tab order.
- Light and dark theme contrast, plus reduced-motion behavior.
- Existing `/apply`, `/login`, family-example actions, final CTA, footer links,
  language switching, and static locale-aware hero remain functional.

Save current screenshots and a value-free acceptance record under
`docs/evidence/landing-page/<date>-explanatory-sections/`, including at least:

```text
landing-sections-en-375px.png
landing-sections-en-768px.png
landing-sections-en-1440px.png
landing-sections-ar-rtl-1440px.png
landing-sample-receipt-dialog.png
landing-faq-keyboard-state.png
README.md
```

Browser/source/build status must be reported separately. A passing source test
or build is not visual acceptance.

## 14. Verification gates

Run focused checks while iterating, then the repository-required gate:

```powershell
Push-Location apps/web
bun test test/landing-feature.test.ts test/landing-sections.test.tsx
Pop-Location
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

If the focused test filename differs, use the actual added filename and record
it. `db:generate` must create no migration; stop and investigate if it does.
The locale changes are source-only and do not authorize schema work.

After the focused landing browser spec passes, run the complete default E2E
suite once and report pre-existing unrelated failures separately rather than
misclassifying them as landing regressions.

No commit, push, package publication, deployment, or production acceptance is
authorized by this plan. Those remain separate user-approved boundaries.

## 15. Implementation order

1. [x] Inspect the current landing composition, routes, theme tokens, installed
   Najm Kit/Image contracts, locale system, tests, and existing public assets.
2. [x] Generate, select, optimize, name, visually inspect, and document the one
   dignity illustration and three product thumbnails.
3. [ ] Re-read required skills and installed contracts immediately before code
   implementation; confirm the working tree and do not overwrite unrelated
   user changes.
4. [ ] Add typed content/asset manifests and all four-locale translations.
5. [ ] Implement `HowItWorksSection` and move the unique `#how-it-works`
   ownership from the trust strip.
6. [ ] Implement `TransparencySection`, shared sample-order data,
   `ExampleOrderCard`, and the Kit-based receipt dialog.
7. [ ] Implement the full-width `DignitySection` using the generated image and
   product-truthful copy.
8. [ ] Implement the controlled accessible `FaqSection` without adding a UI
   framework.
9. [ ] Integrate the four sections before the existing CTA, export boundaries,
   and verify footer ownership remains unchanged.
10. [ ] Extend source/interaction tests and pass focused frontend checks.
11. [ ] Extend and pass focused Playwright acceptance at 375/768/1440, Arabic
    RTL, dark theme, reduced motion, keyboard, dialog, and image decoding.
12. [ ] Run the full repository gate and confirm `db:generate` produces no
    migration.
13. [ ] Record exact results/evidence and update this status without claiming
    publication, deployment, or production acceptance.

## 16. Final acceptance checklist

- [ ] Existing hero, trust strip, family examples, final CTA, and footer are
      preserved with no duplicated chrome or action.
- [ ] The four new sections appear once, in the requested order, before the
      existing CTA.
- [ ] `#how-it-works` uniquely identifies the new process section and existing
      navigation reaches it.
- [ ] Process cards are equal-height and 4/2/1 responsive; connectors appear
      only in the one-row desktop layout and behave correctly in RTL.
- [ ] Transparency content is real HTML; sample values derive to 450 MAD from
      integer minor units and are visibly illustrative.
- [ ] **Explore transparency** and **View sample receipt** have meaningful,
      tested actions; there are no dead or invented routes.
- [ ] Receipt dialog is keyboard accessible, restores focus, and contains no
      fabricated transaction metadata.
- [ ] Dignity copy reflects Kafil's operator-created family model, protects
      privacy, and does not imply direct cash support.
- [ ] FAQ answers match current application behavior and the single-open
      accordion passes keyboard/ARIA checks.
- [ ] English, French, Arabic, and Spanish catalogs contain all visible and
      accessible strings; Arabic RTL is visually accepted.
- [ ] All four generated WebP assets exist at the locked paths, match declared
      dimensions, decode, lazy-load below the fold, and reserve layout space.
- [ ] Product thumbnails have empty alt text beside visible names; the family
      illustration has localized meaningful alt text.
- [ ] Token-backed light/dark styling, visible focus, reduced motion, and no
      horizontal overflow pass at 375, 768, and 1440 px.
- [ ] Focused tests, focused Playwright, full source/build gate, and no-schema-
      drift generation pass with exact evidence recorded.
- [ ] Publication, deployment, and live production verification remain
      unclaimed until separately authorized and completed.
