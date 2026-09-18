# Delivery purchase workflow

Date: **2026-09-18**

Status: **Implemented and verified by source, package, and real-PostgreSQL
tests on 2026-09-18. Browser acceptance is authored but UNRUN: the local
Mailpit and Redis services the E2E runners require are not reachable on this
host, so no browser evidence, screenshot evidence, Git publication, deployment,
or live acceptance is recorded by this document.**

Verdicts recorded on 2026-09-18:

| Checkpoint | Verdict | Evidence |
| --- | --- | --- |
| Implementation | **Pass** | `bun run lint`, `bun run typecheck`, `bun run test` (460 web / 422 server / 90 seed, 0 fail), `bun run build` |
| Database | **Pass** | `bun run test:db` — 61 pass, 0 fail, 6.16s (baseline before this slice: 60 pass) |
| Schema drift | **Pass** | `bun run db:generate` → `No schema changes, nothing to migrate` |
| Browser acceptance | **Not performed** | `test:e2e` needs Redis; `test:e2e:connected` needs Mailpit on `127.0.0.1:1025/8025`. Both refused TCP at preflight, so no run was started. |
| Screenshot evidence | **Not performed** | Depends on the browser runs above. |
| Git publication | **Not performed** | Out of scope for this slice. |
| Deployment / live acceptance | **Not performed** | Out of scope for this slice (§10). |

## 1. Agreed outcome

Extend the existing Delivery dashboard so the authenticated delivery worker who
is assigned to an approved family order can record its first purchase, start the
delivery, and confirm the delivery without receiving operator-wide access.

The agreed example is:

1. **Fatima** signs in with the Family account, builds a cart, and submits order
   `KAF-HFQCHE`.
2. The application reserves Fatima's estimated order total using the existing
   family-order transaction.
3. **Sara**, an Operator, approves the order and assigns **Ahmed**, an active
   internal Delivery account, to its scheduled delivery attempt.
4. Ahmed opens the existing Delivery dashboard on the scheduled date.
5. The map is the first dashboard section. Ahmed selects Fatima's marker or the
   matching planned-delivery row.
6. A right-side Najm `NSheet` opens with the existing Family and Products order
   presentation. It does not repeat the Delivery-person card because Ahmed is
   already the authenticated assignee.
7. The sticky sheet footer shows **Validate purchase** only when the order is
   approved, has no active purchase, and the active assigned attempt belongs to
   Ahmed.
8. The button opens the existing purchase form. Ahmed records the merchant,
   purchase date, actual amount, optional receipt number, and protected receipt.
9. The existing purchase settlement changes the order to `purchased`, settles
   the reserved Family budget against the actual total, appends the ledger and
   purchase record, and attributes the action to Ahmed's auth user.
10. The sheet remains selected and refreshes. Its footer action becomes **Start
    delivery**, then **Confirm delivery** after the start command succeeds.

The lifecycle is therefore:

```text
Family submits
  -> Operator approves and assigns Ahmed
  -> Ahmed records purchase
  -> Ahmed starts delivery
  -> Ahmed confirms delivery
```

Operator-assisted order creation remains available for Families who cannot use
the portal. It is not the normal example and is not changed by this plan.

## 2. Product decisions frozen by this plan

### 2.1 Authorization boundary

- Ahmed can read only orders that have a Delivery attempt assigned to Ahmed's
  active Staff profile.
- Ahmed can record only the **first** purchase for the order currently assigned
  to him.
- The active Delivery assignment is the purchase authorization. Do not require
  or create a second purchasing assignment for this Family-created flow.
- The order must be `approved`, the active attempt must be `assigned`, and no
  active purchase may exist.
- Ahmed cannot approve or reject orders, assign or reassign delivery staff,
  cancel orders, modify Family budgets, replace/reverse a purchase, read another
  worker's order, or open the general `/orders` management surface.
- Sara retains the existing operator purchase command and is the only ordinary
  actor who can replace an incorrect purchase record.
- Admin retains its existing explicit super-role behavior. Do not infer that an
  Admin has Ahmed's Staff identity.
- External delivery profiles without application accounts remain assignable for
  transport, but cannot sign in and therefore cannot execute the own-purchase
  command.
- A hidden frontend button is not authorization. Every own-detail, receipt, and
  purchase endpoint must resolve the current auth user to an active Delivery
  Staff profile and validate assignment ownership on the server.

Do **not** widen `isOperator`, `isOrderReader`, the Delivery role's generic
permissions, or `/orders` navigation. Add narrow `isDeliveryStaff()` commands
that prove ownership.

### 2.2 Existing purchasing assignment remains separate

`orders.purchasing_staff_profile_id` currently models an optional Operator
purchasing assignment on assisted orders. Keep that contract unchanged in this
slice:

- do not repurpose it as Delivery authorization;
- do not remove the rule that assisted purchasing and delivery assignments use
  separate Staff accounts;
- do not add `operator` to Ahmed's Staff functions;
- do not allow one Staff account to switch between Operator and Delivery roles.

The active row in `order_delivery_attempts` authorizes Ahmed's own purchase.
`order_purchase_records.recorded_by_user_id` already records Ahmed as the actor.
Those existing relationships are sufficient; no new purchaser column or join
table is planned.

### 2.3 Dashboard and sheet behavior

- Keep one `DeliveryDashboardPage`; do not build mobile and desktop copies.
- Put the existing Leaflet map immediately after the page header, before metric,
  chart, attention, quick-action, or planned-delivery sections at every viewport.
- Keep the current date selector and exact scheduled-date query semantics.
- Keep the map mounted when the selected date has no coordinates.
- Remove the persistent absolute-positioned detail card from inside the map.
  Nothing may cover markers until the user selects one.
- Marker selection opens the same right-side `NSheet` used by planned-delivery
  row selection.
- The sheet stays on the **right** in every locale, including Arabic, per the
  approved interaction. Its body must still render correct RTL content.
- Keep the selected marker highlighted while the sheet is open. Closing the
  sheet clears selection and returns focus to the marker or row that opened it.
- Reuse Najm Kit's installed `NSheet.footer`; it already provides the required
  sticky footer. Do not hand-build another fixed overlay.
- The sheet uses a maximum desktop width of the existing order sheet (`480px`)
  and `max-w-full` behavior on a phone.
- Tapping a marker and tapping a planned-delivery row produce identical content
  and actions.

### 2.4 Workflow state and warning state are independent

The current dashboard category (`pending`, `delivered`, or `needs_attention`)
mixes lifecycle presentation with operational warnings. Add a separate derived
workflow state; do not encode it as another database enum.

| Order and attempt state | Delivery workflow label | Footer action |
| --- | --- | --- |
| Order `pending`, owned attempt `assigned` | Waiting for approval | Disabled/no mutation |
| Order `approved`, owned attempt `assigned`, no purchase | Purchase required | Validate purchase |
| Order `purchased`, owned attempt `assigned` | Ready for delivery | Start delivery |
| Order `out_for_delivery`, owned attempt `in_progress` | Out for delivery | Confirm delivery |
| Order `delivered`, owned attempt `delivered` | Delivered | No primary mutation |
| Attempt `failed` or `cancelled` | Needs operator action/history | No purchase/start/confirm |

Warnings such as **Address to confirm**, **Family unreachable**, **Missing
proof**, and **Delayed** remain a separate badge/list. A row may legitimately
show both **Purchase required** and **Address to confirm**.

The first slice preserves the current exact-date dashboard query. Cross-date
overdue aggregation is not required to authorize or complete this workflow and
must not be mixed into the selected-date result without a separate product
decision.

## 3. Verified reuse inventory

Implementation must extend these owners instead of recreating them.

| Existing owner | Reuse requirement |
| --- | --- |
| `apps/web/src/features/Dashboard/DeliveryDashboard/components/DeliveryDashboardPage.tsx` | Keep the dashboard, date state, metrics, attention, quick actions, selection, and existing own-delivery commands; reorder the map and replace the in-map card with the sheet. |
| `apps/web/src/features/Dashboard/DeliveryDashboard/components/DeliveryMap.tsx` | Keep Leaflet, tile policy, marker keyboard support, selected-marker styling, `onSelect`, empty-map fallback, and no tracking/route drawing. |
| `apps/web/src/features/Orders/components/OrderDetails.tsx` | Extract/reuse the existing Family + Products order presentation. Preserve operator and Family/Sponsor behavior. |
| `apps/web/src/features/OrderCart/components/OrderCartDialog.tsx` | Reuse `OrderConfirmationStep`; do not duplicate Family/product cards or money formatting. |
| `apps/web/src/features/Orders/components/OrderWorkflowForms.tsx` | Reuse the purchase schema, Najm form controls, amount conversion, evidence upload/cleanup, higher-amount confirmation, and operator replacement form. |
| `apps/web/src/features/Orders/hooks/useOrders.ts` and `useDeliveryDashboard.ts` | Reuse `useEntityQuery`, `useEntityCommand`, query invalidation, errors, and pending behavior. |
| `apps/web/src/services/orderApi.ts` | Add narrow own-delivery calls beside existing operator and own-delivery calls; keep the typed API boundary. |
| `packages/server/src/modules/orders/orderDto.ts` | Reuse `recordPurchaseDto`, evidence validation, idempotency key, safe integer minor units, and the existing delivery DTOs. |
| `packages/server/src/modules/orders/orderController.ts` | Add delivery-owned read/purchase routes beside `startOwnDelivery`, `confirmOwnDelivery`, and `reportOwnDeliveryIssue`; keep operator routes unchanged. |
| `packages/server/src/modules/orders/orderService.ts` | Reuse `requireDeliveryStaff`, order locking, purchase evidence validation, budget settlement, purchase persistence, transition/audit/outbox recording, and order projections. |
| `packages/server/src/modules/orders/orderRepository.ts` | Reuse order items, active purchase, active Delivery attempt, idempotency, and row-lock repositories. Add only the minimum owned-attempt lookup if the current methods cannot express it safely. |
| `packages/server/src/modules/orders/orderEvidenceController.ts` and `orderEvidenceService.ts` | Reuse protected receipt normalization/storage/reference checks. Add only narrow Delivery receipt candidate endpoints; keep serve/maintenance operator-only. |
| `packages/server/src/modules/dashboard/dashboardRepository.ts` and `dashboardService.ts` | Reuse the authenticated Delivery identity and selected-date assignment query; add workflow capability fields without a parallel orders query. |
| Existing server/web/connected tests | Extend their fixtures and assertions; do not introduce a second fake order lifecycle. |

Installed `najm-kit` already declares `NSheet` with one scrollable body and an
optional sticky `footer`. Use that contract. Do not add a Kafil sheet primitive
or custom portal.

## 4. Backend design

### 4.1 Role-scoped order detail

Add a dedicated Delivery-owned detail endpoint:

```text
GET /api/orders/:id/delivery/me
```

Controller contract:

- guard with `@isDeliveryStaff()`;
- validate `:id` with the existing `orderIdParams`;
- resolve the authenticated user ID, never accept a Staff ID from the client;
- return a Delivery projection only after proving that the resolved Staff
  profile owns a Delivery attempt for the order;
- retain an MCP read-only description if this route is eligible for discovery;
- update discovery expectations if the tool is exported.

The projection contains only what the agreed sheet needs:

- order ID, order number, status, currency, requested total, and actual total;
- Family display name/image plus the order's delivery address and phone
  snapshots already exposed to the assigned worker by the Delivery dashboard;
- product snapshot ID/name/SKU, quantity, unit price, and line total;
- owned attempt ID/status, schedule, window, package count, and open issue
  summaries;
- `receiptRecorded` and derived workflow/capability fields;
- `canPurchase`, `canStart`, `canConfirm`, and `canReportIssue` calculated on the
  server from the locked/domain state, not trusted from the client.

Do not expose operator-only IDs, private Staff fields, receipt storage paths,
full purchase history, correction reasons, full status-event actor IDs, Family
CIN/documents, or unrelated Delivery attempts.

An order assigned to another Delivery profile must return a non-success response
without leaking its detail. Keep the exact error convention consistent with the
existing own-delivery commands and pin it in tests.

### 4.2 Delivery-owned purchase command

Add:

```text
POST /api/orders/:id/purchase/me
```

The controller reuses `recordPurchaseDto` and `@isDeliveryStaff()`. The service
adds `recordOwnPurchase(id, data, actorUserId)` and must perform these checks in
the purchase transaction:

1. Parse `recordPurchaseDto` again at the service boundary.
2. Resolve `actorUserId` through the existing `requireDeliveryStaff` helper.
3. Check an existing idempotency key before creating any new record. A replay is
   accepted only for the same order and same actor; conflicting order/actor use
   returns `409`.
4. Lock the order row with the existing order lock.
5. Lock/read the active Delivery attempt and require:
   - its order ID matches;
   - its Staff profile equals Ahmed's resolved profile;
   - its attempt status is `assigned`.
6. Require order status `approved` and no active purchase.
7. Validate the protected receipt using the existing evidence service.
8. Execute the existing initial-purchase settlement unchanged:
   - actual total remains an integer minor-unit amount;
   - existing per-order limit and higher-amount confirmation apply;
   - the Family budget stays non-negative;
   - reserved/available/spent changes and the immutable ledger append stay in
     the same transaction;
   - the purchase record stores `recordedByUserId = actorUserId`;
   - the order becomes `purchased`;
   - transition, audit, and outbox metadata retain the existing topic and do not
     contain receipt paths or sensitive Family data.
9. Return the Delivery-safe detail projection, not the operator projection.

Refactor the current operator `recordPurchase` and the new own command onto one
private initial-purchase implementation. Do not call one decorated transaction
method from another or duplicate the settlement/ledger logic. The operator
route keeps its existing behavior and response.

Assignment/reassignment already locks the order first. Keep that lock order so a
purchase racing with reassignment serializes: either Ahmed owns the active
attempt and buys once, or reassignment wins and Ahmed is denied without a
financial mutation.

### 4.3 Protected receipt candidates

The current evidence controller is operator-only. Do not make all evidence and
maintenance routes available to Delivery accounts.

Add narrow candidate routes such as:

```text
POST   /api/order-evidence/me/receipts/:fileName
DELETE /api/order-evidence/me/receipts/:fileName
```

Requirements:

- guard both with `@isDeliveryStaff()`;
- reuse `OrderEvidenceService.upload("receipts", ...)` and
  `removeCandidate("receipts", ...)`;
- return the same canonical stored reference used by `recordPurchaseDto`;
- keep file signature, type, byte ceiling, normalized name, protected storage,
  and referenced-file deletion protection unchanged;
- do not grant Delivery accounts receipt serving, Delivery-proof serving,
  orphan listing, orphan cleanup, or arbitrary `kind` selection;
- if form submission fails, the shared form calls the role-appropriate candidate
  delete route best-effort, exactly as the operator form already does.

### 4.4 Dashboard projection

Extend the existing Delivery dashboard item rather than introducing a second
list endpoint. Add only the data required to render the workflow:

- the existing `orderStatus` becomes an explicit returned field or is mapped to
  a derived `workflowState`;
- `canPurchase` is true only for an approved order, assigned owned attempt, and
  no active purchase;
- preserve existing `canStart`, `canConfirm`, and `canReportIssue` semantics;
- preserve issue category/delayed calculations independently;
- include no product lines in the map/list response—load full detail lazily
  only after the sheet opens.

If determining `canPurchase` requires an active-purchase join, implement it in
the existing selected-date dashboard query/service without N+1 per row. The
detail endpoint remains authoritative when the user acts.

### 4.5 Persistence decision

No schema change is expected. Reuse:

- `orders.status` and reserved totals;
- `order_items` snapshots;
- `order_delivery_attempts.staff_profile_id`, schedule, and lifecycle;
- `order_purchase_records.recorded_by_user_id` and idempotency key;
- existing budget accounts and append-only ledger.

`bun run db:generate` must produce no migration. If it does, stop and investigate
schema drift; do not accept an unrelated generated migration into this slice.

## 5. Frontend design

### 5.1 One shared order presentation

Extract the current Family + Products rendering from `OrderDetails.tsx` into a
presentational order-summary component that still composes
`OrderConfirmationStep`.

- Operator details keep purchasing assignment, Delivery assignment/history,
  status reasons, and existing full detail.
- Family and Sponsor projections keep their existing privacy boundaries.
- Delivery details reuse the Family and Products sections, schedule/contact
  context, and status badge.
- Delivery details omit the redundant Delivery-person card, operator-only
  timeline, purchase replacement controls, and receipt path/history.
- Do not copy the Family/product JSX into the Delivery dashboard.

A thin `DeliveryOrderSheet` may own the Delivery query and actions, but its body
must use the extracted shared order-summary component. It wraps the installed
Najm `NSheet`; it is not a second order-details implementation.

### 5.2 Map-first dashboard

Refactor `DeliveryDashboardPage.tsx` in this order:

1. `NPageHeader`.
2. Full-width map card with Today/date controls.
3. Existing statistics and the remaining dashboard sections.

Remove only the absolute selected-order card inside the map. Preserve tile
errors, attribution, marker selection, keyboard markers, and the no-coordinate
fallback. The map owns no form or order data fetching.

Selection state should identify the attempt/order and the trigger that opened
the sheet. Both `DeliveryMap.onSelect` and planned-delivery row selection call
the same open handler. Do not navigate to `/orders` and do not add an Orders
sidebar entry for Delivery.

### 5.3 Right-side `NSheet`

Use:

- `side="right"` for all locales;
- `width={480}` plus the current `max-w-full` content behavior;
- a Delivery-specific description, not the current "Operator-only" copy;
- loading and error states built from `NCard`/`NErrorState`;
- a scrollable body supplied by `NSheet`;
- `NSheet.footer` for the single sticky primary action.

Footer behavior:

- Waiting approval: disabled status text or no active mutation.
- Purchase required: **Validate purchase** opens the existing Najm dialog/form.
- Ready for delivery: invoke the existing `startOwnOrderDelivery` command.
- Out for delivery: invoke the existing `confirmOwnOrderDelivery` flow.
- Delivered/failed/cancelled: no invalid action.

After every successful mutation, keep the sheet open, invalidate the selected
date dashboard and Delivery detail query, wait for fresh data, and let the
server-derived state select the next action. Do not advance the button from
optimistic local state alone.

### 5.4 Reuse the purchase form

Refactor `PurchaseOrderDialogContent` into one shared form body plus thin command
adapters:

- keep the existing Zod schema and Najm `NForm`/`FormInput` fields;
- keep `parseMadMinor`, `useNajmFormat`, defaults, receipt requirement, upload,
  cleanup, and higher-amount confirmation;
- inject the initial-purchase mutation and pending state instead of checking the
  current role inside reusable fields;
- operator wrapper continues to support initial purchase and replacement;
- Delivery wrapper supports initial purchase only and calls
  `recordOwnOrderPurchase`;
- replacement reason and replacement endpoint never render for Delivery.

The Delivery sheet button opens the same `useDialog` surface used by Orders.
Do not embed another purchase form inside the sheet and do not create a second
form schema.

### 5.5 Queries and invalidation

Add a stable Delivery detail key scoped by order ID. Fetch detail only while the
sheet is open. A successful own purchase must invalidate at least:

- the selected Delivery dashboard date;
- the Delivery families directory;
- the selected Delivery order detail;
- general order/budget/family-order key families already invalidated by the
  operator purchase command when those queries may be live under an Admin
  session.

Reuse `useEntityQuery` and `useEntityCommand`; do not put server order state in
Zustand.

### 5.6 Localization and accessibility

- Reuse existing order, merchant, date, amount, receipt, Start delivery, Confirm
  delivery, Family, Products, and common action keys whenever semantics match.
- Add only Delivery-specific workflow/sheet copy to all four server locale
  dictionaries: `en`, `fr`, `ar`, and `es`.
- Preserve locale-parity tests.
- Give markers accessible names containing Family, order number, workflow
  state, and warning state without exposing the full address in the marker name.
- Marker Enter/Space and planned-row activation open the same sheet.
- Escape closes the sheet and restores focus.
- Announce purchase success and the refreshed workflow state through the
  existing command feedback plus an appropriate live region.
- Verify 320/390px widths, safe-area footer spacing, zoomed text, French labels,
  and Arabic RTL. The sheet remains on the right in Arabic by explicit product
  decision.

## 6. Implementation phases

### Phase 0 — Reconfirm baseline and contracts

- [x] Read this plan, repository `AGENTS.md`, and the three required Kafil
  skills before implementation.
- [x] Preserve the existing dirty Najm provider work; do not reformat or stage
  unrelated files.
- [x] Recheck installed `najm-kit` `NSheet`, dialog, form, upload, and button
  declarations before editing.
- [x] Capture focused baseline results for order, dashboard, evidence, locale,
  and Delivery dashboard tests. Baseline: server 413 pass / 82 skip / 0 fail,
  web 448 pass / 0 fail, `test:db` 60 pass / 0 fail.
- [x] Confirm no current schema/migration drift before attributing later output
  to this slice. Baseline `db:generate` reported no schema changes.

Checkpoint: current tests are understood and any pre-existing failures are
recorded separately. Do not implement around an unexplained baseline failure.

### Phase 1 — Delivery-owned backend read and purchase

- [x] Add the Delivery-safe order-detail projection and owned-detail service
  method (`OrderService.deliveryOrderDetail` / `getOwnDeliveryDetail`).
- [x] Add `GET /orders/:id/delivery/me` with the Delivery role guard.
- [x] Extract one private initial-purchase core from the existing operator
  method without changing its financial behavior
  (`OrderService.applyInitialPurchase`).
- [x] Add `recordOwnPurchase` with assignment, status, actor-aware idempotency,
  and same-transaction ownership checks.
- [x] Add `POST /orders/:id/purchase/me` with the existing DTO.
- [x] Keep operator purchase/replacement behavior and response contracts green
  (pinned by a new `order-modules.test.ts` case).
- [x] Update MCP discovery/health expectations only for routes actually exposed
  as tools (`orders_get_own_delivery`, `orders_record_own_purchase`).

Checkpoint: focused server tests prove allowed Ahmed, denied Youssef,
pending-order denial, reassignment denial, idempotent replay, and unchanged
operator purchase behavior.

### Phase 2 — Delivery receipt candidates and dashboard capabilities

- [x] Add narrow Delivery receipt upload/delete-candidate controller methods
  over the existing evidence service.
- [x] Prove Delivery cannot serve receipts or call maintenance endpoints
  (`order-evidence.test.ts` guard-boundary case).
- [x] Add `workflowState`/`canPurchase` to the existing dashboard projection
  without N+1 detail loads (one correlated `EXISTS` in `deliveryRows`).
- [x] Keep operational warnings independent from workflow state.
- [x] Update shared server/web Delivery dashboard types from the same contract.

Checkpoint: evidence tests pass, dashboard service tests cover each workflow
state, and privacy assertions show no receipt path or unrelated attempt data.

### Phase 3 — Shared order view and purchase form

- [x] Extract the reusable Family + Products order summary from the current
  operator detail component (`OrderSummarySections`).
- [x] Keep operator, Family, and Sponsor snapshots visually and behaviorally
  unchanged (same `OrderConfirmationStep` props, moved behind the shared
  component).
- [x] Split the existing purchase form body from its operator mutation adapter
  (`PurchaseOrderForm` + `PurchaseOrderDialogContent`).
- [x] Add the Delivery initial-purchase adapter using the same form/evidence
  lifecycle (`DeliveryPurchaseDialogContent`).
- [x] Add Delivery detail API, query key, hook, and command invalidations.

Checkpoint: web typecheck plus focused source/component tests prove one order
summary and one purchase form implementation; no copied schema or duplicate
Family/product markup exists.

### Phase 4 — Map-first dashboard and `NSheet`

- [x] Move the existing map card directly below the page header.
- [x] Delete the permanent in-map detail overlay.
- [x] Add one right-side `DeliveryOrderSheet` using the shared order summary and
  `NSheet.footer`.
- [x] Make marker and planned-row activation open the same selected order.
- [x] Render workflow and warning badges separately.
- [x] Wire Validate purchase, Start delivery, Confirm delivery, Call Family,
  Open Maps, and Report issue through existing commands/components.
- [x] Keep the sheet open and refresh from server state after mutations
  (`useEntityCommand` awaits `invalidateQueries` before the footer re-renders).
- [x] Add/reuse all `en`, `fr`, `ar`, and `es` copy; locale parity test green.

Checkpoint: focused web tests pass and manual keyboard inspection shows no map
overlay, no duplicate sheet/form, correct focus return, and no mobile overflow.

### Phase 5 — Financial, authorization, and browser proof

- [x] Extend `packages/server/test/auth.test.ts` for the new Delivery guards and
  unchanged operator-only commands.
- [x] Extend `packages/server/test/order-modules.test.ts` for own-detail and
  own-purchase service behavior.
- [x] Extend `packages/server/test/order-evidence.test.ts` for narrow Delivery
  candidate access.
- [x] Extend `packages/server/test/dashboard-modules.test.ts` for workflow
  states and capability flags.
- [x] Extend `apps/web/test/delivery-dashboard-feature.test.ts` for map-first
  ordering, no overlay, shared sheet/form, and independent badges.
- [x] Extend the existing order/delivery PostgreSQL integration suite rather
  than creating a parallel financial harness
  (`order-delivery-database-concurrency.test.ts`).
- [~] Extend the existing browser order/delivery fixtures for fast UI coverage.
  Authored in `staff-delivery-assignment.e2e.ts` plus a `delivery` Phase 6
  browser user. **Unrun:** the Phase 6 runner needs Redis, which refused TCP on
  `127.0.0.1:6379`.
- [~] Add a real connected Delivery journey using the existing connected runner,
  real PostgreSQL, protected evidence storage, and isolated auth context.
  Authored as **work unit I** in `connected-four-account.e2e.ts`, reusing the
  existing `login`, `setLanguage`, `attachDiagnostics`,
  `expectExactNegativeResponse`, and Mailpit helpers, with two run-bound
  Delivery secrets added to the runner. Its source contract is pinned by
  `connected-four-account-runner.test.ts`. **Unrun:** Mailpit refused TCP on
  `127.0.0.1:1025` and `127.0.0.1:8025`, so the runner's fail-closed preflight
  cannot pass.

Checkpoint: focused source tests, affected package typechecks, DB integration,
and the smallest connected browser unit all pass before expanding to the full
affected spec.

### Phase 6 — Final gate and evidence

- [ ] Run the complete affected browser spec with diagnostics. **Blocked:**
  Mailpit and Redis unavailable on this host.
- [ ] Run the production-style local browser discriminator if development-only
  compilation could change the result. **Blocked** by the same services.
- [ ] Capture masked mobile English, mobile Arabic RTL, and desktop evidence
  under `docs/evidence/delivery-purchase-workflow/<date>/`. **Blocked:** no
  browser run has happened, so there is nothing truthful to capture.
- [x] Run the root verification gate and schema-drift check — `lint`,
  `typecheck`, `test`, `build`, `db:generate` all green, no migration
  generated.
- [x] Record implementation, database, browser, Git publication, deployment,
  and live acceptance as separate verdicts (see the table at the top).
- [x] Update this plan's status only from actual command/evidence results.

## 7. Test matrix

### 7.1 Server and database

| Scenario | Required assertion |
| --- | --- |
| Ahmed reads assigned order | Delivery-safe detail includes Family/order snapshots and products, but omits operator-only and unrelated data. |
| Youssef reads Ahmed's order | Non-success response; no order detail leaked. |
| Ahmed purchases approved assigned order | One purchase, `recordedByUserId = Ahmed`, order `purchased`, exact ledger/budget settlement, transition/audit/outbox recorded. |
| Ahmed purchases pending order | `409`; no purchase, status, budget, ledger, audit, or outbox mutation. |
| Ahmed purchases another worker's order | Denied; no mutation. |
| Ahmed purchases after reassignment | Denied because the active attempt no longer belongs to Ahmed. |
| Exact idempotent replay | Same result; one purchase and one financial effect. |
| Key reused by another actor/order | `409`; no mutation. |
| Actual total below estimate | Existing release/capture behavior remains exact. |
| Actual total above estimate without confirmation | Existing denial remains exact and atomic. |
| Actual total above estimate with confirmation and available budget | Existing settlement succeeds once. |
| Concurrent purchase/reassignment | Order lock serializes ownership; no unauthorized or duplicate settlement. |
| Delivery receipt candidate | Valid protected receipt uploads and failed submission cleans the unreferenced candidate best-effort. |
| Delivery evidence overreach | Receipt serve, other evidence kinds, and maintenance remain denied. |
| Operator purchase/replace | Existing behavior remains green. |
| Family/Sponsor/Admin-without-Staff identity | Cannot use the Delivery-owned endpoint merely because UI or super-role access exists. |

### 7.2 Browser journey

Use a real Family, Operator, and Delivery context. No `page.route()` or mocked
financial/evidence endpoints may support the connected acceptance verdict.

1. Fatima submits a cart through the Family UI.
2. Sara approves it and assigns Ahmed for the selected date.
3. Ahmed signs in at a phone viewport (`390x844`) and sees the map before every
   dashboard section.
4. The map has no persistent detail card covering markers.
5. Ahmed activates Fatima's marker by pointer, then by keyboard in a separate
   state-neutral check.
6. The right `NSheet` opens with Fatima, products, quantities, total, schedule,
   contact, **Purchase required**, and any independent warning badge. It omits
   the redundant Delivery-person section.
7. Validate purchase opens the existing purchase dialog. Ahmed uploads a small
   generated receipt, records the actual amount, and submits once.
8. Assert the exact own-purchase response, visible success, refreshed
   **Ready for delivery** state, and persisted database budget/ledger/purchase
   values.
9. Start delivery and confirm delivery through the same sheet; assert exact
   responses and persisted terminal state.
10. Select the planned-delivery row and prove it opens the same sheet.
11. At `320px`, `390px`, desktop, and Arabic RTL, assert no horizontal overflow,
    a reachable sticky footer, usable scroll, visible map attribution, and sheet
    opening from the right.
12. In a separate negative case, authenticate Youssef and assert the exact
    denied detail/purchase responses with no unexpected diagnostic errors.

Every page receives deny-all diagnostics for page errors, console errors,
failed requests, and unexpected `4xx`/`5xx`. Register exact negative-response
allowances before the denied action and consume each once.

## 8. Verification commands

Run focused tests during each phase, then close the implementation with:

```powershell
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed test
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run test:db
bun run --cwd apps/web test:e2e:connected
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
git diff --check
git status --short
```

The connected runner must first pass its read-only preflight and smallest
focused work unit with passive diagnostics. Do not run the complete connected
spec repeatedly to diagnose a selector or product defect.

## 9. Stop conditions

Stop and investigate rather than broadening the change when any of these occur:

- the implementation needs a new database column/table despite the existing
  purchase actor and Delivery assignment relationships;
- Delivery must receive `operator`, generic OrderReader, or `/orders` access to
  make the flow work;
- the purchase transaction, DTO, evidence normalization, Family/product UI, or
  order sheet is being copied instead of extracted/reused;
- a Delivery response includes receipt paths, unrelated attempts, private Staff
  fields, Family CIN/documents, or operator-only history;
- `db:generate` produces a migration;
- reassignment can race past the ownership check;
- the sheet action advances without a fresh server response;
- Arabic requires a second dashboard tree rather than localized/RTL behavior in
  the same components;
- browser acceptance depends on mocks, production infrastructure, or an
  unrelated already-running server;
- unrelated Najm provider work is reformatted, staged, reverted, or otherwise
  mixed into this slice.

## 10. Out of scope

- Giving Delivery accounts the general Orders page or Operator permissions.
- Letting Ahmed approve, reject, cancel, assign, reassign, or replace purchases.
- Changing the Family cart/submission flow.
- Reworking assisted-order purchasing staff semantics.
- A new purchaser role, Staff function, or Staff/account migration.
- A new order, purchase, evidence, budget, or delivery schema.
- Route optimization, live GPS tracking, navigation paths, background location,
  geocoding, or offline maps.
- Cross-date overdue aggregation beyond the current selected-date contract.
- VPS deployment, remote production acceptance, Git publication, or changes to
  the unrelated Najm provider plan.

## 11. Completion definition

This plan is complete only when all of the following are evidenced:

- Fatima's Family-created order can follow the agreed workflow through Ahmed's
  assigned Delivery dashboard.
- Ahmed can read and purchase only an order assigned to his active Delivery
  profile.
- The first purchase reuses the existing financial/evidence transaction and is
  idempotent, actor-attributed, auditable, and concurrency-safe.
- Operator purchase replacement remains operator-only and all existing role
  projections remain private.
- The map is first, markers are unobstructed, and marker/row selection opens one
  reusable right `NSheet` with a sticky workflow action.
- The existing order summary and purchase form are shared rather than copied.
- English, French, Arabic, and Spanish remain in parity; phone, desktop,
  keyboard, and RTL evidence pass.
- Source tests, real PostgreSQL tests, connected browser acceptance, the root
  gate, and a no-migration `db:generate` pass against the final tree.
- Documentation truthfully separates implementation, browser evidence, Git
  publication, deployment, and live acceptance.
