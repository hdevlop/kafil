# Kafil MVP Implementation Plan

Status: **ACTIVE**

Last updated: 2026-07-24

This document is the source of truth for implementation order, phase status,
and release gates. Detailed requirements live under
[`docs/plans/sections`](plans/README.md). A section plan may add detail, but it
must not silently change the phase order or product rules in this file.

## 1. Target Outcome

Build a production-ready sponsorship and family-ordering platform with three
visible product roles:

- **Operator** manages accounts, families, children, assignments, budgets,
  contributions, catalog data, and order fulfillment.
- **Family** uses its available budget to order products and track delivery.
- **Sponsor** funds one or more supported families and sees a
  privacy-safe account of how the support is used.

The Najm bootstrap **admin** remains a hidden technical super-role for initial
setup and emergency recovery. It is not part of normal product workflows.

## 2. Status Legend

- `[x]` implemented and confirmed in the current repository
- `[~]` partially implemented or requires migration
- `[ ]` not implemented
- **ACTIVE** next phase that implementation should work on

Only one phase should be active at a time. A phase closes only when its code,
migration, tests, documentation, and exit gate are complete.

## 3. Locked MVP Decisions

These decisions apply unless this plan is deliberately revised:

1. Visible roles are `operator`, `family`, and `sponsor`.
2. `admin` remains a hidden bootstrap/emergency role and is a Najm super-role.
3. Operators create family accounts; families cannot self-register.
4. Public registration creates sponsor accounts only.
5. `familyProfiles` is the sole private-family domain root. Every family
   profile has exactly one Najm login and cannot exist independently from it.
6. One sponsor may support many families; one family may have many sponsors.
7. A sponsor may be assigned to a family only.
8. Children remain family records and do not define a sponsorship target in the MVP.
9. The MVP uses one pooled, carry-forward budget account per family.
10. Money is stored as integer minor units; floating-point money is forbidden.
11. The MVP currency is `MAD`; cross-currency conversion is deferred.
12. Validating a contribution and crediting the budget are one database
    transaction.
13. Validated financial records are never edited or deleted in normal
    workflows. Corrections use reversal ledger entries. Bootstrap admins may
    permanently erase a mistaken contribution only when it is pending,
    rejected, or already fully refunded; a refunded erasure also removes its
    linked credit/refund ledger pair and rebuilds the account snapshots.
14. Placing an order reserves budget and stock atomically.
15. Order items keep product name, SKU, price, and address snapshots.
16. Families cannot approve their own orders.
17. Deactivation is the normal account-removal workflow. Bootstrap admins may
    permanently delete child records or an entire family graph through audited,
    server-authorized emergency actions; the UI hides them from other roles.
18. Sponsors receive privacy-safe projections, never raw family identity records.
19. The backend is hosted inside the existing Next.js application through the
    catch-all Route Handler; there is no second API process.
20. Najm owns passwords, sessions, JWTs, refresh rotation, RBAC, PBAC, and
    ownership enforcement. Kafil must not duplicate that implementation.
21. Family account access and family funding activation are separate states.
22. Each family has its own audited order-activation target in MAD minor units;
    application code must not hard-code a funding amount. `platformSettings`
    provides only a default for API-created families that do not supply one.
23. Validated sponsor contributions, net of contribution refunds, count toward
    activation. Reaching the current target activates the family once.
24. Lowering a family's target reevaluates that family. Raising it or spending
    budget never deactivates an already-qualified family.
25. Operator-created accounts are phone-first. Family initial passwords use the
    surname and birth year (for example, `Amrani1987`) for an easy first login,
    while sponsor initial passwords retain a random suffix. Kafil stores only
    Najm's password hash and reveals the credential once to the operator.
26. Public sponsor registration remains email-first. New accounts stay pending
    until an expiring, one-time email-verification link activates them.
27. Email and normalized phone are both accepted login identifiers. Phone is
    globally unique at the Najm user boundary; profile tables retain the domain
    contact field.
28. Newly operator-created families must replace the temporary password on
    their first login. The server owns this requirement; the family replacement
    may use lowercase letters and numbers, while every other role keeps Najm's
    stronger password policy.

The full decision register is in
[`docs/plans/DECISIONS.md`](plans/DECISIONS.md).

## 4. Current Repository Baseline

The current workspace already contains a useful foundation:

- [x] Bun workspace with `apps/web`, `packages/server`, and `packages/seed`
- [x] One Next.js 16 runtime for landing pages, dashboard pages, and `/api`
- [x] Najm server imported by `app/api/[...route]/route.ts`
- [x] PostgreSQL and Drizzle schema composition
- [x] Najm authentication schema and bootstrap admin seed
- [x] Root runtime, build, migration, and seed CLI commands load the workspace
      `.env`
- [x] Authentication seed is repeatable with stable permission identifiers
- [x] Main seed resets application data while preserving bootstrap auth and
      technical database state
- [x] Seed CLI exposes setup, demo, full, migrate, admin, verify, and image
      library workflows with confirmation for destructive commands
- [x] Demo families and sponsors can consume package-owned image libraries,
      copied into managed protected storage with content-versioned image paths
- [x] Existing `admin`, `operator`, `family`, and `sponsor` auth roles
- [x] Operator account/profile backend module
- [x] Sponsor account/profile backend module
- [x] Family profile owns guardian identity, children, documents, budgets,
      support, carts, and orders; there is no standalone household module
- [x] Protected family document metadata module
- [x] Validation, policy guards, MCP exposure, schema tests, and migrations
- [x] Drizzle reconciliation and append-only Phase 1 migration generation
- [x] Family profiles enforce one login per family through a unique `userId`
- [x] Sponsor public onboarding and self-profile completion
- [x] Email-or-phone authentication with globally normalized phone identities
- [x] Najm Auth 2.0.10 identity-aware access throttling and explicit loopback
      session recovery for the single Next.js production process
- [x] One-time operator credential handoff for family and sponsor accounts
- [x] Server-owned first-login password replacement for newly created families
- [x] Pending public sponsor registration with email activation through
      `najm-email`
- [x] Family auth role, family profile, and child ownership model
- [x] Children with family-profile ownership and lifecycle controls
- [x] Sponsor-family assignments
- [x] Contribution plans and contribution validation
- [x] Budget account, monthly limits, and immutable ledger
- [x] Categories, products, and inventory
- [x] Cart and order workflow
- [x] Configurable family funding target, progress, and order-activation gate
- [x] Operator-only family image upload with protected local filesystem serving
- [x] Role-specific dashboard applications with grouped icon navigation, live
      KPI cards, trend charts, status summaries, and role-scoped attention lists
- [~] Durable financial outbox rows exist; reports, delivery workers, and
      release hardening remain Phase 7

Existing foundation code must be evolved through append-only migrations. Do not
rewrite historical migration files or replace working modules without a
measured reason.

## 5. Target Architecture

```text
Browser
  |
  +-- Landing and auth routes
  |
  +-- Role dashboards
        |
        +-- Operator
        +-- Family
        +-- Sponsor
              |
              v
apps/web/src/app/api/[...route]/route.ts
              |
              v
packages/server
  |
  +-- Najm auth and policies
  +-- Feature controllers
  +-- Transactional services
  +-- Repositories and validators
  +-- PostgreSQL/Drizzle
  +-- Audit and outbox
              |
              v
packages/seed
  +-- Roles
  +-- Permissions
  +-- Bootstrap admin
  +-- Development fixtures
```

Backend modules remain feature-owned:

```text
packages/server/src/modules/<feature>/
  <feature>Controller.ts
  <feature>Dto.ts
  <feature>Guards.ts
  <feature>Repository.ts
  <feature>Schema.ts
  <feature>Service.ts
  <feature>Validator.ts
  index.ts
```

`packages/server/src/database/schema.ts` remains a composition-only entry point.
TypeScript filenames and identifiers use camelCase. PostgreSQL table and column
identifiers use snake_case.

## 6. Domain Relationship

```text
users
  |-- operatorProfiles
  |-- sponsorProfiles
  `-- familyProfiles -- children
            |
supportAssignments
  |
  +-- sponsorProfiles
  +-- familyProfiles

supportAssignments
  `-- contributionPlans
        `-- contributions -- validation --> budgetLedgerEntries

familyProfiles
  +-- budgetAccounts
  +-- carts -- cartItems -- products -- categories
  `-- orders -- orderItems
         +-- orderStatusEvents
         +-- budgetLedgerEntries
         `-- inventoryLedgerEntries
```

## 7. Role Capability Matrix

| Capability | Operator | Family | Sponsor |
| --- | --- | --- | --- |
| Manage operator accounts | No; bootstrap admin only | No | No |
| Manage family accounts and children | Yes | Read own | No |
| Manage sponsor accounts | Yes | No | Update own profile |
| Link sponsors to families | Yes | No | No |
| Submit a contribution | Review/record | No | Yes, own |
| Validate/reject a contribution | Yes | No | No |
| Adjust a family budget | Yes, reason required | No | No |
| Manage platform funding target | Yes, audited | No | No |
| View family budget | All | Own | Supported family summary |
| Manage catalog and inventory | Yes | No | No |
| Use cart and place orders | No | Own | No |
| Approve/reject/prepare/deliver orders | Yes | No | No |
| View orders | All | Own | Supported family summary |
| Deactivate/reactivate accounts | Yes, except operators | No | No |

Every backend endpoint still requires its own secure policy. Hiding a button is
not authorization.

## 8. Financial Invariants

Every financial implementation and test must preserve:

```text
availableMinor >= 0
reservedMinor >= 0
spentMinor >= 0

orderable amount =
  min(account available, remaining monthly limit when a limit exists)
```

- All amounts are safe integers in minor units.
- An account has one currency and all entries must match it.
- Every ledger entry has a unique idempotency key.
- Ledger entries are append-only.
- Current account balances are updated in the same transaction as the ledger.
- The budget account row is locked before a balance-changing operation.
- A contribution can create at most one credit entry.
- An order can create at most one reserve, capture, release, or refund entry for
  each transition.
- Manual adjustments require an operator, a reason, and an audit event.

## 9. Order State Machine

Successful path:

```text
pending -> approved -> in_preparation -> delivered
```

Alternative paths:

```text
pending -> rejected
pending -> cancelled
approved -> cancelled
in_preparation -> cancelled   (operator exception with reason)
```

Rules:

- Submission creates `pending`, reserves budget, and reserves inventory.
- Approval captures reserved budget as spent and allocates reserved inventory.
- Rejection or pending cancellation releases budget and inventory.
- Cancellation after approval creates explicit budget and inventory reversals.
- Delivered, rejected, and cancelled orders are terminal.
- Status changes are command methods, never a generic status update.

## 10. Phase Roadmap

| Phase | Status | Outcome | Detailed plan |
| --- | --- | --- | --- |
| 0. Existing foundation | `[x]` | Workspace, Najm API, auth, profiles, documents | Current repository |
| 1. Identity, families, children, audit | `[x]` | Family role and safe account lifecycle | [Section 01](plans/sections/01-identity-families-and-children.md) |
| 2. Support assignments and privacy views | `[x]` | Sponsor-to-family relationships | [Section 02](plans/sections/02-support-assignments.md) |
| 3. Budgets and contributions | `[x]` | Transactional contribution-to-budget flow | [Section 03](plans/sections/03-budgets-and-contributions.md) |
| 4. Catalog and inventory | `[x]` | Orderable products with stock accounting | [Section 04](plans/sections/04-catalog-and-inventory.md) |
| 5. Cart, orders, and fulfillment | `[x]` | Full family ordering state machine | [Section 05](plans/sections/05-cart-orders-and-fulfillment.md) |
| 6. Role dashboards | `[x]` | Operator, family, and sponsor web applications | [Section 06](plans/sections/06-web-dashboards.md) |
| 7. Reports, operations, and release | `[ ]` **ACTIVE** | Auditable and deployable first production release | [Section 07](plans/sections/07-reports-operations-and-release.md) |

Phase 6 closed on 2026-07-17. Its multilingual dashboard shell, RTL behavior,
browser workflows, cross-role direct-URL denial, crafted API denial, and final
repository gates are recorded in [Section 06](plans/sections/06-web-dashboards.md).
Phase 7 is now the active implementation phase. The first Phase 7 slice landed
on 2026-07-17: the shell now has grouped icon navigation and separators, while
operator, family, and sponsor overview routes consume privacy-scoped aggregate
endpoints for KPI cards, 12-month trends, budget breakdowns, status summaries,
and operational attention lists. Detailed reports and exports remain open.
The installable-mobile slice landed on 2026-07-22 with a native Next.js web app
manifest, branded standard/maskable/Apple icons, production service-worker
registration, and a privacy-safe offline fallback that never caches API or
authenticated page responses.

## 11. Phase 1 - Identity, Families, Children, and Audit

Goal: add the Family as a real authenticated role with one family profile as
the private domain root.

- [x] Add `FAMILY: "family"` to `defineRoles`
- [x] Keep `ADMIN` as the only super-role
- [x] Change public registration default to `sponsor`
- [x] Add family permissions and update seed verification tests
- [x] Reconcile the current Drizzle snapshot/schema column prompt with a
      data-preserving expand strategy
- [x] Add `familyProfiles`, linked one-to-one to a Najm user
- [x] Keep `fundingStatus` separate from Najm login/account status
- [x] Add `children`, owned by a family profile
- [x] Add append-only `auditEvents`
- [x] Implement transactional operator-created family accounts
- [x] Use Najm `provisionUser` invitation behavior; do not store passwords
- [x] Add sponsor self-onboarding after `/auth/register`
- [x] Add `/me` profile endpoints for family and sponsor
- [x] Replace normal account deletion with deactivate/reactivate commands
- [x] Add family ownership rules and privacy DTOs
- [x] Generate and test append-only migration `0003_phase1_identity_families`
- [x] Update MCP discovery expectations
- [x] Add required primary guardian CIN with legacy-safe migration and masked UI
- [x] Merge the legacy `privateHouseholds` table into `familyProfiles` with
      guarded migration `0013_unify_family_profiles`
- [x] Add repeatable demo fixtures for families, sponsors, operators, and
      family children with configurable SMS-style count arguments

Phase 1 evidence (2026-07-16): `FAMILY` is now a first-class Najm role,
public registration defaults to `sponsor`, and idempotent seed definitions now
cover the family role and its least-privilege family/child permissions.
The Phase 1 domain slice now includes feature-owned `familyProfiles`,
`children`, and append-only `auditEvents` schemas; transactional
operator-created family provisioning through Najm without a stored password;
family-owned child reads; and metadata-sanitized auditing. Sponsor public
registration is now separate from sponsor self-profile completion, and normal
sponsor deletion is replaced with audited deactivate/reactivate commands.
Family and sponsor `/me` routes have explicit self-only projections, and MCP
discovery covers the new family, child, and sponsor lifecycle tools.
Admin deletion extension (2026-07-18): `delete:families` and
`delete:children` are granted only to the bootstrap admin. The corresponding
Najm `@CanDelete` routes are additionally protected with `@isAdmin()`, audited,
and rendered only to an authenticated admin in the operator dashboard.
Demo seed extension (2026-07-19): `bun run seed:demo` now creates stable fake
records for 20 families, 50 sponsors, and 5 operators by default, including 39
children, 50 active support assignments, and 100 ledger-backed contributions.
Count arguments work with or without Bun's `--` separator, including the
independent `--contributions` count. Matching records are skipped on repeat
runs, while validated contributions update budgets and family funding status.
Workspace lint and typecheck passed; tests passed with web 104, server 127 plus
one opt-in database skip, and seed 14.
Seed CLI and profile-image extension (2026-07-20): `bun run seed` now opens a
Clack-powered interactive command menu with family, sponsor, operator, and
contribution count prompts for demo/full; full seed is the highlighted default
so pressing Enter reaches the count prompts immediately, while
`bun run seed -- <command>` supports explicit
setup, demo, full, migrate, admin, verify, and image-library operations.
Destructive setup/full commands require confirmation or `--yes`. Flat family
family and sponsor files named `family-NN` / `sponsor-NN` in the flat
`packages/seed/images` library are validated, assigned in numeric order with
one image per profile and empty fallback images after the library is exhausted,
then copied with content-versioned
UUID paths to managed storage, and
written to Najm user image fields. Sponsor images have an authenticated serving
route for operator/sponsor views. Root lint, typecheck, tests, and production
build passed: web 107 tests, server 129 tests with one opt-in database skip, and
seed 27 tests. CLI help, empty-library validation, auth verification, and a
zero-record configured-database demo run also passed without clearing data.
Funding correction (2026-07-19): generated validated contribution totals now
approach but never exceed each family's funding target. Namespaced demo
contributions from the earlier distribution are repaired through audited
refund/delete/recreate service workflows so budget ledger balances remain
consistent.
Migration decision (2026-07-16): existing profile language, country, currency,
and communication columns were retained as private legacy fields rather than
being renamed to unrelated identity fields. New `cin`, `gender`, `address`, and
`date_of_birth` columns are nullable for legacy profiles but remain required in
the DTOs for every new profile. The generated append-only
`0003_phase1_identity_families` migration adds the `gender` and `child_status`
enums; `audit_events`, `children`, and `family_profiles`; indexes and foreign
keys; and nullable identity backfill columns. It contains no table/column drops,
renames, or `SET NOT NULL` changes.

Primary guardian CIN extension (2026-07-19): new family intake now
requires an uppercase, unique guardian CIN. Migration `0012` adds the nullable
legacy-safe database column and unique constraint without destructive DDL;
family self-service and sponsor projections omit it, audit/outbox metadata
filters treat it as sensitive, and operator family cards/details mask it.

The original Phase 1 closeout passed 53 tests, the production build, and smoke
requests to `/`, `/dashboard`, and `/api/system/health`. Current local
verification supersedes its old database caveat: PostgreSQL is configured and
all 13 append-only migrations are applied. Migration `0013` copied guardian
identity into `familyProfiles`, remapped every dependent foreign key, removed
the standalone table, and refuses to discard an orphan that still owns data.

Exit gate:

- An operator can create a family and children.
- The family can activate/login and read only its own family and children.
- A sponsor can self-register and complete only its own profile.
- Inactive users cannot authenticate or perform domain actions.
- All sensitive account operations create audit events.

## 12. Phase 2 - Support Assignments

Goal: model which sponsor supports which family without exposing raw
family identity data.

- [x] Add `supportAssignments` with active/ended lifecycle
- [x] Store the family profile as the only active support target
- [x] Prevent duplicate active assignments for the same target
- [x] Add create, end, list, and detail commands
- [x] Add sponsor-owned assignment policies
- [x] Add operator full-access policies
- [x] Create privacy-safe family summaries
- [x] Add a privacy-safe active-family catalog for sponsor self-selection
- [x] Exclude exact address, phone, CIN, documents, and internal notes
- [x] Add multi-sponsor/multi-family scoping and ended-access tests

Phase 2 evidence (2026-07-16): the feature-owned
`supportAssignments` module adds active/ended records, operator-only notes,
and a generated append-only `0004_phase2_support_assignments` migration. The
current MVP creates family-wide assignments only; the nullable `childId` column
remains solely to preserve historical rows. A partial unique index prevents
duplicate active family-wide assignments, and a check constraint requires
`endedAt` exactly when the status is `ended`.

Operators can list/filter, create, and end assignments with a required reason;
all lifecycle commands emit sanitized audit events. Sponsors can browse active
families through a privacy-safe catalog, select a family for their own support, and continue directly to a
preselected contribution form. The catalog exposes only a generated family
reference, photo, active-child count, and funding progress; it never exposes
guardian identity, CIN, address, phone, documents, or operator notes. Sponsor
family summaries expose the same generated reference, active-child count, and
assignment date. Historical visibility is explicit: sponsors can retain a
minimal record of their own ended assignment, but family summaries require an
active assignment.

The original Phase 2 closeout passed lint, typecheck, tests, build, and runtime
smoke. Review correction (2026-07-16): the seed now defines and assigns the
exact `supportAssignments` PBAC permissions used by the controller decorators,
so operator and sponsor routes are reachable under their intended policies.
The corrected seed is repeatable and verified against the migrated local
PostgreSQL database.

Exit gate:

- Operators can safely manage relationships.
- Sponsors can browse privacy-safe active-family catalog cards and select one
  for their own support.
- Sponsors see only active or historically permitted assignment details.

## 13. Phase 3 - Budgets and Contributions

Goal: turn validated sponsor money into an auditable family budget.

Status: complete (2026-07-16)

- [x] Add budget accounts and current balance columns
- [x] Add immutable budget ledger entries
- [x] Add optional operator-set monthly budget limits
- [x] Backfill one `MAD` budget account per existing family root
- [x] Add contribution plans for monthly and one-time support
- [x] Add contribution payment instances
- [x] Let operators record offline sponsor payments against active assignments
- [x] Implement pending, validated, rejected, and refunded states
- [x] Validate a contribution and credit the budget atomically
- [x] Activate eligible pending families against the persisted platform target
- [x] Add manual operator adjustment and monthly limit commands
- [x] Add idempotency keys and account row locking
- [x] Add family budget summary and ledger views
- [x] Add sponsor contribution and supported-budget summaries
- [x] Add concurrency and duplicate-validation tests

Phase 3 data-model evidence (2026-07-16): `budgetAccounts`,
`monthlyBudgetLimits`, append-only `budgetLedgerEntries`, `contributionPlans`,
and `contributions` are composed from their feature-owned modules. Database
checks enforce MAD, positive contribution/limit amounts, nonzero ledger
amounts, first-of-month limits, and nonnegative account and entry balances.
Generated append-only migration `0005_phase3_budgets_and_contributions` adds
the five tables, four enums, indexes, and an idempotent backfill that creates
one account for every legacy household (now remapped to a family profile).
Focused schema, migration, and money
tests passed (14 tests, 97 expectations); lint and typecheck passed; a second
`bun run db:generate -- --name phase3_budgets_and_contributions` reported no
schema changes. Migration 0005 is now applied in the local PostgreSQL database.

Budget-command evidence (2026-07-16): every newly provisioned family calls the
idempotent account provisioner in the
same transaction. Operator-only commands set monthly limits and apply required-
reason, idempotent manual credits/debits. The service locks the account row
before it mutates the cached balance, increments its version, appends the
ledger record, and writes a sanitized audit event in one transaction. Family
read routes expose only their own budget summary and ledger. `budgets` seed
permissions grant family read access and operator read/update access. The full
gate passed with local non-production email/auth values: lint, typecheck,
66 server tests, 7 seed tests, production build, and a no-change Drizzle
generation.

Completion evidence (2026-07-16): sponsor-owned monthly/one-time plans and
pending contributions now retain the assignment, sponsor, and family
snapshots required for history. Operator validation locks the contribution and
account rows, credits the account with a unique
`contribution:<id>:credit` ledger key, writes audit/outbox rows, and completes
one-time plans. Rejection changes no budget; refunds append a linked reversal
entry. Sponsor summaries exclude family identifiers and deduplicate the
same family across multiple assignments. Migration
`0007_phase3_financial_outbox` adds the durable outbox rows; retry/delivery
processing remains Phase 7 work. Unit coverage exercises idempotent validation,
rejection, reconciliation, lock-bound balance mutation, privacy-safe DTOs, and
outbox sanitization.

Review correction (2026-07-16): the seed now includes the exact
`contributions` PBAC permissions required by its routes. Sponsor budget
summaries require an active support assignment, preventing ended relationships
from retaining current financial access. The displayed remaining amount is the
account's already-spendable `availableMinor`; reservations are not subtracted a
second time.

Offline-payment extension (2026-07-19): operators and bootstrap admins can now
record money received outside the sponsor application by selecting an active
sponsor-family assignment, entering the MAD amount, payment method, payment
date, and optional receipt reference. The transactional command creates a
pending contribution, records the acting operator in `contribution.recorded`
audit/outbox effects, and leaves budget crediting behind the existing explicit
validation command. The operator permission seed now includes
`create:contributions`. No schema migration was required. Verification passed
with 121 server tests (one intentional database-test skip), 101 web tests, 10
seed tests, lint, typecheck, the production build, a no-change Drizzle
generation, and repeatable local seed verification. The operator list, card,
and detail projections also show the linked sponsor and family names instead
of requiring operators to interpret profile identifiers.

Exit gate:

- A validated contribution credits exactly once.
- A rejected contribution never changes the budget.
- Concurrent credits and debits preserve account invariants.
- Family and sponsor views expose only authorized financial data.

## 14. Phase 4 - Catalog and Inventory

Goal: create an operator-managed catalog that can safely support order
reservations.

Status: complete (2026-07-16)

- [x] Add categories with activation and ordering
- [x] Add products with SKU, minor-unit price, image reference, and status
- [x] Add inventory balances with on-hand and reserved quantities
- [x] Add immutable inventory ledger entries
- [x] Add stock adjustment commands with required reasons
- [x] Add family-readable active catalog projections
- [x] Prevent hard deletion of referenced categories/products
- [x] Test inactive products, price validation, and concurrent stock reservation

Completion evidence (2026-07-16): migration
`0006_phase4_catalog_inventory` adds categories, products, balance rows, and
an append-only inventory ledger with non-negative/never-over-reserved database
checks. Operator commands create, update, activate/deactivate, restock, and
adjust; no catalog delete command exists. Family routes are role-limited and
query active categories/products only. Stock-changing paths use `FOR UPDATE`,
unique idempotency keys, and ledger snapshots; the Phase 5 service can call
internal reserve/release/allocate commands. Focused tests cover product price
validation, stock receipt locks, idempotency boundaries, and attempts to
reduce on-hand stock below reservations.

Exit gate:

- Operators can maintain products and stock.
- Families can browse only active products.
- Inventory cannot become negative or be over-reserved.

## 15. Phase 5 - Cart, Orders, and Fulfillment

Goal: let a family place a funded order and let an operator complete its
lifecycle.

- [x] Add one active cart per family profile
- [x] Add cart item add/update/remove/clear operations
- [x] Recalculate cart totals from current product data
- [x] Add orders, immutable item snapshots, and status history
- [x] Submit cart to order in one transaction
- [x] Reject submission until the family's funding lifecycle is active
- [x] Lock and reserve budget and inventory during submission
- [x] Implement approve, reject, prepare, deliver, and cancel commands
- [x] Release or reverse money and stock for rejected/cancelled orders
- [x] Add family order history and tracking
- [x] Add sponsor privacy-safe supported-family order views
- [x] Add duplicate-submit, stale-price, low-budget, and low-stock tests

Phase 5 evidence (2026-07-16): the `orders` module now owns one cart per
family profile, current-price cart estimates, immutable order/item/address
snapshots, and append-only status events. Migrations
`0008_phase5_cart_orders_fulfillment` and
`0009_phase5_order_lifecycle_timestamps` add carts, orders, item snapshots,
status history, lifecycle timestamps, unique submission keys, and database
checks/indexes without destructive DDL.

Family routes are self-scoped for cart and order history; sponsor routes return
only active-assignment order summaries with item snapshots, totals, and status,
never family identifiers or delivery fields. Operator commands are explicit:
approve captures reservations, reject/pending-cancel release them, and
post-approval cancellation writes budget refunds and inventory returns. Each
mutating path is transactional; submission locks the cart, reserves inventory
in stable product-ID order, locks the budget account, and appends idempotent
ledger entries plus audit/outbox/status-event records.

All order lifecycle paths now use one cross-resource lock order: inventory
first, then budget. This applies to submit, approve, reject, pending
cancellation, and post-approval cancellation, avoiding inverted lock ordering
between competing transactions.

Validation evidence (2026-07-16): `bun run lint` and `bun run typecheck`
passed. `bun run check` passed with 95 server tests, 8 seed tests, one
intentionally gated database integration test, and the production build. The
server suite covered cart validation, current-price snapshots, duplicate
submission, a serialized duplicate-submit race, low-budget/low-stock
conflicts, capture/refund effects, and forbidden transitions. A second
`bun run db:generate` reported no schema changes. Production smoke returned
200 for `/`, `/dashboard`, `/api/system/health`, and `/api/mcp/tools`.
Local PostgreSQL is now configured: the empty `kafil` database was created,
all 11 migrations applied successfully, and all five Phase 5 tables were
verified. `bun run test:db` now runs a seeded multi-connection PostgreSQL race:
exactly one of two competing reservations succeeds for a shared budget, and
exactly one succeeds for the final stock unit. Final balances remain
non-negative and neither resource is double-reserved.

Exit gate:

- Two concurrent orders cannot spend the same budget or stock.
- Every allowed transition has the correct ledger effects.
- Every forbidden transition returns a conflict and changes nothing.

## 16. Phase 6 - Role Dashboards

Goal: replace the placeholder dashboard with complete role-specific workflows.

Detailed active plan: [`plans/sections/06-web-dashboards.md`](plans/sections/06-web-dashboards.md).

- [x] Add login, sponsor registration, reset-password, and activation pages
- [x] Resolve the session server-side with Najm auth
- [x] Redirect `/dashboard` to the correct role dashboard
- [x] Add operator navigation and management screens (Families, Children,
      Sponsors, SupportAssignments, Contributions, Budgets, Categories,
      Products, Inventory, Orders, and platform Settings)
- [x] Add family children, budget, catalog, cart, and order screens
- [x] Show configured funding progress and disable pending-family submission
- [x] Add sponsor support, contribution, usage, orders, and profile screens
- [ ] Use Server Components for initial reads
- [ ] Use narrow Client Components for forms and interactive cart controls
- [ ] Keep authorization in the backend, not only in layouts/components
- [ ] Add loading, empty, error, forbidden, and not-found states
- [ ] Support Arabic and French UI copy
- [ ] Add keyboard and mobile accessibility checks

Exit gate:

- Each role can complete its full workflow without direct API tooling.
- Cross-role routes and data remain inaccessible even with crafted requests.

## 17. Phase 7 - Reports, Operations, and Release

Goal: close the operational, privacy, and production-readiness surface.

- [~] Add operator statistics and financial reports (live overview statistics,
      contribution trend, budget position, order pipeline, and low-stock
      attention are complete; detailed reports remain)
- [~] Add sponsor contribution and usage reports (own contribution trend,
      statuses, supported budget use, and privacy-safe KPIs are complete;
      detailed reports remain)
- [~] Add family monthly budget/order summaries (live 12-month order activity,
      budget position, order pipeline, and recent orders are complete; monthly
      statements and category reporting remain)
- [x] Standardize translated success response envelopes across all Kafil
      controller routes while preserving the raw health probe
- [x] Make the web application installable on Android and iPhone with a web app
      manifest, branded icons, standalone display, and a privacy-safe service
      worker/offline fallback
- [ ] Add CSV export with explicit permission and privacy filtering
- [ ] Add durable outbox events for email and reminders
- [ ] Add contribution, order-status, and account-activation notifications
- [ ] Add database readiness checks and operational metrics
- [ ] Add production cache/Redis configuration for auth revocation
- [ ] Add rate limits for sensitive and expensive commands
- [ ] Add security headers and Content Security Policy
- [ ] Add structured logs with request IDs and no sensitive payloads
- [ ] Define backup, restore, migration rollback, and incident procedures
- [ ] Run full unit, integration, authorization, concurrency, and browser tests
- [ ] Complete staging smoke and release checklist

Exit gate:

- The platform is auditable, recoverable, privacy-reviewed, and validated in a
  production-like environment.

## 18. Implementation Rules for Every Slice

Each slice must follow this order:

1. Confirm the relevant section plan and dependencies.
2. Add or change feature-owned schema and exports.
3. Generate a new migration; never edit a deployed migration.
4. Add DTO validation before controller exposure.
5. Implement repository and validator behavior.
6. Implement transaction boundaries in the service layer.
7. Add policy/ownership rules before exposing routes.
8. Add controller commands and MCP annotations.
9. Add focused unit and integration tests.
10. Run the global verification gates.
11. Update this plan with actual results before marking the slice complete.

For stateful or financial resources, never expose a generic update operation
that allows callers to set balances or statuses directly.

## 19. Required Test Surfaces

Every feature must cover:

- DTO parsing and rejection cases
- repository queries and uniqueness constraints
- service success and failure behavior
- transaction rollback behavior
- role and permission denial
- row-level ownership isolation
- privacy-safe response shape
- migration/schema composition
- MCP discovery metadata
- HTTP behavior

Financial and order features additionally require:

- repeated request/idempotency tests
- concurrent operation tests
- insufficient budget/stock tests
- invalid state transition tests
- ledger and balance reconciliation tests

## 20. Global Verification Gate

Run after every completed implementation slice:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Build and runtime gates require the documented `.env` values. Migration
generation must run in an interactive terminal when Drizzle needs an explicit
rename-versus-create decision; record that decision with the phase evidence.

Before closing a phase, also run a production-like server and verify:

```text
/                         -> 200
/dashboard                -> expected auth redirect or role page
/api/system/health        -> 200
/api/mcp/tools            -> 200 and expected tools
```

Phase reports must record the actual command results, migration name, table
changes, and any deferred work. A checkbox without evidence does not close a
phase.

## 21. MVP Release Definition of Done

The first production release is done only when:

- [ ] All seven implementation phases are closed
- [ ] There are no unresolved critical/high security findings
- [ ] All role and ownership tests pass
- [ ] Budget and inventory reconciliation tests pass
- [ ] No financial status or balance can be directly overwritten
- [ ] Family private fields never appear in sponsor responses or logs
- [ ] Database backup and restore have been rehearsed
- [ ] Migrations have been tested from a clean database and from the previous
      release schema
- [ ] Staging smoke covers operator, family, and sponsor end-to-end workflows
- [ ] Production secrets, email transport, Redis, HTTPS, and monitoring are set
- [ ] Rollback and incident owners are documented
