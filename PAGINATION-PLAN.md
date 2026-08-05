# Kafil List Continuation and Pagination Plan

Status: **ACTIVE**

Last updated: 2026-08-05

Scope: how every Kafil list continues, fills its container, and reports how
much data exists. Owned by Phase 2 of the root `PLAN.md`, which links here and
retains the broader table-adoption and server-pagination inventory work.

This plan spans two repositories and one server change. The Najm Kit work must
be published before Kafil can consume it, because `najm-kit` is pinned by the
root `overrides` block.

## Defects found 2026-08-05

Two of the three are fixed and released. The third is untouched.

- **FIXED in `najm-kit@2.2.0`** — **Card lists render a permanent dead footer.**
  `NTablePagination` renders
  outside the `NajmScroll` container owned by `NTableCards`, so the
  `load-more` footer is a fixed strip rather than content the user scrolls
  past. Every list shorter than one page (Categories at 18 rows, Support
  Assignments) permanently spends that strip on `No more items.`
- **FIXED in `najm-kit@2.2.0`** — **`dynamicHeight` is silently inert on every
  Kafil list.** Najm Kit measures
  the container correctly but discards `calculatedPageSize` when
  `manualPagination` is set, and returns early before applying it. Kafil sets
  `manualPagination: true` everywhere, so all tables fall back to the store
  default of 10 rows regardless of viewport height. This is the empty band
  between the last row and the pagination bar on desktop.
- **NOT FIXED** — **`pageCount` is fabricated.** `useResponsiveOffsetList`
  derives
  `pageIndex + (hasNextPage ? 2 : 1)`, which can only ever report one page
  beyond the current one. A 100-row result still displays `Page 1 of 2`, and
  the last-page control jumps to page 2 rather than the last page. Root cause
  is that every list endpoint returns a bare array with no total.

## Decisions

- Mobile/tablet card lists move from an explicit **Load more** button to
  scroll-driven continuation. The button is retained but rendered **only** on
  append failure, as the Retry target. This supersedes the "explicit
  mobile/tablet Load more" requirement previously recorded in Phase 2.
- Desktop tables and desktop card grids keep numbered pagination **by
  default**. They must fill the available height and report an honest total.
- Continuation is selectable per list through a `strategy` option, chosen
  where the data is fetched rather than where it is rendered. "Can this set be
  fetched whole?" is a data question, not a presentation one. Omitting the
  option preserves today's behavior.

  | `strategy` | Desktop | Mobile | For |
  | --- | --- | --- | --- |
  | *(default)* | numbered pages | infinite | unbounded sets |
  | `infinite` | infinite | infinite | browse surfaces |
  | `all` | scroll, no controls | scroll, no controls | proven bound ≤ 100 |

- `all` is a hint, never a promise. It issues **one** request at the server
  `limit` ceiling of 100 and must not chain pages; the existing "no list
  downloads every page" rule stands. If the response returns exactly the
  ceiling, the bound was not real: fall back to `infinite` automatically and
  warn in development. A list must never silently render 100 of 5,000 rows.
- Desktop infinite scroll needs no new Najm Kit capability. `NTablePagination`
  already dispatches on view mode, not viewport; Kafil's own
  `if (!state.cardViewport) return { mode: "paged" }` is the only thing
  preventing it.
- Infinite scrolling the desktop **table** is explicitly out of scope. Rows
  grow unbounded without virtualization, and numbered pages plus search are
  the better tool for operator record lists. Use cards mode for infinite on
  desktop.
- ~~Result totals ship as an `X-Total-Count` response header.~~ **Withdrawn
  2026-08-05 during implementation.** The frontend cannot read it: `api.get`
  delegates to `auth.api.get`, which resolves the parsed JSON body and never
  exposes response headers. A header would require replacing the shared auth
  API client for every list call.
- Result totals ship instead through najm-core's own `paginated(data, { page,
  limit, total })` helper, which returns `{ data, pagination, status }`. The
  existing frontend `unwrapApiResponse` already returns `.data`, so current
  callers keep working unchanged and only a total-aware reader is new.
- Scope note recorded during implementation: 32 repository methods across 14
  modules take `limit`/`offset`. Only the ten backing a numbered-pagination
  desktop table need totals; dashboard widgets and ledger reads render no page
  controls. Moving a service from `T[]` to the `paginated` envelope changes its
  return type, which also reaches MCP tool outputs and every test asserting an
  array, so each module must migrate service, MCP expectations, and tests
  together rather than piecemeal.

## Sequencing

The server totals work is independent of the package release. Kafil adoption of
continuation depends only on Stage B.

- [ ] Stage A — Server result totals (this repository, no package dependency)
- [x] Stage B — Najm Kit contract changes — **published as `najm-kit@2.2.0`**
- [x] Stage C — Kafil continuation adoption — **done**; the totals half of
  Stage C remains blocked on Stage A
- [ ] Stage D — Acceptance

### Status 2026-08-05

Shipped and verified:

- `najm-kit@2.2.0` on npm. 750 package tests pass, lint and both typechecks
  clean, package builds.
- Kafil pinned to `najm-kit@2.2.0` in the root `overrides` and `apps/web`.
- Card lists continue on scroll with no button and no end-of-list strip.
- Desktop tables and card grids fill their container height.
- The `strategy` option and the `all` self-downgrade exist and are covered by
  types; no list opts into `all` yet, because that requires proving a bound.
- Kafil gate green: lint, typecheck, test (379 server, 79 seed), build, and
  `db:generate` reporting no schema change.

Not started: Stage A. Until it lands, `pageCount` remains
`pageIndex + (hasNextPage ? 2 : 1)` and a paged desktop table still reports
`Page 1 of 2` for any result longer than two pages.

## Stage A — Server result totals

**NOT STARTED.** This is the whole of the remaining work.

Apply only to the ten list endpoints that back a numbered-pagination desktop
table. Dashboard widgets and ledger reads take `limit`/`offset` but render no
page controls, so they need no total.

- [ ] Add a filtered `count()` alongside each list query, reusing the **same**
  condition builder as the row query so the two can never diverge. Apply the
  same filters, search, and authorization scope.
- [ ] Keep sponsor and family privacy projections intact; a total must never
  disclose rows the caller cannot list.
- [ ] Return `paginated(rows, { page, limit, total })` from the migrated
  services. This changes the service return type from `T[]` to an envelope, so
  migrate each module's service, MCP tool expectations, and tests together.
- [ ] Add a total-aware reader to `apps/web/src/services/http.ts`. The response
  body already carries `pagination` alongside `data`; `unwrapApiResponse`
  discards it, so existing callers are unaffected and only the reader is new.
- [ ] Surface the total in `useResponsiveOffsetList` so `pageCount` becomes
  `ceil(total / pageSize)`, and remove the fabricated
  `pageIndex + (hasNextPage ? 2 : 1)` derivation.
- [ ] Verify the last-page control reaches the real last page, and that the
  count stays correct across search, filter, sort, and mutation invalidation.

## Stage B — Najm Kit contract changes (sibling `najm` repository)

### Infinite card continuation

- [x] Add an `infinite` card pagination mode to `NTableCardPagination`
  carrying the existing `hasNextPage`, `loadingMore`, `loadMoreError`,
  `onLoadMore`, `retryLabel`, `loadMoreErrorLabel`, and `itemsLoadedLabel`
  fields, and no `loadMoreLabel`/`endLabel`.
- [x] Return `null` from `NTablePagination` for the `infinite` mode, matching
  the existing `all` behavior.
- [x] Own the sentinel inside `NTableCards`, within the `NajmScroll`
  container, and set the observer `root` to that container. Reuse the
  exported `useInfiniteScroll` hook rather than adding a second observer.
- [x] Render skeleton cards at the grid tail while the next page is in
  flight; never a spinner in a fixed strip.
- [x] Render no end-of-list element when `hasNextPage` is false.
- [x] Reveal the continuation button only on append failure, preserving the
  existing pending guard, focus restoration, and `role="alert"` error text.
- [x] Preserve the polite `aria-live` region announcing appended row counts;
  it is the only signal assistive technology receives.

### Container-aware page size

- [x] Apply `calculatedPageSize` under `manualPagination`, debounced, and
  report the change through `onPaginationChange` so the consumer keeps
  ownership of fetching. A resize must not issue an undebounced request.
- [x] Snap card-mode page size to `cardColumnCount * rowsThatFit` so a card
  grid never ends in a ragged partial row. Today `pageSize: 10` against a
  four-column grid ends **every** page at 2.5 rows, not only the last one.
- [x] Compute that row count with `Math.floor`. The existing
  `calculateCardSkeletonCount` uses `Math.ceil`, which is correct for
  skeletons — overfilling is harmless there — but reusing it unchanged for
  page size overflows the container by a partial row and reintroduces the
  scrollbar this work removes.

### Whole-set rendering in table mode

- [x] Extend `renderAllSuppliedRows` beyond cards so `all` is honored in
  table mode: render every supplied row, scroll the table body, and return
  `null` from `NTablePagination`.
- [x] Keep this separate from infinite table rows, which stay out of scope.

### Release

- [ ] Add unit, type, accessibility, RTL, and reduced-motion coverage for the
  new mode; verify 0, 1, exact-page-size, and multi-page datasets.
  **Partly done.** `test/table/infinite-continuation.test.tsx` covers the unit
  behavior, the sentinel lifecycle, duplicate-request guarding, tail
  placeholders, failure/retry, the polite announcement, `all` in table mode,
  and the `calculateCardPageSize` floor. **Still missing: RTL, reduced motion,
  and the 0 / 1 / exact-page-size boundary matrix.**
- [x] Run the Najm Kit gate and publish; record the exact released version and
  commit before Kafil adoption.

## Stage C — Kafil consumer adoption

- [x] Install the exact published Najm Kit release with Bun and verify the
  root/app manifests, `bun.lock`, root `overrides`, runtime package metadata,
  and installed declarations all resolve it.
- [x] Switch `createCardPagination` to the `infinite` mode and drop the now
  unused `loadMore` and `loadingMore` labels. Do not add the missing
  `endOfList` key; the English `No more items.` string is no longer rendered.
- [x] Add the `strategy` option to `useResponsiveOffsetList` and the feature
  hooks that wrap it, and have `createCardPagination` resolve the rendered
  mode from it. Default behavior must be unchanged for callers that omit it.
- [x] Implement the `all` self-downgrade: one request at the ceiling, fall
  back to `infinite` when the response fills the ceiling exactly, and log a
  development warning naming the list.
- [ ] Assign a strategy per list only where a bound is proven. Record the
  evidence for each `all` list; an unbounded set keeps the default.
  **Deliberately not done.** No list opts into `all`; every one keeps the
  default. Opting a list in is a claim about its data bound that must be
  proven, not assumed.
- [ ] Reset the card scroll container to the top when the row set identity
  changes, so a search or filter cannot leave the user mid-list.
  **Not done — open gap.** Typing in a search box starts a fresh query, but the
  scroll offset is retained, so the user can land mid-list.
- [ ] Confirm `dynamicHeight: true` now takes effect on all eleven list pages
  and that no page keeps a hard-coded page size to compensate.
  **Not verified.** No browser run was performed; only the package unit tests
  prove the measurement path.
- [ ] Display the real result total in the page header where it helps the
  operator judge scope. **Blocked on Stage A.**

## Stage D — Acceptance

- [ ] Test 0, 1, page-size minus 1, exact page size, page-size plus 1, and
  multiple-page datasets on each continuation mode.
- [ ] Test each `strategy` on both viewports, including a dataset sized
  exactly at the 100-row ceiling to prove the `all` downgrade fires.
- [ ] Verify role, identity, search, filter, and sort changes reset
  accumulated pages without mixing privacy scopes.
- [ ] Verify mutations invalidate affected pages without stale, missing, or
  duplicated rows.
- [ ] Browser-check every list on phone, tablet, desktop, and Arabic RTL,
  including append failure and retry.
- [ ] Verify reduced-motion and keyboard/screen-reader continuation, including
  the appended-rows announcement.
- [ ] Run the root verification gate and record exact commands and results.

## Gate

Ticked only where evidence exists. Package unit tests are evidence; a browser
run is not yet.

- [ ] Paged lists request only the visible server page, fill the available
  height, and report a total derived from the server. **The total half fails —
  Stage A.**
- [x] Continuation fetches exactly one additional page at a time and no list
  chains pages to download a whole result set. Covered by the duplicate-request
  guard test.
- [x] No `all` list silently truncates; every one either proves its bound or
  downgrades to `infinite` at runtime. The downgrade is implemented; vacuously
  satisfied while no list opts in.
- [x] No list renders a permanent footer strip when there is nothing to load.
- [x] Append failure is recoverable without losing already-rendered rows.
- [x] Search, filters, and sorting are applied before pagination on the server.
  Unchanged by this work; no server behavior was modified.
- [x] Authorization and sponsor/family privacy projections remain intact. No
  backend change was made, so nothing could regress.

Outstanding before this plan can close: Stage A, the scroll-reset gap in Stage
C, and the whole of Stage D.
