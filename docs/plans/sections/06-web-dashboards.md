# Section 06 - Web Dashboards

Status: **COMPLETE**

Current implementation slice: **None — Phase 6 closed on 2026-07-17**

## Goal

Provide complete role-specific web workflows on top of the proven Phase 1-5
backend while following the frontend organization already proven in the SMS
project.

Phase 6 is split into bounded slices. Only the current slice should be expanded
at implementation time; later slices keep their API and privacy boundaries but
may refine their presentation.

## Reference Frontend Contract

Kafil follows the same directional dependency used by SMS:

```text
app route
  -> feature component
    -> feature hook
      -> API service
        -> Najm backend controller
```

Example shape:

```text
app/(dashboard)/operator/families/page.tsx
  -> features/Families/components/FamiliesPage.tsx
    -> features/Families/hooks/useFamilies.ts
      -> services/familyApi.ts
        -> /api/families
```

Routes stay thin. Business UI does not accumulate inside `app/`.

## Required Frontend Structure

```text
apps/web/src/
  app/
    (landing)/
    (auth)/
    (dashboard)/
    api/
  components/
  features/
  hooks/
  lib/
  providers/
  services/
  shared/
  stores/

theme.json
```

Responsibilities:

- `app/`: route files, metadata, layouts, loading/error boundaries, and
  server-side session/role redirects.
- `features/`: complete domain-facing UI grouped by Kafil capability.
- `services/`: authenticated HTTP calls only; no React state and no UI.
- `hooks/`: React Query orchestration, mutations, cache invalidation, and
  feature-specific UI state.
- `shared/`: composed application UI such as the dashboard shell, page loading
  state, money display, and status timeline.
- `components/`: small reusable application components that are not owned by a
  single feature.
- `providers/`: Najm auth, Najm design, query, dialog, and toast roots.
- `stores/`: global client-only state such as responsive sidebar state or the
  family cart badge. Server data does not belong in stores.
- `lib/`: server-only session helpers, formatting, schemas, and pure utilities.
- `theme.json`: the single Najm Kit design configuration.

## Feature Module Contract

Every full feature uses this shape when the pieces are needed:

```text
features/<Feature>/
  components/
    <Feature>Page.tsx
    <Feature>Table.tsx
    <Feature>Card.tsx
    <Feature>Form.tsx
  hooks/
    use<Feature>.ts
    use<Feature>TableColumns.tsx
    use<Feature>TableFilters.ts
  config/
    <feature>Schema.ts
    <feature>Status.ts
  types.ts
  index.ts
```

Smaller read-only features may omit forms, tables, or config files. Files are
added for real responsibility, not to satisfy an empty template.

### Route rules

- A route normally imports one feature page and renders it.
- A route may resolve the server session, role, search params, or initial data.
- Route files do not contain CRUD hooks, column definitions, dialog wiring, or
  API endpoint strings.

### Component rules

- Use Najm Kit primitives before creating a local replacement.
- Page composition uses `NPageHeader`, `NPageLayout`, `NTable`, cards, loading,
  empty, and error states.
- Forms use `NForm`, `FormInput`, Zod, and `NFormSectionHeader`.
- Dialog actions use Najm Kit dialog APIs and a single form identifier.
- Tables keep columns and filters in feature hooks instead of one oversized
  component.
- Cards provide the responsive/mobile representation of table records.

### Hook rules

- React Query owns remote server state.
- A feature hook composes service calls and exposes domain-named operations.
- Successful mutations invalidate every affected query key.
- Hooks map API errors to user feedback but do not weaken backend validation.
- Zustand is reserved for cross-route client state, not fetched records.

### Service rules

- One service file groups endpoint calls for one backend resource or tightly
  coupled workflow.
- Services use the shared authenticated `api` client.
- Endpoint paths exist only in services.
- Services return the backend DTO/envelope without inventing private fields.
- Multipart handling is added only when protected uploads enter scope.

### Security and privacy rules

- Client role checks only control navigation and presentation.
- Every secure read and mutation remains protected by Najm backend guards.
- Server Components verify the session near protected data reads.
- Sponsor components consume sponsor-safe DTOs only.
- Raw family address, phone, CIN, documents, internal notes, and delivery
  details never enter sponsor feature types.

## Route Structure

```text
apps/web/src/app/
  (auth)/
    login/
    register/sponsor/
    forgot-password/
    reset-password/
  (dashboard)/
    dashboard/
    operator/
      families/
      children/
      sponsors/
      assignments/
      contributions/
      budgets/
      categories/
      products/
      inventory/
      orders/
    family/
      children/
      budget/
      catalog/
      cart/
      orders/
    sponsor/
      support/
      contributions/
      budgets/
      orders/
      profile/
```

`/dashboard` resolves the session and redirects to the correct role home.
Unknown roles receive a forbidden state. An admin is routed to the operator
surface for bootstrap support but is not presented as a normal product role.

## Phase 6A - Theme, Auth, and Role Shell

Outcome: a user can enter through Najm auth and reach the correct protected
dashboard shell.

- [x] Add the root `theme.json`
- [x] Add `NajmDesignProvider`, `AuthProvider`, dialogs, and toasts
- [x] Add the shared authenticated API client
- [x] Add Najm `defineAuth()` server/client configuration
- [x] Add Next.js 16 `proxy.ts` optimistic route protection
- [x] Add login, sponsor registration, forgot-password, and reset-password
      routes
- [x] Resolve the initial session in the root layout
- [x] Redirect `/dashboard` by role
- [x] Add protected operator, family, and sponsor homes
- [x] Add the role-aware Najm Kit sidebar shell
- [x] Add Phase 6A contract tests and production route smoke

Validation evidence on 2026-07-16:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 15 passed, 0 failed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 13 app routes and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | public/auth routes returned 200; protected role routes returned 307 to `/login?from=...` |
| `bun run test` | web 15 passed; server 95 passed and 1 database-only test skipped; seed 8 passed |

Phase 6A is implemented. Phase 6 remains active because the domain feature
screens in Phases 6B-6H are intentionally still open.

## Phase 6B - Shared Feature Infrastructure

Outcome: feature teams can implement consistent CRUD/read workflows without
copying transport and state boilerplate.

- [x] Add React Query provider and standard query defaults
- [x] Add typed response/error helpers
- [x] Add reusable entity-query and command hooks
- [x] Add money/date/localized-number formatters
- [x] Add standard status maps and badges
- [x] Add page loading, empty, error, forbidden, and not-found states
- [x] Add table pagination/filter helpers
- [x] Confirm Najm Kit owns responsive sidebar state; no duplicate Kafil store
      is needed

Implementation notes:

- Browser services return the backend DTO directly. They do not invent an
  Axios-style or `{ data }` response envelope around Najm's typed fetch client.
- Generic infrastructure is limited to query keys, reads, commands, errors,
  formatting, pagination, and page states. Domain CRUD remains explicit inside
  each feature so financial commands and privacy-safe DTOs cannot be blurred by
  an `any`-based abstraction.
- Queries cache for one minute and retry one network/server failure. Client
  errors and all mutations are not automatically retried.

Validation evidence on 2026-07-16:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 23 passed, 0 failed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | production build passed; 13 routes and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes 200, protected routes 307 to login, unknown route 404 |
| `bun run test` | web 23 passed; server 95 passed and 1 database-only test skipped; seed 8 passed |

Phase 6B is complete. The next implementation target is the operator
`Families` feature in Phase 6C.

## Phase 6C - Operator Identity and Relationships

Implementation order:

1. [x] `Families`
2. [x] `Children`
3. [x] `Sponsors`
4. [x] `SupportAssignments`

Each feature must include its service, hook, page component, table/card view,
validated form where mutations exist, and route page. Family creation must
support the operator invitation flow and child creation without exposing
password handling.

### Families result

The Families feature follows the SMS directional contract:

```text
app/(dashboard)/operator/families/page.tsx
  -> features/Families/components/FamiliesPage.tsx
    -> features/Families/hooks/useFamilies.ts
      -> services/familyApi.ts
        -> /api/families
```

Implemented behavior:

- server-owned operator route protection through the parent layout
- paginated Najm `NTable` plus responsive family cards
- client filters for the loaded page and explicit offset pagination
- operator-only family-profile detail view
- passwordless family account invitation
- transactional creation of one family profile and its required Najm login
- one shared family form for create and edit, including the image, guardian
  identity, contact/address, relationship, funding target, and notes fields
- optional dynamic child rows remain part of the creation transaction only;
  existing children stay in their own management workflow
- explicit audited deactivate/reactivate commands requiring a reason
- loading, empty, error, and mobile states

The client payload does not expose password, role, account-status, audit actor,
or budget mutation fields. Backend guards remain authoritative.

Validation evidence on 2026-07-16:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 29 passed, 0 failed, including 6 Families contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | production build passed; 14 routes including `/operator/families` and the proxy |
| `bun run --cwd apps/web smoke:phase6` | unauthenticated `/operator/families` returned 307 to login |
| `bun run test` | web 29 passed; server 95 passed and 1 database-only test skipped; seed 8 passed |

### Children result

The Children feature follows the established feature-owned web contract:

```text
app/(dashboard)/operator/children/page.tsx
  -> features/Children/components/ChildrenPage.tsx
    -> features/Children/hooks/useChildren.ts
      -> services/childApi.ts
        -> /api/children and /api/families
```

Implemented behavior:

- server-owned operator route protection through the parent layout and an
  operator navigation entry
- paginated Najm `NTable` plus responsive child cards, client-side filters,
  loading, empty, and error states
- child creation only for an existing family profile, selected from the
  guarded family API
- child profile updates without client control over family ownership or
  status
- explicit, reason-required deactivate/reactivate commands; backend audit and
  authorization remain authoritative
- typed service calls and React Query invalidation kept inside the feature
  boundary

The create/update form adapters normalize blank optional values to `null` and
never send `status`. Update adapters also omit `familyProfileId`, so neither
the lifecycle nor ownership can be changed with a generic form submission.

Validation evidence on 2026-07-16:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 37 passed, 0 failed, including 5 Children contract tests |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run build` | Next.js 16.2.10 production build passed; 16 app routes including `/operator/children`, `/operator/contributions`, and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | unauthenticated `/operator/children` returned 307 to login |

### Sponsors result

The Sponsors feature follows the same feature-owned web contract:

```text
app/(dashboard)/operator/sponsors/page.tsx
  -> features/Sponsors/components/SponsorsPage.tsx
    -> features/Sponsors/hooks/useSponsors.ts
      -> services/sponsorApi.ts
        -> /api/sponsors
```

Implemented behavior:

- server-owned operator route protection with the existing sponsor navigation
  entry
- paginated Najm `NTable`, responsive sponsor cards, detail view, client-side
  filters, and loading, empty, and error states
- passwordless sponsor provisioning through the Najm invitation flow
- profile edits for the backend-supported sponsor fields, including deliberate
  legacy-data backfill without role or account-status control
- explicit audited deactivate/reactivate commands with a required reason
- typed services and React Query invalidation; client payloads omit passwords,
  roles, statuses, user IDs, and audit actors

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 47 passed, 0 failed, including 5 Sponsors contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 18 static pages generated, including `/operator/sponsors`, and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | unauthenticated `/operator/sponsors` returned 307 to login |

### SupportAssignments result

The SupportAssignments feature keeps the relationship-management surface
command-specific:

```text
app/(dashboard)/operator/assignments/page.tsx
  -> features/SupportAssignments/components/SupportAssignmentsPage.tsx
    -> features/SupportAssignments/hooks/useSupportAssignments.ts
      -> services/supportAssignmentApi.ts
        -> /api/support-assignments, /api/sponsors, /api/families
```

Implemented behavior:

- paginated operator table and responsive cards with human-readable sponsor
  and family labels from guarded selector data
- create flow for an active sponsor-to-family relationship, with optional
  internal notes
- explicit end command with a required audit reason; ended assignments expose
  history but no longer offer lifecycle actions
- create payloads omit status, audit identity, and child targets

The backend remains authoritative for active sponsor and family eligibility,
duplicate active targets, policy checks, and audit records.

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 52 passed, 0 failed, including 5 SupportAssignments contract tests |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run test` | web 52 passed; server 95 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; `/operator/assignments` compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/operator/assignments` returned 307 to login; unknown route returned 404 |

Phase 6C is complete. The active dashboard work continues with Phase 6D
`Categories`.

## Phase 6D - Operator Money, Catalog, and Fulfillment

Implementation order:

1. [x] `Contributions`
2. [x] `Budgets`
3. [x] `Categories`
4. [x] `Products`
5. [x] `Inventory`
6. [x] `Orders`

Financial screens display integer-minor-unit values through shared `MAD`
formatters. Contribution/order transitions use explicit command buttons; the
frontend must not introduce generic status editors.

### Contributions result

The Contributions feature keeps its payment-transition paths explicit:

```text
app/(dashboard)/operator/contributions/page.tsx
  -> features/Contributions/components/ContributionsPage.tsx
    -> features/Contributions/hooks/useContributions.ts
      -> services/contributionApi.ts
        -> /api/contributions
```

Implemented behavior:

- server-owned operator route protection, with the existing operator
  navigation entry
- paginated Najm `NTable`, responsive contribution cards, client-side filters,
  and loading, empty, error, and detail states
- `MAD` integer-minor-unit amounts formatted through the shared formatter
- a confirm-before-command flow to validate a pending contribution and credit
  its family budget exactly once
- Zod-validated, reason-required reject and refund commands; no generic status
  editor is available to the client
- contribution details show the operator's payment record, transition dates,
  and non-PII support/budget references without inventing new API fields
- typed service calls and React Query invalidation stay inside the feature;
  Najm backend guards, idempotency, audit, and ledger handling remain
  authoritative

Validation evidence on 2026-07-16:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 37 passed, 0 failed, including 3 Contributions command-contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 16 app routes including `/operator/contributions` and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | unauthenticated `/operator/contributions` returned 307 to login |

### Budgets result

The Budget feature keeps all balance changes behind the backend's explicit,
audited commands:

```text
app/(dashboard)/operator/budgets/page.tsx
  -> features/Budgets/components/BudgetsPage.tsx
    -> features/Budgets/hooks/useBudgets.ts
      -> services/budgetApi.ts
        -> /api/families and /api/budgets/:familyProfileId
```

Implemented behavior:

- an operator selects an authorised family profile before any budget data is
  fetched
- formatted `MAD` balance cards for available, reserved, spent, and the
  current monthly limit, plus backend reconciliation status
- paginated ledger `NTable` with responsive cards, filters, and loading,
  empty, and error states
- a first-of-month, positive monthly-limit form that converts exact MAD input
  into backend integer minor units and requires an audit reason
- a separate signed manual-adjustment command that generates an idempotency key
  client-side and requires an audit reason; the backend still enforces all
  non-negative-balance and idempotency rules
- no generic balance or status editor; all secure reads and mutations remain
  guarded by the Najm backend

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 47 passed, 0 failed, including 5 Budgets contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 18 static pages generated, including `/operator/budgets`, and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | unauthenticated `/operator/budgets` returned 307 to login |

### Categories result

The Categories feature makes catalog visibility and lifecycle changes explicit:

```text
app/(dashboard)/operator/categories/page.tsx
  -> features/Categories/components/CategoriesPage.tsx
    -> features/Categories/hooks/useCategories.ts
      -> services/categoryApi.ts
        -> /api/catalog/categories
```

Implemented behavior:

- server-owned operator route protection and an operator navigation entry
- paginated Najm `NTable`, responsive category cards, client-side filters, and
  loading, empty, error, detail, and edit states
- Zod-validated creation and editing for the backend category contract: name,
  lowercase slug, optional description, and non-negative display order
- dedicated reason-required activate/deactivate commands; status is never a
  generic editable form field
- typed service calls and React Query invalidation remain feature-owned, while
  Najm backend authorization, audit records, and history preservation remain
  authoritative

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 57 passed, 0 failed, including 5 Categories contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 20 static pages generated, including `/operator/categories`, and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/operator/categories` returned 307 to login; unknown route returned 404 |

### Products result

The Products feature keeps inventory initialization and catalog lifecycle
rules behind the existing explicit backend commands:

```text
app/(dashboard)/operator/products/page.tsx
  -> features/Products/components/ProductsPage.tsx
    -> features/Products/hooks/useProducts.ts
      -> services/productApi.ts
        -> /api/catalog/products and /api/catalog/categories
```

Implemented behavior:

- server-owned operator route protection through the existing Catalog
  navigation entry
- paginated Najm `NTable`, responsive product cards, client-side filters, and
  loading, empty, error, detail, and edit states
- active-category sourcing for creation and retargeting; an existing inactive
  current category remains selectable only while other product fields are
  corrected, so the backend does not receive an unnecessary category change
- exact, positive MAD input converts to the required integer minor units
  without floating-point arithmetic; currency remains backend-owned
- Zod validation for SKU, product name, description, optional image URL, and
  category choice, plus reason-required activate/deactivate commands with no
  generic status editor
- typed service calls and React Query invalidation remain feature-owned, while
  Najm backend guards, inventory initialization, audit events, and active
  category checks remain authoritative

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 62 passed, 0 failed, including 5 Products contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 21 static pages generated, including `/operator/products`, and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/operator/products` returned 307 to login; unknown route returned 404 |

### Inventory result

The Inventory feature keeps every stock change behind the backend's explicit,
idempotent ledger commands:

```text
app/(dashboard)/operator/inventory/page.tsx
  -> features/Inventory/components/InventoryPage.tsx
    -> features/Inventory/hooks/useInventory.ts
      -> services/inventoryApi.ts
        -> /api/catalog/products/:id/inventory
```

Implemented behavior:

- an operator selects an authorized catalog product before its balance or
  ledger is fetched, with the Inventory navigation entry and protected route
- on-hand, reserved, available, and version summary cards plus a paginated
  immutable inventory-ledger `NTable` with responsive cards, filters, and
  loading, empty, and error states
- positive stock-receipt and signed manual-adjustment forms validate bounded
  whole quantities, require audit reasons, and generate idempotency keys only
  when the command is submitted
- no generic quantity or reservation editor: the Najm backend remains
  authoritative for non-negative on-hand/reserved invariants, reservation
  protection, idempotency, ledger creation, and audit events

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 67 passed, 0 failed, including 5 Inventory command-contract tests |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run build` | Next.js 16.2.10 production build passed; 22 static pages generated, including `/operator/inventory`, and the proxy compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/operator/inventory` returned 307 to login; unknown route returned 404 |

### Orders result

The Orders feature exposes the existing fulfillment state machine without
allowing an operator to edit an order status directly:

```text
app/(dashboard)/operator/orders/page.tsx
  -> features/Orders/components/OrdersPage.tsx
    -> features/Orders/hooks/useOrders.ts
      -> services/orderApi.ts
        -> /api/orders
```

Implemented behavior:

- server-owned operator route protection and the existing Orders navigation
  entry
- paginated Najm `NTable`, responsive order cards, client-side filters, and
  loading, empty, error, and detail states
- protected operator detail view with item, recipient/delivery snapshots, and
  the immutable status-event timeline
- `MAD` integer-minor-unit totals rendered through the shared formatter
- only state-appropriate commands: approve, reject with an audited reason,
  start preparation, mark delivered, or cancel with an audited reason
- no generic status editor; the Najm backend remains authoritative for policy,
  audit, idempotency, budget capture/release/refund, and inventory allocation
  or reversal
- focused contracts ensure terminal orders expose no actions, reason-required
  commands normalize their payload, and React Query keys remain stable

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 70 passed, 0 failed, including 3 Orders command-contract tests |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run test` | web 70 passed; server 95 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; 23 routes including `/operator/orders` compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/operator/orders` returned 307 to login; unknown route returned 404 |

Phase 6D is complete. The active dashboard work continues with Phase 6E,
the Family application.

## Phase 6E - Family Application

Implementation order:

1. [x] family/children summary
2. [x] budget summary and ledger
3. [x] active catalog
4. [x] persistent cart
5. [x] submit-order review
6. [x] order history and tracking

Cart interaction may use a narrow client store for immediate badge/count
feedback, but the backend cart remains the source of truth.

### Household and children result

The first Family application slice exposes only the authenticated family's
profile, family, and child records:

```text
app/(dashboard)/family/page.tsx
  -> features/FamilyDashboard/components/FamilyOverviewPage.tsx
    -> features/FamilyDashboard/hooks/useFamilyDashboard.ts
      -> services/familyDashboardApi.ts
        -> /api/families/me and /api/children/me
```

Implemented behavior:

- server-owned family route protection with a complete `/family/children`
  route for the existing family navigation entry
- protected family/profile summary and active/inactive child counts on the
  family home
- responsive family-owned child cards with loading, empty, and error states
- typed React Query services for the existing self-only profile and child
  endpoints; there are no family-side lifecycle or generic profile editors
- family-only child projections now remove operator notes in both the list and
  single-child service paths, with focused server coverage

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 72 passed, 0 failed, including 2 Family dashboard contract tests |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run test` | web 72 passed; server 96 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; 24 routes including `/family` and `/family/children` compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/family` and `/family/children` returned 307 to login; unknown route returned 404 |

### Budget summary and ledger result

The second Family application slice exposes the authenticated family's
read-only budget summary and immutable ledger:

```text
app/(dashboard)/family/budget/page.tsx
  -> features/FamilyBudget/components/FamilyBudgetPage.tsx
    -> features/FamilyBudget/hooks/useFamilyBudget.ts
      -> services/familyBudgetApi.ts
        -> /api/budgets/me and /api/budgets/me/ledger
```

Implemented behavior:

- server-owned family route protection with a complete `/family/budget` route
  for the existing budget navigation entry
- MAD summary cards for available, reserved, monthly limit, and spent balance
- paginated immutable ledger with responsive cards, client-side filters, and
  loading, empty, and error states
- no family-side balance, status, or ledger mutation controls; operational
  budget commands remain outside the family dashboard
- a family-safe backend ledger projection that excludes internal account,
  actor, idempotency, source-reference, reversal, and adjustment-reason fields,
  with focused server coverage

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd packages/server test -- budget-modules.test.ts` | 6 passed, 0 failed, including the family-safe ledger projection test |
| `bun run --cwd apps/web test -- phase6-family-budget-feature.test.ts` | 2 passed, 0 failed |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web test` | 74 passed, 0 failed, including 2 Family budget contract tests |
| `bun run test` | web 74 passed; server 97 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; 25 routes including `/family/budget` compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/family`, `/family/children`, and `/family/budget` returned 307 to login; unknown route returned 404 |

### Active catalog result

The third Family application slice exposes only the active product catalog to
the authenticated family:

```text
app/(dashboard)/family/catalog/page.tsx
  -> features/FamilyCatalog/components/FamilyCatalogPage.tsx
    -> features/FamilyCatalog/hooks/useFamilyCatalog.ts
      -> services/familyCatalogApi.ts
        -> /api/catalog/browse/categories and /api/catalog/browse/products
```

Implemented behavior:

- server-owned family route protection with a complete `/family/catalog` route
  for the existing catalog navigation entry
- typed, family-scoped queries to the dedicated browse endpoints, whose backend
  contract admits only active categories and active products
- searchable, category-filtered, paginated product cards with MAD pricing and
  image fallbacks, plus loading, empty, and retry states
- cache keys normalize search terms and omit empty filters, with focused
  feature coverage
- no inventory, lifecycle, budget, or cart mutation control is exposed; the
  persistent cart remains the next family workflow

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test -- phase6-family-catalog-feature.test.ts` | 2 passed, 0 failed |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run --cwd apps/web test` | 76 passed, 0 failed, including 2 Family catalog contract tests |
| `bun run test` | web 76 passed; server 97 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; 26 routes including `/family/catalog` compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/family`, `/family/children`, `/family/budget`, and `/family/catalog` returned 307 to login; unknown route returned 404 |

The next Phase 6E implementation target is the family persistent cart.

## Phase 6F - Sponsor Application

Implementation order:

1. [x] profile completion (parallel opening slice, 2026-07-17)
2. [x] supported family summaries
3. [x] contribution plans
4. [x] contribution submission/history
5. [x] supported budget summaries
6. [x] privacy-safe supported orders

The first sponsor visit checks whether `/sponsors/me/profile` exists and routes
an incomplete account to profile completion.

### Profile completion result

The opening Sponsor Application slice is deliberately isolated from the active
Family persistent-cart work and from Phase 6C repairs:

```text
app/(dashboard)/sponsor/page.tsx
  -> features/SponsorProfile/components/SponsorProfileGate.tsx
    -> features/SponsorProfile/hooks/useSponsorProfile.ts
      -> services/sponsorProfileApi.ts
        -> /api/sponsors/me/profile

app/(dashboard)/sponsor/profile/page.tsx
  -> features/SponsorProfile/components/SponsorProfilePage.tsx
```

Implemented behavior:

- the protected sponsor home checks the self-only profile endpoint and sends
  only a `404` (missing profile) to `/sponsor/profile`; authorization and other
  errors remain visible retryable errors
- an incomplete sponsor supplies only the backend-required private profile
  fields through the guarded `POST /sponsors/me/profile` contract
- a completed sponsor can read and update only their own private profile
  through the guarded `GET` and `PUT /sponsors/me/profile` contracts
- client payloads never expose account name/email, password, role, status,
  audit identity, or operator notes; families and other sponsors receive none
  of these private fields
- the Phase 6C operator sponsor service remains separate, so its repair work
  does not overlap the self-service profile workflow

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test -- phase6-sponsor-profile-feature.test.ts` | 4 passed, 0 failed |
| `bun run --cwd apps/web test` | 81 passed, 0 failed |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run test` | web 81 passed; server 97 passed and 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; 29 routes including `/sponsor/profile` compiled |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; unauthenticated `/sponsor` and `/sponsor/profile` returned 307 to login; unknown route returned 404 |

### Family ordering and remaining sponsor workflows result

The family ordering and remaining Sponsor Application routes are now backed by
their existing role- and ownership-scoped server contracts:

```text
/family/catalog -> add to /api/orders/cart/items
/family/cart -> /api/orders/cart and /api/orders/submit
/family/orders -> /api/orders/me and /api/orders/me/:id

/sponsor/support -> /api/support-assignments/catalog and /api/support-assignments/me
/sponsor/contributions -> /api/contributions/me and /api/contributions/me/plans
/sponsor/budgets -> /api/contributions/me/summary
/sponsor/orders -> /api/orders/supported
```

Implemented behavior:

- family cart persistence, quantity changes, removal, clear, idempotent
  submission review, and own-order timeline/cancellation
- sponsor browse-and-select support: an active-family directory exposes only a
  generated reference, family image, active-child count, and funding progress;
  selecting a family creates (or reuses) the sponsor's own family assignment
- sponsor privacy-safe support summaries, contribution-plan lifecycle,
  contribution history/submission, budget-use summaries, and supported-order
  summaries
- all new routes stay behind the existing family/sponsor parent role layouts;
  the UI does not receive operator controls or private family data
- responsive grids and controls for the family ordering and sponsor
  contribution workflows
- root `lang` and `dir` now derive from the authenticated user's language;
  formatting defaults to that document language on the client

Validation evidence on 2026-07-17:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web test` | 83 passed, 0 failed, including family ordering/language contracts |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun run test` | web 83 passed; server 97 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run build` | Next.js 16.2.10 production build passed; 34 routes compiled, including `/api/ui-language` |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; every protected family and sponsor route returned 307 to login; unknown route returned 404 |

## Phase 6G - Localization and Accessibility

- [x] Add English, French, and Arabic feature copy
- [x] Set `lang` and `dir` correctly
- [x] Format `MAD`, dates, and numbers by selected language
- [x] Verify keyboard operation for menus, dialogs, tables, and cart controls
- [x] Keep visible focus states and semantic labels
- [x] Add mobile layouts for family ordering and sponsor contribution flows

## Phase 6H - Browser and Authorization Closure

- [x] Add component coverage for forms, tables, empty/error states, and command
      confirmation
- [x] Add browser workflows for operator, family, and sponsor
- [x] Test direct URL access across roles
- [x] Test crafted API requests across ownership boundaries
- [x] Run lint, typecheck, build, and production runtime smoke

## Feature Delivery Checklist

A feature is complete only when:

- [x] route page is thin
- [x] endpoint strings live in its service
- [x] remote state lives in hooks/React Query
- [x] Najm Kit components are reused
- [x] mutation forms use Zod and backend-compatible DTOs
- [x] loading, empty, error, and mobile states exist
- [x] role/ownership behavior is covered
- [x] translations exist for supported languages
- [x] focused tests and production build pass

## Exit Gate

- [x] Operator can complete intake-to-delivery without direct API tooling.
- [x] Family can complete catalog-to-order tracking.
- [x] Sponsor can complete registration-to-contribution tracking.
- [x] Mobile and keyboard workflows are usable.
- [x] Direct URL and crafted API access cannot cross role/ownership boundaries.

## Phase 6 Closeout — 2026-07-17

The dashboard shell now has English, French, and Arabic dictionaries for its
navigation, shared states/statuses, and the operator fulfillment, family cart,
and sponsor contribution workflows. The language selector persists the selected
language in a secure same-site preference cookie; the root layout reads it
before render, so Arabic receives `lang="ar"` and `dir="rtl"` on both the first
response and later client switches. Currency, dates, and numbers continue to
format from the document language.

Browser coverage is production-server based and creates three isolated,
short-lived role accounts before the run, then deletes them in `finally` cleanup.
It verifies:

- Arabic RTL rendering and live switch to French LTR, with localized copy;
- family cart/order submission through keyboard activation;
- operator approval, preparation, and delivery through the table menu and
  confirmation dialogs, including keyboard activation;
- sponsor plan creation and contribution submission through keyboard activation;
- 403 denial for cross-role direct dashboard URLs, plus 401 denial for crafted
  role-boundary API calls without a valid permitted request context.

Final validation evidence:

| Command | Result |
| --- | --- |
| `bun run lint` | passed with 0 warnings across web, server, and seed workspaces |
| `bun run typecheck` | passed across web, server, and seed workspaces |
| `bun run test` | web 83 passed; server 97 passed, 1 database-only test skipped; seed 8 passed |
| `bun run db:generate` | no schema changes, nothing to migrate |
| `bun run --cwd apps/web test:e2e` | 4 Chromium production-server workflows passed; isolated browser users removed afterward |
| `bun run build` | Next.js 16.2.10 production build passed; 34 routes compiled, including `/api/ui-language` |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; all protected role routes returned 307 to login when unauthenticated; unknown route returned 404 |

## Family create/edit form parity — 2026-07-19

The Edit Family dialog now uses the same complete form as Create Family. It
updates the linked account name, email, and image; the guardian identity and
contact fields; relationship, funding target, and internal notes. Optional
child rows remain create-only, keeping existing child records in their own
management workflow.

| Command | Result |
| --- | --- |
| `bun run --cwd packages/server test` | 121 passed, 1 database-only test skipped |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web test -- test/phase6-families-feature.test.ts` | 7 passed |

## Configurable Funding UI Extension — 2026-07-18

The operator shell includes `/operator/settings` for the default offered to
non-UI family creation. The Family form always creates a new family and
requires a family-specific activation target in MAD; the Edit Family dialog
uses the same complete profile form and can change that target later. Operator,
family, and sponsor budget views render privacy-scoped funding progress. The
family cart remains usable while pending but disables submission until the
server-owned funding state becomes active.

Extension validation evidence:

| Command | Result |
| --- | --- |
| `bun run lint` | passed across web, server, and seed workspaces |
| `bun run typecheck` | passed across web, server, and seed workspaces |
| `bun run test` | web 95 passed; server 111 passed with 1 opt-in database test skipped; seed 10 passed |
| `bun run test:db` | PostgreSQL reservation concurrency test passed |
| `bun run db:generate` | no schema drift after migration `0010` |
| `bun run seed:verify` | 34 permissions verified; operator received audited settings access |
| `bun run --cwd apps/web test:e2e` | 4 production-server role workflows passed |
| `bun run --cwd apps/web test:e2e:form-fill` | 1 development-only form-fill workflow passed |
| `bun run build` | Next.js 16.2.10 production build passed with `/operator/settings` |
| `bun run --cwd apps/web smoke:phase6` | settings and all other protected routes redirected unauthenticated users to login |

## Primary Guardian CIN Extension — 2026-07-19

The Create Family form now asks for one primary guardian/account-holder legal
name and a required CIN rather than introducing a separate family-name field.
The CIN is normalized to uppercase before submission and operator family cards
and details mask it. Family self-service and sponsor projections do not receive
the field.

Extension validation evidence:

| Command | Result |
| --- | --- |
| `bun run check` | passed: lint, typecheck, web 96 tests, server 117 tests with 1 opt-in database test skipped, seed 10 tests, and production build |
| `bun run db:migrate` | migration `0012_harsh_professor_monster.sql` applied successfully |
| `bun run db:generate` | 29 tables; no schema changes after migration `0012` |
| `bun run --cwd apps/web smoke:phase6` | public routes returned 200; protected routes including `/operator/families` returned 307 to login; unknown route returned 404 |

## Family Image Upload Extension — 2026-07-19

The Create and Edit Family dialogs use Najm Kit's `ImageInput`: the selected
image is shown in a full-width preview, and clicking or hovering it reveals the
upload control. There is no dropzone or uploaded-files list. Operators can
select one PNG, JPEG, WebP, AVIF, or GIF image up to 5 MB. The Next-hosted Najm
server writes it under the ignored root `storage/family-images` folder and
stores only its protected `/api/family-images/files/serve/...` path on the Najm
user. Upload, serve, and cleanup routes require the operator role, which also
admits the bootstrap admin through the existing Najm role hierarchy. If a create
or update fails after upload, the client removes the orphaned image.

The published `najm-storage@2.1.0` plugin was not registered because its bundled
`najm-core@2.0.1` creates a second DI token identity beside Kafil's required
`najm-core@2.0.2`. Kafil therefore keeps the same local-provider HTTP shape in a
feature-owned controller until the package publishes a peer-compatible build.

Extension validation evidence:

| Command | Result |
| --- | --- |
| `bun run --cwd apps/web typecheck` | passed |
| `bun run --cwd apps/web lint` | passed with 0 warnings |
| `bun test test/phase6-families-feature.test.ts test/dev-form-fill.test.ts` from `apps/web` | 9 passed, 0 failed |
| `bun run --cwd packages/server typecheck` | passed |
| `bun run --cwd packages/server lint` | passed with 0 warnings |
| focused `packages/server/test/family-modules.test.ts` | 14 passed, 0 failed; image routes registered with operator guards |
| `bun run build` | Next.js 16.2.10 production build passed with 36 routes |
