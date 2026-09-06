# Family order limits plan (v4 — per-family with global fallback)

Status: **IMPLEMENTED — source and PostgreSQL gates pass; browser acceptance deferred by user**

This is a task-specific root plan. It does not replace any other plan and
claims no project-wide phase status. There is no root `PLAN.md`.

Decision confirmed with user: enforcement values are resolved per family;
Settings holds nullable global defaults. The common rule is:

```text
effective = explicitFamilyOverride ?? globalDefault ?? unlimited (null)
```

For the monthly amount, an explicit override is the existing row for the
selected family and month. Absence of that row means inheritance; an inherited
global value is never copied into `monthly_budget_limits`.

## 1. Goal

Control family purchase pace with three AND-combined caps:

- `monthlyLimitMinor` (MAD/month, existing per-family/month override) — total
  monthly order usage.
- `maxOrdersPerMonth` (count/month, new) — number of accepted submissions.
- `maxBudgetPerOrderMinor` (MAD/order, new) — maximum resulting basket total.

Average `monthly / count` is friendly advice only and never blocks.

Example: monthly 6,000 + 4 orders + 3,000 ceiling allows
2,800 + 2,200 + 900 + 100, blocks a 5th order by count even with money left.
A 5,500 single basket is blocked by the ceiling even with monthly room left.

Out of scope: funding targets, contributions, catalog behavior, delivery
behavior, and `najm-theme`.

## 2. Current state (verified)

- `packages/server/src/modules/settings/settingSchema.ts:24`
  `platform_settings` has no order-count, per-order, or default-monthly fields.
- `packages/server/src/modules/settings/settingDto.ts:15`
  `updateSettingsDto` contains only the current product settings.
- `apps/web/src/features/Settings/components/AppSettingsPanel.tsx`
  has no order-limit controls.
- `packages/server/src/modules/budgets/budgetService.ts:120`
  exposes `setMonthlyLimit(familyProfileId, { month, limitMinor, reason })`.
- `apps/web/src/services/budgetApi.ts` has only the budget-summary GET; there is
  currently no monthly-limit or order-policy editor in the web app.
- `packages/server/src/modules/orders/orderService.ts:1374-1391`
  `ensureCapacity()` enforces available budget plus explicit monthly usage.
- `packages/server/src/modules/budgets/budgetRepository.ts:173`
  `monthlyOrderUsage` sums `order_reserve/release/refund` in the UTC month.
- A pending order is inserted before `reserveRequestedBudget`; therefore a
  submission-time count query made there includes the new order itself.
- `budget_accounts` is one row per family and is already the serialization row
  for financial order mutations.

## 3. Design

### 3.1 Storage

Global defaults in `platform_settings`:

- `default_max_orders_per_month INT NULL CHECK BETWEEN 1 AND 31`
- `default_max_budget_per_order_minor BIGINT NULL`
- `default_monthly_budget_minor BIGINT NULL`

Both money columns require database checks:

```text
value IS NULL OR value BETWEEN 1 AND 9007199254740991
```

The upper bound matches `MAX_MINOR_UNITS` and Drizzle's JavaScript `number`
mode. All three columns are added as NULL with no migration backfill, preserving
current production behavior.

Per-family overrides on `budget_accounts`:

- `max_orders_per_month INT NULL CHECK BETWEEN 1 AND 31`
- `max_budget_per_order_minor BIGINT NULL CHECK safe-positive as above`

`NULL` means inherit the global default; this v1 intentionally has no explicit
"unlimited despite a configured global" state.

Monthly amount remains in `monthly_budget_limits`, keyed by account and month:

- row exists: explicit operator/family-creation override for that month;
- no row: inherit `platform_settings.default_monthly_budget_minor`;
- no row and global NULL: unlimited.

Do not seed an inherited value into this table. A future policy-history table
is out of scope for v1.

### 3.2 Policy resolution and projections

Add a budgets-owned resolver that accepts the already locked account:

```text
resolveOrderPolicy(lockedAccount, month):
  monthlyOverride = monthly_budget_limits.find(lockedAccount.id, month)
  settings = platform_settings.find()

  monthlyLimit = monthlyOverride?.limitMinor
    ?? settings.defaultMonthlyBudgetMinor
    ?? null
  maxOrders = lockedAccount.maxOrdersPerMonth
    ?? settings.defaultMaxOrdersPerMonth
    ?? null
  maxPerOrder = lockedAccount.maxBudgetPerOrderMinor
    ?? settings.defaultMaxBudgetPerOrderMinor
    ?? null
```

Do not re-read the account inside the resolver. Submission first acquires the
budget-account `FOR UPDATE` lock, then resolves from that row so a concurrent
family-policy update cannot be observed stale after waiting for the lock.
There is no cross-request cache. A submission already in flight may resolve on
either side of a concurrent global-settings update; later requests see the new
default.

Budget summary projections:

- Family projection exposes effective values only:
  `month`, `monthlyUsedMinor`, `monthlyLimitMinor`, `ordersUsed`,
  `ordersLimit`, `ordersRemaining`, `maxPerOrderMinor`.
- Operator projection additionally exposes each `override`, `default`,
  `effective`, and `source: "family" | "global" | "unlimited"`, so the editor
  can truthfully render `Effective: 3/month (family override; global 4)`.
- Neither projection adds guardian CIN, address, documents, evidence, notes, or
  other family-private data.

### 3.3 Mutation semantics and API

Keep explicit commands:

- `PUT /api/settings` updates the three nullable global defaults with the
  existing settings permission and an audit event containing safe before/after
  limit values.
- `PUT /api/budgets/:familyProfileId/order-policy` accepts
  `{ maxOrdersPerMonth: 1..31|null, maxBudgetPerOrderMinor: positive|null,
  reason: 3..500 }`. NULL restores global inheritance. It locks the budget
  account, writes only policy columns, and records `budget.orderPolicyUpdated`.
- Existing `PUT /api/budgets/:familyProfileId/monthly-limit` continues to set an
  explicit `{ month, limitMinor, reason }` row.
- New `POST /api/budgets/:familyProfileId/monthly-limit/reset` accepts
  `{ month, reason }`, deletes that explicit month row if present, is
  idempotent, and records `budget.monthlyLimitReset`. The effective value then
  comes from the current global default or unlimited.

All budget-policy mutations use `@isOperator()`, `@CanUpdate()`, validated
params/body, Najm `@McpTool` metadata with confirmation, response locale keys,
and the existing `update:budgets` permission. Settings stays under
`update:settings`; no permission definition is added.

Family creation accepts three optional values:

- `maxOrdersPerMonth`
- `maxBudgetPerOrderMinor`
- `monthlyBudgetMinor`

Omitted or NULL count/per-order values persist as NULL on `budget_accounts`.
Omitted or NULL monthly value creates no monthly row. An explicit monthly value
creates the current UTC-month row with the creating operator as `setByUserId`,
a deterministic `Set during family creation` reason, and audit evidence. This
write remains in the existing family-creation transaction.

### 3.4 Submission enforcement and concurrency

Do not extend one helper with ambiguous amount semantics. Use separate checks:

```text
ensureAvailableAndMonthlyCapacity(account, additionalMinor, policy)
ensurePerOrderCapacity(resultingOrderTotalMinor, policy)
ensureNewOrderCountCapacity(familyProfileId, month, policy)
```

New submission flow, inside the existing transaction:

1. Preserve the existing idempotency checks and server-side item valuation.
2. Preserve any inventory-before-budget lock ordering used by the command.
3. Insert the pending order.
4. Lock the family's budget account `FOR UPDATE`.
5. Resolve the policy from that locked account and the current UTC month.
6. Check available/monthly capacity with the full reservation amount.
7. Check the per-order ceiling against `order.totalMinor`.
8. Count non-cancelled/non-rejected orders in the month. Because the current
   order is already visible to its own transaction, reject only when
   `count > maxOrders`; the Nth order passes and N+1th fails.
9. Append the reservation and finish the order/audit/outbox writes.

The count query is:

```sql
SELECT count(*)
FROM orders
WHERE family_profile_id = :familyProfileId
  AND created_at >= :monthStartUtc
  AND created_at < :nextMonthStartUtc
  AND status NOT IN ('cancelled', 'rejected')
```

The existing `(family_profile_id, created_at)` index supports the range. The
account lock serializes different idempotency keys for one family; the real
PostgreSQL test must prove the READ COMMITTED visibility assumption after a
waiting transaction acquires that lock.

The confirmed count policy intentionally frees a slot when an order becomes
`cancelled` or `rejected`, including an operator cancellation after purchase.
Cancellation, rejection, or hard deletion must therefore refresh quota reads.

### 3.5 Purchase and replacement top-ups

Top-ups are not new orders and never run the count check.

- `settleInitialPurchase`: when `actualTotalMinor > order.totalMinor`, check
  monthly/available capacity with `difference`, but check the per-order ceiling
  against `actualTotalMinor`.
- `settleReplacementDifference`: when
  `replacementTotalMinor > current.actualTotalMinor`, check monthly/available
  capacity with `difference`, but check the per-order ceiling against
  `replacementTotalMinor`.
- A lower or equal resulting total needs no new capacity check because the
  earlier accepted total already satisfied its policy.

This prevents a 2,800 MAD estimate revised to 3,200 MAD from passing a 3,000 MAD
ceiling merely because the additional reserve is only 400 MAD.

### 3.6 Guidance, not enforcement

- `fundingTargetMinor / 12` may be a placeholder hint only; funding target and
  monthly purchase pace are different policies.
- `monthly / count` is an even-split hint only. Uneven baskets such as
  2,800 + 2,200 + 900 + 100 against 6,000/4 remain valid.

## 4. Backend implementation tasks (`packages/server`)

1. Schema and migration:
   - add three nullable global columns and two nullable account columns;
   - add range/safe-integer checks;
   - generate a new migration and verify it contains no data backfill.
2. DTOs and controllers:
   - extend `updateSettingsDto` with three nullable globals;
   - add `setFamilyOrderPolicyDto` and `resetMonthlyBudgetLimitDto`;
   - add the policy PUT and monthly-reset POST routes from section 3.3.
3. Repositories:
   - update settings and account policy columns;
   - delete/reset an explicit monthly row idempotently;
   - count active orders in a UTC range;
   - keep `packages/server/src/database/schema.ts` composition-only.
4. Services:
   - add locked-account policy resolution and actor-attributed audits;
   - implement exact create/inherit/reset semantics;
   - split submission capacity, resulting-order ceiling, and count checks;
   - apply the correct top-up totals from section 3.5.
5. Family create path:
   - extend `createFamilyDto` with three nullish optionals using the same DTO
     boundaries as the policy commands;
   - after `budgets.ensureForFamily`, persist count/per-order overrides;
   - create a monthly row only when `monthlyBudgetMinor` is explicit.
6. Locales:
   - add settings/policy labels, hints, success messages, reset confirmation,
     and conflict keys for monthly, count, and per-order denial to en/fr/ar/es;
   - keep locale parity passing.
7. MCP:
   - settings and budget controllers are already tool groups, so update tool
     metadata and discovery expectations unconditionally for changed/new tools.

## 5. Frontend implementation tasks (`apps/web`)

### 5.1 Global settings

- Extend Settings types, schema, defaults, request conversion, and
  `AppSettingsPanel` with three Najm Kit inputs.
- Empty means unlimited global default; do not coerce empty to zero.
- Show `≈ monthly/count MAD/order if split evenly` using integer quotient and
  remainder formatting.

### 5.2 Family create and policy editor

- Extend `FamilyHouseholdFields`, create-wizard field registration,
  `familySchemas.ts`, and `CreateFamilyInput` with three optional form values.
- Fetch Settings only to show placeholders such as `Global: 4/month`; an empty
  submission remains omitted/NULL and is resolved by the server.
- Add a new operator-only `FamilyOrderPolicyCard` to the existing family detail
  surface. There is no existing monthly-limit web editor to extend.
- The card edits count and per-order overrides, sets or resets the selected
  month's amount, requires an audit reason, and renders the operator projection
  source/effective values.
- Add `budgetApi` functions and `useEntityCommand` hooks for policy PUT,
  monthly-limit PUT, and monthly-reset POST.

### 5.3 Family/order quota presentation

- Extend operator and family budget-summary types independently.
- `OrderCart` and `Orders` show effective quota text, for example:
  `1 of 3 orders remaining · up to 3,000 MAD/order`.
- Handle each nullable limit honestly; do not display fabricated zeroes.
- Client checks are advisory. The backend remains authoritative and the UI
  presents the exact server denial.
- Use Najm Kit primitives, shared money/number formatters, localized copy, and
  authorization presentation wrappers only.

### 5.4 Cache invalidation

Invalidate every affected React Query family:

- settings update: `settingKeys`, operator `budgetKeys`, family
  `familyBudgetKeys`;
- per-family policy set/monthly set/reset: operator `budgetKeys`, family
  `familyBudgetKeys`;
- submit/assisted submit, reject, cancel, and hard delete: order keys plus both
  budget key families because `ordersUsed` changes;
- purchase/replacement and all budget reserve/release/refund mutations: both
  budget key families because monthly usage or balances change.

Verify desktop/mobile presentation, keyboard labels/focus, and Arabic RTL.

## 6. Tests

### 6.1 Backend source tests

- DTO boundaries:
  - nullable/omitted means inherit;
  - count rejects 0, negatives, and 32+;
  - money rejects zero, negative, fractional, and unsafe integers;
  - monthly reset requires a valid first-of-month date and reason.
- Resolution:
  - family override beats global;
  - NULL/absent uses global;
  - both absent means unlimited;
  - resetting monthly removes the row and immediately exposes the global.
- Submission:
  - Nth passes and N+1th is blocked with the post-insert `count > limit`
    contract;
  - cancelled/rejected are not counted;
  - idempotent resubmit is single-counted;
  - month rollover resets count;
  - three caps are AND-combined.
- Top-ups:
  - 2,800 estimate to 3,200 actual is blocked by a 3,000 ceiling even though
    the difference is only 400;
  - replacement uses the replacement total, not its difference;
  - a top-up at the count limit remains allowed when its resulting total and
    monthly/available capacity pass because it consumes no new order slot.
- Audit/MCP/locale:
  - safe before/after policy metadata, actor, resource, and reason;
  - updated tool discovery and confirmation metadata;
  - locale parity.
- Authorization/privacy:
  - family and sponsor are denied on the actual policy PUT, monthly PUT, and
    monthly-reset POST routes;
  - family/operator projections contain only their declared fields and never
    add CIN, exact address, documents, evidence, or notes.

### 6.2 Database integration

Run `bun run test:db` with real PostgreSQL:

- parallel submissions with distinct idempotency keys admit exactly up to the
  cap and leave no extra order, reservation, audit, or outbox record;
- the waiting transaction observes the earlier committed order after acquiring
  the budget-account lock;
- a concurrent family-policy update and submission serialize on that account;
- monthly reset is transactional and idempotent;
- schema constraints reject unsafe money and invalid count values.

### 6.3 Frontend source tests

- empty/null parsing and request conversion;
- integer-only even-split hint including remainder;
- operator override/default/effective/source rendering;
- quota remaining text, unlimited combinations, and zero clamping;
- query invalidation for every mutation listed in section 5.4.

### 6.4 Browser acceptance

Create `apps/web/test/e2e/family-order-limits.e2e.ts` using the real PostgreSQL
runner on `127.0.0.1:3210`, no route mocks, and deny-all diagnostics. Add the
file to the default list in `apps/web/scripts/run-phase6-e2e.ts` so
`bun run --cwd apps/web test:e2e` actually executes it.

Work units:

1. Admin saves global count/per-order/monthly defaults and reload proves they
   persisted.
2. Operator creates a family with empty limit inputs; its detail shows global
   sources rather than copied overrides.
3. Family submits two orders under a 2/month default; the third action produces
   exactly one registered `POST /api/orders/submit` 409, an inline localized
   error, no unexpected HTTP errors, and no extra persisted effects.
4. Operator sets that family to 3/month; the next family submission passes and
   quota text refreshes without a page reload.
5. Operator resets the override to NULL and the detail returns to the global
   source; cancellation/rejection refreshes and frees one count slot.
6. A basket above the per-order cap is rejected. A separately prepared purchase
   top-up proves the resulting total, not only the difference, is enforced.
7. Repeat the changed settings/detail/quota surfaces at mobile width and Arabic
   RTL with keyboard-reachable controls and visible focus.

Follow `kafil-playwright-testing`: focused work unit plus passive diagnostics,
then dependent range, complete affected spec, production-style run, and final
gate. Register each intentional 409 by exact method/path/status once and restore
deny-all immediately.

## 7. Migration, seed, rollout, and rollback

- Migration adds nullable columns and constraints only. It does not set a
  global default or create monthly rows for existing families.
- Production/setup seeding does not activate order limits automatically.
- Demo fixtures only use the confirmed illustrative values:
  - global max orders/month: `4`;
  - global max per order: `300000` minor (3,000 MAD);
  - global monthly amount: `600000` minor (6,000 MAD);
  - one demo family has `max_orders_per_month = 2`; other demo families inherit;
  - no inherited monthly row is created.
- The demo seeder writes only the three new setting columns and attributes the
  patch to its designated demo operator. `seed:remove` resets those columns to
  NULL only when the current updater is that demo actor and all three values
  still equal the exact demo defaults; otherwise it preserves the settings as
  user-managed data.
- Extend `verifyDemoData` and package seed tests to verify the demo globals, the
  one explicit override, absence of copied inherited rows, and the guarded
  cleanup behavior. Keep `seed:verify` scoped to its existing auth/theme
  contract because no permission seed change is expected.
- Apply with `bun run db:migrate` only in the authorized environment after
  source gates. Record migration evidence separately from deployment and
  browser acceptance.
- Rollback order: disable enforcement and new UI/API use first, deploy that
  revision, then use a follow-up migration to remove columns/constraints.
  Never edit the deployed migration.
- Store acceptance artifacts under `docs/evidence/` with no sensitive family
  identifiers or runtime secrets.

## 8. Verification gates

Focused while implementing:

```bash
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed test
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
```

Database and browser gates:

```bash
bun run test:db
bun run --cwd apps/web test:e2e
```

Final repository gate:

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

Review the generated migration before applying it. After it is committed,
`bun run db:generate` must produce no further migration. Report implementation,
migration application, Git publication, deployment, and browser acceptance as
separate statuses.

## 9. Confirmed decisions

- [x] v1 stores count/per-order overrides on `budget_accounts`.
- [x] Monthly override remains a per-account, per-month row; absence inherits.
- [x] Empty create input never copies a global default into a monthly row.
- [x] An explicit monthly reset command restores inheritance.
- [x] Counting uses UTC `[month-01, next-month-01)`.
- [x] Count is checked after insert, includes the current order, and rejects
  only when `count > limit` while holding the budget-account lock.
- [x] Cancelled/rejected orders do not count and therefore free a slot.
- [x] Top-ups check additional monthly capacity but compare the resulting order
  total to the per-order ceiling; they do not consume another count slot.
- [x] Migration defaults remain NULL; illustrative 4 / 3,000 / 6,000 values are
  demo fixtures only.
- [x] Family create wizard carries the same three optional inputs.
- [x] Per-order cap is a high risk ceiling around 50–60% of monthly; the
  `monthly/count` average is hint-only.
