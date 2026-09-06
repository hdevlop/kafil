# Family order limits plan (v2 — per-family with global default)

Status: **DRAFT - not implemented**

This is a task-specific root plan. It does not replace any other plan and
claims no project-wide phase status. There is no root `PLAN.md`.

Decision confirmed with user: enforcement values live **per family**;
Settings holds the **global default fallback**. Effective rule:

```text
effective = familyOverride ?? globalDefault ?? unlimited (null)
```

## 1. Goal

Control family purchase pace with three AND-combined caps:

- `monthlyLimitMinor` (MAD/month, existing per-family, kept) — spend ceiling.
- `maxOrdersPerMonth` (count/month, NEW) — logistics/anti-abuse throttle.
- `maxBudgetPerOrderMinor` (MAD/order, NEW) — single-basket cap.

Example: monthly 6,000 + 3 orders + 3,000/order allows
2,800 + 2,200 + 900, blocks a 4th order by count even with 100 left.
Derived `monthly / count ≈ 2,000` is display hint only, never enforced.

Out of scope: funding targets, contributions, catalog, delivery, `najm-theme`.

## 2. Current state (verified)

- `packages/server/src/modules/settings/settingSchema.ts:24`
  `platform_settings`: `familyFundingTargetMinor`,
  `pendingContributionExpiryHours`, `formFillEnabled`, theme/branding,
  `currency`. No order-count / per-order columns.
- `packages/server/src/modules/settings/settingDto.ts:15`
  `updateSettingsDto`: only those three fields.
- `apps/web/src/features/Settings/components/AppSettingsPanel.tsx:89-116`
  global form only, no order limits.
- `packages/server/src/modules/budgets/budgetService.ts:120`
  `setMonthlyLimit(familyProfileId, { month, limitMinor })` — per-family,
  per-month amount in `monthly_budget_limits`.
- `packages/server/src/modules/orders/orderService.ts:1374-1391`
  `ensureCapacity()` enforces `availableMinor` + `monthlyLimit - usage`.
- `packages/server/src/modules/budgets/budgetRepository.ts:173`
  `monthlyOrderUsage` sums `order_reserve/release/refund` in UTC
  `[month-01, next-month-01)`. Amount-based, not count-based.
- `packages/server/src/modules/orders/orderValidator.ts` — no count check.
- `packages/server/src/modules/families/familyService.ts:148`
  new families inherit `fundingTargetMinor` from global default. Same
  default-then-override pattern applies here.

## 3. Design

### 3.1 Storage

Global defaults in `platform_settings` (nullable = unlimited, preserves current
behaviour until admin sets a value):

- `default_max_orders_per_month INT NULL CHECK BETWEEN 1 AND 31`
- `default_max_budget_per_order_minor BIGINT NULL CHECK > 0`
- `default_monthly_budget_minor BIGINT NULL CHECK > 0` (seeds first
  `monthly_budget_limits` row for new families; never overwrites
  operator-set rows)

Per-family overrides on `budget_accounts` (one row per family already exists
via `findByFamilyId` / `lockByFamilyId`; avoids a new table + join for v1):

- `max_orders_per_month INT NULL CHECK BETWEEN 1 AND 31`
- `max_budget_per_order_minor BIGINT NULL CHECK > 0`

Monthly amount stays in existing `monthly_budget_limits` (per month).
Alternative (new `family_order_limits` table) is phase-2 if the team prefers
policy history; v1 uses the two columns.

### 3.2 Resolution (backend helper)

New `resolveOrderPolicy(familyProfileId, month)` in budgets module:

```text
monthlyLimit = monthly_budget_limits.find(account, month)
  ?? defaultMonthlyBudgetMinor ?? null
maxOrders    = budget_accounts.max_orders_per_month
  ?? platform_settings.default_max_orders_per_month ?? null
maxPerOrder  = budget_accounts.max_budget_per_order_minor
  ?? platform_settings.default_max_budget_per_order_minor ?? null
```

One settings-row read + one account read per submission; no cross-request
caching (month rollover must take effect immediately).

### 3.3 Enforcement (`modules/orders/orderService.ts`)

- Extend `ensureCapacity(account, amount)` to also take the resolved policy.
- New `ensureOrderCountCapacity(familyProfileId, month)`:
  `SELECT count(*) FROM orders WHERE family_profile_id AND created_at >=
  monthStart AND created_at < monthEnd AND status NOT IN
  ('cancelled','rejected')`. Window matches `currentMonth()` UTC semantics.
- Reject with `HttpError.conflict` + locale keys (family projection keeps
  numbers minimal; operator projection full).
- Call sites: `reserveRequestedBudget` (submit + assisted submit) and the
  `difference > 0` branches of `settleInitialPurchase` /
  `settleReplacementDifference` so purchase top-ups cannot smuggle past caps.
- Same-transaction check as the reserve append; preserve lock order
  inventory-first-then-budget; keep idempotent resubmit single-counted
  (existing `submission_idempotency_key` / `order:id:budget:reserve` keys).
- Money stays integer minor MAD; no float.

### 3.4 Why not fully automatic

- Monthly from target (`target/12`): target is total need, monthly is pace.
  Seasons, household size, emergencies differ. Use `target/12` as placeholder
  hint at most.
- Per-order from `monthly/count`: even-split guide only. Uneven baskets
  (2,800 + 2,200 + 900 against 6,000/3) must pass; enforcing the 2,000 average
  would wrongly block order 1.

## 4. Backend tasks (`packages/server`)

1. Schema: add 3 global columns + 2 account columns, checks above.
   `bun run db:generate`, review SQL, never edit deployed migrations.
2. DTOs: extend `updateSettingsDto` (3 nullable globals);
   extend `setMonthlyBudgetLimitDto`-adjacent operator DTO or new
   `setFamilyOrderPolicyDto` (`maxOrdersPerMonth 1-31|null`,
   `maxBudgetPerOrderMinor positive|null`, reason 3-500) for per-family
   overrides.
3. Services: `settingService` persists globals + audit; `budgetService`
   `setFamilyOrderPolicy` + `resolveOrderPolicy`; family creation seeds first
   monthly row from `defaultMonthlyBudgetMinor` when set; `orderService`
   enforcement per 3.3.
3b. Family create form (confirmed): optional override inputs at creation.
   Frontend wizard `features/Families/components/FamilyForms/`:
   `HouseholdFields.tsx` (next to `activationTargetMad`) +
   `CreateFamilyDialog.tsx` wizard `fields` list +
   `config/familySchemas.ts` (`householdFieldsSchema`,
   `toCreateFamilyInput`) + `types.ts` (`CreateFamilyInput`):
   `maxOrdersPerMonth` (1-31, empty = global), `maxPerOrderMad`
   (empty = global), `monthlyBudgetMad` (empty = global default).
   Backend `modules/families/familyDto.ts` (`createFamilyDto` 3 nullable
   optionals) + `familyService.ts:create` (after
   `budgets.ensureForFamily`, write `budget_accounts` overrides + first
   `monthly_budget_limits` row). Same empty-means-global semantics as
   `fundingTargetMinor`; update-flow counterpart is the existing
   per-family policy editor (section 5).
4. Guards: settings = existing admin/operator gate; per-family policy =
   existing `update budgets` permission (`config/authDefinitions.ts:36`).
5. Locales `src/locales/{en,fr,ar,es}.json`: 2 conflict messages, 3 global
   labels/hints, 2 per-family labels, derived-hint string. Parity test must pass.
6. MCP: update tool metadata + discovery tests if settings/order tools exposed.

## 5. Frontend tasks (`apps/web`)

- `features/Settings`: 3 new inputs in `settingSchemas.ts` /
  `AppSettingsPanel.tsx` (empty = unlimited) + derived hint
  `≈ monthly/count MAD/order if split evenly`. `useEntityQuery/Command`,
  invalidate settings + budget caches.
- Family/budget detail (where `setMonthlyLimit` UI lives): 2 override inputs
  (empty = use global), showing effective value
  e.g. `Effective: 3/month (global 4)`.
- Family create wizard (confirmed): same 3 inputs as optional fields in the
  household step (`HouseholdFields.tsx`), empty = inherit global at submit
  time. Shows global default as placeholder
  e.g. `Global: 4/month`. No separate per-month row editor at creation;
  the first `monthly_budget_limits` row is seeded server-side.
- `features/OrderCart` + `features/Orders`: quota line from extended budget
  summary (`ordersUsed`, `ordersLimit`, `maxPerOrderMinor`,
  `monthlyUsed`, `monthlyLimit`):
  `2 of 3 orders left · up to 3,000 MAD/order`.
  Client pre-check only; backend authoritative. `Can` presentation, no hidden
  button as security boundary.
- Shared money formatters, `StatusBadge`/`PageState`, 4 locales, RTL check (ar).

## 6. Tests

- DTO: null unlimited; 0/-1/32+ rejected; per-order 0 rejected.
  Create-family DTO: omitted override = NULL (inherit global); explicit values
  validated identically.
- Service: N+1th submit blocked; cancelled/rejected not counted; per-order cap
  on submit + higher-amount confirmation; three caps AND-combined;
  family override beats global; global used when override null; idempotent
  resubmit single-counted; month rollover resets count.
- Concurrency (`bun run test:db`): parallel submits admit only up to cap.
- Permissions/privacy: family/sponsor cannot PATCH; projections exclude
  CIN/address/documents.
- Schema/migration-content, locale parity, seed verify (if permission added).
- Frontend unit: parsing, hint math (quotient/remainder), quota text.
- Browser (`apps/web/test/e2e/`, live DB `127.0.0.1:3210`, no mocks):
  admin sets global 2/month → family submits 2 OK → 3rd asserts inline error +
  exact single `409` with deny-all diagnostics; operator overrides family to 3
  → 3rd now passes. Follow `kafil-playwright-testing` ladder (focused +
  passive diagnostics first).

## 7. Migration / seed / ops

- `db:generate` → review → `db:migrate`. All new columns NULL → existing
  behaviour unchanged until admin configures.
- Seed example values (confirmed): migration/seed backfills globals only,
  per-family overrides stay NULL (inherit global) except one demo family:
  - `platform_settings.default_max_orders_per_month = 4`
  - `platform_settings.default_max_budget_per_order_minor = 300000`
    (3,000 MAD — minor units)
  - `platform_settings.default_monthly_budget_minor = 600000`
    (6,000 MAD — seeds first `monthly_budget_limits` row for new families;
    never overwrites operator-set rows)
  - Demo: one family gets override `max_orders_per_month = 2` to prove
    family-beats-global in E2E; all other demo families inherit global.
  - Derived hint from seeds: `6,000 / 4 ≈ 1,500 MAD/order if split evenly`;
    enforced per-order cap stays 3,000 so uneven baskets
    (e.g. 2,800 + 2,200 + 900) still pass.
- `seed:verify` only if permissions change.
- Rollback: remove enforcement code first, then follow-up migration.
- Evidence under `docs/evidence/`.

## 8. Verification gate

```bash
bun run lint && bun run typecheck && bun run test && bun run build && bun run db:generate
```

`db:generate` clean afterwards; browser spec before close.

## 9. Decisions (confirmed)

- [x] v1 stores overrides on `budget_accounts` (two nullable columns).
- [x] Counting window UTC `[month-01, next-month-01)`, matches
  `monthlyOrderUsage`.
- [x] Exclude `cancelled`/`rejected` from the order count.
- [x] Seed example values (see section 7): 4 orders/month,
  3,000 MAD/order, 6,000 MAD/month default.
