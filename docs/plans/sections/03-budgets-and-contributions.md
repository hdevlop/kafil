# Section 03 - Budgets and Contributions

Status: complete (2026-07-16)

## Handoff

Phase 3 is complete. Phase 5 may use its budget reserve/capture/release ledger
entry types; the notification delivery processor remains Phase 7 work.

## Goal

Implement an auditable money path from sponsor commitment to validated payment
to spendable family budget.

## Dependencies

- support assignments
- audit events
- operator, family, and sponsor ownership

## Data Model

### `budgetAccounts`

- `id` UUID primary key
- `familyProfileId` unique FK
- `currency` fixed to `MAD` in the MVP
- `availableMinor` bigint, default 0
- `reservedMinor` bigint, default 0
- `spentMinor` bigint, default 0
- `version` integer for optimistic diagnostics
- timestamps

Every existing family receives one account through migration/backfill.

### `monthlyBudgetLimits`

- `id` UUID primary key
- `budgetAccountId` FK
- `month` date normalized to first day
- `limitMinor` bigint
- `setByUserId`
- `reason`
- timestamps

Unique by account/month. The limit caps ordering for that month; unused account
balance still carries forward.

### `budgetLedgerEntries`

- `id` UUID primary key
- `budgetAccountId` FK
- `entryType`
- `amountMinor` signed bigint
- `availableAfterMinor`
- `reservedAfterMinor`
- `spentAfterMinor`
- `sourceType`
- `sourceId`
- `idempotencyKey` unique
- `actorUserId` nullable for system jobs
- `reason` nullable except manual actions
- `reversesEntryId` nullable self-reference
- `createdAt`

Entry types include:

- `contribution_credit`
- `manual_credit`
- `manual_debit`
- `order_reserve`
- `order_capture`
- `order_release`
- `order_refund`
- `contribution_refund`

### `contributionPlans`

- `id` UUID primary key
- `supportAssignmentId` FK
- `kind`: `monthly` or `one_time`
- `amountMinor`
- `currency`
- `status`: `active`, `paused`, `stopped`, `completed`
- `startsAt`
- `nextDueAt` nullable
- `endedAt` nullable
- timestamps

One-time plans complete after their validated contribution. Monthly plan
changes affect future contribution instances only.

### `contributions`

- `id` UUID primary key
- `contributionPlanId` nullable FK
- `supportAssignmentId` FK
- `sponsorProfileId` FK
- `familyProfileId` FK
- `amountMinor`
- `currency`
- `paymentMethod`
- `externalReference` nullable
- `status`: `pending`, `validated`, `rejected`, `refunded`
- `submittedAt`
- `paidAt` nullable
- `validatedByUserId` nullable
- `validatedAt` nullable
- `rejectedByUserId` nullable
- `rejectedAt` nullable
- `rejectionReason` nullable
- timestamps

Persist sponsor and family references as historical snapshots of the
relationship. Ending the assignment later does not orphan the contribution.

## Transaction Services

### Validate contribution

One transaction:

1. Lock the contribution row.
2. Require `pending`.
3. Confirm amount/currency and historical assignment relationship.
4. Lock the family budget account.
5. Insert `contribution_credit` with
   `idempotencyKey = contribution:<id>:credit`.
6. Increase `availableMinor`.
7. Mark contribution validated with operator/time.
8. Append audit and outbox records.
9. Commit.

Repeated validation must return the existing result or a conflict without
creating another credit.

### Reject contribution

- Lock contribution.
- Require `pending`.
- Record operator, timestamp, and required reason.
- Do not touch budget balances.

### Refund/correction

- Never change the original validated amount.
- Insert a linked reversal ledger entry.
- Update current balances safely.
- Mark the contribution refunded only after the reversal succeeds.

### Bootstrap-admin mistaken-entry erasure

- A bootstrap admin may permanently delete a `pending` or `rejected`
  contribution that was entered in error.
- A `validated` contribution must be refunded first; the admin may then erase
  the `refunded` contribution, its linked credit/refund ledger pair, and the
  now-unneeded snapshots are rebuilt from the remaining ledger entries.
- The destructive action remains recorded in the audit log.

### Manual adjustment

- Operator only.
- Reason required.
- Negative adjustments cannot make available balance negative.
- Use a unique idempotency key.
- Create audit event.

## Queries and Projections

Family sees:

- available, reserved, spent, and current monthly limit/remaining
- own filtered ledger history

Sponsor sees:

- own plans and contributions
- total validated amount
- supported family total budget/used/remaining
- no identities or contribution details of other sponsors

Operator sees:

- all pending contributions
- contribution validation history
- family account and ledger
- reconciliation and monthly summaries

## Implementation Checklist

- [x] Add money validation helpers
- [x] Add enums and schemas
- [x] Add family account backfill migration
- [x] Add account row-lock repository methods
- [x] Add append-only ledger repository
- [x] Add contribution plan module
- [x] Add contribution module
- [x] Add operator-recorded offline contribution workflow
- [x] Add validate/reject/refund commands
- [x] Add manual adjustment and monthly limit commands
- [x] Add family and sponsor projections
- [x] Add audit/outbox writes
- [x] Add duplicate/idempotency tests
- [x] Add concurrent credit/debit tests
- [x] Add reconciliation tests
- [x] Add role/privacy tests

## Progress Evidence

2026-07-16 foundation and data-model slices:

- Added strict `MAD` currency, positive/signed integer minor-unit, and
  non-negative balance invariant helpers under `modules/budgets/`.
- The helpers reject floating-point values, zero contribution/ledger amounts,
  unsafe integers, unsupported currencies, negative balances, and overflow.
- Added `budgetAccounts`, `monthlyBudgetLimits`, append-only
  `budgetLedgerEntries`, `contributionPlans`, and `contributions` as
  feature-owned schema modules, with all Phase 3 enum exports composed through
  the database schema.
- Generated append-only `0005_phase3_budgets_and_contributions`, including an
  idempotent one-account-per-existing-family MAD backfill. It contains no
  drops or destructive changes.
- Focused schema, migration, and money coverage passed (14 tests and 97
  expectations), as did lint and typecheck. A second Drizzle generation
  reported no schema changes. Contribution-specific transactional workflows,
  policies, and projections remain open.

2026-07-16 budget-command slice:

- Added `FOR UPDATE` account locking, cached-balance version increments, and
  append-only ledger persistence. Manual adjustments are idempotent per ledger
  key, require an operator reason, cannot over-debit the available balance,
  and write sanitized audit events in the same transaction.
- Added operator monthly-limit commands and family-owned budget/ledger reads;
  the service derives the family from the authenticated family profile, not
  caller input. Sponsor financial projections remain open until contribution
  workflows exist.
- Household and family creation now ensure exactly one account through the
  idempotent account provisioner. Added least-privilege `budgets` permission
  seed entries for families and operators.
- Full verification passed: lint, typecheck, 66 server tests, 7 seed tests,
  production build using local non-production email/auth values, and a
  no-change Drizzle generation. The later review-correction slice below
  supersedes the original lack of a live database concurrency run.

2026-07-16 completion slice:

- Added sponsor-owned contribution-plan and contribution commands, operator
  pending-list/read/validate/reject/refund commands, immutable validation and
  reversal ledger effects, and privacy-safe sponsor financial summaries.
- Added `outboxEvents` with sanitized payloads. `0007_phase3_financial_outbox`
  records contribution submitted/validated/rejected/refunded events in the
  same transaction; Phase 7 owns retry and delivery processing.
- Added reconciliation, lifecycle, duplicate/idempotency, role/privacy,
  sanitization, and lock-bound invariant tests. Validation passes: 83 server
  tests / 311 expectations, 7 seed tests / 43 expectations, lint, typecheck,
  a no-change Drizzle generation, and the production build.
- Fresh production smoke on port 3012 returned 200 for `/`, `/dashboard`, and
  `/api/system/health`; MCP exposed 91 tools, including 16 contribution tools
  and 19 catalog tools.

2026-07-16 review corrections:

- The authentication seed now grants the exact `contributions` permissions
  required by sponsor and operator route guards.
- Sponsor budget summaries require `supportAssignments.status = active`; ended
  relationships retain only the explicitly documented assignment history.
- `remainingMinor` now returns the already-spendable account
  `availableMinor`. Reserved money is tracked separately and is not subtracted
  twice.
- Local PostgreSQL has all 11 migrations applied. Repeated seed and
  `seed:verify` runs pass, and the Phase 5 multi-connection database test also
  exercises the shared budget lock under competing reservations.

2026-07-19 offline-payment extension:

- Added an operator-only recording-options query and offline contribution
  command for active sponsor-family assignments.
- The command requires a positive MAD amount, payment method, non-future
  payment date, and optional external reference. It creates a pending record;
  only the existing validation command credits the family budget.
- Recording is transactional and emits `contribution.recorded` audit and
  outbox effects with the acting operator identity. Operators now receive the
  matching `create:contributions` permission through the repeatable seed.
- The operator Contributions screen exposes the workflow through a searchable
  sponsor/family form, refreshes the review list after creation, and shows the
  linked sponsor and family names in table, card, and detail views.
- Verification passed with 121 server tests (one intentional database-test
  skip), 101 web tests, 10 seed tests, lint, typecheck, production build, a
  no-change Drizzle generation, and local `seed:verify`.

## Exit Gate

- Every active family has exactly one `MAD` account.
- A contribution validates exactly once and creates one credit entry.
- Rejection creates no ledger entry.
- All balances reconcile to ledger effects.
- Concurrent operations cannot create negative or lost balances.
- Families and sponsors see only authorized financial projections.

## Configurable Funding Activation Extension — 2026-07-18

Each `familyProfiles` record now owns its activation target, rather than
sharing one platform value. Validated `contribution_credit` entries net of
`contribution_refund` entries determine progress against that family-specific
target. Contribution validation credits the budget and activates an eligible
pending family in the same transaction, with audit and durable outbox effects.
An audited family target update reevaluates only that family. The platform
setting remains an API default for a new family when no target is supplied.
