# Kafil MVP Decision Register

Status: active

## Product and Role Decisions

### D-001 - Three visible roles

The product exposes `operator`, `family`, and `sponsor`.

### D-002 - Hidden bootstrap admin

Najm `admin` remains a technical super-role for initial operator creation,
emergency recovery, and role/permission maintenance. It is not shown as a
normal product role.

### D-003 - Family onboarding

An operator creates one family profile and its Najm login transactionally.
Public family registration is not allowed in the MVP.

### D-004 - Sponsor onboarding

Public Najm registration assigns the fixed `sponsor` role. Sponsor profile
completion is a separate authenticated onboarding step. Callers cannot choose
a role.

### D-005 - Account removal

Operators deactivate/reactivate family and sponsor users through Najm user
status. Normal workflows do not hard-delete accounts with financial or order
history. The bootstrap admin may permanently delete a family; that audited
transaction removes its login and complete linked domain graph, including
children, assignments, contributions, budget history, documents, carts, and
orders.

## Family and Assignment Decisions

### D-006 - Family profile is the private domain root

`familyProfiles` owns guardian identity, address, phone, children, private
documents, budget, cart, support assignments, contributions, and orders. A
standalone household table or API is forbidden.

### D-007 - Family login linkage

Every `familyProfiles` row has one required, unique Najm `userId`. A family
profile cannot exist independently and a second login for the same family is
outside the MVP contract.

### D-008 - Multiple support relationships

A sponsor may support multiple families, and a family may have multiple
sponsors.

### D-009 - Family-only sponsorship

An assignment always references the family profile. Children remain part of
the household record and are not individual sponsorship targets in the MVP.

### D-010 - Shared family budget

Sponsor contributions credit the pooled family budget. Child-specific wallets
are deferred.

## Financial Decisions

### D-011 - Currency

The MVP uses `MAD`. Currency fields remain explicit, but conversion and
multi-currency accounts are deferred.

### D-012 - Money representation

Money is stored as PostgreSQL `bigint` minor units and validated as safe integer
values at application boundaries. Floating-point money is forbidden.

### D-013 - Carry-forward

Unused budget remains available in later months. Optional monthly limits cap
spending but do not destroy the underlying balance.

### D-014 - Contribution validation

Only operators validate or reject submitted contributions. Validation and the
budget credit are committed in one transaction.

### D-015 - Immutable ledger

Budget ledger entries are append-only. A correction, refund, or cancellation
creates a reversal entry linked to the original source.

### D-016 - Monthly contribution modification

Changing or stopping a monthly plan affects future payments only. Validated
payments are not edited.

## Catalog and Order Decisions

### D-017 - Product snapshots

Orders store item name, SKU, price, quantity, total, and delivery address
snapshots. Later catalog changes do not rewrite historical orders.

### D-018 - Reservation at submission

Submitting an order reserves budget and inventory atomically. Approval captures
both; rejection and cancellation release or reverse them.

### D-019 - Explicit order commands

Order status changes use explicit commands with transition validation. A generic
status update endpoint is forbidden.

### D-020 - Terminal order states

`delivered`, `rejected`, and `cancelled` are terminal.

## Privacy and Architecture Decisions

### D-021 - Sponsor privacy projection

Sponsors see display-safe family data, budget totals, contribution history, and
order summaries. They do not see exact addresses, phone numbers, CINs,
documents, internal notes, or delivery instructions.

### D-022 - One runtime

The Next.js application and Najm API use one process/origin. `packages/server`
is a package boundary, not a separate deployment.

### D-023 - Najm owns authentication

Kafil reuses Najm auth, sessions, JWTs, refresh rotation, reset flows, role
guards, permission guards, and ownership. It does not create a parallel auth
system.

### D-024 - Backend-first delivery

Domain schema, services, policies, migrations, and tests are implemented before
the full dashboards. The dashboards consume proven backend workflows.

### D-025 - Feature-owned schema

Each module owns its `*Schema.ts`; the global schema file composes exports only.

### D-026 - Durable side effects

Financial truth stays in PostgreSQL. Emails and reminders use a database outbox
so a transient delivery failure cannot roll back or lose a committed business
operation.

### D-027 - Configurable family funding target

The family order-activation target is stored on each `familyProfiles` record
as integer MAD minor units. Operators set it when creating a family and may
change it through the audited family update command; application code must not
own a fixed activation amount. The singleton `platformSettings` value remains
only as a default for non-UI API creation when no target is supplied.

### D-028 - Funding lifecycle is separate from account lifecycle

Najm user status controls login access. `familyProfiles.fundingStatus` controls
whether the family may submit orders. A family may log in, view its budget,
and prepare a cart while `pending_funding`, but order submission requires
`active` funding status.

### D-029 - One-way funding activation

Validated sponsor contribution credits, net of contribution refunds, count
toward that family's target. Validation activates an eligible family in the
same transaction. Lowering a family's target reevaluates that family; raising
it does not deactivate families that already qualified, and later spending does
not reverse activation.

### D-030 - Primary guardian CIN

New family intake requires the primary guardian's CIN. It is stored as an
uppercase, unique, operator-only family identity field. Migration `0013`
requires it for every family profile; family self-service responses omit it,
operator UI displays mask it by default, and audit/outbox payloads must never
retain it.
