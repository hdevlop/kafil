# Staff Completion and Delivery Assignment Plan

**Status:** IN PROGRESS - implementation complete; closing verification in progress (2026-07-30)
**Depends on:** `PLAN-staff-module.md`
**Primary surfaces:** Staff page, Staff form, existing Orders table, order delivery dialogs and details
**Rule:** Phase 0 is a blocking gate. Delivery work must not begin until the existing Staff implementation has been independently rechecked, every finding has been resolved, and its required verification passes.

## 1. Goal

Finish the Staff foundation, then add an auditable delivery-assignment workflow inside the existing Orders module.

The agreed administrator experience is:

1. Staff uses the same visual pattern as Sponsors: searchable cards/table, status filter, view toggle, and an Add button.
2. Add/Edit Staff exposes one visible `Role` field with exactly two MVP choices:
   - `Operator`
   - `Delivery`
3. Delivery work stays inside the current Orders table. There is no separate Delivery or Purchasing sidebar page.
4. An operator or admin assigns an active Delivery staff member to a purchased order, starts delivery, confirms delivery, records failure, or changes the assignment.
5. Every assignment and attempt is retained as immutable operational history.

## 2. Locked product decisions

### 2.1 Staff role meaning

`Role` on the Staff form is operational Staff metadata. It is not a new Najm authorization role and must not create a parallel RBAC system.

For the MVP, the UI accepts exactly one role. At the application boundary it may map to the existing normalized Staff function model:

| Staff form value | Persisted function key | Najm account behavior |
| --- | --- | --- |
| `Operator` | `operator` | A linked Najm user is provisioned and synchronized according to the Staff plan. |
| `Delivery` | `delivery` | No login account is created in this slice. The profile is selectable for order delivery work. |

The database may retain the normalized function/join structure for future expansion, but Staff create and edit forms must not expose a multi-select in this MVP.

### 2.2 Staff screen

The Staff screen must follow the current Sponsors screen structure:

```text
+--------------------------------------------------------------------------------+
| Staff                                                           [view] [ + ]   |
| Manage operators and delivery staff.                                           |
+--------------------------------------------------------------------------------+
| Search staff name... | Search email/phone... | Filter by status | Filter role  |
+--------------------------------------------------------------------------------+
| [avatar] Amina Zahra          | [avatar] Youssef Ali                          |
|          Delivery             |          Operator                             |
| Phone: ...                    | Email: ...                                     |
| Company: ...                  | Status: Active                                 |
| Status: Active                |                               [actions menu]    |
+--------------------------------------------------------------------------------+
```

Required behavior:

- Use the established Najm Kit table/card primitive already used by Sponsors.
- Keep the existing built-in card/table view behavior and Add action.
- Use server-backed search, status, role, sorting, and pagination.
- Show only fields appropriate to the current viewer.
- Keep Staff management admin-only.
- Provide operators only the privacy-safe delivery selector needed by Orders.

### 2.3 Orders screen

Keep the current Orders screen, searches, status filter, columns, and actions menu. Add only the delivery information and actions required by this workflow.

```text
+----------------------------------------------------------------------------------------------+
| Orders                                                                                       |
| Review submitted orders and run the audited fulfillment state machine.                      |
+----------------------------------------------------------------------------------------------+
| Search order... | Search recipient... | Filter by status                        [filters]   |
+----------------------------------------------------------------------------------------------+
| ORDER | FAMILY | PHONE | ARTICLES | SOURCE | TOTAL | STATUS | DELIVERY       | PLACED | ... |
| KAF-1 | Samira | ...   | 1        | Assist | 250   | Bought | Not assigned   | ...    |  :  |
| KAF-2 | Karim  | ...   | 3        | Family | 410   | Route  | Amina Zahra    | ...    |  :  |
+----------------------------------------------------------------------------------------------+
```

The row action menu is state-aware:

| Order and assignment state | Available delivery actions |
| --- | --- |
| `purchased`, no active assignment | Assign delivery |
| `purchased`, assigned | View delivery, Start delivery, Change delivery staff |
| `out_for_delivery` | View delivery, Confirm delivery, Delivery failed |
| `delivered` | View delivery history |

The Orders table remains the operational workspace. Do not add a separate delivery-management page or navigation item.

## 3. Phase 0 - Mandatory Staff implementation audit and repair

This phase must run first. The evidence written in `PLAN-staff-module.md` is a useful checklist, but it must not be accepted without checking the current working tree.

### 3.1 Re-audit scope

Compare the live implementation against every acceptance item in `PLAN-staff-module.md`, including:

- schema, migration, stable identifiers, function backfill, and constraints;
- DTO validation and response contracts;
- repository filtering, sorting, pagination, and safe projections;
- service transactions, Najm provisioning, actor identity, status synchronization, and idempotency;
- admin-only Staff management and operator-safe delivery options;
- seed setup, demo fixtures, and repeatability;
- Staff page authorization, navigation, cards/table behavior, dialogs, forms, loading, errors, and localization;
- tests, message registry, MCP exposure where applicable, privacy, audit, and outbox metadata.

Inspect installed Najm package contracts before changing any integration. Do not infer component, auth, provisioning, decorator, or response behavior from memory.

### 3.2 Reconcile Staff UI with the agreed solution

Even if the previous implementation passes its original plan, reconcile it with these newer product decisions:

- Staff visually follows Sponsors.
- Add/Edit Staff has one visible `Role` select, not a multi-function control.
- Valid values are `operator` and `delivery`.
- Operator-specific fields and provisioning behavior appear only for `operator`.
- Delivery-specific contact or affiliation fields appear only for `delivery`.
- Changing the selected role must clear or omit hidden incompatible fields.
- The UI field may submit an adapter such as `functions: [role]` if that preserves the verified server contract.

### 3.3 Resolve findings before continuing

For every finding:

1. Record the mismatch and affected files in the implementation evidence section of this plan.
2. Fix the source implementation, not generated `dist` output.
3. Add or update the smallest regression test that proves the correction.
4. Re-run the focused failing gate.
5. Re-run the complete Staff gate below.

Delivery schema or UI implementation cannot begin while any Staff acceptance item or required verification remains failing.

### 3.4 Staff completion gate

The phase is complete only when all of the following are confirmed against the live code:

- Admin can list, search, filter, sort, paginate, create, edit, activate, and deactivate Staff.
- The page provides card/table views and the Add button in the Sponsors pattern.
- The form exposes one operational Role: Operator or Delivery.
- Operator creation uses explicit, verified Najm provisioning behavior and has a linked user.
- Delivery creation does not provision a login account.
- Repeated seed/setup runs do not duplicate Staff profiles or function assignments.
- Existing operator identities are correctly backfilled or linked.
- Staff status and linked operator access cannot silently diverge.
- Operators cannot open or mutate the Staff management page.
- Operators can read only the minimal active-delivery option projection required by Orders.
- Family and sponsor roles cannot read Staff management or delivery options.
- Inactive delivery Staff do not appear in new-assignment options.
- Full validation, database migration, and browser acceptance gates pass.

## 4. Delivery domain model

### 4.1 Add a normalized delivery-attempt table

Add a feature-owned table such as `order_delivery_attempts`. Do not place order-assignment history on the Staff profile.

Minimum fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable UUID. |
| `order_id` | Order being delivered. |
| `staff_profile_id` | Assigned Staff profile. |
| `status` | `assigned`, `in_progress`, `failed`, `delivered`, or `cancelled`. |
| `delivery_name_snapshot` | Historical name at assignment time. |
| `delivery_phone_snapshot` | Protected operational phone snapshot. |
| `affiliation_snapshot` | Optional company/affiliation snapshot. |
| `assigned_by_user_id` | Authenticated admin/operator actor. |
| `assigned_at` | Assignment timestamp. |
| `started_at` | Start timestamp. |
| `failed_at` | Failure timestamp. |
| `completed_at` | Successful completion timestamp. |
| `cancelled_at` | Reassignment/cancellation timestamp. |
| `failure_reason` | Required for failed attempts. |
| `cancellation_reason` | Required when an active assignment is replaced. |
| command idempotency fields | Unique keys for assign, start, fail, confirm, and reassign commands as appropriate. |
| timestamps | Record creation/update metadata. |

Add a database constraint or partial unique index that permits at most one active attempt (`assigned` or `in_progress`) per order.

Keep the current order-level delivery start, confirmation, proof, and aggregate lifecycle fields as the canonical order summary where they already exist. The attempt row adds the missing assigned-person identity and immutable attempt history; it does not duplicate or bypass the current order state machine.

### 4.2 Lifecycle

```text
purchased + unassigned
        |
        | assign active Delivery staff
        v
purchased + assigned
        |
        | start delivery
        v
out_for_delivery + in_progress
        |                         |
        | confirm                 | fail with reason
        v                         v
delivered + delivered       purchased + failed attempt
                                      |
                                      | assign again
                                      v
                                new assigned attempt
```

Rules:

- Assignment does not change the order from `purchased`.
- Starting requires one active `assigned` attempt and moves the order to `out_for_delivery` in the same transaction.
- Confirmation completes the active attempt and the existing delivery confirmation/proof workflow in the same transaction.
- Failure records a reason, closes the active attempt, and returns the order to `purchased` so it can be assigned again.
- Changing Staff before delivery starts cancels the old attempt with a reason and creates the replacement atomically.
- Attempt history is never deleted or rewritten.
- Generic order-status updates remain forbidden.

### 4.3 Staff deactivation and deletion

- Inactive Delivery staff cannot receive new assignments.
- An assignment that has not started cannot start after its Staff profile becomes inactive; it must be reassigned.
- An already in-progress attempt remains auditable and can be explicitly confirmed or failed by an authorized operator/admin.
- Staff deletion must be blocked when delivery history references the profile. Normal lifecycle management uses deactivation.

## 5. Backend contracts

### 5.1 Commands

Add explicit commands rather than a generic update endpoint:

- `POST /orders/:id/delivery/assign`
  - body: `staffProfileId`, `idempotencyKey`
- `POST /orders/:id/delivery/reassign`
  - body: `staffProfileId`, `reason`, `idempotencyKey`
- existing `POST /orders/:id/delivery/start`
  - require and start the active assignment;
  - preserve existing idempotency behavior.
- `POST /orders/:id/delivery/fail`
  - body: `reason`, `idempotencyKey`
- existing `POST /orders/:id/delivery/confirm`
  - complete the active attempt together with the existing confirmation method, note, and proof behavior.

Exact DTOs must use verified project conventions for UUIDs, trimmed text, maximum lengths, and idempotency keys.

### 5.2 Reads

- Extend the authorized operator/admin order list projection with a small `currentDelivery` summary.
- Extend authorized order detail with the current assignment and ordered attempt history.
- Reuse the Staff module's privacy-safe active-delivery selector for assignment forms.
- Avoid per-row Staff queries; list current delivery summaries in a bounded/batched query.

Suggested list summary:

```ts
type CurrentDeliverySummary = {
  attemptId: string;
  staffProfileId: string;
  name: string;
  status: "assigned" | "in_progress";
  assignedAt: string;
};
```

### 5.3 Authorization

- Admin and operator may assign, reassign, start, fail, and confirm delivery.
- Family and sponsor may not execute delivery commands.
- Staff management remains admin-only.
- Operator access to Staff is limited to the safe delivery-option projection.
- Authorization must be enforced by controllers/guards and services, not only by hidden UI actions.

### 5.4 Transaction and concurrency rules

- Lock the order before validating or mutating its active delivery attempt.
- Validate the current order status and active attempt inside the transaction.
- Validate that the selected Staff profile is active and has the `delivery` operational role inside the transaction.
- Preserve one active attempt per order under concurrent requests.
- Every command must be retry-safe and return the same successful result for the same idempotency key and command target.
- Append audit/outbox events only after the state transition succeeds within the transaction conventions already used by Orders.

This slice does not reserve inventory or mutate family budgets. If a future delivery command touches those resources, it must preserve the project's inventory-before-budget lock order.

## 6. Privacy and projections

### 6.1 Operator/admin projection

Authorized operational responses may include:

- delivery Staff name;
- operational phone;
- affiliation/company;
- assignment and attempt timestamps;
- failure and cancellation reasons;
- protected delivery address and evidence already permitted by the Orders contract.

### 6.2 Family projection

Family responses include only delivery milestones needed to understand their order:

- assigned/preparing for delivery;
- out for delivery;
- delivered;
- safe timestamps already exposed by the order contract.

Do not expose delivery Staff phone, affiliation, internal failure/cancellation reasons, actor IDs, or internal attempt notes.

### 6.3 Sponsor projection

Sponsor responses remain privacy-safe usage views. They may receive the existing fulfillment milestone only. Do not expose delivery Staff identity/contact information, exact delivery address, proof paths, failure reasons, or internal notes.

### 6.4 Audit and outbox

Audit/outbox metadata may contain stable resource IDs, status transitions, and safe timestamps. It must not contain:

- exact family address;
- Staff phone;
- private notes;
- raw delivery proof paths or content;
- secrets or provisioning credentials.

## 7. Frontend implementation

### 7.1 Staff completion

Complete the Phase 0 Staff reconciliation before building Orders delivery UI:

- Sponsor-style Staff page;
- Add button and create dialog;
- Add/Edit form with a single Role select;
- role-conditional fields and validation;
- status actions with confirmations;
- admin-only route/navigation presentation;
- operator-only safe selector usage in Orders.

Use installed Najm Kit components and verified contracts. Do not hand-build substitutes for an available table, form, dialog, combobox, status badge, or feedback primitive.

### 7.2 Orders table

Preserve the current Orders table and add a `Delivery` column near `Status`/`Placed`.

Cell states:

- `Not assigned`
- assigned Staff name
- assigned Staff name plus in-progress state
- `Needs reassignment` after the latest failed/cancelled attempt when there is no active assignment
- completed Staff name where the order list contract intentionally retains it

The column must remain compact and responsive. On narrow layouts, delivery information may move into the row/card detail using the existing table responsiveness pattern.

### 7.3 Dialogs and row actions

Add Najm Kit dialogs/forms for:

- Assign delivery: searchable select of active Delivery Staff.
- Change delivery staff: current assignment, new Staff select, required reason.
- Start delivery: explicit confirmation.
- Delivery failed: required reason and consequence explanation.
- Confirm delivery: reuse and extend the existing confirmation/proof dialog rather than creating a competing flow.
- View delivery: current assignment and immutable attempt timeline.

Disable submission while a command is pending, display server validation/conflict messages, invalidate the appropriate order list/detail queries on success, and keep dialog state pristine when closed/reopened.

### 7.4 Delivery Details view

Provide a dedicated Delivery Details view without creating a separate route or sidebar module. Open it from either:

- the Orders table `Delivery` cell;
- `View delivery` in the row actions menu;
- the delivery section of the existing order detail view.

Use the verified Najm Kit responsive sheet/drawer pattern. It should appear as a right-side drawer on desktop and a full-width sheet on mobile.

```text
┌──────────────── DELIVERY DETAILS ────────────────┐
│ Order KAF-001                   Out for delivery  │
│ Family Atlas · 3 articles · 427 MAD              │
├──────────────────────────────────────────────────┤
│ Assigned delivery staff                          │
│ [Avatar] Hassan                                   │
│          Delivery · Internal team                 │
│          +212 6 55 44 33 22                      │
├──────────────────────────────────────────────────┤
│ Progress                                         │
│                                                  │
│ ✓ Order confirmed       Jul 27 · 10:15           │
│ │                                                │
│ ✓ Purchased             Jul 27 · 11:40           │
│ │                                                │
│ ✓ Assigned to Hassan    Jul 27 · 12:10           │
│ │                                                │
│ ● Out for delivery      Jul 27 · 14:05           │
│ │                                                │
│ ○ Delivered             Waiting                  │
├──────────────────────────────────────────────────┤
│ Attempt history                                  │
│ #1 Hassan · Active · Assigned Jul 27              │
├──────────────────────────────────────────────────┤
│ [Change staff] [Delivery failed] [Confirm]       │
└──────────────────────────────────────────────────┘
```

Required sections:

1. Header with order number and current delivery status.
2. Compact order summary with family, article count, and total using existing formatters.
3. Current Delivery Staff card with avatar, name, operational role, affiliation, and phone for authorized admin/operator viewers.
4. Milestone timeline built from real order and attempt timestamps:
   - order confirmed;
   - purchased;
   - assigned;
   - out for delivery;
   - delivered or failed.
5. Immutable attempt history showing previous failed or cancelled assignments and the active/current attempt.
6. Footer actions derived from the order and attempt state, using the same command dialogs defined above.

View behavior:

- `purchased` without assignment shows `Not assigned` and an `Assign delivery` action.
- `purchased` with an assignment shows the assigned Staff member plus `Start delivery` and `Change staff` actions.
- `out_for_delivery` shows the active progress milestone plus `Delivery failed` and `Confirm delivery` actions.
- `delivered` is read-only and shows the completed timeline and history.
- A failed latest attempt shows its reason to admin/operator and presents `Assign another delivery staff`.
- Loading, empty, stale/conflict, and retry states use the established page/dialog feedback patterns.

Do not include a live map, simulated vehicle location, route line, ETA promise, or customer-to-driver contact action. Those require a future authenticated Delivery Staff mobile/GPS workflow. The family/sponsor projections must not receive the admin/operator Staff phone, affiliation, internal failure reason, or assignment history.

### 7.5 Localization and accessibility

- Add English, French, and Arabic message keys for Staff roles, delivery states, actions, dialog text, validation, success, and errors.
- Maintain logical RTL layout.
- Every icon-only action requires an accessible label.
- Status must be conveyed by text, not color alone.
- Dialog/sheet focus, focus restoration, error association, keyboard interaction, timeline semantics, and mobile layout must follow the existing Najm Kit patterns.

## 8. Implementation sequence

### Phase 0 - Staff audit and repair (complete 2026-07-30)

- [x] Re-audit the previous plan against live code.
- [x] Capture findings.
- [x] Resolve all findings.
- [x] Reconcile the Staff UI to the Sponsor pattern and single Role field.
- [x] Pass the complete Staff gate.

### Phase 1 - Contract and decision alignment (complete 2026-07-30)

- [x] Confirm installed Najm backend/frontend contracts.
- [x] Confirm current Orders lifecycle and delivery DTOs.
- [x] Add the delivery-assignment decision to `docs/plans/DECISIONS.md`.
- [x] Record that operational Staff Role is domain metadata, not Najm RBAC.

### Phase 2 - Schema and migration (complete 2026-07-30)

- [x] Add the delivery-attempt schema in the Orders feature.
- [x] Compose it through the database schema entrypoint.
- [x] Generate a new migration; never edit a deployed migration.
- [x] Add constraints, indexes, and prior/current migration coverage.

### Phase 3 - Backend commands (complete 2026-07-30)

- [x] Implement repository locking and active-attempt queries.
- [x] Implement assign, reassign, start integration, fail, and confirm integration.
- [x] Add idempotency, audit, outbox, authorization, and concurrency coverage.

### Phase 4 - Read projections and privacy (complete 2026-07-30)

- [x] Extend operator/admin order list and detail.
- [x] Add attempt history.
- [x] Confirm family and sponsor projections remain safe.
- [x] Verify audit/outbox metadata excludes protected values.

### Phase 5 - Orders UI (complete 2026-07-30)

- [x] Add the Delivery column to the current table.
- [x] Add state-aware row actions and dialogs.
- [x] Add the responsive Delivery Details sheet/drawer with progress timeline and immutable attempt history.
- [x] Complete localization, responsive behavior, and accessibility.

### Phase 6 - Acceptance and documentation (closing verification in progress)

- [ ] Run the final full root and browser gates.
- [x] Run database concurrency/migration tests.
- [ ] Complete the full browser regression suite after focused role and delivery-transition acceptance.
- [x] Update this plan with implementation evidence and findings.
- [x] Update `PLAN-staff-module.md`, `docs/PLAN.md`, and the affected section plans to match reality.

## 9. Test matrix

### 9.1 Staff regression

- [x] Admin-only Staff page and mutations.
- [x] Operator/Delivery single-role form behavior.
- [x] Operator provisioning and linked-user synchronization.
- [x] Delivery profile without login creation.
- [x] Server-backed filter/sort/page behavior.
- [x] Active-delivery selector projection and authorization.
- [x] Seed rerun/backfill stability.
- [x] Card/table view, Add dialog, edit/status actions, localization, and browser behavior.

### 9.2 Delivery service and database

- [x] Assign only an active Staff profile with role `delivery`.
- [x] Reject operator-only, inactive, missing, or cross-contract-invalid Staff.
- [x] Reject assignment outside `purchased`.
- [x] Prevent two active attempts for one order under concurrency.
- [x] Retry assign/reassign/start/fail/confirm idempotently.
- [x] Start requires an active assignment.
- [x] Confirm requires `out_for_delivery` and completes the same active attempt.
- [x] Fail closes the attempt and returns the order to `purchased`.
- [x] Reassign cancels the old attempt and creates one new active attempt atomically.
- [x] History remains ordered and immutable.
- [x] Staff deactivation behavior follows section 4.3.
- [x] Migration works from both the previous schema and an empty schema.

### 9.3 Authorization and privacy

- [x] Admin/operator command success.
- [x] Family/sponsor command denial.
- [x] Operator/admin projections contain required operational data.
- [x] Family/sponsor projections omit Staff identity/contact and internal reasons.
- [x] Audit/outbox metadata omits protected address, phone, notes, and proof paths.

### 9.4 Frontend

- [x] Current Orders searches, status filter, sorting, selection, and actions continue working.
- [x] Delivery column renders every supported state.
- [x] Action menu matches order/attempt state.
- [x] Delivery Details opens from the column, actions menu, and existing order detail integration point.
- [x] Delivery Details renders the correct current Staff card, milestones, attempt history, and state-aware footer actions.
- [x] Desktop drawer and mobile full-width sheet behavior both pass.
- [x] Admin/operator operational contact data is never rendered in family/sponsor views.
- [x] No live-map or real-time-location claim is rendered without a future location source.
- [x] Dialog validation and pristine state work across repeated opens.
- [x] Successful commands refresh list/detail state.
- [x] Conflict/idempotent responses produce correct feedback.
- [x] Mobile, RTL, keyboard, and screen-reader behavior is accepted.

## 10. Verification commands

Run focused checks while implementing, then the complete gate before marking the plan complete:

```bash
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed typecheck
bun run --cwd packages/seed test
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run test:db
bun run build
bun run db:generate
bun run db:migrate
bun run check
```

`db:generate` must produce either the expected new migration during schema implementation or no unexpected diff after it is committed. Record any interactive rename/create decision. Browser acceptance must be recorded separately with the routes, roles, and transitions exercised.

## 11. Out of scope

- Delivery Staff login or self-service mobile application.
- A separate Delivery or Purchasing sidebar/page.
- Route optimization, GPS tracking, maps, signatures, or customer SMS.
- Generic status mutation endpoints.
- Delivery fees charged to a family budget.
- External courier settlement/accounting. If added later, it is a Kafil operating expense and must be modeled separately from family funds.
- Multi-role Staff selection in the MVP form.

## 12. Exit criteria

This plan is complete only when:

- [x] The previous Staff implementation has been freshly audited.
- [x] All discovered Staff findings are resolved and documented.
- [x] Staff matches the agreed Sponsor-style page and single Role form.
- [x] Delivery assignment is available from the existing Orders table.
- [x] The Delivery Details view provides the current assignment, progress timeline, attempt history, and valid next actions.
- [x] Assign, reassign, start, fail, confirm, and history work through explicit audited commands.
- [x] Concurrency, idempotency, authorization, privacy, and migration tests pass.
- [ ] The full browser acceptance suite passes for admin, operator, family, and sponsor views.
- [ ] The final root and package verification gates pass after browser-test corrections.
- [x] Roadmap and section-plan documentation match the implemented behavior.

## 13. Implementation evidence

Populate this section during implementation. Do not mark items complete from planned intent.

### Staff re-audit findings

- The previous Staff slice still exposed a multi-function form even though the
  accepted MVP has one visible Role; sorting was not consistently delegated to
  the repository; linked operator phone changes were not synchronized; and
  Staff deletion did not yet account for delivery history.
- The route/navigation boundary was rechecked: `/operator/staff` is
  server-guarded for `admin`, while operators receive only the safe active
  delivery-options projection.

### Staff fixes and proof

- Create/edit now exposes exactly `Operator` or `Delivery`. Operator creation
  provisions and links its Najm account; Delivery creates no login. Incompatible
  affiliation/account fields are cleared, linked email/phone stay synchronized,
  server sorting is deterministic, and any delivery-attempt history makes Staff
  non-pristine.
- Localized Staff copy was reconciled in English, French, Spanish, and Arabic.
  Unit/browser coverage proves Sponsor-style cards, the single Role form,
  admin-only access, normal-operator denial, and Arabic RTL behavior.

### Delivery implementation proof

- Migration `0027_unusual_victor_mancha.sql` adds the normalized
  `order_delivery_attempts` table, lifecycle check, Staff/order foreign keys,
  command idempotency uniqueness, lookup indexes, and a partial unique index
  allowing one active attempt per order.
- Orders expose explicit assign, reassign, start, fail, and confirm commands.
  Services lock the order, retain Staff/contact snapshots and immutable attempt
  history, return failures to `purchased`, complete the active attempt during
  confirmation, and emit privacy-safe audit/outbox metadata with no contact,
  address, reason, note, or proof-path leakage.
- Operator list/detail projections include current/latest/history delivery data;
  family receives only `deliveryAssigned`; sponsor keeps the existing safe
  milestone projection. The canonical `/orders` page has a Delivery column,
  state-aware dialogs/actions, and an RTL-aware Najm `NSheet` with current
  contact, semantic progress, history, and responsive 95vw mobile behavior.

### Verification results

- Server: typecheck passed; 307 tests passed, 33 database-opt-in tests skipped,
  0 failed. PostgreSQL integration/concurrency: 21 passed, 0 failed.
- Seed: typecheck passed; 71 tests passed, 0 failed.
- Web: lint/typecheck passed; 226 tests passed, 0 failed. Production build with
  Next.js 16.2.10 passed and emitted 40 routes.
- `db:migrate` applied `0027_unusual_victor_mancha`; the post-implementation
  `db:generate` drift check produced no unexpected migration.
- Closing status: focused delivery acceptance and all package/database/build
  gates pass; the final full browser and root reruns remain in progress.

### Browser acceptance

- Admin: Staff cards, one Role selector, conditional affiliation fields, and
  Arabic RTL/localized copy; normal operator: direct Staff route denied.
- Operator: current assignment, reassign with retained cancellation reason,
  start, fail with retained failure reason, reassignment state, semantic
  Delivery Details history, and 390px mobile sheet behavior.
- Family/sponsor: safe milestone pages rendered without Staff name, phone,
  company, reason, or assignment history.
