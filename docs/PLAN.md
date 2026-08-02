# Kafil MVP Implementation Plan

Status: **ACTIVE**

Last updated: 2026-07-27

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
14. Placing an order reserves only budget; Kafil procures products on demand
    and owns no physical stock.
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
25. Operator-created accounts are phone-first. A family's temporary first
    password is the guardian CIN; standard CIN-shaped input is normalized so
    either uppercase or lowercase works. Sponsor initial passwords retain a
    random suffix. Kafil stores only Najm's password hash and never places the
    CIN in auth logs, audit metadata, or outbox payloads.
26. Public sponsor registration remains email-first. New accounts stay pending
    until an expiring, one-time email-verification link activates them.
27. Email and normalized phone are both accepted login identifiers. Phone is
    globally unique at the Najm user boundary; profile tables retain the domain
    contact field.
28. Newly operator-created families must replace the temporary password on
    their first access. A valid temporary CIN creates only a ten-minute,
    browser-session password-setup session; it creates no usable dashboard/API
    session. Choosing the permanent lowercase-and-number password consumes the
    setup session, revokes every normal session, and requires one clean sign-in.
    Every other role keeps Najm's stronger password policy.
29. Operators and admins may create an attributed assisted order for an active
    family without impersonating it or changing its personal cart.
30. Approval keeps the estimated total reserved. A protected supermarket
    receipt records the immutable actual purchase and settles lower/higher
    variance explicitly.
31. The active lifecycle is `pending -> approved -> purchased ->
    out_for_delivery -> delivered`; raw receipt/proof files are operator-only.
32. Admin access management is a Kafil privacy-safe facade over Najm users,
    sessions, fixed roles, canonical permissions, and audited custom permissions.
    User creation always completes the owning operator/family/sponsor profile.
33. Bootstrap admins may permanently delete a mistaken pre-purchase order only
    while it has no purchase or fulfillment evidence. The transaction removes
    its order-owned reserve/release ledger entries, unstarted delivery plans,
    items, and timeline; rebuilds the family budget snapshots; and retains an
    audit record. An assignment that never started is planning, not fulfillment
    evidence.
34. A Staff profile may carry both `operator` and `delivery` capabilities.
    Assisted checkout may optionally plan an active operator for purchasing and
    an active delivery-capable Staff member for delivery, including the same
    person for both. Planning does not advance the order: explicit approval,
    purchase recording, delivery start, and delivery confirmation remain the
    only lifecycle transitions.

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
- [x] Explicit remember-me persistence for normal logins: unchecked logins use
      browser-session cookies and checked logins persist through browser
      restarts; temporary-CIN access is always a setup-only browser session
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
- [x] Procurement categories and products; legacy inventory retained read-only
- [x] Cart and order workflow
- [x] Configurable family funding target, progress, and order-activation gate
- [x] Operator-only family image upload with protected local filesystem serving
- [x] One canonical `/dashboard` with server-side exact-role selection, grouped
      icon navigation, live KPI cards, trend charts, status summaries, and
      role-scoped attention lists
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
  +-- Canonical /dashboard
        |
        +-- AdminDashboard (admin and operator)
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
         +-- orderPurchaseRecords -- orderPurchaseReversals
         `-- protected receipt and delivery evidence
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
| Manage procurement catalog | Yes | No | No |
| Use cart and place orders | Assisted only | Own | No |
| Approve/reject/purchase/deliver orders | Yes | No | No |
| View orders | All | Own | Supported family summary |
| Deactivate/reactivate accounts | Yes, except operators | No | No |
| Inspect users, fixed roles, and permissions | Admin only | No | No |
| Create domain users and custom permissions | Admin only | No | No |

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
pending -> approved -> purchased -> out_for_delivery -> delivered
```

Alternative paths:

```text
pending -> rejected
pending -> cancelled
approved -> cancelled
purchased -> cancelled        (operator confirms goods are recoverable)
out_for_delivery -> cancelled (operator confirms goods are recoverable)
in_preparation -> delivered/cancelled (legacy compatibility only)
```

Rules:

- Submission creates `pending` and reserves the catalog estimate from budget.
- Approval keeps that estimate reserved.
- Recording the protected receipt captures the actual purchase amount, releases
  a lower variance, or explicitly reserves/captures a confirmed higher variance.
- Rejection or pre-purchase cancellation releases the estimate.
- Recoverable post-purchase cancellation refunds the active actual purchase.
- Delivery transitions have no financial or inventory effect.
- Delivered, rejected, and cancelled orders are terminal.
- Status changes are command methods, never a generic status update.

## 10. Phase Roadmap

| Phase | Status | Outcome | Detailed plan |
| --- | --- | --- | --- |
| 0. Existing foundation | `[x]` | Workspace, Najm API, auth, profiles, documents | Current repository |
| 1. Identity, families, children, audit | `[x]` | Family role and safe account lifecycle | [Section 01](plans/sections/01-identity-families-and-children.md) |
| 2. Support assignments and privacy views | `[x]` | Sponsor-to-family relationships | [Section 02](plans/sections/02-support-assignments.md) |
| 3. Budgets and contributions | `[x]` | Transactional contribution-to-budget flow | [Section 03](plans/sections/03-budgets-and-contributions.md) |
| 4. Procurement catalog | `[x]` | Orderable products without Kafil stock | [Section 04](plans/sections/04-catalog-and-inventory.md) |
| 5. Cart, procurement, purchase, and delivery | `[x]` | Assisted/self-service orders with actual-cost settlement | [Section 05](plans/sections/05-cart-orders-and-fulfillment.md) |
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
authenticated page responses. The dynamic-branding-assets slice landed on
2026-07-26: the `platform_settings` row now stores four nullable branding
asset paths plus a `branding_revision` counter guarded by a positive-revision
check, the new `/api/branding` module exposes a public read and
admin-only upload, commit, reset, and delete endpoints with revision-locked
commits, the sidebar, auth, and first-login layouts now consume the committed
asset URLs (with a baked-in factory fallback on image error), and the global
Settings sheet gained an admin-only Brand assets card with live previews,
uncoordinated upload/discard/reset actions, and translations for en, fr, ar,
and es. Detailed reports, exports, durable outbox delivery, rate limits,
security headers, and backup rehearsals remain open.
The measured image-size and cold-loading follow-up is now specified in
[`IMAGE-DELIVERY-OPTIMIZATION.md`](plans/IMAGE-DELIVERY-OPTIMIZATION.md). It is
implemented in code with upload-time normalization, bounded package/public
WebPs, protected rendering, and a backup-gated backfill command. The protected
data apply/rollback rehearsal and browser transfer evidence remain deployment
gates for this Phase 7 release-hardening slice.

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
`bun run seed -- <command>` supports explicit setup, demo, remove, full,
migrate, admin, category, verification, and image-library operations. The
concise `remove` action transactionally deletes only deterministic demo
accounts and their linked activity and managed files; packaged categories,
settings, the bootstrap admin, and unrelated records remain. Destructive
remove/setup/full commands require confirmation or `--yes`. Family and sponsor
files named `family-NN` / `sponsor-NN` in the flat
`packages/seed/images` library are validated, assigned in numeric order with
one image per profile and empty fallback images after the library is exhausted,
then copied with content-versioned
UUID paths to managed storage, and
written to Najm user image fields. Sponsor images have an authenticated serving
route for operator/sponsor views. Root lint, typecheck, tests, and production
build passed: web 107 tests, server 129 tests with one opt-in database skip, and
seed 27 tests. CLI help, empty-library validation, auth verification, and a
zero-record configured-database demo run also passed without clearing data.
Demo realism follow-up (2026-07-30): the current defaults are 10 families, 20
sponsors, 6 operators, 4 delivery staff, and 20 contributions. Demo/full always
repair the 17 packaged categories, create or repair the packaged image-backed
demo products, and generate 24 repeat-family orders across the trailing 12 months.
The generated history uses normal assisted-order, budget, purchase, receipt,
delivery-assignment, and confirmation commands, while deterministic keys make
reruns idempotent and recent orders retain useful active lifecycle states.
Seed lint/typecheck and all 73 seed tests passed. Root typecheck, the complete
test command, the 40-route production build, and no-change migration generation
also passed; the combined root check is currently blocked only by an unrelated
unused-parameter lint finding in the concurrent delivery implementation.
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

Family-create wizard follow-up (2026-07-24): the demo seed rerun now
repairs existing demo families' `housingSituation`, `registrationDate`, and
`supportPriority` through `FamilyService.update` only when at least one of
the three differs from the requested fixture, exposing the work in the
returned `repaired` count. The household step exposes the `unknown` housing
option only while the current selection is `unknown` and removes it the
moment an operator records a real value, so the historical placeholder
cannot be reselected. A new Playwright suite verifies the three wizard
step labels, active-step validation, Back/Next value preservation, and
responsive row pairing at desktop and mobile widths. Focused verification
covers 46 seed tests, 12 family-feature tests, 160 server tests (one
opt-in database skip), and green lint/typecheck across packages.

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

## 14. Phase 4 - Procurement Catalog

Goal: maintain the products Kafil is willing to procure after a family request.

Status: complete (2026-07-16)

- [x] Add categories with activation and ordering
- [x] Add products with SKU, minor-unit price, image reference, and status
- [x] Retire stock balances, receipts, adjustments, navigation, APIs, and MCP
      tools from active runtime behavior
- [x] Add family-readable active catalog projections
- [x] Prevent hard deletion of catalog items with order history; admin-only
      pristine delete for items added by mistake
- [x] Test inactive products, price validation, and orders without stock setup

Historical implementation evidence (2026-07-16; inventory behavior superseded
by the procurement retirement evidence below):
migration `0006_phase4_catalog_inventory` adds categories, products, balance
rows, and an append-only inventory ledger with non-negative/never-over-reserved
database checks. Operator commands create, update, activate/deactivate, restock,
and adjust. Bootstrap admins additionally expose `deleteCategory` and
`deleteProduct` for "added by mistake" cleanup, gated by an explicit
pristineness check — items with order history, inventory ledger activity, or a
non-zero balance are refused with HTTP 409 and the operator must deactivate.
The inventory ledger is **never modified** by the delete path; cart items and
product images are cleaned post-commit. Family routes are role-limited and
query active categories/products only. Stock-changing paths use `FOR UPDATE`,
unique idempotency keys, and ledger snapshots; the Phase 5 service can call
internal reserve/release/allocate commands. Focused tests cover product price
validation, stock receipt locks, idempotency boundaries, and attempts to
reduce on-hand stock below reservations.

Procurement retirement evidence (2026-07-27): active inventory controllers,
MCP tools, UI, navigation, dashboard projections, form-fill registrations, and
all order effects were removed. New products do not receive a balance. The
legacy inventory tables and enum remain untouched as read-only history; no
runtime repository writes them. Catalog deletion now depends on order history,
not the existence of a legacy balance.

Exit gate:

- Operators can maintain an orderable procurement catalog.
- Families can browse only active products.
- A funded order succeeds without an inventory balance.

## 15. Phase 5 - Cart, Orders, and Fulfillment

Goal: let a family place a funded order and let an operator complete its
lifecycle.

- [x] Add one active cart per family profile
- [x] Add cart item add/update/remove/clear operations
- [x] Recalculate cart totals from current product data
- [x] Add orders, immutable item snapshots, and status history
- [x] Submit cart to order in one transaction
- [x] Reject submission until the family's funding lifecycle is active
- [x] Lock and reserve budget only during submission
- [x] Add attributed assisted orders that leave the family cart untouched
- [x] Keep approval reserved; record protected receipt and actual purchase
- [x] Add explicit purchased, out-for-delivery, and delivered commands
- [x] Release/refund only budget for rejected/cancelled orders
- [x] Add family order history and tracking
- [x] Add sponsor privacy-safe supported-family order views
- [x] Add duplicate-submit, stale-price, low-budget, variance, delivery,
      evidence, privacy, and no-inventory tests

Phase 5 evidence (2026-07-16): the `orders` module now owns one cart per
family profile, current-price cart estimates, immutable order/item/address
snapshots, and append-only status events. Migrations
`0008_phase5_cart_orders_fulfillment` and
`0009_phase5_order_lifecycle_timestamps` add carts, orders, item snapshots,
status history, lifecycle timestamps, unique submission keys, and database
checks/indexes without destructive DDL.

The original Phase 5 implementation reserved both stock and budget. That
historical behavior and its lock-order evidence are retained in the record but
were fully superseded on 2026-07-27: current submission reserves budget only,
approval retains that reservation, purchase captures actual cost, and no active
order path reads or writes inventory.

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

Workflow expansion evidence (2026-07-27): migration
`0025_ambitious_abomination` adds attributed placement, immutable purchase and
reversal records, protected evidence metadata, `purchased`, and
`out_for_delivery`. Operator UI now creates assisted orders, records/replaces
receipts, and tracks delivery. Family and sponsor views expose only safe
milestones. Exact/lower/higher settlement, cart isolation, terminal delivery,
evidence signature/cleanup, and account-access tests pass. The local migration
and 16 PostgreSQL integration tests passed.

Exit gate:

- Two concurrent orders cannot spend the same budget.
- Every allowed transition has the correct ledger effects.
- Every forbidden transition returns a conflict and changes nothing.

## 16. Phase 6 - Role Dashboards

Goal: replace the placeholder dashboard with complete role-specific workflows.

Detailed active plan: [`plans/sections/06-web-dashboards.md`](plans/sections/06-web-dashboards.md).

- [x] Add login, sponsor registration, reset-password, and activation pages
- [x] Resolve the session server-side with Najm auth
- [x] Render the correct exact-role dashboard directly at `/dashboard`
- [x] Add operator navigation and management screens (Families, Children,
      Sponsors, SupportAssignments, Contributions, Budgets, Categories,
      Products, Orders, admin Access management, and platform Settings)
- [x] Add family children, budget, catalog, cart, and order screens
- [x] Show configured funding progress and disable pending-family submission
- [x] Add sponsor support, contribution, usage, orders, and profile screens
- [x] Add an audited, persisted F8 fake-data setting that is disabled by
      default and changes without rebuilding or restarting Docker
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

Staff and delivery-assignment extension (complete 2026-07-30): the admin-only
Staff directory now owns Operator/Delivery operational metadata, provisions
linked operator accounts, and supplies operators with a privacy-safe delivery
selector. Migration `0027_unusual_victor_mancha` adds immutable delivery
attempts with one-active-attempt and idempotency constraints. Explicit Orders
commands cover assign, reassign, start, fail, and confirm; the canonical
`/orders` UI adds a Delivery column, state-aware dialogs, and responsive history
sheet. Family/sponsor projections remain identity-safe. Unit, PostgreSQL
concurrency, production build, migration drift, and four-role browser gates
passed. Phase 7 remains active for the unrelated release items below.

Assisted fulfillment-planning extension (complete 2026-07-31): Staff now
supports one or both operational capabilities (`operator`, `delivery`). During
operator/admin cart confirmation, purchasing and delivery assignees are
optional, and one dual-capability Staff member can fill both fields. The order
is still created as `pending`; purchasing assignment is snapshotted on the
order, delivery planning creates the immutable assigned attempt, and only the
existing explicit commands move the lifecycle forward. Migration
`0028_clumsy_vargas` adds the nullable purchasing assignment snapshot.

Canonical dashboard extension (2026-08-01): `/dashboard` now resolves the
authenticated role server-side and directly renders exactly one dashboard;
there is no role-home redirect. Admin and operator share `AdminDashboard`,
while family and sponsor render their own dashboards. All Overview navigation
links target `/dashboard`, and the dashboard feature is organized under
`features/Dashboard/{AdminDashboard,FamilyDashboard,SponsorDashboard}`. The old
`/operator`, `/family`, and `/sponsor` overview pages were removed; their nested
role-protected workflow routes remain unchanged.

Family CIN credential follow-up (2026-08-01): newly operator-created families
now receive the guardian CIN as their temporary first password. Kafil
normalizes standard CIN-shaped input to lowercase in both active login paths
and the first-password replacement check, so uppercase and lowercase typing
work identically. Existing surname/year temporary hashes remain usable, the
mandatory replacement flow is unchanged, and CIN-shaped values are rejected
as permanent family passwords. No schema migration was required.

Remember-me follow-up (2026-08-01): the login form now submits an explicit
boolean preference. Kafil's single Next/Najm API boundary applies it to both
the refresh-token and signed-session cookies and preserves the choice through
refresh rotation and server-side session recovery. Unchecked logins use
browser-session cookies; checked logins retain the configured seven-day
persistence. The forced family password screen now includes a localized sign
out action so a user can return to login or switch accounts. Najm client login
requests are handled by Kafil's access-login DTO, allowing temporary CIN
credentials without weakening the permanent-password policy or bypassing
Najm's token application and refresh-circuit reset. No schema migration was
required.

Auth navigation stability follow-up (2026-08-01): login and sign-out now use a
single full-document replacement after changing cookies and Najm client state.
This remounts the root auth provider from the new server session and prevents
stale client/RSC state from bouncing between `/login?from=/dashboard` and
`/dashboard` after a browser restore.

Setup-only family password follow-up (2026-08-01): a successful temporary-CIN
credential check no longer returns a usable normal session. Kafil immediately
revokes the transient Najm login artifacts before the response and issues one
opaque, hashed, ten-minute password-setup session in the HttpOnly
`kafil.family-setup` browser-session cookie. The setup route is public to Najm
auth but requires that scoped server session; `/dashboard` and every protected
API remain unavailable because no access token, refresh token, or signed Najm
session reaches the browser. Closing the browser removes the setup cookie, and
reopening or restoring `/change-password` without it redirects to `/login`.
Password completion atomically consumes the setup row, replaces the temporary
hash, clears the requirement, revokes all normal sessions, clears every cookie,
and asks the family to sign in once with the new password. Migration
`0029_square_mac_gargan` adds only the hashed setup-session storage and its
expiry/consume/revoke metadata. Family provisioning uses a transaction-local
Najm-compliant bridge credential and overwrites it with Najm's hash of the CIN
before commit, so the temporary credential is never stored in plaintext and is
still exactly the guardian CIN shared with the family.

Validation: the full root `bun run check` gate passed (web 245 tests, server
322 tests with 36 database opt-in skips, seed 76 tests, and a successful
37-page production build). `bun run test:db` passed all 22 PostgreSQL tests,
including concurrent single-consumption of the setup token and real family
create/delete/recreate. Migration `0029_square_mac_gargan` applied locally and
the following `bun run db:generate` reported no schema drift. HTTP smoke
confirmed signed-out `/change-password` redirects to `/login` and the setup API
returns 401 without its scoped cookie. Interactive browser acceptance was not
available because this session exposed no browser backend.

Najm ownership follow-up (2026-08-01): `najm-auth@2.0.12` now owns the generic,
purpose-bound `credential_setup_sessions` table and transactional setup-session
service. Temporary-credential verification is separate from normal session
establishment, so Kafil never creates a full session for the CIN path. Kafil
retains only its family requirement, CIN normalization, and permanent-password
policy, delegating setup begin/require/consume/cancel to Najm. Append-only
migrations `0030_previous_madrox` and `0031_numerous_the_liberteens` create the
shared table and remove the superseded Kafil table; applying them intentionally
invalidates any outstanding ten-minute setup token while preserving password
requirements. The npm registry integrity was verified, `bun run check` passed
with 245 web tests, 323 server tests plus 36 database-only skips, 76 seed tests,
and a successful 37-page build; `bun run test:db` passed 22/22 and
`bun run db:generate` reported no drift. Live HTTP acceptance confirmed a
setup-only login, no normal auth cookie, a 307 dashboard rejection, immediate
revocation on cancel, and a clean redirect to `/login`.

Phase 7 unification slice (2026-07-28): `/products`, `/categories`, and `/orders`
become the single canonical surfaces for the catalog and order experience.
The shared frontend plan in
[`PLAN-unified-products-categories-orders.md`](../PLAN-unified-products-categories-orders.md)
is implemented; the previous role-prefixed routes now redirect to the
canonical destinations.

- New canonical routes: `apps/web/src/app/(dashboard)/products/page.tsx`,
  `categories/page.tsx`, `orders/page.tsx`.
- Compatibility redirects: `/operator/products|categories|orders` and
  `/family/catalog|cart|orders` now `redirect()` to the canonical route;
  `/family/cart` preserves `?cart=open` to open the shared cart dialog.
- Shared inherited-role presentation lives in
  `apps/web/src/shared/Authorization/{Role.tsx,useKafilRole.ts,index.ts}`.
  `useKafilRole` returns the exact role so feature hooks can pick
  management vs. family data without reusing presentation gates.
- One `useProductsWorkspace` / `useCategoriesWorkspace` /
  `useOrdersWorkspace` hook now drives each unified page; the page
  selects management or family projection by the exact role.
- A single `OrderCart` overlay is mounted from `DashboardShell` on
  `/products`, `/categories`, and `/orders`. Admin/operator principals
  write to a Zustand draft; families reuse the existing
  `/orders/cart` + `/orders/submit` endpoints.
- The legacy `FamilyCatalog` and `FamilyOrdering` page components were
  deleted. `useFamilyCart`, `useFamilyOrders`, the family budget hooks,
  and the catalog service are still exported from their feature
  barrels so other views (dashboards, sponsor surfaces) keep working.
- `ProductCard` no longer imports `useFamilyOrderingCommands`; it
  accepts an `onAdd` callback so it is presentation-only.
- `DashboardShell.isDashboardNavigationActive` teaches the new exact
  roots (`/products`, `/categories`, `/orders`) and maps the legacy
  `/family/cart` and `/family/catalog` aliases to the product surface.
- `lib/auth.ts` extends `protectedRoutes` and `roleRoutes` with the
  three canonical routes so unauthenticated traffic is rejected and
  the correct roles reach them.
- No migration was generated by `bun run db:generate`; backend
  contract is unchanged.
- Assisted draft flow hardening (2026-07-28): `OrderCartDialog` now drives
  the assisted family selection through a searchable
  `AssistedFamilySelector` (active families only, server-filtered) instead
  of a free-text input. The dialog also revalidates draft availability
  against the live management catalog (`useProducts` with
  `refetchOnMount: "always"`, `staleTime: 0`) and blocks save when items
  are unavailable. After assisted or family submission,
  `useOrderCart.save` invalidates `orderKeys.all`, `budgetKeys.all`,
  `familyOrderingKeys.all`, and every entry of `catalogWriteKeys`
  individually so the budget summary and management catalog refresh.
- Backend email config hardening (2026-07-28):
  `packages/server/src/config/emailConfig.ts` now requires `EMAIL_PROVIDER`
  to be set and throws on startup if it is missing. The previous silent
  fallback to `console` is removed so a misconfigured production
  deployment fails loudly instead of silently logging verification or
  reset messages.
- Orders route highlight fix (2026-07-28): `OrdersRouteClient` defers
  clearing the `created` query parameter by a 1500ms grace period so the
  orders query has time to load before the highlight is lost.
- Page unification closeout (2026-07-28): `OrdersPage`, `CategoriesPage`,
  and `ProductsPage` each render one shared page component; the
  `FamilyOrdersPage` / `OperatorOrdersPage` / `FamilyCategoriesView` /
  `FamilyProductsView` subcomponents are removed and role-only controls
  are gated by `<Family>` / `<Operator>` / `<Admin>` inside the shared
  pages. `useProductsWorkspace` now accepts live filters so changing the
  Categories sheet URL parameter immediately refetches the family catalog
  query instead of locally filtering the previous response.
- Canonical Orders route follow-up (2026-08-01): `/orders` is the only family,
  sponsor, operator, and admin Orders page. The `/family/orders`,
  `/operator/orders`, and `/sponsor/orders` pages were removed; exact-role
  selection chooses the privacy-scoped query, columns, and actions inside the
  shared `OrdersPage` and `NTable`, while route and backend guards remain
  authoritative.
- Shared role presentation follow-up (2026-08-01): family and management
  Products and Categories now render through the same `NTable` and card
  components. Management and family Orders use the same `NTable` and
  `OrderCard`; sponsor order projections reuse that card. Sponsor contribution
  history reuses `ContributionCard`.
  Each role retains its privacy-scoped query and capability-specific actions.
  The family sidebar now mirrors the admin Finance/Catalog grouping and exposes
  the canonical Categories, Products, and Orders destinations. The duplicate
  `FamilyBudget`, `FamilyCatalog`, and `FamilyOrdering` frontend feature folders
  are removed: their role-scoped hooks and types now live inside `Budgets`,
  `Products`, and `Orders`.
- Budget-page removal follow-up (2026-08-02): removed the standalone operator,
  family, and sponsor budget routes and navigation. Contributions remains the
  funding-history surface, Orders remains the purchase/status surface, and
  dashboards retain concise balance summaries. The backend budget engine,
  order-time funding checks, reservation safety, and audit ledger remain intact.
- Persistence test rewrite (2026-07-28): `order-cart-store.test.ts`
  installs a `window.sessionStorage` polyfill and asserts that
  `bindSession` rehydrates only the matching owner, that a different
  owner does not load another user's draft, and that the selected
  family is never persisted. The previous silent `if (typeof window ===
  "undefined") return;` early-out is gone.
- Phase 7 hardening (2026-07-28):
  - Fixed an infinite update loop in `OrderCartDialog` by making
    `setAvailability` idempotent (returns the existing state when the
    availability flag is unchanged). Each draft line is now revalidated with
    its uncapped product-detail query before submission.
  - Extended the catalog product API (`/catalog/products`) and
    family list API (`/families`) with `categoryId`, `status`, and
    `search` query parameters so the management category sheet and the
    assisted family selector hit the backend instead of locally
    filtering the first 100 results. The backend `productListQuery`
    already accepted these filters; the `familyListQuery` and the
    repository's `list(limit, offset, filters)` now do too.
  - Added pagination to the family catalog view and a Next/Prev
    button pair on `ProductsFamilyGrid`. The workspace now exposes
    `setPagination` for both scopes.
  - Removed the `console` provider fallback from
    `apps/web/next.config.ts`. The build no longer defaults a missing
    `EMAIL_PROVIDER` to `console`, so a misconfigured production
    build surfaces a runtime error from `emailConfig.ts` instead of
    silently logging email contents.
  - `ProductCard` now exposes one compact Add action instead of duplicating
    quantity controls from the cart sheet. After the first add it reflects the
    live cart quantity and opens the cart, while `OrderCartSheet` remains the
    only place that increments, decrements, or removes items.
  - `OrderCartSheet` now requires a read-only review step before the existing
    submit command. The flattened confirmation surface shows the family image,
    name, exact delivery address, phone number, products, quantities, line totals,
    available budget, and total with icon-led Back and Confirm actions; it adds no tracking
    or post-submit receipt screen and preserves server-side recalculation and
    idempotent submission. Copy is localized in en/fr/ar/es.
  - The Products header now uses a translated Categories button that opens a
    narrow Najm Kit sheet reusing category `NTable` card mode with small square
    image tiles and `aria-pressed` selection instead of a horizontal banner.
  - New `apps/web/test/e2e/phase7-unified-flow.e2e.ts` exercises
    the category-sheet URL→query refetch and the assisted family
    search→submission flow in Playwright with mocked routes.
  - Updated `phase6-closeout.e2e.ts` to expect `/orders` after
    family cart submission (the canonical destination from the
    unified flow) instead of the legacy `/family/orders` alias.
  - `DashboardShell` supplies the server-owned role through
    `KafilRoleProvider`, keeping inherited role presentation identical during
    SSR and client hydration after login navigation.
  - The browser runner uses HTTP development mode and Najm's documented
    loopback `NAJM_AUTH_INTERNAL_URL`, so `verifyAlways` recovery does not
    depend on an untrusted self-signed internal TLS request.
  - Bootstrap admins now have an explicit `delete:orders` command and an
    admin-only permanent-delete action in each order card/table menu. Deletion
    is limited to orders without purchase or fulfillment history; it removes
    the pre-purchase order ledger effects, rebuilds account snapshots, deletes
    the order graph transactionally, and records `order.deleted` in the audit
    log. Operators and other roles do not receive the permission or UI action.
- Validation evidence (2026-07-28):
  - `bun run --cwd apps/web typecheck` clean.
  - `bun run --cwd apps/web lint` → 0 errors, 0 warnings.
  - `bun run --cwd apps/web test` → 205 pass, 0 fail (829 assertions).
  - `bun run --cwd packages/server test` → 273 pass, 27 skip, 0 fail.
  - `bun run --cwd packages/seed test` → 69 pass, 0 fail.
  - `bun run --cwd apps/web build` → Next.js 16 production build
    succeeds (39 routes).
  - `bun run db:generate` → "No schema changes, nothing to migrate".
  - Focused `bun run --cwd apps/web test:e2e` with
    `KAFIL_E2E_GREP=Phase 7 unified catalog` → 2 pass, including
    category-query refiltering and assisted family search/submission, with no
    hydration error.
  - The complete registered browser suite exceeded the ten-minute outer
    timeout while older Phase 6 assertions were still failing. It is not
    counted as passing closeout evidence and remains a follow-up.
- Admin permanent-order-delete validation (2026-07-29):
  - `bun run check` passed: web/server/seed lint and typecheck clean; web tests
    215 pass; server tests 291 pass and 31 opt-in skips; seed tests 71 pass;
    Next.js production build succeeded with 39 routes.
  - `bun run test:db` passed 19 PostgreSQL tests, including deletion of the
    order graph, restoration of its reserved amount, rebuild of later ledger
    snapshots, and refusal when purchase history exists.
  - `bun run db:generate` reported no schema changes and no migration.
- Container seed source-runtime hardening (2026-07-30):
  - The final Docker stage now includes `/app/tsconfig.base.json`, preserving
    the legacy TypeScript decorator transform required when the seed CLI
    imports `@kafil/server` source inside the running image.
  - An isolated final-image-layout probe reproduced the prior
    `reflect-metadata` failure without the file and imported the server with
    exit code 0 after restoring it.
  - Lint, typecheck, web tests (215 pass), server tests (291 pass and 31
    opt-in skips), seed tests (71 pass), the 39-route production build, and
    `bun run db:generate` passed. A real Docker image build remains unverified
    on this workstation because Docker is unavailable.

- Budget ledger and demo-history repair (2026-08-02):
  - The shared budget ledger now identifies each activity and source, resolves
    contribution references and order numbers, and shows the resulting
    available balance instead of rendering contribution-only columns for order
    reserve, capture, and release entries.
  - Dense contribution fixtures split each family's intended funding evenly
    instead of repeatedly halving the remainder. Demo contribution timelines
    are chronological and deterministic, and every managed family snapshot is
    rebuilt after idempotent repair.
  - Demo reruns preserve valid forward order progress performed by users while
    continuing to reject incompatible lifecycle drift; immutable order history
    is never downgraded.
  - The exact local rerun with 2 families, 10 sponsors, 6 operators, 4 delivery
    staff, and 40 contributions completed successfully. Both accounts reconcile
    with zero row-level snapshot mismatches; the dense family has 29 validated
    contributions between MAD 103.44 and MAD 103.45.
  - `bun run check` passed, including the 36-route production build, and
    `bun run db:generate` reported no schema drift. Interactive browser
    inspection was unavailable because no browser backend was exposed.

- Root-plan completion (2026-08-02): the additive `PLAN.md` queue is complete.
  `/contribution` is now the canonical admin/operator/family contribution
  surface, with an owner-filtered family projection and visible guarded icon
  actions. The shared order card now serves management, family, and sponsor
  audiences with compact mobile density, safe delivery summaries, and a
  deterministic quantity-ranked dominant category loaded without list N+1s.
  The family 12-month order chart fits 320–430 px without horizontal scrolling.
  Sponsor activation now uses a hashed, six-digit, ten-minute OTP entered after
  valid pending credentials; resend cooldown, bounded attempts, setup-only
  cookies, atomic consumption, and Remember me are server-owned. Append-only
  migration `0032_same_rachel_grey.sql` applied successfully.
  `najm-kit@2.1.47` and `najm-auth@2.0.13` are published and installed. Root
  lint, typecheck, tests, and the 36-route production build pass; PostgreSQL
  integration is 23/23 and Drizzle reports no schema drift. Focused isolated
  Chrome acceptance passes contribution privacy/actions, order cards at
  375/390/430 px plus Arabic RTL, the 12-point chart at 320/375/390/430 px plus
  Arabic RTL, and real registration-to-OTP-to-dashboard activation. Phase 7
  remains active only for the unrelated release and infrastructure items below.


- [~] Add operator statistics and financial reports (live overview statistics,
      contribution trend, budget position, and order pipeline are complete;
      detailed reports remain)
- [~] Add sponsor contribution and usage reports (own contribution trend,
      statuses, supported budget use, and privacy-safe KPIs are complete;
      detailed reports remain)
- [~] Add family monthly budget/order summaries (live 12-month order activity,
      budget position, order pipeline, and recent orders are complete; each
      recent order now shows the image of the category with the highest summed
      item quantity; monthly statements and category reporting remain)
- [x] Standardize translated success response envelopes across all Kafil
      controller routes while preserving the raw health probe
- [x] Make the web application installable on Android and iPhone with a web app
      manifest, branded icons, standalone display, and a privacy-safe service
      worker/offline fallback
- [x] Add admin-only Users, Roles, and Permissions views with safe account
      lifecycle commands, session revocation, code-managed grant drift, and MCP
- [x] Add protected receipt/delivery evidence reconciliation and orphan cleanup
- [ ] Add CSV export with explicit permission and privacy filtering
- [ ] Add durable outbox events for email and reminders
- [ ] Add contribution, order-status, and account-activation notifications
- [ ] Add database readiness checks and operational metrics
- [ ] Add production cache/Redis configuration for auth revocation
- [ ] Add rate limits for sensitive and expensive commands
      (access-route limits are active and now support validated shared and
      route-specific environment overrides; expensive domain commands remain)
- [ ] Add security headers and Content Security Policy
- [ ] Add structured logs with request IDs and no sensitive payloads
- [x] Define database/storage backup, isolated restore, forward-migration, and
      incident procedures, including protected order evidence
- [~] Run full unit, integration, authorization, concurrency, and browser tests
      (unit/build/database gates pass; production-like browser/staging smoke remains)
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
- insufficient budget and confirmed higher-variance tests
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
- [ ] Budget and order/evidence reconciliation tests pass
- [ ] No financial status or balance can be directly overwritten
- [ ] Family private fields never appear in sponsor responses or logs
- [ ] Database backup and restore have been rehearsed
- [ ] Migrations have been tested from a clean database and from the previous
      release schema
- [ ] Staging smoke covers operator, family, and sponsor end-to-end workflows
- [ ] Production secrets, email transport, Redis, HTTPS, and monitoring are set
- [ ] Rollback and incident owners are documented
