# Kafil global fixes

Date: **2026-09-19**

Status: **Fixes 1, 2, 3, and 4 are implemented. Source and focused tests pass;
the repository gate result is recorded per fix. Fixes 1-3 previously passed the
repository gate, and `db:generate` reported no schema change. Automated browser
acceptance has not been run: the user verified the Delivery layout manually and
directed that the two workspace columns share one height, which is implemented
and asserted. Nothing has been committed, pushed, or deployed.**

Implementation owner: **Claude Opus coder**

## 1. Purpose

This is the bounded implementation queue for user-visible Kafil fixes that are
confirmed from the running product. Each fix must remain independently
reviewable, testable, reversible, and reportable. A later fix may be appended
as `Fix 2`, `Fix 3`, and so on, but it must not silently expand an earlier
fix's authorization, persistence, or deployment scope.

The first confirmed issue is that an Admin or Operator can retrieve a protected
purchase receipt through the backend, but the order-details sheet does not
present the purchase record or a receipt-view action. The second confirmed
issue is that the Delivery map's Today and date controls are semantically in the
card header but wrap onto a separate visual row on a narrow mobile viewport.
The third confirmed issue is the Delivery dashboard's information hierarchy:
statistics currently follow the map, while the existing Scheduled deliveries
card is separated from the map instead of forming one map-and-plan workspace.

## 2. Global execution rules

Before implementing any fix:

1. Read root `AGENTS.md`, this plan, and the repository-local skills required
   by the files in that fix.
2. Inspect `git status --short` and preserve every unrelated edit. Never
   restore, reformat, stage, or commit another task's work.
3. Confirm installed Najm package declarations before using a component or
   transport API. Do not invent Najm Kit props from memory.
4. Implement and validate one numbered fix at a time. Do not mark the global
   plan complete while any registered fix remains open.
5. Keep source validation, database validation, browser acceptance, Git
   publication, deployment, and connected production acceptance as separate
   completion boundaries.
6. Never expose secrets, bearer tokens, protected file bytes, family addresses,
   or receipt references in logs or evidence.

## 3. Fix register

| Fix | Description | Source status | Browser status | Deployment status |
| --- | --- | --- | --- | --- |
| 1 | Show the active purchase and securely view its receipt from Admin/Operator order details | Implemented; focused tests and root gate pass | Automated run not performed | Not deployed |
| 2 | Keep the Delivery map date controls on the same header row as the card title | Implemented; focused tests and root gate pass | Specs written; automated run not performed | Not deployed |
| 3 | Put Delivery statistics first, then pair the map and Scheduled deliveries in a 60/40 workspace | Implemented; focused tests and root gate pass | Specs written; manual user check of the stats-first 60/40 layout; automated run not performed | Not deployed |
| 4 | Reorder the Delivery order sheet and remove redundant status/package details | Implemented; focused test and typecheck pass | Automated run not performed | Not deployed |

Deviation from this plan, on explicit user instruction: section 24.4 asked the
Scheduled deliveries card to take its natural content height. The user reviewed
the rendered dashboard and required both workspace columns to share one height,
so both cards now fill the grid row (`h-full`). The source contract and the
browser geometry assertions were updated to match.

Add future fixes to this table only after their current behavior, desired
behavior, owning files, authorization boundary, and acceptance proof are known.

---

# Fix 1 - Admin and Operator purchase receipt view

## 4. User-visible outcome

In the existing order-details sheet, place a new **Purchase & receipt** section
after Products and before purchasing/delivery details.

When an active purchase exists, show:

- merchant name;
- purchase date and time using the shared locale-aware formatter;
- receipt number, with the localized `Not provided` value when it is null;
- actual total in integer minor units through the shared money formatter;
- a full-width **View receipt** action.

When no active purchase exists, keep the section present and show a localized
empty state:

```text
Receipt not recorded yet
Available after the purchase is recorded.
```

The successful state follows this structure:

```text
Products
  ...existing product lines and requested total...

Purchase & receipt
  Merchant          Marjane
  Purchase date     9/19/26, 4:42 PM
  Receipt number    REC-28491
  Actual total      MAD 598.00
  [ View receipt ]

Delivery
  ...existing assignment/delivery card...
```

Clicking **View receipt** opens the protected PDF or image in a new browser tab
without putting a bearer token in the URL. The current order sheet stays open.

## 5. Confirmed current state

The implementation starts from these existing contracts:

- `OrderService.orderDetail(..., "operator")` already returns the active
  purchase, including receipt path, MIME type, byte size, merchant, receipt
  number, purchase time, and actual total.
- `OperatorRoleGuard` already accepts both `operator` and `admin` roles.
- `GET /order-evidence/:kind/serve/:fileName` already serves protected bytes
  with `private, no-store`, inline content disposition, MIME type, and
  `nosniff` headers.
- Family and Sponsor projections do not receive raw receipt paths.
- Delivery may upload or discard its own receipt candidate, but the serve route
  remains Operator/Admin-only.
- `OrderDetails` currently renders the shared Family and Products summary,
  purchasing staff, delivery, and status reason, but no purchase/receipt
  section or view action.
- Kafil keeps its access token in the Najm Auth client and attaches it as an
  `Authorization: Bearer ...` header. A plain `<a href>` or direct
  `window.open(receiptStoragePath)` would omit that credential and is not an
  acceptable implementation.

Reconfirm these facts against the source and installed packages immediately
before implementation. If any contract has changed, update this plan before
changing behavior.

## 6. Authorization and privacy contract

The source change must preserve all of these invariants:

| Principal | Purchase metadata in this sheet | Raw receipt bytes |
| --- | --- | --- |
| Admin | Allowed | Allowed |
| Operator | Allowed | Allowed |
| Delivery | Own workflow remains unchanged | Denied |
| Family | Privacy-safe receipt-recorded state only | Denied |
| Sponsor | Privacy-safe receipt-recorded state only | Denied |
| Anonymous | Denied | Denied |

Rules:

1. The backend guard is authoritative. UI visibility is not authorization.
2. Do not broaden `OrderEvidenceController.serve()` to an order-reader guard or
   add Family, Sponsor, or Delivery to it.
3. Do not add receipt paths to Family, Sponsor, Delivery, audit, notification,
   or outbox projections.
4. Do not create a public/static receipt URL, signed token in the query string,
   or service-worker cache entry.
5. Do not log the receipt reference, response bytes, access token, or generated
   object URL.
6. Keep the response non-cacheable and same-origin.

## 7. Implementation design

### 7.1 Authenticated protected-file transport

Owner: `apps/web/src/services/http.ts`

Add a narrow authenticated binary GET helper alongside the existing JSON and
upload/delete transports.

Required behavior:

- accept only an application-relative `/api/...` path supplied by a
  feature-specific adapter;
- call the existing access-token readiness/refresh path;
- fetch with `credentials: "include"` and the current bearer token;
- on the first `401`, refresh once and retry once, matching the existing
  transport contract;
- reject non-2xx responses through the same public error pipeline used by the
  UI;
- return the `Blob` plus relevant response metadata without parsing it as JSON;
- never persist or cache the bytes.

Do not weaken or overload the existing JSON `api.get()` behavior. Expose a
clearly named file-read method such as `api.getFile()` only after verifying the
current installed auth-client contract.

### 7.2 Receipt-specific adapter and reference validation

Owner: `apps/web/src/services/orderApi.ts`

Add one receipt-view adapter that accepts the server-provided receipt reference
and rejects anything outside the exact managed form:

```text
/api/order-evidence/receipts/serve/<uuid>.<pdf|jpg|jpeg|png|webp>
```

The adapter must pass the existing same-origin `/api/...` path directly to the
binary helper. It must not prepend a second `/api`, accept a full URL, accept
`..`, change `receipts` to another evidence kind, or accept a maintenance or
delete route.

Keep path normalization in this adapter rather than scattering string
replacement through the component.

### 7.3 Purchase-and-receipt section

Primary owners:

- new focused component under
  `apps/web/src/features/Orders/components/`, for example
  `PurchaseReceiptSection.tsx`;
- `apps/web/src/features/Orders/components/OrderDetails.tsx`;
- `apps/web/src/features/Orders/types.ts` only if a type needs narrowing, not a
  duplicate purchase model.

Use Najm Kit and existing Kafil conventions:

- semantic section heading with a Lucide receipt icon;
- `NCard` and `NDetailList` for metadata;
- `NButton` for the view action;
- `useNajmFormat()` for date/time and money;
- existing error/toast behavior for a failed file request;
- verified pending/disabled affordances so repeated clicks cannot start
  concurrent reads.

Do not add a second order query. Consume `data.activePurchase` from the existing
`useOrder()` result. Do not recompute actual totals from product lines.

Place the section only in the Operator/Admin `OrderDetails` branch. Do not put
it in `SponsorOrderDetails`, `FamilyOrderDetails`, or Delivery-owned detail
components.

### 7.4 Safe preview lifecycle

The user gesture must open one new tab while popup permission is still valid,
then navigate that tab to a short-lived object URL after the authenticated
fetch succeeds.

Required sequence:

1. On button activation, synchronously open a blank same-origin tab with
   `noopener,noreferrer` behavior.
2. Start the authenticated binary request.
3. Verify the returned MIME type agrees with the recorded supported receipt
   type before previewing.
4. Create an in-memory object URL and navigate the prepared tab to it.
5. Revoke the object URL after a safe bounded lifetime or when ownership is
   otherwise released; do not revoke it before the new tab has loaded it.
6. If opening or fetching fails, close the blank tab when possible, restore
   the button state, and present a localized error without closing the order
   sheet.

If browser behavior proves that the `noopener` window cannot be navigated by
the opener, use a Najm dialog-based in-app viewer instead. Do not fall back to
putting the bearer token in a URL or opening the protected path directly.

PDF and supported image receipts must both work. Unsupported or mismatched
content must fail closed.

### 7.5 Localization

Owners:

- `packages/server/src/locales/en.json`
- `packages/server/src/locales/fr.json`
- `packages/server/src/locales/ar.json`
- `packages/server/src/locales/es.json`

Add matching keys for:

- Purchase & receipt;
- Merchant;
- Purchase date;
- Receipt number;
- Actual total;
- View receipt;
- Receipt not recorded yet;
- Available after the purchase is recorded;
- Not provided;
- Receipt could not be opened.

Use natural translations, preserve locale parity, and verify Arabic RTL. Do
not leave English literals in the feature component.

## 8. Tests

### 8.1 Focused source and component contracts

Add or extend focused tests under `apps/web/test/` to prove:

- the Operator/Admin details branch renders the purchase section between the
  shared Products content and Delivery content;
- all four purchase fields use `activePurchase` and the shared formatters;
- null receipt numbers render the localized fallback;
- the empty state is rendered when `activePurchase` is null;
- the view action is absent from Family, Sponsor, and Delivery components;
- the adapter accepts the exact managed receipt path and rejects full URLs,
  traversal, other evidence kinds, unsupported extensions, and malformed IDs;
- the binary request sends the current bearer credential, refreshes once after
  a first `401`, does not JSON-parse success bytes, and surfaces final errors;
- no direct `window.open(receiptStoragePath)` or plain receipt anchor is added.

Retain the existing server guard test in
`packages/server/test/order-evidence.test.ts`. If backend source does not
change, do not manufacture a backend refactor merely to add coverage. Add only
the narrow Admin/Operator allow and other-role denial proof missing from the
existing suite.

Run while iterating:

```text
bun run --cwd apps/web test
bun run --cwd apps/web typecheck
bun run --cwd packages/server test
```

### 8.2 Focused browser proof

Use the smallest real Playwright work unit with passive diagnostics. Do not
mock the receipt request for final acceptance.

Prove with an authenticated Admin account and real protected storage:

1. Open an order with an active purchase in `purchased`, `out_for_delivery`, or
   `delivered` state.
2. Confirm merchant, formatted purchase date, optional receipt number, actual
   total, and the enabled View receipt action.
3. Register the exact receipt GET observer before clicking.
4. Click once and assert one GET to the exact managed receipt pathname, a `200`
   response, the expected MIME type, and non-empty bytes.
5. Assert a preview tab opens and the original order sheet remains open.
6. Assert no unexpected console errors, page errors, failed requests, or HTTP
   errors.

Also prove:

- an approved order without a purchase shows the empty state and no view
  action;
- an active replacement purchase shows and opens the replacement receipt, not
  a reversed historical receipt;
- a denied/expired request leaves the sheet usable and shows the localized
  failure state;
- Family and Sponsor crafted receipt requests remain denied;
- Delivery cannot serve the receipt even though its own upload-candidate route
  remains valid;
- desktop, narrow mobile, keyboard-only activation, French, and Arabic RTL do
  not clip metadata or lose focus.

Record browser evidence under a new dated directory in `docs/evidence/` only
after the run passes. Never store receipt bytes, tokens, generated identity
data, or exact family addresses in evidence.

## 9. Completion gates for Fix 1

After focused tests pass, run the repository gate from `AGENTS.md`:

```text
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Expected schema result: **no generated migration and no schema drift**. Fix 1
is a frontend transport/presentation change using an existing protected server
route and existing order projection.

Then report these independently:

| Boundary | Required evidence |
| --- | --- |
| Source | Diff reviewed; focused tests and root gate pass |
| Authorization | Admin/Operator allow and other-role denial remain proven |
| Database | `db:generate` creates no migration |
| Browser | Focused real-storage Playwright journey passes |
| Git | Commit/push only when explicitly requested |
| Deployment | Exact deployed revision and healthy runtime only when explicitly authorized |
| Production acceptance | Fresh connected Admin receipt proof only after deployment authority |

Do not label Fix 1 complete merely because the source tests pass. Browser
acceptance is required for the reported screenshot defect.

## 10. Rollback

Fix 1 has no schema or data migration.

To roll it back:

1. Remove the purchase/receipt section from Operator/Admin order details.
2. Remove the receipt adapter and binary GET helper only if no later fix uses
   them.
3. Remove the new locale keys and focused tests in the same rollback.
4. Rebuild and redeploy the prior known-good application revision.

Do not change, delete, or make public any stored receipt. The existing protected
serve route and purchase records remain valid throughout rollback.

## 11. Out of scope for Fix 1

- changing purchase recording or receipt replacement workflows;
- changing who may upload a receipt;
- allowing Family, Sponsor, or Delivery to view raw receipts;
- adding receipt download, print, OCR, annotation, or deletion features;
- showing reversed purchase history;
- changing order statuses, budget settlement, ledger behavior, or delivery
  transitions;
- database or storage migrations;
- making order evidence public or cacheable;
- deploying, pushing Git commits, or running against production without a
  separate explicit request.

# Fix 2 - Delivery map single-row date header

## 12. User-visible outcome

Keep the Delivery map title block and its date filters in one visual header row
on mobile, tablet, and desktop.

The card header must read as one compact toolbar:

```text
[pin] Delivery map                         [Today] [September 19th, 2026] [calendar]
      Scheduled family addresses
```

On the narrow mobile viewport shown in the reported defect, **Today** and the
date picker remain aligned at the logical end of the same row as **Delivery
map**. They must not drop below the title or create a second controls row.

The title side may consume the remaining flexible width. The title remains
readable before truncation; the subtitle may truncate on the narrowest
supported viewport. The controls retain their current 40-pixel height and must
not become icon-only, overlap, clip outside the card, or force horizontal page
scrolling.

Changing the date continues to:

- keep the map mounted while the next date loads;
- show a visible and screen-reader-announced loading state;
- clear the selected delivery and the expanded-list state;
- request the selected Casablanca calendar date once;
- update the existing map, counts, chart, issues, and delivery list together;
- keep the date out of the URL; and
- preserve **Today** as the only date preset.

## 13. Confirmed current state

The implementation starts from these source and installed-package facts:

- `DeliveryDashboardPage` already renders the title, subtitle, and map pin
  through one `NCard` header.
- Today and `DateInput` already live in `NCardAction`; this is not a request to
  move them into the map body or create another toolbar.
- The Kafil override `classNames.header: "flex-wrap gap-2"` opts the installed
  `NCard` header into wrapping. At the reported width, the complete action slot
  moves to the next line.
- Installed `najm-kit@2.16.6` renders an `NCard` header as a horizontal,
  `min-w-0`, `justify-between` flex row. Its action slot is shrink-resistant,
  and `NCard.classNames` exposes `header`, `title`, `description`, and `icon`
  escape hatches.
- The current Today button is `h-10`; the date field is `w-32 sm:w-48` and
  formats the selected date inside the installed `DateInput`.
- A separate `size-10` spinner is inserted before those two controls while
  React Query serves placeholder data. It temporarily adds another 40 pixels
  plus a gap to the action width.
- `useDeliveryDashboard(date)` already uses `keepPreviousData`, so the card and
  Leaflet map stay mounted during a date transition.
- Existing source tests pin the `NCardAction`, equal control height, one Today
  preset, date-independent query keys, no date URL state, and the persistent
  map behavior.
- The required English, French, Arabic, and Spanish title, subtitle, Today, and
  date-picker accessible-name translations already exist.

Reconfirm the installed declarations and implementation immediately before
coding. Never patch `node_modules`. If the installed `NCard` escape hatches no
longer provide the confirmed behavior, stop and update this plan with a
separate Najm package release/adoption boundary before editing shared source.

## 14. Authorization and privacy contract

Fix 2 is layout-only. It must preserve these boundaries:

1. The Delivery dashboard remains available only through its existing role and
   route authorization. A visual change must not alter guards or navigation.
2. The browser continues to request only the authenticated Delivery dashboard
   projection for the selected date.
3. Do not add family addresses, coordinates, phone numbers, marker payloads,
   or selected-delivery data to the URL, DOM attributes, console output,
   screenshots, traces, or test names.
4. Do not add analytics, geolocation, tracking, route drawing, or a new map
   provider request.
5. Do not move the filters over the map. Nothing may be layered over markers or
   interfere with Leaflet controls, attribution, marker selection, or keyboard
   operation.
6. The title and filter layout must use logical direction and be verified in
   Arabic RTL; do not fix LTR by adding a physical left/right offset that breaks
   RTL.

No backend, permission, database, seed, storage, or financial source is owned
by Fix 2.

## 15. Owning files and implementation design

### 15.1 Primary source owner

Owner:

- `apps/web/src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx`

Keep one map card and one date-control group. Do not create separate mobile and
desktop card headers and do not render duplicate Today or date-picker controls
that are merely hidden at a breakpoint.

Update the existing `NCard` composition as follows:

1. Retain `title`, `description`, `icon={MapPin}`, and one `NCardAction`.
2. Remove the Kafil `flex-wrap` override from the card header. Preserve a
   bounded gap while allowing the installed `min-w-0` title side to shrink.
3. Keep the action slot shrink-resistant and on the logical end of the header.
4. Constrain the secondary subtitle to one line on narrow widths so it cannot
   push the action slot onto another row. The title remains a single-line
   ellipsis through the installed card behavior.
5. Preserve the existing 40-pixel Today and date-field height. A narrow-screen
   padding adjustment is allowed, but neither control may fall below a
   40-pixel target or become icon-only.
6. Keep the existing `DateInput` widths unless browser measurement proves the
   128-pixel mobile width itself overflows. Do not solve the problem by clipping
   the formatted date or inventing an unsupported compact-format prop.
7. Use token-backed and responsive utility classes only. Do not add fixed
   pixel positioning tied to the reported screenshot width.

The required visual priority on constrained widths is:

1. Today and the date picker remain fully actionable and inside the card.
2. The map title remains identifiable.
3. The subtitle truncates before the title or controls become unusable.
4. The map pin may be visually reduced or hidden only at the smallest verified
   width if the preceding rules cannot otherwise be satisfied; its semantic
   title remains present.

### 15.2 Width-neutral loading state

The date transition indicator must no longer be a sibling that expands the
action row by `size-10`.

Wrap only the existing date field in a `relative` container with the same
responsive width. During `isDateTransition`:

- suppress the date field's default calendar icon through its verified
  `showIcon` contract;
- render the existing `NSpinner` in an absolutely positioned,
  pointer-events-none logical-end icon slot inside that fixed-width container;
- keep `role="status"` and one localized, screen-reader-only loading label;
- expose `aria-busy` on the date-control group or the nearest meaningful
  container; and
- do not change the header's width or height when loading starts or ends.

The overlay must not cover the formatted date, intercept the picker trigger,
or require a physical `left-*`/`right-*` rule. Do not replace the field with a
second loading-only control and do not unmount the map.

### 15.3 State, data, and localization preservation

Do not change:

- `casablancaToday()` or the noon-based `Date` construction used to avoid date
  rollover;
- `changeDate`, query keys, `keepPreviousData`, or cache invalidation;
- the URL cleanup behavior;
- marker selection, focus restoration, delivery-sheet ownership, or map
  fallback behavior;
- the Today selected state or button variants; or
- any server locale key unless implementation introduces user-visible copy,
  which this design does not require.

Do not introduce Zustand, a second query, a new formatter, a custom calendar,
or a Kafil-only copy of `DateInput`.

### 15.4 Najm package boundary

The confirmed installed `NCard` class-name slots and `DateInput.showIcon`
contract are sufficient for this fix, so no Najm repository change, package
publication, root override update, or consumer reinstall is authorized.

If implementation proves a reusable primitive is genuinely missing, stop the
Kafil slice. Record the missing installed contract and create a separately
authorized Najm Kit plan, release, registry-availability check, Kafil override
update, install, and consumer validation sequence. Do not add a parallel custom
card or date input to Kafil as a workaround.

## 16. Focused tests

### 16.1 Source contract

Owner:

- `apps/web/test/delivery-dashboard-feature.test.ts`

Update the existing date-header test rather than adding a second overlapping
source-string test. It must prove at source level that:

- title, description, pin, and the single `NCardAction` remain on the map card;
- there is exactly one Today action and one `DateInput`;
- the Kafil header no longer opts into `flex-wrap`;
- the controls retain equal 40-pixel height and bounded responsive width;
- the standalone `size-10` spinner no longer consumes action-row width;
- the transition status still uses `NSpinner`, localized loading text,
  `role="status"`, and `aria-busy`;
- the spinner is contained by the fixed-width date-field wrapper and does not
  intercept pointer events;
- Today remains the only preset and the selected date stays out of the URL; and
- `keepPreviousData` and the mounted-map transition contract remain intact.

Avoid treating a Tailwind source-string assertion as visual proof. The
same-row outcome must be measured in a browser.

Run the smallest source checks while iterating:

```text
bun run --cwd apps/web test test/delivery-dashboard-feature.test.ts
bun run --cwd apps/web typecheck
```

If the current package script does not forward the focused path, run the full
app test script instead. Record the exact successful command rather than
silently substituting a different scope.

### 16.2 Deterministic browser regression

Owner:

- extend the existing Delivery dashboard work unit in
  `apps/web/test/e2e/staff-delivery-assignment.e2e.ts`, or add one focused
  neighboring test only if mixing layout assertions into that workflow would
  make it harder to review;
- do not change the Playwright runner or configuration for this fix.

Use the deterministic fixture only for layout geometry, controlled transition
timing, and interaction regression. Add stable selectors only when semantic
role/name scoping cannot uniquely identify the card title, Today button, and
date trigger.

At viewport widths **320, 390, 430, 768, and 1280**, assert:

- the title block and action group have vertically overlapping bounding boxes
  and therefore occupy one row;
- Today and the date trigger remain fully inside the card header;
- neither control overlaps the title, subtitle, pin, or the other control;
- the card and document have no horizontal overflow;
- the header height does not change when the delayed date response activates
  and clears the loading indicator;
- the map element remains mounted and keeps the same DOM identity through the
  transition; and
- the spinner occupies the date field's icon area without blocking a click.

Run the narrow layout matrix in English, French, Spanish, and Arabic. In Arabic
assert the title side and action side reverse according to RTL while preserving
the same-row and no-overflow contract. Do not approve the layout from an
English screenshot alone.

## 17. Browser acceptance

After the source contract and deterministic layout work unit pass, run the
smallest real local Delivery browser journey through the repository-owned
runner with passive diagnostics. Do not attach to an unrelated dev server and
do not use `page.route()` or mocked API data for final acceptance.

Preflight must verify only presence and reachability of the authorized local
database and the runner-owned port without printing environment values. This
fix does not require Mailpit or outbound email.

With an authenticated seeded Delivery account:

1. Open `/dashboard` at the reported narrow mobile width, then at 320 and 430
   pixels.
2. Confirm Delivery map, subtitle, Today, and the date trigger share one visual
   header row with no overlap or horizontal scroll.
3. Register the exact dashboard-response observer before selecting a different
   date.
4. Open the date picker by keyboard, select a known fixture date, and assert one
   successful request for that date.
5. While the request is pending, confirm the map stays mounted, the header does
   not reflow, and the loading status is announced.
6. After success, confirm the selected date, map markers or empty Casablanca
   fallback, counts, and delivery list all represent the new response.
7. Activate Today by keyboard and confirm one request for the Casablanca Today
   key plus `aria-pressed="true"` after completion.
8. Confirm the URL has no `date` query parameter.
9. Repeat the narrow-header proof in French and Arabic RTL. Spot-check Spanish
   in the deterministic matrix.
10. Assert no unexpected console errors, page errors, failed requests, or HTTP
    errors.

Capture only the card/header viewport when evidence is required. Do not expose
family names, addresses, coordinates, phone numbers, tokens, or other delivery
data; use sanitized fixtures or redact the map/body below the header. Store
accepted evidence in a new dated directory under `docs/evidence/` only after
the run passes.

Browser acceptance is mandatory before Fix 2 can be reported complete because
the defect is responsive and visual. Source tests, a build, or manual reading
of utility classes cannot prove the single-row result.

## 18. Completion gates for Fix 2

After the focused source and browser work units pass, run:

```text
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

The package-scoped checks provide the narrow frontend verdict; the root
sequence closes the repository gate required by `AGENTS.md`. Do not infer that
one replaces the other, and do not rerun an unchanged build merely to create a
second label in the report if the commands resolve to the same underlying
work--record that fact explicitly.

Expected database result: **no generated migration and no schema drift**.

Report these boundaries independently:

| Boundary | Required evidence |
| --- | --- |
| Source | Focused contract, frontend checks, root gate, and reviewed diff pass |
| Responsive UI | Geometry matrix passes at 320, 390, 430, 768, and 1280 pixels |
| Accessibility | Keyboard date selection, Today activation, loading announcement, and focus remain usable |
| Localization | English, French, Spanish, and Arabic layout matrix passes; real French and Arabic spot checks pass |
| Data behavior | Exactly one selected-date request; mounted map and synchronized dashboard sections remain proven |
| Database | `db:generate` creates no migration |
| Git | Commit/push only when explicitly requested |
| Deployment | Exact deployed revision and healthy runtime only when explicitly authorized |
| Production acceptance | Fresh connected Delivery proof only after deployment authority |

Do not mark Fix 1 complete from Fix 2 evidence, or Fix 2 complete from Fix 1
evidence. They are independent fixes in the same queue.

## 19. Rollback

Fix 2 has no schema, data, package, or localization migration.

To roll it back:

1. Restore the prior map-card header class composition.
2. Restore the prior standalone transition-spinner placement.
3. Revert only the focused source and browser assertions owned by Fix 2.
4. Re-run the frontend checks and verify the prior date-selection behavior.
5. Rebuild and redeploy the prior known-good application revision only when
   deployment is separately authorized.

Do not revert the Delivery purchase workflow, map-first dashboard order, sheet,
query caching, or any unrelated global fix.

## 20. Out of scope for Fix 2

- changing the Delivery dashboard data model, endpoint, permissions, or query
  keys;
- adding Tomorrow, week, range, route, or URL-backed date filters;
- changing Casablanca date/time semantics;
- replacing or forking Najm Kit `NCard`, `DateInput`, calendar, or button
  primitives;
- changing the global card recipe or every `NCardAction` consumer;
- changing Leaflet provider configuration, tiles, attribution, map height,
  markers, clustering, geolocation, tracking, or route drawing;
- moving controls over the map or adding a floating map toolbar;
- changing dashboard counts, charts, attention items, quick actions, delivery
  list, or order sheet;
- backend, locale-copy, database, seed, storage, or deployment changes;
- committing, pushing, publishing, or deploying without a separate explicit
  request; and
- claiming visual acceptance without the measured browser proof in section 17.

# Fix 3 - Stats-first 60/40 Delivery workspace

## 21. User-visible outcome

Reorder the Delivery dashboard into this desktop hierarchy:

```text
Delivery dashboard header

[Assigned] [Pending] [Delivered] [Needs attention] [Families] [Remaining]

[ Delivery map - 60%                                ][ Scheduled deliveries - 40% ]
[ title/subtitle                 Today + date        ][ delivery rows              ]
[                                                    ][                            ]
[ map                                               ][                            ]
[                                                    ][                            ]
[ Delivered / Pending / Attention badges            ][ View all / Show less       ]

[ Delivery overview ] [ Issues / Attention ] [ Quick actions ]
```

The six existing statistics are the first dashboard content after the page
header. On wide screens, the next row has two columns:

- the existing Delivery map card occupies **three fifths (60%)** on the left in
  LTR locales;
- the existing Scheduled deliveries card occupies **two fifths (40%)** on the
  right in LTR locales; and
- both cards begin at the same vertical position and use the standard dashboard
  gap.

Arabic RTL mirrors the two logical columns while preserving the 60/40 ratio,
DOM reading order, usable card content, and internal RTL text. Do not force a
physical-left override that makes the Arabic page read backward.

Below the wide breakpoint, use one content column in this order:

1. statistics;
2. Delivery map;
3. Scheduled deliveries;
4. Delivery overview;
5. Issues / Attention; and
6. Quick actions.

The mobile statistics retain the existing two-column compact-card layout. The
map and Scheduled deliveries must not be squeezed into narrow side-by-side
columns on phone or tablet widths.

## 22. Confirmed current state

The implementation starts from these current contracts:

- `NPageHeader` is already first in `DeliveryDashboardPage`.
- The full-width map card currently follows the page header.
- The six-stat `NGrid` currently follows the map. It already renders two
  columns by default, three at `lg`, and six at `xl`, with compact mobile
  `NStatCard` variants.
- The existing `delivery-list` block is the required Scheduled deliveries
  card. It currently appears later in a four-column dashboard grid beside
  Delivery overview, Issues / Attention, and Quick actions.
- Scheduled deliveries already reads the same selected-date `items` as the
  map; shows the first five or all rows through `showAll`; preserves its empty
  state; and renders family, time window, workflow, and warning state.
- A scheduled-delivery row and a map marker already call the shared selection
  path and open the single `DeliveryOrderSheet`.
- Quick actions already scroll to the stable `delivery-list` id.
- The map already remains mounted across selected-date transitions.
- `DeliveryMap` invalidates Leaflet size once after initial mount, but it does
  not currently observe later container-width changes. A responsive change
  from a full-width card to a 60% column therefore requires explicit resize
  validation and, if reproduced, a bounded resize observer.
- `NGrid` and `NGridItem` in installed `najm-kit@2.16.6` support one column
  below a breakpoint, five columns at `xl`, and child spans of three and two.
  The 60/40 layout does not require a custom grid primitive.
- Existing source and connected-browser assertions currently require the map
  to precede statistics and `delivery-list`; those assertions must be updated
  with the product layout instead of being deleted or left contradictory.

Reconfirm these facts and the installed `NGrid` declarations immediately before
implementation. Never patch `node_modules`.

## 23. Relationship to Fix 2, authorization, and privacy

### 23.1 Execution relationship

Implement Fix 2 before Fix 3 in the same branch or establish an evidence-backed
Fix 2 baseline first. The left map column must retain Fix 2's single-row title,
Today action, date picker, and width-neutral loading state.

Fix 3 owns only section ordering, the responsive 60/40 workspace, movement of
the existing Scheduled deliveries card, and map-container resize correctness.
It must not duplicate or reopen Fix 2's date-control design. Fix 2 remains
independently reviewable and reportable; Fix 3 cannot be marked complete from a
Fix 2 browser pass.

### 23.2 Authorization and privacy contract

This remains a Delivery-only presentation change:

1. Do not change dashboard guards, role navigation, API endpoints, query keys,
   response projections, or command authorization.
2. The map and Scheduled deliveries continue to consume one authenticated
   selected-date dashboard response.
3. Moving the list must not introduce a second query, copy server data into
   Zustand, or persist the selection client-side.
4. Do not expose family names, phone numbers, addresses, coordinates, order
   identifiers, marker data, or selected rows in URLs, logs, DOM test
   attributes, screenshots, traces, or evidence.
5. Nothing may be layered over the map markers. Preserve protected address
   handling, tile attribution, map errors, marker labels, and the shared sheet.
6. Browser evidence must use sanitized fixtures or crop/redact the map and list
   data while leaving the layout boundaries measurable.

No backend, permission, database, seed, storage, money, or email source is
owned by Fix 3.

## 24. Owning files and implementation design

### 24.1 Primary layout owner

Primary owner:

- `apps/web/src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx`

Render the page in this source and DOM order:

1. existing `NPageHeader`;
2. existing six-stat `NGrid`;
3. new primary workspace `NGrid` containing the map and Scheduled deliveries;
4. secondary dashboard grid containing Delivery overview, Issues / Attention,
   and Quick actions; and
5. the single `DeliveryOrderSheet`.

Move existing blocks; do not render a hidden copy for another breakpoint. The
DOM order must match the mobile reading order and keyboard order.

### 24.2 Statistics-first row

Move the complete existing stat grid immediately after `NPageHeader` without
changing its data, icons, labels, values, variants, or breakpoints:

```text
cols={2} lgCols={3} xlCols={6}
```

All six statistics must precede both `<DeliveryMap>` and `id="delivery-list"`
in source and rendered DOM. Do not turn them into a horizontal scroller, merge
them into the map card, or introduce a second summary row.

### 24.3 Primary 60/40 workspace

Use Najm Kit's installed grid primitives rather than a custom card or arbitrary
percentage widths:

```text
NGrid:     cols={1}, xlCols={5}
Map item:  span={1}, xlSpan={3}
List item: span={1}, xlSpan={2}
```

This makes the wide layout exactly 3:2 while stacking both items below `xl`.
Both grid items require `min-w-0` so card content can shrink without producing
page overflow. Keep the map first in DOM order and Scheduled deliveries second.

The map card keeps:

- Fix 2's single-row header and date controls;
- the existing map-only selection behavior;
- the existing desktop and mobile minimum map heights;
- the three status badges below the map; and
- no permanent or responsive detail overlay.

Do not shrink the map height merely because its width is now 60%.

### 24.4 Scheduled deliveries right column

Move the one existing wrapper with `id="delivery-list"` into the two-span
workspace item. Preserve:

- `NCard`, title, Truck icon, and empty state;
- the same selected-date `items` array;
- the first-five and Show all / Show less behavior;
- `NButton` rows, avatar, family name, optional phone, time window, workflow
  badge, and conditional warning badge;
- selected-row styling through `effectiveSelectedId`;
- `openAttempt(item.attemptId, event.currentTarget)` and focus restoration; and
- the stable id used by Quick actions.

There must be exactly one Scheduled deliveries heading, one `delivery-list`
id, and one mapped set of delivery-row buttons.

At `xl`, align the top of this card with the map card. Allow the card to use
the grid item's available width and natural content height. Do not add an
internal scroll area, virtualizer, pagination system, sticky footer, or fixed
height in this fix; those would alter the existing Show all contract. The two
cards are not required to keep equal bottom edges after Show all expands.

### 24.5 Secondary dashboard row

After removing Scheduled deliveries from the current four-item grid, retain one
secondary grid containing only:

1. Delivery overview;
2. Issues / Attention; and
3. Quick actions.

Use one column on mobile, two at the existing medium breakpoint where useful,
and three equal columns at `xl`. Preserve each component's data and behavior.
Do not add filler content or duplicate one panel merely to complete a row.

### 24.6 Leaflet container-resize contract

Secondary owner only if browser measurement confirms the current one-shot
invalidation is insufficient:

- `apps/web/src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx`

Add one browser-native `ResizeObserver` for the actual Leaflet container. On a
real width or height change, schedule a single animation-frame
`map.invalidateSize()` call. Cancel the frame, disconnect the observer, and
retain the existing `map.remove()` cleanup on unmount.

The resize path must:

- not recreate the map or markers;
- not call `fitBounds` or reset the user's center/zoom merely because the
  container changed size;
- not change marker selection or focus restoration;
- not add a polling timer, window-global resize listener, or package; and
- not run when `ResizeObserver` is unavailable during a non-browser test.

If browser evidence proves the current Leaflet rendering already follows every
required container transition, retain the one-shot implementation and record
that proof rather than adding speculative code.

### 24.7 Localization and accessibility

No new copy is expected. Reuse the existing localized statistic, map,
Scheduled deliveries, empty-state, status, and View all strings in English,
French, Arabic, and Spanish.

Preserve:

- semantic headings supplied by the existing cards;
- DOM and keyboard order matching the stacked mobile order;
- row-button accessible names and focus restoration from the shared sheet;
- keyboard-operable map markers and date controls;
- logical spacing and RTL column mirroring; and
- 40-pixel date controls from Fix 2.

Do not use CSS `order` to make a visual order that differs from DOM order.

## 25. Focused tests

### 25.1 Source contracts

Owner:

- `apps/web/test/delivery-dashboard-feature.test.ts`

Replace the current "map first" ordering assertion with one explicit
stats-first workspace contract. Prove that:

- `NPageHeader` precedes every dashboard section;
- the first `<NStatCard` precedes `<DeliveryMap>`;
- `<DeliveryMap>` precedes the single `id="delivery-list"` block in DOM order;
- the map and list are siblings inside one `NGrid` configured as one column and
  five `xl` columns;
- their `NGridItem` spans are three and two at `xl`;
- the existing Scheduled deliveries JSX occurs exactly once;
- Delivery overview, Issues / Attention, and Quick actions follow the primary
  workspace and no longer contain the list between them;
- Quick actions still target `delivery-list`;
- the map remains free of the removed absolute detail overlay; and
- marker and scheduled-row selection still open the same single sheet.

If `DeliveryMap` gains resize observation, add a focused source or component
contract proving observer creation, animation-frame invalidation, cleanup, and
the absence of map recreation or bounds reset from that path.

Update contradictory assertions; do not delete the affected coverage without
an equivalent new contract.

Run while iterating:

```text
bun run --cwd apps/web test test/delivery-dashboard-feature.test.ts
bun run --cwd apps/web typecheck
```

If the focused path is not forwarded by the package script, run the complete
web test script and report that exact scope.

### 25.2 Existing workflow regression

Preserve the tests that prove:

- the list and marker open the same right-side sheet;
- no selected-delivery card covers the map;
- the dashboard and map stay mounted during selected-date transitions;
- Delivery cannot see operator-only details; and
- `showAll`, selected-row state, date changes, and focus return still work.

Do not weaken those assertions to make the rearrangement pass.

## 26. Deterministic browser layout regression

Owner:

- `apps/web/test/e2e/staff-delivery-assignment.e2e.ts`

Extend the existing Delivery dashboard work unit with geometry assertions. Its
route fixtures may provide deterministic row counts and delayed transitions for
this layout regression, but final acceptance in section 27 must use real APIs.

At wide LTR viewports **1280, 1440, and 1600** assert:

- every visible stat card is above both primary workspace cards;
- all six stats occupy one row at `xl`;
- map and Scheduled deliveries top edges align within a small rendering
  tolerance;
- map is left and Scheduled deliveries is right;
- after excluding the standard inter-column gap, their content widths are
  within a narrow tolerance of 60% and 40%;
- neither card overlaps the other or escapes the content area; and
- the secondary three-card row begins below both primary workspace cards.

At **320, 390, 768, and 1024** assert:

- statistics remain first and have no horizontal scroller;
- map and Scheduled deliveries are stacked, not squeezed side by side;
- the map precedes Scheduled deliveries;
- every card remains inside the viewport with no document-level horizontal
  overflow; and
- Fix 2's map header remains usable at the resulting widths.

For Arabic at one narrow and one wide viewport, assert logical column mirroring,
RTL text, unchanged DOM/tab order, no overlap, and the same 3:2 ratio.

Resize one hydrated page across the `xl` boundary in both directions. Confirm:

- the same Leaflet map element remains mounted;
- visible tiles cover the resized container rather than leaving blank strips;
- controls, attribution, and markers remain inside the map;
- center/zoom are not reset solely by the resize; and
- a marker and a Scheduled delivery row still open the same sheet afterward.

Register response observers before date or row actions, use bounding boxes for
geometry, and avoid arbitrary sleeps.

## 27. Real connected browser acceptance

Update the Delivery section of
`apps/web/test/e2e/connected-four-account.e2e.ts`, whose current assertion says
Assigned today follows the map. The accepted contract is now the inverse:
statistics precede the map.

Run the smallest connected work unit plus passive diagnostics through the
repository-owned runner. Use its real PostgreSQL data, authenticated Delivery
identity, APIs, and browser requests; do not use `page.route()`, direct SQL
mutation, or an unrelated already-running server as acceptance evidence.

Within the existing assigned-worker journey:

1. At the 390-pixel phone viewport, prove the six stats precede the map; the map
   precedes Scheduled deliveries; and the page has no horizontal overflow.
2. Confirm the existing scheduled row is reachable without changing identity
   or duplicating data and still opens the shared sheet.
3. Before the workflow mutation, resize the same authenticated page to a wide
   viewport and prove the 60/40 map/list geometry with real data.
4. Confirm the map fully redraws after the resize and the scheduled row remains
   usable.
5. Restore the phone viewport and continue the existing purchase/delivery
   journey so responsive inspection does not replace lifecycle acceptance.
6. Assert no unexpected console errors, page errors, failed requests, or HTTP
   errors.

Run a read-only fail-fast preflight first. Verify the authorized local database
and runner-owned port without printing `.env` values. Mailpit is required only
if the selected connected work unit's unchanged surrounding journey uses it;
Fix 3 itself sends no email.

Record sanitized evidence only after a passing run. Do not capture real family
names, phone numbers, addresses, coordinates, credentials, or map/list data.

## 28. Completion gates for Fix 3

After the focused source test, deterministic layout work unit, and connected
acceptance pass, run:

```text
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Expected schema result: **no generated migration and no schema drift**.

Report each boundary independently:

| Boundary | Required evidence |
| --- | --- |
| Fix 2 prerequisite | Single-row map header accepted or separately reported incomplete |
| Source | New order and one 3:2 workspace pass focused tests and reviewed diff |
| Responsive layout | Wide 60/40 geometry and narrow stacked geometry pass |
| Map rendering | Same Leaflet instance redraws correctly across the `xl` breakpoint |
| Interaction | Marker and list row still open the single sheet; Show all and scroll target remain valid |
| Accessibility/localization | DOM/tab order, keyboard use, French copy, and Arabic RTL remain valid |
| Connected browser | Real assigned-worker layout and existing workflow pass with passive diagnostics |
| Database | `db:generate` creates no migration |
| Git | Commit/push only when explicitly requested |
| Deployment | Exact deployed revision and healthy runtime only when explicitly authorized |
| Production acceptance | Fresh connected Delivery proof only after deployment authority |

Fix 3 is not complete from a desktop screenshot, Tailwind class inspection, or
mocked browser test alone.

## 29. Rollback

Fix 3 has no schema, data, locale, or package migration.

To roll it back independently:

1. Move the stat grid back to its previous position only if reverting the
   stats-first requirement.
2. Move the single Scheduled deliveries block back into the secondary dashboard
   grid; never leave a second copy in the primary workspace.
3. Restore the secondary grid's prior four-item breakpoints.
4. Remove the `DeliveryMap` resize observer only if it was added solely for Fix
   3 and no later accepted layout relies on it.
5. Revert Fix 3's source and browser ordering/geometry assertions.
6. Re-run the frontend and root gates, then rebuild/redeploy a prior known-good
   revision only when separately authorized.

Do not roll back Fix 2's single-row date header, width-neutral loading state, or
any Delivery purchase/sheet behavior while reverting Fix 3.

## 30. Out of scope for Fix 3

- changing any statistic's meaning, label, count, icon, selected-date semantics,
  or breakpoint card variant;
- adding, removing, merging, or horizontally scrolling statistics;
- creating a second Scheduled deliveries component, query, list, or mobile copy;
- changing the first-five, Show all / Show less, empty-state, selected-row, or
  sheet-opening behavior;
- adding list search, filters, sorting, pagination, virtualization, internal
  scrolling, or sticky controls;
- changing map providers, tiles, attribution, marker data, clustering,
  geolocation, tracking, routing, fit-bounds rules, or map height;
- changing date controls beyond the already planned Fix 2 contract;
- changing dashboard API responses, permissions, backend modules, locale copy,
  database, seed, storage, money, or mail behavior;
- changing the other role dashboards or global Najm Kit card/grid recipes;
- committing, pushing, publishing, deploying, or running production acceptance
  without separate authorization; and
- claiming completion without real responsive browser evidence.

# Fix 4 - Streamline the Delivery order sheet

## 31. User-visible outcome

The Delivery order sheet reads in this order: contact actions, Family,
Schedule, Products, then issue reporting. The Call family and Open in Google
Maps buttons are at the top. Schedule precedes Products. The redundant workflow
tag and package-count line are absent.

## 32. Boundaries and implementation

- Keep the shared Family and Products presentation as the one source of truth.
- Add optional insertion slots to the shared confirmation composition; leave
  all existing consumers unchanged when those slots are omitted.
- Keep dashboard/list workflow badges and backend workflow state unchanged.
- Preserve protected family contact data, Delivery authorization, footer
  actions, issue reporting, localization, and responsive two-button layout.
- No API, schema, migration, seed, storage, or package change belongs to this
  fix.

Owners:

- `apps/web/src/features/OrderCart/components/OrderCartDialog.tsx`
- `apps/web/src/features/Orders/components/OrderSummarySections.tsx`
- `apps/web/src/features/Dashboard/DeliveryDashboard/components/DeliveryOrderSheet.tsx`
- existing focused and browser contract tests

## 33. Verification and acceptance

Focused source coverage must prove the slot order and absence of the sheet's
package count and workflow tag. Run the web typecheck and the repository gate.
Automated browser acceptance remains a separate boundary: verify the requested
order at a narrow viewport and confirm both contact actions and issue/footer
actions still work. Do not claim browser acceptance from source tests.

## 34. Rollback and out of scope

Rollback removes the optional slots and restores the previous sheet placement.
Do not change workflow derivation, package-count APIs, translations, order
summary content for other roles, or any backend authorization as part of this
fix. Do not commit, push, or deploy without separate authorization.

## 35. Template for the next fix

Append each future fix with these headings:

```text
# Fix N - concise outcome
## User-visible outcome
## Confirmed current state
## Authorization and privacy contract
## Owning files and implementation design
## Focused tests
## Browser acceptance
## Completion gates
## Rollback
## Out of scope
```

Update the register in section 3 whenever a fix is added or its evidence-backed
status changes.
