# Kafil Remaining Work Plan

Status: **ACTIVE**

Last updated: 2026-08-05

This file contains only work that is still incomplete or not fully verified.
Completed implementation history has been removed. This file is the
authoritative roadmap; the former `docs/PLAN.md` and `apps/web/PLAN.md` were
folded into it and deleted.

`PAGINATION-PLAN.md` is the one deliberate companion file. It holds the
cross-repository list continuation, container height, and result total work
owned by Phase 2, which is too detailed to inline here. Do not fold it back in
and do not start a third plan file.

## Current baseline

- Najm Kit fixes for responsive card actions, adaptive table skeletons, and
  card pagination were first published in `najm-kit@2.1.48` and remain present
  in Kafil's installed `najm-kit@2.1.56`.
- Kafil's manifests and lockfile now resolve `najm-kit@2.1.56`. Its installed
  declarations expose the resilient `ImageInput` preview contract and the new
  shared `NDonutCard` component.
- Najm theme contracts and Kafil's persisted appearance validator already own
  `chart-1` through `chart-5`, including per-mode overrides editable through
  `NThemeCustomizer`.
- Installed `NCard` supports `loading` and a custom `skeleton` slot. The default
  `loading` branch renders `NLoadingState`; shaped loaders are available through
  `NStatCardSkeleton`, `NSkeletonChart`, `NSkeletonDonut`, and widget/list
  presets, but Kafil dashboards do not yet use them consistently.
- Fixes 1, 2, 4, and 5 are implemented in source. They remain in the final
  verification matrix only because their complete test/browser evidence has
  not yet been recorded at one worktree commit.
- Contributions now uses the shared `NTable` row menu, and the primary Kafil
  list pages expose the shared card-pagination contract. That contract is now
  known to be incomplete for continuation, height, and totals; see
  `PAGINATION-PLAN.md`.
- A temporary Kafil Brand assets preview adapter is present in the working tree.
  Kafil must adopt the installed shared `ImageInput` contract and remove the
  local workaround.
- Reusable bar, line, pie, and status-breakdown rendering still lives under
  `apps/web/src/components/charts`; this must move to Najm Kit rather than become
  a second Kafil-owned component system.
- Unrelated working-tree changes must be preserved throughout this plan.

## Phase 1 — Adopt the Najm image contract and verify Brand assets

Shared `ImageInput` implementation and publication are complete. This phase is
limited to adopting and verifying the installed `najm-kit@2.1.56` contract in
Kafil.

- [ ] Record the configured, fallback, draft, and resolved URL for expanded
  logo, collapsed logo, login logo, and login hero.
- [ ] Confirm root/app manifests, `bun.lock`, runtime package metadata, and
  installed declarations all resolve the exact `najm-kit@2.1.56` release.
- [ ] Replace the local `BrandingAssetPreview` plus upload-only `ImageInput`
  split with the published resilient `ImageInput` contract.
- [ ] Remove Kafil-only preview failure, source sequencing, and image-state code
  now owned by Najm Kit; retain Kafil localization and branding/storage logic.
- [ ] Verify every factory asset exists in the production build and decodes as
  the expected image type and dimensions.
- [ ] Verify every stored branding route returns raw bytes, the correct MIME
  type, safe cache headers, and the expected not-found response.
- [ ] Verify Settings, sidebar, and authentication screens consume the same
  resolved branding contract.
- [ ] Verify upload, immediate preview, save, reload, replace, revert, clear to
  fallback, and application restart without stale images.
- [ ] Verify a missing or undecodable asset displays the localized recovery
  state and never exposes a broken native image icon or generic `Preview` text.
- [ ] Exercise all four slots on desktop, mobile, and Arabic RTL.
- [ ] Run focused branding frontend/server tests and record exact results.

Phase 1 gate:

- [ ] Brand assets remain available after reload and production-style restart.
- [ ] Missing assets fail safely and recoverably.
- [ ] Authorization, upload limits, cleanup, localization, and cache behavior
  remain correct.

## Phase 2 — Finish Kafil table adoption and pagination gaps

Earlier Najm table release work is complete. This phase covers Kafil consumers
and data behavior.

A 2026-08-05 review of the live list surfaces found three defects that Kafil
cannot fix on its own — a permanent dead footer strip on card lists, an inert
`dynamicHeight`, and a fabricated `pageCount`. The resulting cross-repository
work is tracked in **`PAGINATION-PLAN.md`** at the repository root and must be
complete before this phase's gate can pass.

### Kafil consumer regression audit

- [ ] Audit Sponsors, Families, Contributions, Orders, Products, Categories,
  Support Assignments, Staff, Children, Applicants, and Admin Users to confirm
  permitted card actions use the installed Najm table contract.
- [ ] Confirm Contributions has no remaining card-injected ellipsis/dropdown or
  Kafil-only action-visibility workaround.
- [ ] Remove any obsolete Kafil skeleton count, border, height, or loading
  workaround that duplicates the installed package behavior.
- [ ] Browser-check action visibility, focus, menu anchoring, skeleton height,
  border/radius/shadow parity, and content overlap on phone, tablet, desktop,
  hybrid touch, and Arabic RTL layouts.

### Server pagination inventory

- [ ] Create an inventory of every unbounded list, its endpoint, default page
  size, search/filter/sort behavior, desktop navigation, and mobile continuation.
- [ ] Confirm no interactive list calls `listAllOffsetPages` or automatically
  downloads every page.
- [ ] Confirm no unbounded list silently stops at 100 rows.
- [ ] Convert any remaining first-100 list to server-backed pages with desktop
  controls and scroll-driven mobile/tablet continuation.
- [ ] Review 100-row lookups used inside filters/forms. Replace unbounded
  selectors with server search or document a proven small bound.
- [ ] Verify `hasNextPage` metadata or one-row lookahead at exact-page-size
  boundaries so continuation is never inferred incorrectly.
- [ ] Verify role, identity, search, filter, and sort changes reset accumulated
  pages without mixing privacy scopes.
- [ ] Verify mutations invalidate affected pages without stale, missing, or
  duplicated rows.
- [ ] Test 0, 1, page-size minus 1, exact page size, page-size plus 1, and
  multiple-page datasets.
- [ ] Browser-check every migrated list on desktop, mobile, tablet, and Arabic
  RTL, including append failure and retry.

Phase 2 gate:

- [ ] The `PAGINATION-PLAN.md` gate passes in full.
- [ ] Search, filters, and sorting are applied before pagination on the server.
- [ ] Authorization and sponsor/family privacy projections remain intact.

## Phase 3 — Move charts and dashboard skeletons to Najm Kit

Najm Kit owns reusable UI primitives. Kafil may keep dashboard query mapping,
localized month formatting, and value formatters, but it must not keep its own
SVG, bar, line, pie, legend, or responsive chart implementation after the
shared package is released.

### Najm Kit chart contract

- [ ] Inventory `MonthlyBarChart`, `MonthlyLineChart`, `PieBreakdown`,
  `StatusBreakdown`, `chartUtils`, their public props, and every Kafil consumer;
  separate reusable rendering from Kafil-specific data and localization.
- [ ] Add typed public Najm Kit exports for `NBarChart`, `NLineChart`,
  `NPieChart`, and `NStatusBreakdown`, and reuse or extend the installed
  `NDonutCard` instead of creating overlapping donut implementations.
- [ ] Add a typed `size` contract to `NPieChart` and `NDonutCard` so consumers
  can control the rendered chart diameter without custom SVG or CSS overrides;
  preserve sensible defaults and allow the chart to shrink within its container.
- [ ] Keep pie/donut sizing independent from card, center-label, and legend
  layout, and verify compact, default, and custom sizes do not clip, distort,
  overflow, or reduce accessible content on phone, tablet, or desktop.
- [ ] Make the shared charts accept caller-formatted labels and values, generic
  series/items, card title/icon content, empty states, legends, and accessible
  summaries without importing Kafil types, translations, or dashboard models.
- [ ] Use the existing `--chart-1` through `--chart-5` theme variables as the
  default series palette. Make item/series colors optional theme-backed
  defaults, while retaining an explicit color override for exceptional cases.
- [ ] Apply the same optional theme-palette behavior to `NDonutCard`; do not
  require every consumer to copy `var(--chart-N)` into its data model.
- [ ] Ensure strokes, fills, legend markers, totals, hover/focus states, and
  empty states remain readable in light and dark modes and do not hard-code a
  Kafil palette.
- [ ] Keep the five palette slots deterministic across rerenders and document
  the behavior when a chart contains more than five series/items.
- [ ] Verify `NThemeCustomizer` exposes `chart-1` through `chart-5` for the
  active light/dark mode and that draft edits update rendered charts live via
  the provider CSS variables, without reload or component remount.
- [ ] Add Najm Kit unit/type tests, accessibility coverage, responsive and RTL
  cases, zero/empty/single-point/multi-series cases, README examples, and
  playground examples for every public chart export.
- [ ] Run the Najm Kit lint, typecheck, tests, UI build, preview build,
  declaration/export check, and exact-tarball release audit; publish and record
  the verified release version and commit before Kafil adoption.

### Shared loading and skeleton contract

- [ ] Audit `NCard`'s `loading`/`skeleton` behavior and the installed
  `NStatCardSkeleton`, `NSkeletonChart`, `NSkeletonDonut`, `NSkeletonEventList`,
  `NSkeletonWidget`, and `NSkeletonWidgets` presets before adding new APIs.
- [ ] Keep `NCard loading` as the generic async-state fallback, but use its
  `skeleton` slot or a component-owned loading contract whenever the final card
  has a known shape; do not show the same centered loader for every card type.
- [ ] Add typed loading states to `NStatCard`, `NBarChart`, `NLineChart`,
  `NPieChart`, `NDonutCard`, and `NStatusBreakdown` so each component renders a
  skeleton matching its real header, body geometry, legend, and responsive size.
- [ ] Extend or replace the generic chart preset with reusable bar, line,
  pie/donut, and status/progress variants. Reuse the same Najm card surface so a
  skeleton never creates a nested or visually duplicated border, radius, or
  shadow.
- [ ] Provide shared list/activity and quick-action card skeleton patterns for
  dashboard cards that are not charts or stats; keep row counts configurable
  without Kafil-specific labels, routes, or data models.
- [ ] Ensure every preset inherits Najm card, border, radius, background,
  spacing, and motion tokens and respects reduced-motion preferences.
- [ ] Mark loading regions accessibly with `aria-busy` and an appropriate
  localized loading label while keeping decorative skeleton shapes hidden from
  assistive technology.
- [ ] Add unit/type tests, visual playground examples, responsive/RTL coverage,
  and layout-parity checks for every skeleton variant before package release.

### Kafil adoption

- [ ] Install the exact published Najm Kit chart release with Bun and verify the
  root/app manifests, lockfile, runtime package metadata, and declarations.
- [ ] Replace dashboard imports of `MonthlyBarChart`, `MonthlyLineChart`,
  `PieBreakdown`, and `StatusBreakdown` with the public Najm Kit components.
- [ ] Convert Kafil dashboard data to the generic chart contracts at the feature
  boundary; keep localized month and money/number formatters in Kafil.
- [ ] Remove `apps/web/src/components/charts`, obsolete chart prop types, and
  `DashboardCharts.tsx` re-exports once no consumer needs the local wrappers.
- [ ] Remove hard-coded series colors from Kafil consumers except documented
  semantic overrides, so normal chart colors come from the saved appearance.
- [ ] Create one shared dashboard loading composition that maps stat, bar,
  line, pie, donut, status, list/activity, attention, and quick-action card kinds
  to the matching Najm Kit skeleton while preserving each role's real grid spans.
- [ ] Replace Admin's local `DashboardLoading`, Family's single generic
  `<NCard loading>`, and Sponsor's height-based `SponsorDashboardSkeleton` cards
  with the shared composition; remove repeated arrays, arbitrary loading heights,
  and per-dashboard skeleton markup.
- [ ] Give every card in the Admin, Family, and Sponsor dashboard layouts a
  corresponding loader with the same title/header space, responsive footprint,
  and approximate content height as the loaded card.
- [ ] Keep generic `PageLoadingState` only for route/session/profile gates where
  the final dashboard layout is not yet known; use shaped dashboard skeletons
  for dashboard-data loading.
- [ ] Verify loading-to-content transitions do not reorder cards, change grid
  spans, cause cumulative layout shift, overflow at narrow widths, or flash an
  empty/error state before the query settles.
- [ ] Verify unsaved Theme Customizer previews, save, reload, reset, import,
  light/dark mode, and per-mode overrides update every dashboard chart
  consistently through `chart-1` to `chart-5`.
- [ ] Browser-check every migrated chart at 320–430 px, tablet, desktop, Arabic
  RTL, reduced motion, keyboard/focus, loading, empty, and error states; retain
  all 12 monthly points without horizontal overflow.
- [ ] Run focused Kafil chart/settings tests and the frontend verification gate,
  then record exact versions, commands, results, and remaining limitations.

Phase 3 gate:

- [ ] Reusable chart rendering exists only in the published Najm Kit package;
  Kafil contains domain adapters and formatters only.
- [ ] Bar, line, pie, donut, and status-breakdown charts inherit the active
  Theme Customizer chart palette by default in both light and dark modes.
- [ ] No dashboard loses data, localization, accessibility, RTL behavior, or
  responsive layout during the migration.
- [ ] Every dashboard card has a shape-matched shared skeleton, and no role
  dashboard keeps a hard-coded generic loading-card grid.

## Phase 4 — Consolidated Fix 1–8 acceptance

- [ ] Run all focused frontend, backend, authorization, privacy, storage, and
  pagination tests for Fixes 1–8.
- [ ] Verify every affected UI in English, French, Arabic, and Spanish.
- [ ] Verify representative phone, tablet, desktop, and Arabic RTL layouts.
- [ ] Confirm sponsor responses never expose guardian CIN, exact address,
  documents, notes, internal family profile IDs, or other private household data.
- [ ] Confirm UI visibility changes do not grant backend permissions.
- [ ] Run the complete local gate at the exact worktree under acceptance:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

- [ ] Run `bun run test:db` against the intended PostgreSQL test database.
- [ ] Record exact test counts, build route count, installed Najm versions,
  migration result, limitations, and the worktree commit.

Phase 4 gate:

- [ ] Every Fix 1–8 implementation, test, acceptance, and evidence requirement
  is satisfied at the same worktree commit.
- [ ] No unresolved critical/high defect, privacy leak, authorization gap,
  pagination ceiling, or broken branding asset remains.

## Phase 5 — Real four-account UI acceptance

Use four isolated browser contexts: bootstrap admin, one newly created family,
Sponsor A created with a fresh Gmail alias, and Sponsor B created by the managed
demo seed. Never persist passwords, OTPs, cookies, mailbox addresses, or other
secrets in the repository or evidence.

### Environment and identities

- [ ] Confirm the local/demo target, PostgreSQL database, SMTP provider,
  protected admin credentials, primary Gmail connection, and Sponsor B
  one-time credential handoff without printing secrets.
- [ ] Generate a unique run label and fresh Moroccan-friendly test identities.
- [ ] Create the family through the admin UI, complete its forced first-login
  password change, and verify family-only navigation and data.
- [ ] Submit Sponsor A through `/apply`, retrieve only its matching OTP email,
  verify it reaches `pending_review` without a sponsor session, approve it in
  the admin UI, verify the decision email, and sign in normally.
- [ ] Sign in as seeded Sponsor B and rerun the supported non-destructive seed
  path to prove identity reuse without duplicate profiles or password changes.

### Contributions, privacy, and funding

- [ ] Assign both sponsors to the same family through the admin UI and verify
  distinct assignments aggregate into one sponsor-safe family summary.
- [ ] Exercise pending, rejection, validation, stale duplicate validation,
  refund, plan pause/resume/stop, and exact funding-target activation.
- [ ] Verify every ledger and balance transition in integer minor units and
  prove duplicate commands do not duplicate credits, refunds, audit records,
  notifications, or outbox effects.
- [ ] Verify each sponsor sees the shared family once and only their own
  contribution/plan history, with no cross-sponsor or household-private data.

### Orders, purchase, and delivery

- [ ] Exercise family order submission and cancellation with exact reserve
  release and idempotency evidence.
- [ ] Exercise admin rejection of a pending order with exact reserve release.
- [ ] Exercise a complete order: submit, approve, purchase with real test
  receipt and controlled variance, assign delivery Staff A, fail the attempt,
  reassign Staff B, retry, and confirm delivery.
- [ ] Verify immutable lifecycle history, one active delivery attempt, exact
  available/reserved/spent balances, and no duplicate transition effects.
- [ ] Recheck the final order from all four accounts and verify each role sees
  only its authorized projection.

### Responsive and negative acceptance

- [ ] Capture desktop, tablet, phone, keyboard, focus, validation, loading,
  empty, error, and Arabic RTL evidence for the critical journeys.
- [ ] Verify forbidden routes and actions fail server-side, direct/stale actions
  fail safely, and isolated sessions never leak state across accounts.
- [ ] Inventory all created test data and record whether it is retained for the
  demo or removed through supported application workflows.

Phase 5 gate:

- [ ] All four accounts complete the connected journey without unresolved UI,
  email, session, authorization, privacy, financial, or lifecycle failures.
- [ ] Evidence contains masked identifiers only and no secrets.

## Phase 6 — Audit and publish GitHub `main`

- [ ] Inspect every modified, deleted, and untracked file and review the entire
  diff, preserving unrelated user changes.
- [ ] Scan the intended commit for `.env` data, credentials, tokens, private
  household data, OTPs, cookies, dumps, certificates, and generated artifacts.
- [ ] Confirm migrations are additive and intentional and no deployed migration
  was edited.
- [ ] Fetch `origin`, record local and remote SHAs, and integrate remote changes
  non-destructively if `origin/main` advanced.
- [ ] Rerun `bun run check`, `bun run test:db`, `bun run db:generate`, the
  complete browser matrix, and production runtime smoke after synchronization.
- [ ] Verify `/`, `/dashboard`, `/api/system/health`, and `/api/mcp/tools` in the
  production-style runtime.
- [ ] Stage only the audited release, run `git diff --cached --check`, review the
  complete staged diff/stat, and create the release commit on `main`.
- [ ] Push normally to `origin/main`; never force-push.
- [ ] Verify local `HEAD`, fetched `origin/main`, and GitHub remote SHA match.
- [ ] Monitor the GitHub workflow to a terminal result and report deployment
  status separately from local acceptance.

Phase 6 gate:

- [ ] The intended work is present on GitHub `main` at the recorded SHA.
- [ ] The worktree is clean or every intentional remaining file is documented.
- [ ] Local, database, browser, production-smoke, workflow, and deployment
  results are recorded with clear pass/fail boundaries.

## Execution order

- [ ] Phase 1 — Najm image-contract adoption and Brand assets verification
- [ ] Phase 2 — Kafil table adoption and pagination gaps
- [ ] Phase 3 — Najm Kit charts, themed colors, and shared dashboard skeletons
- [ ] Phase 4 — Consolidated Fix 1–8 acceptance
- [ ] Phase 5 — Real four-account UI acceptance
- [ ] Phase 6 — Audit and publish GitHub `main`

Do not mark a phase complete without implementation, focused tests, acceptance,
and exact recorded evidence. Local completion does not count as successful
deployment.
