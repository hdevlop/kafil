# Section 04 - Catalog and Inventory

Status: complete (2026-07-16)

## Goal

Provide an operator-managed product catalog with enough inventory accounting to
reserve stock safely when a family places an order.

## Dependencies

- operator authorization
- family role
- audit events

## Data Model

### `categories`

- `id` UUID primary key
- `name`
- `slug` unique
- `description` optional
- `status`: `active` or `inactive`
- `sortOrder`
- timestamps

### `products`

- `id` UUID primary key
- `categoryId` FK
- `sku` unique
- `name`
- `description` optional
- `priceMinor` bigint
- `currency` fixed `MAD`
- `imageUrl` or storage reference optional
- `status`: `active` or `inactive`
- timestamps

Historical products are deactivated, not deleted after they are referenced by
an order.

### `inventoryBalances`

- `productId` primary key/FK
- `onHandQuantity`
- `reservedQuantity`
- `version`
- timestamps

### `inventoryLedgerEntries`

- `id` UUID primary key
- `productId` FK
- `entryType`
- `quantity` signed integer
- `onHandAfter`
- `reservedAfter`
- `sourceType`
- `sourceId`
- `idempotencyKey` unique
- `actorUserId`
- `reason` nullable except adjustment
- `reversesEntryId` nullable
- `createdAt`

Entry types:

- `restock`
- `adjustment`
- `order_reserve`
- `order_release`
- `order_allocate`
- `order_return`

## Backend Contract

Operator:

- category list/create/update/activate/deactivate
- product list/create/update/activate/deactivate
- stock receipt and stock adjustment commands
- inventory history

Family:

- list active categories
- list/search/filter active products
- get active product detail

Catalog reads must not expose operator notes, internal storage paths, or inactive
items to families.

## Inventory Rules

- `onHandQuantity >= 0`
- `reservedQuantity >= 0`
- `reservedQuantity <= onHandQuantity`
- Stock-changing operations lock the balance row.
- A manual reduction cannot reduce on-hand below reserved.
- Orders use idempotent inventory entries.
- Product price updates do not change existing order item snapshots.

## Implementation Checklist

- [x] Add category and product schemas
- [x] Add inventory schemas
- [x] Generate migration
- [x] Add operator CRUD with deactivation
- [x] Add stock command services
- [x] Add family catalog projections
- [x] Add search/filter/pagination DTOs
- [x] Add indexes for slug, SKU, category, status, and name search
- [x] Add image strategy without exposing protected household documents
- [x] Add audit events
- [x] Add concurrent inventory tests
- [x] Add inactive-product and price validation tests

## Completion Evidence

2026-07-16:

- Generated `0006_phase4_catalog_inventory` with category/product status
  enums, product price/currency checks, stock-balance invariants, immutable
  stock-ledger entries, and indexes for slug, SKU, category/status, and name
  filtering.
- Operators use explicit create/update/activate/deactivate/restock/adjustment
  commands. Categories and products have no delete command; deactivation
  preserves future order-history references. Product images are limited to a
  catalog URL field, with no household-document or internal-storage field.
- Families can read only active category/product projections. Stock mutation
  locks the balance row, records an idempotent ledger entry, and cannot make
  stock negative or lower than its reservations. Phase 5 can reuse the internal
  reserve/release/allocate commands.
- Verified with the same complete server/seed/build/MCP smoke gate recorded in
  [Section 03](03-budgets-and-contributions.md#progress-evidence).

## Exit Gate

- Operators can maintain categories, products, prices, and stock.
- Families see only active catalog entries.
- Inventory cannot go negative or be over-reserved.
- Referenced catalog history is preserved through deactivation and snapshots.
