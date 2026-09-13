# Delivery Staff Dashboard Implementation Plan

Status: source implementation complete; manual browser acceptance pending
Last source audit: 2026-09-13
Owner: Kafil full-stack delivery workflow

## Goal

Build a real-data Delivery dashboard that follows the supplied mockup, reuses
the current Operator dashboard's Najm Kit composition, and lets an authenticated
delivery-capable Staff member work only with deliveries assigned to that Staff
profile for one selected Casablanca calendar date.

The existing Operator dashboard at `/dashboard` remains available and its
current data contract and layout are not replaced. A dedicated `delivery`
account also enters through `/dashboard`, which resolves the Delivery dashboard
from the authenticated role. The legacy `/delivery` URL redirects that account
to `/dashboard`.

## Scope boundaries

### In scope

- Six date-scoped statistics: Assigned, Pending, Delivered, Needs attention,
  Families, and Packages remaining.
- Delivery overview pie chart, latest five assigned deliveries, attention
  summary, selected-delivery summary, quick actions, and a family-address map.
- Today and calendar-date selection driven by local dashboard state.
- Bidirectional row/marker selection and selected-delivery actions.
- Staff-scoped start, issue-reporting, and confirmation commands that reuse the
  existing order delivery state machine.
- First-class scheduling, package-count, coordinate, and delivery-issue data;
  no illustrative names, counts, positions, or fallback coordinates.
- Responsive, keyboard, theme, privacy, and real-service browser acceptance.

### Explicit non-goals

- No live driver or vehicle tracking, background GPS, route optimization,
  connected routes, numbered stops, ETA/distance calculation, or Start route
  action.
- No replacement or redesign of the existing Operator dashboard.
- No new order statuses. Dashboard categories are a presentation projection of
  the current order/delivery-attempt lifecycle plus open delivery issues.
- No recipient-code confirmation until a real recipient-code backend contract
  exists. The current workflow supports operator confirmation, recipient
  signature evidence, and photo evidence; the dashboard may reuse photo proof
  but must not invent a code flow.
- No automatic geocoding. A missing coordinate remains missing and is rendered
  as **Location unavailable**.
- No mixed Operator/Delivery account or Staff profile. Every Staff record
  created by an administrator has exactly one role and receives its own pending
  invitation account. A person who needs both responsibilities must have two
  separate accounts. Consuming each one-time set-password link verifies and
  activates only that account.

## Current repository evidence and gaps

- The existing shared operator/admin surface is
  `apps/web/src/features/Dashboard/AdminDashboard/components/AdminDashboardPage.tsx`.
  It already composes `NPageHeader`, six `NStatCard` instances, `NPieChart`,
  `NStatusBreakdown`, `NCard`, shared formatting, React Query, translations,
  and global header actions.
- `/dashboard` is selected only from the auth role in
  `apps/web/src/features/Dashboard/resolveDashboard.ts`; Staff functions are not
  currently part of dashboard or navigation resolution.
- `staff_profiles.user_id` links a Staff profile to a login, while
  `staff_functions.function_key = 'delivery'` expresses delivery capability.
  New delivery-only Staff receive a dedicated `delivery` account. They are not
  provisioned as broad Operators merely to make the UI reachable.
- `order_delivery_attempts` records assignee and lifecycle timestamps but has
  no scheduled date, time window, or package count.
- Orders already snapshot the private delivery address and phone and already
  have assignment/start/fail/confirm transitions. The existing list/detail and
  command routes are operator-scoped, not assigned-Staff-scoped.
- `family_profiles` and orders have no coordinates. No map package or map
  provider configuration exists in the workspace.
- Order item quantity (`articleCount`) is not a package count. The dashboard
  must not silently relabel it as packages.
- There is no structured delivery-issue model for Address to confirm, Family
  unreachable, or Missing delivery proof. Delayed can be derived only after a
  schedule exists.

## Locked implementation decisions

1. `/dashboard` is the single dashboard entry for every account role;
   `GET /api/dashboard/operator` stays intact and
   `GET /api/dashboard/delivery?date=YYYY-MM-DD` is additive. `/delivery` is a
   compatibility redirect for delivery accounts, not a second workspace link.
2. Each Staff profile has exactly one function and one matching account role.
   A dedicated least-privilege `delivery` guard accepts only the `delivery`
   role, then resolves that user's active Staff profile and requires its
   delivery function. Operator and admin accounts cannot cross that boundary.
3. Only the current Staff profile's attempts scheduled on the requested date
   enter the response. Aggregates are derived in the service from that exact
   returned set so chart values and cards cannot drift apart.
4. Date-only values use the configured `Africa/Casablanca` product timezone.
   The client sends an ISO date (`YYYY-MM-DD`), never a browser-local timestamp
   masquerading as a day boundary.
5. Category mapping is mutually exclusive and ordered:
   - `delivered`: the attempt is delivered;
   - `needs_attention`: not delivered and failed, overdue, or linked to at
     least one open issue;
   - `pending`: every other assigned/in-progress attempt.
   The three counts must equal Assigned.
6. Families is the count of distinct family profile IDs. Packages remaining is
   the sum of the persisted package count for all non-delivered assignments.
7. Coordinates are an optional pair. If either value is absent or invalid, the
   API returns `coordinates: null`; the list/details remain usable and no map
   marker is rendered.
8. Delivery issues are separate operational records and never mutate the order
   lifecycle by themselves. Delay is derived from the schedule; the other
   three categories come from unresolved structured issues.
9. The selected day is client-owned and defaults to today in Casablanca. It is
   sent only to the dashboard API and is intentionally omitted from the browser
   URL because it is transient operational state, not a shareable route state.
10. Selection is one client-owned `selectedDeliveryId`. Rows and markers update
   that same state. Changing date clears a selection that is not present in the
   new response.
11. All new visible copy is authored in English as requested. It still uses
    Kafil translation keys, with native en/fr/ar/es copy and locale parity; no
    hard-coded component strings are introduced. RTL
    layout remains an acceptance requirement even though this surface's copy is
    intentionally English.

## Target API contract

`GET /api/dashboard/delivery?date=YYYY-MM-DD` returns one privacy-scoped model:

```ts
interface DeliveryDashboardData {
  selectedDate: string;
  timezone: "Africa/Casablanca";
  counts: {
    assigned: number;
    pending: number;
    delivered: number;
    needsAttention: number;
    families: number;
    packagesRemaining: number;
  };
  deliveries: Array<{
    attemptId: string;
    orderId: string;
    orderNumber: string;
    familyProfileId: string;
    familyName: string;
    familyImage: string | null;
    category: "pending" | "delivered" | "needs_attention";
    attemptStatus: "assigned" | "in_progress" | "failed" | "delivered" | "cancelled";
    address: string;
    phone: string | null;
    coordinates: { latitude: number; longitude: number } | null;
    scheduledDate: string;
    windowStartMinute: number | null;
    windowEndMinute: number | null;
    packageCount: number;
    openIssues: Array<{
      id: string;
      kind: "address_confirmation" | "family_unreachable" | "missing_proof";
      note: string | null;
    }>;
    canStart: boolean;
    canConfirm: boolean;
    canReportIssue: boolean;
  }>;
}
```

The response must not expose another Staff member's deliveries, family CIN,
documents, internal family notes, or unrelated order history. Do not write
address, phone, or coordinates to audit metadata, outbox payloads, or logs.

## Work plan

### Phase 0 - Contract and map-provider gate

- [x] Verify the installed Najm Kit date-picker, tabs/toggle, card, chart, badge,
  dialog, and feedback-state declarations before choosing components.
- [x] Read the relevant Next.js 16 local guide before adding the browser-only
  map boundary or changing route/navigation behavior.
- [x] Select and document a production map provider and client library. Require
  marker rendering, accessible selection, zoom controls, attribution, light and
  dark compatibility, and a browser-only/dynamic import compatible with Next
  16. Do not ship against an unapproved public tile endpoint.
- [x] Add only the provider's public configuration to `.env.example` and
  `deploy/env/app.env.example`; document domain/key restrictions and update the
  deployed edge CSP allowlist if the provider requires external script, style,
  image, font, or connection origins.
- [x] Confirm the package-count definition with the delivery workflow. This
  plan treats it as a first-class physical package count, not item quantity.
- [x] Record the provider and package-count decisions in this section before
  implementation begins.

Implementation decision (2026-09-09): Leaflet 1.9 renders browser-only map
markers and the standard OpenStreetMap tile service supplies tiles with visible
attribution. The tile URL and attribution are public build configuration, the
tile origin is in the application CSP, and no tile prefetching or bulk download
is performed. `packageCount` is the operator-entered number of physical parcels
for an assignment and is not derived from order-item quantity.

### Phase 1 - Scheduling, coordinates, packages, and issues

- [x] Add optional paired delivery latitude/longitude fields to the Family
  schema, DTOs, repository/service projection, operator Family form, and tests.
  Validate latitude `[-90, 90]`, longitude `[-180, 180]`, and require both or
  neither.
- [x] Snapshot the validated coordinate pair onto an order alongside the
  existing delivery address/phone snapshots. Existing orders remain null; do
  not recompute historical snapshots when a Family changes.
- [x] Add a scheduled Casablanca date, optional start/end minutes, and positive
  package count to the active delivery-assignment contract. Require start before
  end when both are present.
- [x] Extend the existing operator assign/reassign forms and DTOs to collect the
  schedule and physical package count. Reassignment copies neither silently;
  the operator must confirm the new attempt's schedule and count.
- [x] Add a feature-owned `order_delivery_issues` table linked to an attempt,
  with structured kind, optional bounded note, reporter, opened/resolved
  timestamps, and indexes for unresolved issues.
- [x] Generate and review a new migration. Do not edit deployed migrations.
  Keep new historical fields nullable and provide an operator reconciliation
  path for existing unscheduled/unlocated assignments rather than fabricating a
  backfill.
- [x] Update demo fixtures with deterministic schedules, package counts,
  mutually exclusive dashboard outcomes, issue cases, and a mix of present and
  absent coordinates.

### Phase 2 - Delivery identity and authorization

- [x] Add a reusable backend resolver that maps authenticated `userId` to one
  active Staff profile and verifies the `delivery` function.
- [x] Add a dedicated delivery-dashboard guard/decorator using that resolver.
  Keep `isOperator`, the Operator dashboard, and existing operator management
  commands unchanged.
- [x] Use the authenticated account role to render one `/dashboard` navigation
  entry. No delivery-eligibility request or second delivery navigation item is
  needed; backend delivery authorization remains authoritative.
- [x] Deny every Operator and admin account, inactive Staff, Staff without the
  Delivery function, families, sponsors, and unlinked legacy Staff records.
- [x] Keep admin accounts outside the delivery-account boundary; administrative
  authority never substitutes for a separately authenticated delivery account.
- [x] Add the dedicated `delivery` auth role with no general product
  permissions; only the delivery guard and linked Staff identity unlock the
  assigned-delivery workflow.
- [x] Use the same passwordless admin-invitation contract as Sponsor accounts
  for every administrator-created Staff record: create the auth account as
  pending, email a one-time set-password link, and rely on Najm Auth 4.0.4 to
  verify and activate it only after successful link consumption. Never return
  an initial password from an admin-created Staff API response.

### Phase 3 - Backend dashboard read model and staff commands

- [ ] Add `deliveryDashboardQuery` validation with a required ISO date and
  bounded date policy; return `400` for malformed or impossible dates.
- [ ] Add repository queries joining delivery attempts, orders, order items,
  Family identity, coordinates, and unresolved issues, filtered by the resolved
  Staff profile and exact scheduled date.
- [x] Build one `DashboardService.getDelivery(userId, date)` projection and
  derive all six counts and chart categories from its delivery rows.
- [x] Sort deliveries deterministically by window start, then order number; the
  UI displays the first five while View all reveals the complete selected-day
  collection.
- [ ] Add staff-scoped start/confirm/report-issue/resolve-issue commands, or
  staff-scoped controller routes that delegate to the existing order service.
  Every command must re-resolve the current attempt, assignee, Staff status,
  function, order state, and idempotency context inside the service boundary.
- [ ] Confirmation is enabled only for the assigned current attempt in progress
  and disabled after delivery. Reuse the existing confirmation validation and
  evidence upload; offer photo proof because it exists, and do not add a
  recipient-code option.
- [x] Report issue without changing order status. Keep fail-delivery as the
  existing explicit lifecycle transition when the current workflow genuinely
  needs to end an attempt.
- [ ] Add response/denial tests for cross-Staff reads and mutations, stale or
  reassigned attempts, completed deliveries, privacy fields, idempotency,
  issue resolution, and date/timezone boundaries.

### Phase 4 - Delivery dashboard feature

- [x] Add `apps/web/src/features/Dashboard/DeliveryDashboard/` with a page,
  focused section components, hook, query keys, types, and pure view-model
  helpers. Keep role resolution in the thin `/dashboard` route.
- [x] Reuse `NPageLayout`, `NPageHeader`, `NPageHeaderActions`,
  `PageHeaderGlobalActions`, `NGrid`, `NGridItem`, `NStatCard`, `NPieChart`,
  `NCard`, `NAvatar`, `NBadge`, `NButton`, Najm date/form primitives, shared
  formatters, and standard page feedback states.
- [x] Keep the selected date in local dashboard state. Today and the date picker
  update it without navigation or scroll reset; the obsolete `date` query is
  removed on entry. Same-date selections are a no-op, and cached dashboard data
  keeps the page and Leaflet instance mounted while another date loads. Every
  section consumes the same query result.
- [ ] Implement six top cards in the existing compact responsive pattern.
  Adapt labels to `Assigned today`/`Families today` only for the actual current
  date; use selected-date wording for any other date.
- [x] Implement the desktop 12-column body: a six-column left region containing
  a 2x2 card grid, and a six-column map spanning both rows. Align top and bottom
  edges. Stack without horizontal overflow below the desktop breakpoint.
- [x] Delivery overview uses the existing pie/legend contract and the exact
  three mutually exclusive categories.
- [x] Today's deliveries preserves the current latest-order row density,
  avatars, badge treatment, and View all behavior, but shows order reference,
  family, window, and category from the selected date.
- [ ] Needs attention shows the four requested counts and a compact selected
  delivery summary. With no selection, render an accessible prompt to select a
  delivery.
- [ ] Quick actions contain View my deliveries, Confirm delivery, Contact a
  family, Report an issue, and Delivery history. Selection-dependent actions
  are disabled with a clear reason until a delivery is selected.
- [x] Add a provider adapter behind `DeliveryMap`. Render only independent teal,
  green-check, and orange-alert markers; include the requested legend and zoom
  controls. Do not render route polylines or tracking affordances.
- [ ] Row activation focuses/selects the matching marker and opens the detail
  panel. Marker activation selects and reveals the matching row. Preserve
  keyboard activation, visible focus, and an accessible list alternative to
  map-only interaction.
- [x] Details show family name, order reference, status, private assigned-use
  address/phone, selected date/window, package count, and only allowed actions.
  Show **Location unavailable** when coordinates are null.
- [x] Call family uses a `tel:` link only when a phone exists. Open in Google
  Maps uses coordinates when present, otherwise the encoded address, in a safe
  external link. Never invent coordinates.
- [ ] Reuse the existing confirm dialog/evidence flow through the staff-scoped
  command. On success, invalidate the selected date's dashboard query plus the
  affected order/detail keys so statistics, chart, list, marker, and details
  update together.
- [x] Provide a dashboard loading skeleton matching the established admin and
  sponsor structure.
- [ ] Provide whole-page error/retry, zeroed empty state, map provider failure
  state, per-delivery location-unavailable treatment, and mutation pending/error
  feedback.

### Phase 5 - Tests and real browser acceptance

- [ ] Add focused frontend tests for date URL state, category mapping, aggregate
  invariants, selected row/marker synchronization, action eligibility, query
  invalidation, empty/error states, and the absence of tracking/route UI.
- [x] Extend navigation, dashboard-resolution, Staff, order, localization, and
  map configuration source tests without weakening existing Operator dashboard
  expectations.
- [x] Add server module tests for Staff ownership, selected-date projection,
  coordinate pairing, package totals, issue counts, cross-assignment denial,
  and response privacy.
- [ ] Add PostgreSQL integration coverage for the Staff/date query, unresolved
  issue joins, reassignment ownership, idempotent confirmation, and rollback or
  concurrency behavior that mocks cannot prove.
- [ ] Add a real authenticated delivery-capable test account and real scheduled
  assignments to the E2E setup/teardown. Do not use `page.route()` or mocked
  delivery data for acceptance.
- [ ] Add a focused `delivery-dashboard.e2e.ts` work unit covering today,
  tomorrow, arbitrary date, zero data, missing coordinates, list/marker
  selection, external links, issue reporting, start/confirm, and the complete
  post-confirm refresh.
- [ ] Prove another Staff account cannot read or mutate the selected delivery,
  and prove family/sponsor responses still omit Staff/private operational data.
- [ ] Capture desktop alignment plus 320/375 mobile, 768/1024 tablet, dark mode,
  keyboard, reduced-motion, and RTL layout evidence under
  `docs/evidence/delivery-dashboard/<date>/`. Validate the native en/fr/ar/es
  dashboard copy and RTL behavior during the manual pass.
- [ ] Register the new spec in the managed E2E runner only after the focused
  work unit passes. Keep passive diagnostics attached and fail on unexpected
  page errors, console errors, failed requests, and HTTP errors.

### Phase 6 - Completion gates and evidence

- [x] Run focused web, server, seed, and database tests while iterating and
  record exact command results in this plan.
- [ ] Run the full connected delivery-dashboard browser spec against real
  PostgreSQL and the runner-owned Next.js process.
- [ ] Run a production-build browser pass for the affected route and map
  provider boundary.
- [x] Run the repository gate in order:

  ```powershell
  bun run lint
  bun run typecheck
  bun run test
  bun run build
  bun run db:generate
  bun run test:db
  ```

- [ ] Verify `db:generate` creates no uncommitted migration after the intended
  migration is committed; inspect `git diff --check` and scope/secret changes.
- [ ] Update `docs/plans/README.md` and this plan with source, migration,
  browser, and screenshot evidence. Keep implementation, Git publication,
  deployment, and production acceptance as separate statuses.

## Acceptance checklist

- [ ] Existing admin/operator users still receive the unchanged Operator
  dashboard and `/api/dashboard/operator` contract.
- [ ] Only an eligible signed-in delivery-capable Staff profile can open the
  Delivery dashboard or its staff command endpoints.
- [ ] Every displayed delivery belongs to that Staff profile and selected date.
- [ ] Assigned equals Pending + Delivered + Needs attention for populated and
  empty dates.
- [ ] Families is distinct families; Packages remaining uses real persisted
  package counts for non-delivered assignments.
- [ ] The date control refreshes every section consistently; reload resets it to
  the current Casablanca date without adding transient state to the URL.
- [ ] Rows and available markers select each other; missing-location rows remain
  fully usable without a fabricated pin.
- [ ] The map has independent status markers, legend, and zoom only—no tracking,
  route, ETA, distance, or Start route behavior.
- [ ] Call, Google Maps, confirm, and issue actions always target the selected
  assigned delivery and are unavailable when invalid or complete.
- [ ] Confirmation refreshes cards, chart, list, marker, selected details, and
  history from server state in one cache-invalidating workflow.
- [ ] Empty, loading, query error, provider error, mutation error, mobile,
  tablet, desktop, dark, keyboard, and RTL states have recorded evidence.
- [ ] No family CIN/documents/internal notes, other Staff assignments, or exact
  location/contact data leaks through unrelated roles, logs, audit, or outbox.

## Evidence log

Playwright creation and execution are intentionally deferred at the user's
request. Manual browser acceptance will supply responsive, RTL, map, and
interaction evidence; unchecked browser items remain open rather than being
treated as passed.

| Boundary | Status | Evidence |
| --- | --- | --- |
| Source implementation | Implemented | role-resolved `/dashboard`, legacy `/delivery` redirect, shared dashboard action/attention cards, local date state and matched header controls, shared skeleton structure, dashboard API/read model, Staff-owned commands, schedule/coordinates/issues, Leaflet map, passwordless Staff account invitations |
| Migration/schema | Passed locally | `0046_misty_thing.sql` generated, reviewed, applied; second `bun run db:generate` found no drift |
| Focused tests | Passed | Dashboard/Staff/Order web contracts 32/32; locale parity 5/5; root suites: web 444/444, server 410/410 (77 DB-gated skips), seed 94/94 |
| PostgreSQL integration | Passed | `bun run test:db`: 55/55 after applying migration 0046 |
| Browser acceptance | Manual pending | No Playwright spec was created or run, per user instruction |
| Root gate | Passed | `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run db:generate`; schema had no further drift |
| Git publication | Not requested | — |
| Deployment | Not requested | — |
| Production acceptance | Not requested | — |
