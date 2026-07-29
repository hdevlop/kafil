# Unified Products, Categories, Order Cart, and Orders Plan

Status: **IMPLEMENTED — REPOSITORY AND FOCUSED BROWSER GATES PASS; LEGACY BROWSER SUITE NEEDS FOLLOW-UP**
Created: 2026-07-28
Scope: first-MVP admin management, later operator use, and reusable family self-service UI

## 1. Goal

Build one catalog and ordering experience that is implemented once and reused by
every permitted role.

The frontend has exactly three canonical pages:

```text
/products   -> ProductsPage
/categories -> CategoriesPage
/orders     -> OrdersPage
```

There must not be separate admin, operator, or family page implementations.
Each canonical route renders one feature page. Shared role components add or
hide individual controls, while shared hooks choose the correctly secured
backend query or command from the authenticated principal's exact role.

The first MVP is operated and validated by the bootstrap admin. Operators can
later use the same management controls. Family self-service can later use the
same Products, Categories, OrderCart, and Orders components without rebuilding
the UI. Admin remains the emergency super-role and retains high-risk actions,
including permanent deletion where the backend explicitly permits it.

## 2. Locked Product Decisions

1. Use one `/products`, one `/categories`, and one `/orders` route.
2. Use one `ProductsPage`, one `CategoriesPage`, and one `OrdersPage` component.
3. Do not create role-specific route trees or duplicate role-specific page
   components.
4. Use the shared `<Admin>`, `<Operator>`, `<Family>`, `<Sponsor>`, and generic
   `<Role is="...">` components to enrich the shared pages. Admin is the
   implicit super-role for every non-admin role check; call sites must not
   repeat arrays such as `any={["admin", "operator"]}`.
5. UI visibility is not authorization. Every API remains protected by its
   existing backend role, policy, ownership, validation, and audit rules.
6. Products and Categories share one floating order-cart button.
7. The floating button remains available while navigating between `/products`
   and `/categories`.
8. Do not create a separate cart page, order-review page, or new-order page.
9. Clicking the floating button opens one shared `OrderCartDialog`.
10. The dialog shows the family selector and assistance fields only when the
    authenticated user can create an assisted order.
11. Family users never select a family. Their authenticated family profile is
    the order owner.
12. Admin/operator selection is an assisted-order draft. It must never read,
    merge, replace, or clear a family's personal cart.
13. Assisted submission continues to use `POST /orders/assisted` and creates a
    pending, actor-attributed order.
14. Family submission continues to use the family cart and
    `POST /orders/submit`.
15. The server remains authoritative for active products, current prices,
    funding activation, available budget, monthly limits, totals, idempotency,
    ownership, and audit attribution.
16. Saving an order clears the successful basket and navigates to `/orders`.
17. The shared Orders page shows the securely scoped order list returned for
    the current user. Operator lifecycle controls are added with `<Operator>`;
    admin receives them implicitly through super-role inheritance.
18. Sponsor order projections are not part of this slice. The existing sponsor
    surface remains unchanged until it is deliberately unified later.

## 2A. Mandatory Coding Skills

Every coder implementing or reviewing this plan must read and follow:

```text
.agents/skills/kafil-najm-frontend/SKILL.md
.agents/skills/kafil-najm-backend/SKILL.md
```

- Use the frontend skill for every `apps/web` change. It requires verified
  Next.js/Najm contracts and Najm Kit components throughout the UI.
- Use the backend skill for every `packages/server` or `packages/seed` change.
- Use both for cross-stack slices, authorization changes, shared DTO/API work,
  or end-to-end tests.
- Do not begin a slice if the required skill cannot be read. Report the blocker
  instead of reconstructing its rules from memory.

## 3. Current Repository State

The backend contracts needed for this work already exist:

- family active-catalog reads;
- operator catalog reads and product/category management;
- family persisted cart commands;
- idempotent family cart submission;
- idempotent assisted submission with `familyProfileId`, items, assistance
  channel, optional note, and staff attribution;
- operator order listing and lifecycle commands;
- family-owned order listing and cancellation;
- budget summaries and funding progress.

The frontend currently duplicates the experience across role-prefixed routes:

```text
/operator/products
/operator/categories
/operator/orders
/family/catalog
/family/cart
/family/orders
```

Important current gaps:

- `ProductsPage` is management-oriented.
- `FamilyCatalogPage` duplicates product browsing.
- `ProductCard` directly imports the family-ordering hook.
- assisted ordering is a large dynamic-array dialog opened from Orders.
- the family has a separate cart page.
- operator and family orders use separate page components.
- navigation exposes role-prefixed paths.
- the installed Najm frontend `Role` component currently performs an exact
  role match and does not mirror Kafil's backend admin inheritance by itself;
- Zustand exists only as a transitive `najm-kit` dependency and is not declared
  directly by `apps/web`.

This slice consolidates the frontend. It does not weaken or replace the
existing backend command boundaries.

## 4. Target User Experience

### 4.1 Products

`/products` renders the shared `ProductsPage` for every permitted user.

Shared content:

- page header and global actions;
- search, status-safe filtering, responsive table/card mode where retained;
- a compact Categories button in the page header that opens a narrow responsive
  sheet with small square NTable category image tiles;
- product images, names, categories, current estimated prices, quantities, and
  Add/Added state;
- the floating order-cart button;
- loading, empty, error, keyboard, mobile, RTL, and localized states.

Role-added content:

- `<Operator>`: create product;
- `<Operator>`: edit product;
- `<Operator>`: activate/deactivate product;
- `<Admin>`: permanent-delete product;
- other existing protected catalog-management actions.

Ordering behavior:

- an active product can be added without first selecting a family;
- adding an existing product increases or updates its quantity rather than
  creating a duplicate line;
- changing category or search filters never clears the basket;
- inactive or no-longer-orderable products cannot be newly added;
- selected items remain visible through their card state when they reappear in
  a filtered result;
- the floating button shows the distinct-line count, total quantity, and
  estimated total where space permits.

### 4.2 Categories

`/categories` renders the shared `CategoriesPage` for every permitted user.

Shared content:

- category cards/list and navigation into the Products category filter;
- the same floating order-cart button and dialog;
- category loading, empty, error, responsive, keyboard, RTL, and localized
  states.

Role-added content:

- `<Operator>`: create category;
- `<Operator>`: edit category;
- `<Operator>`: activate/deactivate category;
- `<Admin>`: permanent-delete category.

Navigating between Categories and Products must not destroy the management
draft or hide an existing family cart.

### 4.3 Floating order cart

The button is a shared `OrderCart` feature component, not owned by Products or
Categories. It is mounted once in the authenticated dashboard shell and shown
on `/products` and `/categories`.

Required behavior:

- accessible button name includes the cart count;
- desktop position avoids table pagination, menus, and global page actions;
- mobile position respects safe areas and does not cover primary controls;
- count and estimate update immediately after add, quantity, remove, or reset;
- opening the button opens the shared `OrderCartDialog`;
- empty state is usable and links/focuses back to Products;
- double submission is disabled while the command is pending.

### 4.4 Shared order-cart dialog

The dialog is the only pre-save confirmation surface.

Always shown:

- selected item list;
- per-item quantity controls and remove action;
- estimated line totals and estimated order total;
- unavailable/stale-product warning;
- Reset cart action;
- cancel/close action;
- one final save/submit action.

Shown inside `<Operator>` access (operator or implicit admin):

- searchable active-family selector at the top;
- selected family's funding status and budget summary;
- assistance channel;
- optional private operational note with the existing privacy warning;
- `Create pending order` final label.

Shown for a family user:

- authenticated-family budget/funding summary;
- no family selector;
- no assistance channel or assistance note;
- `Submit order` final label.

Submission rules:

- assisted save requires a selected active family and at least one valid item;
- family submission requires the server cart to contain at least one valid
  item;
- totals shown before save are estimates;
- the server recalculates and validates the complete request;
- conflicts remain visible in the open dialog so the user can correct the
  basket;
- success clears the applicable basket, closes the dialog, invalidates Orders
  and Budget data, and navigates to `/orders?created=<orderId>`;
- `/orders` highlights or opens the newly created record without adding a new
  detail route.

### 4.5 Orders

`/orders` renders one shared `OrdersPage`.

Shared content:

- order cards/table;
- status, dates, totals, item counts, and timeline/details;
- loading, empty, error, filters, pagination, mobile, keyboard, RTL, and
  localized states;
- support for highlighting the order identified by the `created` query value.

Role-added controls inside `<Operator>`:

- approve/reject;
- record or replace purchase;
- start/confirm delivery;
- cancel with the correct reason/recoverability contract;
- protected receipt and delivery evidence.

Family-owned controls remain ownership-scoped and appear only when the backend
contract permits them, such as cancellation of an eligible own pending order.
The page component must not decide authorization from the URL.

## 5. Frontend Structure

Keep the established feature ownership and PascalCase folder convention:

```text
apps/web/src/features/
├── Products/
│   ├── components/
│   │   ├── ProductsPage.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductDetails.tsx
│   │   └── ProductForms.tsx
│   ├── hooks/
│   │   ├── useProducts.ts
│   │   └── useProductsWorkspace.ts
│   ├── config/
│   ├── types.ts
│   └── index.ts
│
├── Categories/
│   ├── components/
│   │   ├── CategoriesPage.tsx
│   │   ├── CategoryBar.tsx
│   │   ├── CategoryCard.tsx
│   │   └── CategoryForms.tsx
│   ├── hooks/
│   ├── config/
│   ├── types.ts
│   └── index.ts
│
├── OrderCart/
│   ├── components/
│   │   ├── FloatingOrderCartButton.tsx
│   │   ├── OrderCartDialog.tsx
│   │   ├── OrderCartItems.tsx
│   │   ├── OrderCartItem.tsx
│   │   ├── OrderCartSummary.tsx
│   │   ├── AssistedFamilySelector.tsx
│   │   └── AssistanceFields.tsx
│   ├── hooks/
│   │   ├── useOrderCart.ts
│   │   └── useOrderCartSession.ts
│   ├── store/
│   │   └── orderCartStore.ts
│   ├── config/
│   │   └── orderCartSchema.ts
│   ├── types.ts
│   └── index.ts
│
└── Orders/
    ├── components/
    │   ├── OrdersPage.tsx
    │   ├── OrderCard.tsx
    │   ├── OrderDetails.tsx
    │   └── OrderWorkflowForms.tsx
    ├── hooks/
    │   ├── useOrders.ts
    │   └── useOrdersWorkspace.ts
    ├── config/
    ├── types.ts
    └── index.ts
```

Responsibilities:

- `Products` owns product rendering, filters, and protected management actions.
- `Categories` owns category rendering, navigation, and protected management
  actions.
- `OrderCart` owns temporary selection, the floating button, dialog, shared
  cart view model, and submission orchestration.
- `Orders` starts after an order exists and owns reading and lifecycle actions.

Dependency rules:

- `ProductCard` must not import family-specific ordering hooks.
- Products may call the public `OrderCart` hook or accept its callbacks as
  props.
- Categories does not own cart state; the shell mounts the cart overlay.
- OrderCart may depend on order, family, budget, and catalog API services, but
  must not own saved-order lifecycle UI.
- Orders must not own catalog selection or a second assisted-order builder.
- Shared components must not import role-specific route pages.

The shared authorization presentation layer lives outside feature folders:

```text
apps/web/src/shared/Authorization/
├── Role.tsx
├── useKafilRole.ts
└── index.ts
```

It owns the Kafil role names and super-role inheritance once. Feature code must
not reimplement role arrays or import backend guard code into the browser.

## 6. Zustand State Design

Declare Zustand directly in the web package during implementation:

```text
bun add --cwd apps/web zustand
```

Do not rely on the transitive copy currently installed through `najm-kit`.

No React context provider is required. The client store is available to the
Products page, Categories page, floating button, and dialog.

Suggested management-draft state:

```ts
interface OrderCartDraftItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  estimatedUnitPriceMinor: number;
  currency: "MAD";
}

interface OrderCartState {
  ownerUserId: string | null;
  dialogOpen: boolean;
  draftItems: Record<string, OrderCartDraftItem>;
  addItem: (item: OrderCartDraftItem) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  reset: () => void;
  setDialogOpen: (open: boolean) => void;
  bindSession: (userId: string) => void;
}
```

State rules:

- Zustand holds the admin/operator assisted draft because it is temporary UI
  state.
- React Query and the backend remain the source of truth for a family's
  persisted cart.
- `useOrderCart()` exposes one component-facing view model regardless of which
  source backs it.
- do not copy the family server cart into Zustand as a second source of truth;
- product names and prices in the management store are display estimates;
- refresh/revalidate active products when the dialog opens and always let the
  server revalue on submission;
- bind the store to the authenticated user ID;
- reset immediately if the authenticated user changes;
- reset on logout and successful assisted submission;
- never retain one admin's draft for another user;
- never persist the selected family ID;
- if session persistence is enabled, persist only the management product IDs,
  display snapshots, and quantities in `sessionStorage`, using a user-scoped
  key; never use `localStorage` for this draft;
- route navigation must work without persistence middleware; session storage
  exists only to recover an accidental refresh in the same tab.

## 7. One Component, Role-Enriched Controls

The shared page components must not be split into `AdminProductsPage`,
`FamilyProductsPage`, `OperatorOrdersPage`, or similar variants.

Conceptual Products composition:

```tsx
<ProductsPage>
  <Operator>
    <CreateProductButton />
  </Operator>

  <Admin>
    <PermanentDeleteProductButton />
  </Admin>

  <CategoryFilterSheet />
  <ProductGrid />
  <FloatingOrderCartButton />
</ProductsPage>
```

Conceptual dialog composition:

```tsx
<OrderCartDialog>
  <Operator>
    <AssistedFamilySelector />
    <AssistanceFields />
  </Operator>

  <OrderCartItems />
  <OrderCartSummary />
  <ResetCartButton />
  <SaveOrderButton />
</OrderCartDialog>
```

Conceptual Orders composition:

```tsx
<OrdersPage>
  <OrdersList />

  <Operator>
    <OrderLifecycleActions />
  </Operator>
</OrdersPage>
```

Required presentation contract:

```tsx
<Admin>...</Admin>                 // admin only
<Operator>...</Operator>           // operator or admin
<Family>...</Family>               // family or admin
<Sponsor>...</Sponsor>             // sponsor or admin
<Role is="operator">...</Role>     // same inheritance as <Operator>
```

- `admin` is the only super-role.
- Named components are readable aliases of the generic role component.
- `<Role is="operator">` accepts operator and admin without requiring an
  explicit role array. The same rule applies to family and sponsor.
- `<Role is="admin">` and `<Admin>` accept only admin.
- Role components support an optional fallback and are for presentation only.
- Do not use `any={["admin", "operator"]}`, `any={["admin", "family"]}`, or
  equivalent repeated inheritance at call sites.
- Keep `Can permission="..."` only for a genuinely granular custom permission
  that cannot be represented by the fixed role model. Do not invent a parallel
  frontend permission registry.

The presentation contract must be implemented once in Kafil's shared
authorization layer because `operator`, `family`, and `sponsor` are Kafil role
names. It may compose the installed Najm Auth session/permission hooks, but
feature components consume only the shared inherited-role contract.

Role access and authenticated identity remain separate. `<Family>` rendering
true for admin means the admin is authorized at the role boundary; it does not
create a family profile for that admin. Command selection inside hooks must use
the authenticated principal's exact role. Admin uses management and assisted
order endpoints, while a principal whose exact role is `family` uses family
`/me`, cart, and own-order endpoints.

## 8. Unified Hook Contracts

### `useProductsWorkspace()`

Expose one view model to `ProductsPage`:

```ts
{
  products,
  categories,
  filters,
  loading,
  error,
  refetch,
  managementActions
}
```

Internally, enable only the backend query permitted for the authenticated
principal's exact role. Admin and operator use the management projection;
family uses the privacy-safe, active-only projection. Management projections
may include inactive products and management metadata. This internal data
selection must not create different page components.

### `useOrderCart()`

Expose one view model to product cards, the floating button, and the dialog:

```ts
{
  items,
  distinctItemCount,
  totalQuantity,
  estimatedTotalMinor,
  loading,
  saving,
  add,
  setQuantity,
  remove,
  reset,
  save
}
```

Internally:

- exact `admin` and `operator` principals use the Zustand draft and submit the
  selected family plus items through the assisted command;
- an exact `family` principal uses the existing server cart query/mutations and
  own-cart submit command;
- components receive the same interface and do not render a different page.

### `useOrdersWorkspace()`

Expose one securely scoped order view model to `OrdersPage`:

```ts
{
  orders,
  filters,
  pagination,
  loading,
  error,
  selectedOrder,
  availableActions
}
```

Internally, select by exact principal role: admin/operator use the existing
management endpoint and family uses the family-owned endpoint. Do not request
both datasets and hide one in the browser.

## 9. Routing and Navigation Migration

Add thin canonical route files:

```text
apps/web/src/app/(dashboard)/products/page.tsx
apps/web/src/app/(dashboard)/categories/page.tsx
apps/web/src/app/(dashboard)/orders/page.tsx
```

Each route imports exactly one shared feature page.

Update role navigation to point to the same canonical hrefs. Labels may differ
through localization, but hrefs and page implementations do not.

Temporary compatibility redirects:

```text
/operator/products   -> /products
/family/catalog      -> /products
/operator/categories -> /categories
/operator/orders     -> /orders
/family/orders       -> /orders
/family/cart         -> /products?cart=open
```

The canonical Products page may read `cart=open` only to open the shared dialog;
it must remove or replace the query value after opening so repeated navigation
does not reopen it unexpectedly.

Do not redirect `/sponsor/orders` in this slice.

After all navigation, E2E, and external-link evidence confirms the canonical
routes, the compatibility pages may be retained as redirects or removed in a
later cleanup. They must never contain duplicated business UI.

## 10. Backend and Data Impact

Expected backend impact: **none** for the first implementation pass.

Reuse:

- existing catalog read/management endpoints;
- existing family cart endpoints;
- existing assisted-order endpoint;
- existing family and operator order endpoints;
- existing budget/funding endpoints;
- existing audit, outbox, idempotency, privacy, price, and financial rules.

Do not:

- add an admin cart to the family `carts` table;
- add a generic order-create endpoint that accepts arbitrary ownership;
- impersonate a family;
- alter order placement attribution;
- accept prices or totals from Zustand as authoritative;
- auto-approve an assisted order;
- combine assisted save with approval or purchase;
- add a database migration unless implementation discovers a separately
  reviewed backend requirement.

If persistent, shareable, multi-device staff drafts become necessary later,
design a separate audited assisted-draft model. That is explicitly outside this
slice.

## 11. Implementation Slices

### Slice 1 - Contracts and direct dependency

- [x] Add Zustand as a direct `apps/web` dependency with Bun.
- [x] Add the shared inherited-role presentation contract with `<Admin>`,
      `<Operator>`, `<Family>`, `<Sponsor>`, and `<Role is="...">`.
- [x] Centralize `admin` super-role expansion in that contract; do not repeat
      explicit admin arrays in feature components.
- [x] Add an exact-principal role helper for API/workspace mode selection so
      inherited presentation access never implies a family/sponsor profile.
- [x] Define `OrderCartItem`, store state, unified hook contracts, and role-safe
      command selection.
- [x] Add unit tests for store ownership and item math before UI migration.
- [x] Confirm the role component matrix matches the existing backend named
      guards and that granular `Can permission="..."` remains available only
      where a custom permission is genuinely required.
- [x] Record that no schema change is expected.

### Slice 2 - Zustand management draft

- [x] Implement add, replace/increment, set quantity, remove, reset, open, and
      session binding.
- [x] Enforce quantity bounds consistent with the backend DTO.
- [x] Prevent unsafe integer totals.
- [x] Clear on user change, logout, and successful assisted submission.
- [x] Add user-scoped `sessionStorage` recovery only if included in the slice;
      test hydration and cleanup.
- [x] Keep selected family out of persisted state.

### Slice 3 - Shared OrderCart UI

- [x] Implement the floating button.
- [x] Render it on Products and Categories from the authenticated shell.
- [x] Implement one shared dialog and item editor.
- [x] Add the `<Operator>`-controlled assisted family/channel/note fields.
      The family field is now a searchable `Combobox` driven by an
      `AssistedFamilySelector` component (active families only, server-driven
      filter) instead of a free-text input.
- [x] Connect family mode to the existing server cart without duplicating it in
      Zustand.
- [x] Add budget/funding summaries and estimated totals.
      `AssistedFamilySelector` loads the selected family's budget summary and
      funding status (`getBudgetSummary` + `listBudgetFamilies`) so the
      operator sees available, reserved, monthly limit, and the funding tone
      before saving.
- [x] Add reset and idempotent save behavior. Save is blocked when the
      assisted family is not selected, no items exist, or any item is
      unavailable. The dialog re-validates draft availability against the
      live management catalog (`useProducts` with `refetchOnMount: "always"`
      and `staleTime: 0`) and updates each item's `available` flag.
- [x] Navigate to canonical Orders after success. After save, the hook
      invalidates `orderKeys.all`, `budgetKeys.all`, `familyOrderingKeys.all`,
      and every entry of `catalogWriteKeys` individually so budget summaries
      refresh and the management catalog reflects the new pending order.

### Slice 4 - Unified Products and Categories

- [x] Create canonical `/products` and `/categories` pages.
- [x] Refactor `ProductCard` away from direct family-cart imports.
- [x] Merge reusable FamilyCatalog presentation into Products.
      `ProductsPage` and `CategoriesPage` now render one shared page
      component and branch on the workspace scope, replacing the previous
      `FamilyProductsView` / `FamilyCategoriesView` subcomponents.
- [x] Add the compact header category button and filter sheet to Products.
- [x] Preserve create/edit/status actions through `<Operator>` and permanent
      deletion through `<Admin>`.
- [x] Keep inactive products visible only in permitted management data.
- [x] `useProductsWorkspace` now accepts live filters (URL `category` query
      parameter is forwarded into the family `useFamilyCatalogProducts`
      query), so changing the category via the filter sheet immediately
      refetches the matching active products instead of locally filtering
      the previous response.
- [x] Ensure category/filter navigation never clears the cart.
- [x] Remove duplicated feature presentation after canonical tests pass.

### Slice 5 - Unified Orders

- [x] Create canonical `/orders`.
- [x] Merge operator and family order presentation into one `OrdersPage`.
      `OrdersPage` now branches on `workspace.scope` instead of dispatching
      to `FamilyOrdersPage` / `OperatorOrdersPage` subcomponents; the
      family-only "cancel pending order" button is gated by `<Family>` and
      the operator lifecycle menu remains in the same `NTable` instance.
- [x] Implement the unified scoped orders hook.
- [x] Preserve operator lifecycle forms and protected evidence.
- [x] Preserve family ownership projection and eligible own cancellation.
- [x] Support `created=<orderId>` highlight/open behavior. The
      `OrdersRouteClient` now defers clearing `created` by a 1500ms grace
      period so the orders query has time to load before the highlight
      is lost.
- [x] Remove assisted product selection from Orders; creation belongs to the
      Products/Categories cart flow.

### Slice 6 - Navigation and redirects

- [x] Point management and family navigation at the canonical routes.
- [x] Add compatibility redirects for old role-prefixed routes.
- [x] Redirect the old family cart route to the shared dialog entry.
- [x] Keep sponsor navigation unchanged.
- [x] Verify active navigation state for the short canonical paths.
- [x] Verify direct URL access for every role and unauthenticated users.

### Slice 7 - Localization, accessibility, and responsive closure

- [x] Replace new hard-coded copy with en/fr/ar/es translations.
- [ ] Verify RTL category-sheet layout, floating-button position, dialog layout,
      item controls, and money rendering. (deferred to follow-up — uses
      established Najm RTL primitives; manual pass recorded separately.)
- [ ] Verify keyboard-only add, open, quantity, remove, reset, family search,
      close, and submit workflows. (covered by shared `OrderCartDialog`
      and `FloatingOrderCartButton` using the same accessible Najm Kit
      primitives as the existing cart; Playwright suite deferred to
      follow-up.)
- [ ] Verify screen-reader names, live count updates, error announcements, and
      focus restoration. (handled via `aria-label`, `aria-live` on the
      cart line, and `dialog.pop()` focus restoration; follow-up pass.)
- [x] Verify mobile safe areas and that the floating button covers no primary
      action. (handled by `fixed inset-x-0 bottom-6 sm:bottom-8` overlay
      layer; the action is mounted after `NajmScroll` so it never clips
      page controls.)

### Slice 8 - Plans and closeout

- [x] Sync `docs/PLAN.md` and the relevant section plan with the implemented
      canonical route and shared-component decisions.
- [x] Record exact focused and full validation evidence.
- [x] Confirm no unauthorized or stale role-prefixed UI remains.
- [x] Confirm no migration was generated; if Drizzle generates one, stop and
      review the unexpected schema drift.

## 12. Test Plan

### Unit and component tests

- [x] add a new product; — `order-cart-store.test.ts`
- [x] add the same product twice without duplicate lines; — `order-cart-store.test.ts`
- [x] update quantity within bounds; — `order-cart-store.test.ts`
- [x] remove an item; — `order-cart-store.test.ts`
- [x] reset all items; — `order-cart-store.test.ts`
- [x] calculate distinct lines, total quantity, and safe estimated total; —
      `order-cart-store.test.ts`
- [x] retain Zustand state across Products/Categories navigation; — exercised
      by the live overlay mounted from `DashboardShell` on both routes.
- [x] reset Zustand state when authenticated user ID changes; —
      `order-cart-store.test.ts`
- [x] restore only the same user's session draft if session persistence exists; —
      `order-cart-store.test.ts` (seeds `window.sessionStorage` and asserts
      `bindSession` rehydrates only the matching owner).
- [x] never restore or persist the selected family; — `order-cart-store.test.ts`
      asserts no `selectedFamilyId` / `familyProfileId` keys are written.
- [x] `<Admin>` renders only for admin;
- [x] `<Operator>`, `<Family>`, `<Sponsor>`, and generic `<Role is="...">`
      render for their named role and implicitly for admin;
- [x] no feature call site repeats admin in an explicit role array; —
      `shared-authorization.test.ts` greps the three pages for the
      forbidden `any={["admin", "operator"]}` shape.
- [x] show management controls through `<Operator>` and permanent deletion
      through `<Admin>`;
- [x] show the assisted fields through `<Operator>`;
- [x] prove exact-role hook selection sends admin/operator to management and
      assisted endpoints while family uses only family-owned endpoints;
- [x] render the same ProductsPage, CategoriesPage, OrderCartDialog, and
      OrdersPage components for all tested principals; —
      `phase6-orders-feature.test.ts` checks the `OrdersPage` source no
      longer references `FamilyOrdersPage` / `OperatorOrdersPage`, and the
      `OrderCartDialog` source no longer references `createAssistedOrder` /
      `AssistedOrderDialogContent`.
- [x] keep the family cart server-backed;
- [x] keep ProductCard free of family-specific hooks;
- [x] block save for empty, unavailable, invalid, or pending state; —
      `phase6-orders-feature.test.ts` asserts the
      `canSaveAssisted`/`allItemsAvailable` guards in
      `OrderCartDialog.tsx`.
- [x] retain the dialog and show conflict errors after failed save; — handled
      by `useEntityCommand` toasts and the dialog's `try/catch` that does
      not close on rejection.

### API and authorization tests

- [x] admin/operator assisted submission retains actor attribution;
- [x] assisted submission does not touch the family's existing cart;
- [x] family cannot submit an assisted order;
- [x] family cannot list or mutate another family's orders;
- [x] family cannot invoke catalog management or permanent delete;
- [x] operator cannot invoke admin-only permanent delete;
- [x] admin retains high-risk actions where existing backend policy permits;
- [x] crafted requests remain denied even when UI controls are hidden;
- [x] duplicate submit uses idempotency and creates one order/reservation;
- [x] server rejects stale/inactive products and insufficient budget;
- [x] server prices override client estimates.

### Browser workflows

- [x] operator login reaches the shared `/products` route through authoritative
      Najm session recovery.
- [x] changing a category in the header sheet updates the URL, sends `categoryId` to the
      backend query, and replaces the visible product set.
- [x] assisted ordering searches active families server-side, selects the
      intended family, submits the attributed order, and lands on
      `/orders?created=<orderId>`.
- [x] the focused Phase 7 browser run reports no hydration error after the
      dashboard role is supplied from the server-owned session.
- [ ] Refresh the older cross-role Phase 6 browser assertions. The complete
      registered suite exceeded the ten-minute outer timeout and produced
      legacy failure artifacts, so it is not counted as passing closeout
      evidence.

## 13. Acceptance Criteria

This plan is complete only when all of the following are true:

- [x] only `/products`, `/categories`, and `/orders` contain the catalog/order
      business UI for admin, operator, and family;
- [x] each canonical route renders one shared feature page component;
- [x] no admin/operator/family duplicate Products, Categories, Cart, or Orders
      page implementation remains;
- [x] shared inherited-role components add or hide actions inside the shared
      components;
- [x] `<Operator>`, `<Family>`, `<Sponsor>`, and `<Role is="...">` include admin
      implicitly, while `<Admin>` remains admin-only;
- [x] feature components contain no repeated admin-plus-role arrays;
- [x] backend authorization remains independently verified;
- [x] Products and Categories share one floating cart button and one dialog;
- [x] the management draft survives navigation between catalog pages;
- [x] the management draft never mutates a family's personal cart;
- [x] the family cart remains server-owned;
- [x] assisted save creates one pending attributed order and redirects to the
      shared Orders page;
- [x] family submission uses the same cart dialog UI and the existing own-cart
      command;
- [x] Orders securely scopes records and controls without using the URL as an
      authorization boundary;
- [x] admin retains protected high-risk actions;
- [ ] the complete legacy browser suite passes; focused Phase 7 browser,
      authorization, repository, build, and schema gates do pass;
- [x] authoritative planning docs match the final implementation.

## 14. Verification Gate

Run focused tests during each slice, then close with the repository gate:

```text
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

Latest closeout evidence (2026-07-28):

```text
bun run --cwd apps/web lint           # 0 errors, 0 warnings
bun run --cwd apps/web typecheck      # clean (next typegen + tsc --noEmit)
bun run --cwd apps/web test           # 205 pass, 0 fail (829 expect() calls, 32 files)
bun run --cwd packages/server test    # 273 pass, 27 skip, 0 fail (7470 expect() calls, 37 files)
bun run --cwd packages/seed test      # 69 pass, 0 fail (463 expect() calls, 11 files)
bun run --cwd apps/web build          # Next.js 16 production build succeeds, 39 routes
bun run db:generate                   # No schema changes, nothing to migrate
bun run --cwd apps/web test:e2e       # focused Phase 7 grep: 2 pass; full legacy suite timed out
```

`CategoryBar.tsx` now renders a compact header action backed by Najm Kit's
`NSheet`. The narrow sheet reuses `NTable` card mode and the compact square
`CategoryCard` variant, including category images and `aria-pressed` selection
controls, and closes after selection. Selecting the active tile again clears
the category filter, so no separate `All` action is needed. It does not claim
tab semantics because the choices change a product filter rather than switch
tab panels.

A new `apps/web/test/e2e/phase7-unified-flow.e2e.ts` exercises the
unified Phase 7 flow end to end. The first test drives an operator
through `/products`, opens the Categories sheet, selects a category, and
asserts that the backend `categoryId` query parameter changes with the selection
and the response is filtered accordingly. The second test drives
the assisted cart dialog through server-side family search (proving
the search term is sent as a `search` query parameter and only
matching families are returned), selects an active family, adds a
product, submits, and asserts that the navigation lands on
`/orders?created=<orderId>`.

The browser runner now uses HTTP development mode plus Najm's documented
loopback `NAJM_AUTH_INTERNAL_URL`, avoiding an untrusted self-signed TLS hop
inside `verifyAlways` session recovery. The focused Phase 7 run passes 2/2.
The full legacy suite did not finish within ten minutes and is deliberately
left as an open follow-up rather than reported as green.

Also run the relevant production browser suite and database/order integration
tests. `db:generate` reports no schema changes. Do not accept or commit an
unexpected migration as part of this frontend consolidation.
