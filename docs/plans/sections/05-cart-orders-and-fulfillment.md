# Section 05 - Cart, Orders, and Fulfillment

Status: complete (2026-07-16)

## Goal

Let a family build a cart, submit a funded order, and track the operator-managed
fulfillment lifecycle.

## Dependencies

- family ownership
- budget account and ledger
- catalog and inventory
- audit events

## Data Model

### `carts`

- `id` UUID primary key
- `familyProfileId` unique FK
- timestamps

### `cartItems`

- `id` UUID primary key
- `cartId` FK
- `productId` FK
- `quantity`
- timestamps

Unique by cart/product. Cart prices are calculated from current product data and
are not financial commitments.

### `orders`

- `id` UUID primary key
- `orderNumber` unique human-readable identifier
- `familyProfileId` FK
- `status`
- `subtotalMinor`
- `totalMinor`
- `currency`
- guardian/delivery address snapshot fields
- `placedByUserId`
- `approvedByUserId` nullable
- `approvedAt` nullable
- `rejectedByUserId` nullable
- `rejectedAt` nullable
- `rejectionReason` nullable
- `cancelledByUserId` nullable
- `cancelledAt` nullable
- `cancellationReason` nullable
- `preparationStartedAt` nullable
- `deliveredAt` nullable
- timestamps

### `orderItems`

- `id` UUID primary key
- `orderId` FK
- `productId` FK with restricted deletion
- product name snapshot
- SKU snapshot
- unit price snapshot
- quantity
- line total

### `orderStatusEvents`

- `id` UUID primary key
- `orderId` FK
- `fromStatus` nullable for creation
- `toStatus`
- `actorUserId`
- `reason` nullable
- `createdAt`

Status history is append-only.

## Cart Contract

Family-owned commands:

- get/create own cart
- add product
- set quantity
- remove item
- clear cart

Validation:

- product must be active
- quantity must be positive and bounded
- cart belongs to the authenticated family profile
- returned totals are current estimates

## Submit Order Transaction

1. Resolve the authenticated family profile.
2. Lock the active cart and load items.
3. Load and validate active products.
4. Recalculate all prices on the server.
5. Lock all required inventory rows in stable product-ID order.
6. Lock the family budget account.
7. Check stock, available budget, and monthly remaining limit.
8. Create order and item snapshots.
9. Insert budget `order_reserve`.
10. Insert inventory `order_reserve` entries.
11. Update budget/inventory balances.
12. Create initial status event and audit/outbox events.
13. Clear cart.
14. Commit.

Use a client-provided idempotency key so repeated submission does not create
two orders.

## Order Commands

### Approve

- Operator only.
- Require `pending`.
- Move budget reserved to spent.
- Move inventory reserved to allocated/on-hand consumed.
- Record operator and status event.

### Reject

- Operator only with reason.
- Require `pending`.
- Release reserved budget and inventory.
- Set terminal `rejected`.

### Start preparation

- Operator only.
- Require `approved`.
- No new financial effect.

### Deliver

- Operator only.
- Require `in_preparation`.
- Record delivery time and terminal `delivered`.

### Cancel

- Family may cancel only its own `pending` order.
- Operator may cancel `pending`, `approved`, or `in_preparation` with reason.
- Pending cancellation releases reservations.
- Post-approval cancellation creates budget refund and inventory return
  reversals when goods are recoverable.
- Cancellation service is idempotent.

## Read Models

Family:

- own order list/detail
- status timeline
- totals and item snapshots

Sponsor:

- supported-family order summary only
- item names, quantities, totals, and statuses
- no exact delivery address, phone, or internal notes

Operator:

- filter all orders by state/date/family
- pending validation queue
- preparation and delivery queue
- complete audit/status history

## Implementation Checklist

- [x] Add cart schemas and ownership
- [x] Add order schemas and enums
- [x] Generate migration
- [x] Add cart module
- [x] Add order read repository
- [x] Add transaction coordinator for submit
- [x] Add explicit transition command services
- [x] Add budget ledger integration
- [x] Add inventory ledger integration
- [x] Add status history and audit/outbox events
- [x] Add family and sponsor projections
- [x] Add idempotency tests
- [x] Add stale-price tests
- [x] Add low-budget/low-stock tests
- [x] Add concurrent order tests
- [x] Add every allowed/forbidden transition test

## Completion Evidence

2026-07-16:

- Added feature-owned cart/order schemas and generated append-only migrations
  `0008_phase5_cart_orders_fulfillment` and
  `0009_phase5_order_lifecycle_timestamps`. They add cart/item uniqueness,
  order submission idempotency, immutable item/address snapshots, state history,
  lifecycle timestamps, and money/quantity constraints.
- Added family cart routes, family order history/tracking, privacy-safe sponsor
  summaries for active assignments, and operator queues/read detail. There is
  no generic status or balance mutation route.
- Submission recalculates active product prices server-side, serializes on the
  family cart, locks/reserves inventory in stable product order, locks the
  family budget, applies the monthly limit, then records the order, ledgers,
  audit/outbox events, and initial status event atomically. Approval captures
  reservations; rejection and pending cancellation release them; post-approval
  cancellation creates a budget refund and inventory return.
- Submit and every later cross-resource lifecycle transition use the same lock
  order: inventory first, then budget. Focused service tests assert that effect
  order for submit, approve, and both cancellation paths.
- `order-modules.test.ts` covers DTO boundaries, stale-price snapshots,
  duplicate and concurrent duplicate submits, insufficient budget/stock,
  capture/refund, forbidden transitions, and inventory-before-budget effect
  ordering. Current workspace verification passes with 95 server tests, 8 seed
  tests, the separately gated database race test, lint, typecheck, production
  build, and a no-change Drizzle generation. Production-like smoke returned
  200 for `/`, `/dashboard`, `/api/system/health`, and `/api/mcp/tools`.
- Local PostgreSQL is configured. The empty `kafil` database received all 11
  migrations successfully, and all five Phase 5 tables were verified.
  `bun run test:db` now proves with separate PostgreSQL connections that only
  one competing reservation can consume a shared budget and only one can
  reserve the final stock unit; the losing transaction rolls back cleanly.

## Exit Gate

- A family can place an order only within current budget and stock.
- Concurrent orders cannot double-spend budget or inventory.
- Approval/rejection/cancellation produce exactly the expected ledger effects.
- Historical order data does not change when products or addresses change.
- Family and sponsor order access is correctly scoped and privacy-safe.

## Configurable Funding Gate Extension — 2026-07-18

Order submission now requires the family's separate funding status to be
`active` before stock or budget effects begin. The server remains authoritative;
the family cart also displays configured progress and disables submission while
funding is pending. Available budget, monthly limit, and stock checks still run
after this eligibility gate.
