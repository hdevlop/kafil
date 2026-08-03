# Canonical Family, Contribution, Order, and Children Pages Plan

Status: **PLANNED**

## Goal

Replace the separate family-facing routes with one canonical `/family` page
shared by `admin`, `operator`, and `sponsor` accounts.

Keep the implementation simple:

- one route: `/family`
- one `FamiliesPage`
- one Najm Kit `NTable` with card and table modes
- one shared `FamilyCard`
- semantic authorization components around role-specific HTML
- no separate admin, operator, or sponsor page components
- family accounts have no family-directory sidebar item and cannot access the
  canonical `/family` directory

## Authorization Rules

Keep the existing Kafil presentation components:

- `<Admin>` renders for `admin` only.
- `<Operator>` renders for `operator` and `admin`.
- `<Family>` remains available for family self-service pages, but is not used
  inside the shared family-directory card.
- `<Sponsor>` renders for `sponsor` and `admin`.
- `<Can>` protects permission-specific actions when a permission is more
  precise than a role.

Admin is the super-role and must be able to see every family-directory section
wrapped by `<Operator>` or `<Sponsor>`, plus admin-only content wrapped by
`<Admin>`.

These components control presentation only. Backend guards and privacy-safe
response projections remain authoritative.

## Implementation Steps

### 1. Add the canonical route

- Add `app/(dashboard)/family/page.tsx`.
- Render the existing `FamiliesPage` directly from the route.
- Allow only `admin`, `operator`, and `sponsor` to access `/family` in the Najm
  Auth route configuration.
- Keep family accounts denied from `/family`, including direct navigation.
- Do not resolve an audience mode or render separate role pages.

### 2. Point navigation to `/family`

- Use `/family` as the family destination for every supported role.
- Keep the navigation label appropriate to the signed-in account without
  changing the destination.
- Do not add `/family` to the family account sidebar.
- Redirect obsolete family-directory routes to `/family`, including
  `/operator/families` and `/sponsor/support`.
- Keep existing family-owned self-service destinations, such as
  `/family/children`, separate from the `/family` directory authorization.
  Allowing operator or sponsor access to `/family` must not grant access to
  those nested family-only routes.

### 3. Reuse one `NTable` and one card

- Keep `FamiliesPage` composed from the existing Najm Kit `NTable`.
- Preserve card mode as the default and table mode as the alternative.
- Keep one `FamilyCard` component for all roles.
- Keep common family image, reference, funding, status, and summary markup in
  the shared card instead of duplicating it per role.
- Show the family funding progress bar to admin, operator, and sponsor without
  a role wrapper.

### 4. Guard role-specific HTML

- Render common privacy-safe information, including funding progress, without
  a role wrapper.
- Wrap sensitive family identity and contact lines plus management actions in
  `<Operator>` so operator and admin can see them.
- Wrap permanent-delete and other admin-only actions in `<Admin>`.
- Wrap sponsor-only support/contribution actions in `<Sponsor>`.
- Do not add a `<Family>` section to `FamilyCard`; family accounts cannot open
  this directory.
- Use the same rules in both `FamilyCard` and `NTable` columns, menus, empty
  actions, header actions, dialogs, and sheets.
- Do not hide only the table column while leaving the same value visible in
  card mode or a details dialog.
- Avoid repeated `role === ...` checks and repeated admin arrays when a shared
  authorization component expresses the rule.

Keep the card markup direct. Guard only the individual information lines or
actions that differ by account; do not create small role-specific family
components merely to hold the same `NCardInfo` markup.

Example structure:

```tsx
<NCard title={family.name}>
  <NCardInfo label={t("family.children")} value={family.activeChildCount} />
  <FundingProgressBar progress={family.funding} />

  <Operator>
    <NCardInfo label={t("family.phone")} value={family.phone} />
  </Operator>

  <Sponsor>
    <SupportFamilyButton family={family} />
  </Sponsor>

  <Admin>
    <DeleteFamilyButton family={family} />
  </Admin>
</NCard>
```

Admin intentionally sees every block in this example.

### 5. Reuse one family details view

- Let admin, operator, and sponsor open the same existing `FamilyDetails`
  dialog from the shared card or table row.
- Do not create a separate sponsor family-details component.
- Keep the hero image, privacy-safe display reference, funding status, funding
  progress, active-child count, and other approved summary values visible to
  all three accounts.
- Wrap sensitive identity and household lines in `<Operator>` so they are
  visible to operator and admin but absent for sponsor. This includes email,
  guardian CIN, phone, exact address, housing details, relationship details,
  private notes, and other operational identity data.
- Wrap sponsor-only support or contribution actions in `<Sponsor>`.
- Wrap permanent-delete and other emergency actions in `<Admin>`.
- Admin intentionally sees the common details, operator details, sponsor
  actions, and admin-only actions in the same dialog.
- Guard the relevant `NDetailItem` or `NSection` directly. Keep the existing
  `FamilyDetails`, `FamilyDetailsHero`, and `FamilyDetailsProfile` structure
  unless a section boundary already matches the privacy boundary.
- The sponsor title must use the privacy-safe family reference supplied by the
  sponsor projection, not the private guardian or account name.

### 6. Preserve backend privacy

- Keep one frontend family workspace, but never expose private family fields
  to a sponsor response and rely on hidden HTML to protect them.
- Admin may receive the complete authorized family projection.
- Operator receives its permitted management projection.
- Sponsor receives only the privacy-safe family projection.
- Family accounts cannot call the family-directory endpoint. Their existing
  owner-scoped dashboard and self-service endpoints remain separate.
- Keep guardian CIN, exact address, documents, private notes, and protected
  evidence out of sponsor responses, browser state, logs, and cached queries.
- Return enough privacy-safe summary data for the shared sponsor details view,
  including the family reference, image, active-child count, funding status,
  and funding progress.
- Backend commands must continue rejecting roles that cannot perform them even
  when a request is crafted outside the UI.

### 7. Keep server family data out of Zustand

- Keep fetched family records in the existing React Query hooks as the single
  source of truth.
- Pass the `family` record once through `NTable.renderCard`; `FamilyCard`
  already receives that record as `data`.
- Read values directly from `data` inside the card instead of drilling the
  family through unnecessary wrapper components.
- If a future card becomes deeply nested, prefer a card-local React context
  scoped to that rendered card. Do not copy family records into a global
  Zustand store.
- Reserve Zustand for genuinely client-owned transient workflow state. It must
  not duplicate API data, ownership, or privacy projections.

## Family Page Tests and Acceptance

- `/family` opens for admin, operator, and sponsor sessions.
- Those three roles render the same `FamiliesPage`, `NTable`, and `FamilyCard`
  implementation.
- Admin sees operator, sponsor, and admin-only sections.
- Operator does not see admin-only or sponsor-only actions.
- Funding progress is visible to admin, operator, and sponsor in both card and
  table modes.
- A family session has no `/family` navigation item and is denied when opening
  the route or calling its directory endpoint directly.
- Sponsor does not see private identity, contact, document, note, or management
  content.
- Sponsor can open the same family details dialog and see the privacy-safe
  reference, image, active-child count, funding status, and funding progress.
- The sponsor details response and rendered dialog contain no guardian/account
  name, email, CIN, phone, exact address, housing details, relationship data,
  private notes, documents, or protected evidence.
- Admin and operator open the same details component; operator-guarded fields
  are visible to both, while admin-only actions remain exclusive to admin.
- Card mode, table mode, row menus, dialogs, sheets, empty states, and mobile
  rendering follow the same visibility rules.
- Direct API requests remain denied when the account lacks the required role,
  permission, or ownership.
- Sponsor API-response tests prove that sensitive family fields are absent,
  not merely hidden by React.
- React Query remains the only client cache for family records; no Zustand
  family-record copy is introduced.
- Old family routes redirect to `/family` without creating duplicate page
  implementations.
- Existing en, fr, ar, and es labels and RTL behavior remain supported.

## Canonical Contribution Follow-up

### Current state

- Admin, operator, and family already use the canonical `/contribution` route,
  one `ContributionsPage`, one Najm Kit `NTable`, one `ContributionCard`, and
  one `ContributionDetailsSheet`.
- The backend already scopes admin/operator reads to all contributions and
  family reads to contributions belonging to the authenticated family.
- Sponsor still uses the separate `/sponsor/contributions` route and
  `SponsorContributionsPage`. It reuses `ContributionCard` for history but does
  not use the canonical table and details flow.
- Therefore the contribution feature is only partially unified.

### Role and ownership rules

- Admin sees all contributions and every operator, sponsor, and admin action.
- Operator sees all contributions and the management actions allowed by its
  permissions.
- Family sees only contributions whose `familyProfileId` belongs to its
  authenticated user. It cannot select another family scope.
- Sponsor sees only contributions whose `sponsorProfileId` belongs to its
  authenticated user. It cannot select another sponsor or family scope.
- Ownership is resolved by the backend from the authenticated principal, never
  from a client-provided audience or owner ID.

### One route and one page

- Allow admin, operator, family, and sponsor to access `/contribution`.
- Point the sponsor Contributions navigation item to `/contribution`.
- Redirect `/sponsor/contributions` and keep `/operator/contributions` as
  compatibility redirects to `/contribution`.
- Render only the existing `ContributionsPage`; do not create management,
  family, or sponsor page variants.
- Keep one `NTable`, one `ContributionCard`, and one
  `ContributionDetailsSheet` for every account.

### One role-scoped read contract

- Keep `GET /contributions` as the canonical list endpoint.
- Extend its existing principal dispatch:
  - admin/operator -> repository `list`, returning all authorized records
  - family -> repository `listFamily`, filtered by authenticated family user
  - sponsor -> repository `listOwn`, filtered by authenticated sponsor user
- Apply the same dispatch to `GET /contributions/:id`; a family or sponsor
  requesting another account's contribution receives not found or forbidden.
- Keep sponsor `/contributions/me` command and plan endpoints where they remain
  useful for submission and plan ownership, but do not require a separate
  history page.
- Keep role-safe response projections. Optional sensitive fields must be
  absent from family or sponsor responses when they are not authorized, not
  merely hidden in React.

### Shared table, card, and details HTML

- Render amount, status, submitted date, relevant lifecycle dates, and other
  approved common contribution information once without duplicating markup.
- Use a role-safe destination label: management may receive the family name;
  sponsor receives only its support/family reference; family already knows its
  own destination.
- Keep sponsor display information visible where already privacy-approved.
- Render optional data lines only when the role-safe projection contains the
  value. Do not create separate cards just because payment method, destination,
  or operational metadata differs.
- Use `<Operator>` for record, validate, reject, refund, management filters,
  and operational-only fields. Admin inherits these sections.
- Use `<Sponsor>` for submitting a contribution and managing the authenticated
  sponsor's own plans.
- Use `<Admin>` for permanent delete, bulk selection, and bulk delete.
- Family remains read-only and needs no `<Family>` action section.
- Reuse the same details sheet. Guard sensitive sponsor email, private family
  identity, rejection reason, actor IDs, and operational metadata with the
  appropriate management authorization.
- Admin intentionally sees common information plus operator, sponsor, and
  admin-only sections.

### Intended code shape

The canonical route remains thin:

```tsx
// app/(dashboard)/contribution/page.tsx
import { ContributionsPage } from "@/features/Contributions";

export default function ContributionPage() {
  return <ContributionsPage />;
}
```

Najm Auth allows every contribution audience through the same route:

```ts
roleRoutes: {
  "/contribution": ["admin", "operator", "family", "sponsor"],
}
```

The controller continues passing the authenticated principal to one service
method. The client does not submit an audience or owner ID:

```ts
@Get()
@isContributionReader()
list(
  @User("id") userId: string,
  @User("role") role: string,
  @Query() query: ContributionListQuery,
) {
  return this.contributions.listForPrincipal(userId, role, query);
}
```

Extend `isContributionReader` to include sponsor for reads, then keep the
ownership dispatch in one service method:

```ts
listForPrincipal(
  userId: string,
  role: string,
  query: ContributionListQuery,
) {
  const parsed = contributionListQuery.parse(query ?? {});

  if (role === "family") {
    if (parsed.familyProfileId) {
      HttpError.forbidden("Family contribution scope cannot be selected");
    }

    return this.contributions.listFamily(
      userId,
      parsed.limit,
      parsed.offset,
      { status: parsed.status },
    );
  }

  if (role === "sponsor") {
    if (parsed.familyProfileId) {
      HttpError.forbidden("Sponsor contribution scope cannot be selected");
    }

    return this.contributions.listOwn(
      userId,
      parsed.limit,
      parsed.offset,
      { status: parsed.status },
    );
  }

  if (role === "admin" || role === "operator") {
    const { limit, offset, ...filters } = parsed;
    return this.contributions.list(limit, offset, filters);
  }

  HttpError.forbidden("Contribution access denied");
}
```

Use the same ownership rule for a single record:

```ts
async getForPrincipal(id: string, userId: string, role: string) {
  if (role === "family") {
    const record = await this.contributions.findFamilyById(id, userId);
    if (!record) HttpError.notFound("Contribution not found");
    return record;
  }

  if (role === "sponsor") {
    const record = await this.contributions.findOwnById(id, userId);
    if (!record) HttpError.notFound("Contribution not found");
    return record;
  }

  if (role === "admin" || role === "operator") {
    return this.validator.ensureContributionExists(id);
  }

  HttpError.forbidden("Contribution access denied");
}
```

Keep one role-safe record shape with common fields and optional projected
fields. Omitted values are not placeholders for leaked data:

```ts
interface ContributionListRecord {
  id: string;
  amountMinor: number;
  status: ContributionStatus | string;
  submittedAt: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  validatedAt?: string | null;
  rejectedAt?: string | null;

  sponsorName?: string;
  sponsorImage?: string | null;
  sponsorGender?: "F" | "M" | null;

  // Management projection only.
  sponsorEmail?: string;
  familyName?: string;
  familyImage?: string | null;
  rejectionReason?: string | null;

  // Sponsor projection only; never a private family name.
  supportLabel?: string;

  // Present only for roles allowed to see it.
  paymentMethod?: string;
  externalReference?: string | null;
}
```

The shared page owns one query and one table. Only role-specific controls are
guarded:

```tsx
export function ContributionsPage() {
  const { isExactSponsor } = useKafilRole();
  const contributions = useContributions({ ...pagination });

  return (
    <NPageLayout>
      <NPageHeader title={t("contributions.title")} />

      <Sponsor>
        <SponsorContributionControls disabled={!isExactSponsor} />
      </Sponsor>

      <NTable
        data={contributions.data ?? []}
        columns={columns}
        renderCard={({ data }) => (
          <ContributionCard
            data={data}
            actions={<ContributionActions contribution={data} />}
          />
        )}
        onView={openView}
      />

      <ContributionDetailsSheet contribution={viewingContribution} />
    </NPageLayout>
  );
}
```

`<Sponsor>` also renders for admin under the current presentation inheritance.
Admin may inspect that section, but `disabled={!isExactSponsor}` prevents an
admin without a sponsor profile from executing an identity-owned sponsor
command. Admin visibility must not become sponsor impersonation.

Keep the card markup direct and render common information once:

```tsx
<NCard title={data.sponsorName} description={formatMad(data.amountMinor)}>
  <NCardSection>
    <NCardInfo label={t("contributions.status")} value={data.status} />
    <NCardInfo
      label={t("contributions.submitted")}
      value={formatKafilDate(data.submittedAt)}
    />

    {data.paymentMethod ? (
      <NCardInfo
        label={t("contributions.paymentMethod")}
        value={data.paymentMethod}
      />
    ) : null}

    <Operator>
      {data.familyName ? (
        <NCardInfo label={t("contributions.family")} value={data.familyName} />
      ) : null}
    </Operator>

    <Sponsor>
      {data.supportLabel ? (
        <NCardInfo label={t("contributions.support")} value={data.supportLabel} />
      ) : null}
    </Sponsor>
  </NCardSection>
</NCard>
```

Keep row actions in one component. Family and sponsor histories naturally get
only the common View action:

```tsx
function ContributionActions({ contribution }: ContributionActionProps) {
  return (
    <>
      <ViewContributionButton contribution={contribution} />

      <Operator>
        <ValidateContributionButton contribution={contribution} />
        <RejectContributionButton contribution={contribution} />
        <RefundContributionButton contribution={contribution} />
      </Operator>

      <Admin>
        <DeleteContributionButton contribution={contribution} />
      </Admin>
    </>
  );
}
```

The details sheet follows the same composition:

```tsx
<ContributionDetailsSheet>
  <ContributionCommonDetails contribution={contribution} />

  <Operator>
    <ContributionOperationalDetails contribution={contribution} />
  </Operator>

  <Sponsor>
    {contribution.supportLabel ? (
      <NDetailItem
        label={t("contributions.support")}
        value={contribution.supportLabel}
      />
    ) : null}
  </Sponsor>

  <Admin>
    <ContributionEmergencyActions contribution={contribution} />
  </Admin>
</ContributionDetailsSheet>
```

These names describe boundaries in the plan; implementation should keep the
current direct markup when a separate component would contain only one or two
lines.

### Keep the implementation small

- Remove `SponsorContributionsPage` after its create/plan controls are moved
  into guarded sections of `ContributionsPage`.
- Do not add contribution audience page components or duplicate table/card
  definitions.
- Do not use Zustand for contribution records, plans, or ownership. Keep
  server data in React Query and local form values in the form component.
- Keep the authenticated role/principal scope in the React Query key so cached
  management, family, and sponsor projections cannot be reused across account
  changes.
- Reuse existing hooks and commands; split a component only when it contains a
  genuinely reusable form or a large independent section.

### Contribution acceptance

- Admin and operator see all contributions through `/contribution`.
- Family sees only contributions funding its own family.
- Sponsor sees only contributions submitted by its own sponsor profile.
- All four accounts use the same `ContributionsPage`, `NTable`,
  `ContributionCard`, and `ContributionDetailsSheet` implementation.
- Sponsor can submit contributions and manage its own plans from guarded
  sections on the canonical page.
- Family cannot record, validate, reject, refund, submit, manage plans, or
  permanently delete contributions.
- Sponsor cannot record offline payments, validate, reject, refund, or delete.
- Operator cannot permanently delete or bulk-delete.
- Admin sees operator and sponsor controls plus admin-only deletion controls.
- Crafted owner IDs, filters, and contribution IDs cannot cross family or
  sponsor ownership boundaries.
- Family and sponsor API-shape tests prove unauthorized sensitive fields are
  absent.
- Card mode, table mode, details sheet, filters, pagination, mobile layout,
  localization, and Arabic RTL follow the same visibility rules.
- Old contribution routes redirect to `/contribution` without leaving a
  duplicate page implementation.

## Canonical Orders Follow-up

### Current state and target

- `/orders` is already the canonical route for admin, operator, family, and
  sponsor.
- The current backend behavior is already correct:
  - admin/operator list all orders
  - family lists only orders owned by its authenticated family
  - sponsor lists only orders belonging to actively supported families
  - permanent deletion is admin-only
- `OrdersPage` and `OrderCard` are shared, but the page still constructs three
  separate `NTable` configurations, passes an `audience` prop into the card,
  and uses separate management/family/sponsor read endpoints and details paths.
- Simplify those presentation and read boundaries without changing order
  lifecycle, cart, budget, purchase, delivery, or evidence behavior.

### Role rules

- Admin sees all orders, all operator workflow information and actions, all
  approved family/sponsor projections, and the admin-only permanent-delete
  action.
- Operator sees all orders and all normal order workflow actions, but never the
  permanent-delete action.
- Family sees only its own orders and may cancel only its own pending order
  through the existing family command.
- Sponsor sees privacy-safe orders for actively supported families and has no
  order mutation actions.
- Sponsor support ownership is resolved by joining the authenticated sponsor
  profile to an active support assignment for the order's family.

### One principal-scoped read path

- Keep `/orders` as the single page and `GET /orders` as the canonical list
  read.
- Allow all four roles through a named order-reader guard.
- Dispatch inside the service from the authenticated principal:

```ts
listForPrincipal(
  userId: string,
  role: string,
  query: OrderListQuery,
) {
  if (role === "family") {
    return this.listOwn(userId, query);
  }

  if (role === "sponsor") {
    return this.listSupported(userId, query);
  }

  if (role === "admin" || role === "operator") {
    return this.list(query);
  }

  HttpError.forbidden("Order access denied");
}
```

- Apply the same rule to `GET /orders/:id`:

```ts
getForPrincipal(id: string, userId: string, role: string) {
  if (role === "family") {
    return this.getOwn(id, userId);
  }

  if (role === "sponsor") {
    return this.getSupported(id, userId);
  }

  if (role === "admin" || role === "operator") {
    return this.get(id);
  }

  HttpError.forbidden("Order access denied");
}
```

- Add `getSupported(id, userId)` as a privacy-safe read that proves the sponsor
  has an active assignment to the order's family. It must never fall back to
  the operator detail projection.
- Keep `/orders/me`, `/orders/supported`, and their current service methods as
  compatibility endpoints only while callers migrate. Family cart, submit,
  and own-cancel commands remain exact family endpoints.
- Keep assisted ordering and every approve/reject/purchase/delivery/cancel
  command on operator-authorized endpoints.
- Keep `DELETE /orders/:id` protected by both `@isAdmin()` and
  `@CanDelete("orders")`.

The canonical controller shape becomes:

```ts
@Get()
@isOrderReader()
list(
  @User("id") userId: string,
  @User("role") role: string,
  @Query() query: OrderListQuery,
) {
  return this.orders.listForPrincipal(userId, role, query);
}

@Get("/:id")
@isOrderReader()
get(
  @Params("id") id: string,
  @User("id") userId: string,
  @User("role") role: string,
) {
  return this.orders.getForPrincipal(id, userId, role);
}

@Delete("/:id")
@CanDelete("orders")
@isAdmin()
delete(@Params("id") id: string, @User("id") userId: string) {
  return this.orders.delete(id, userId);
}
```

### Role-safe shared order record

Use one UI-facing record with common fields and optional fields supplied only
by the authorized projection:

```ts
interface SharedOrderRecord {
  id: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
  actualTotalMinor?: number | null;
  articleCount: number;
  placedAt: string;
  dominantCategoryName?: string | null;
  dominantCategoryImage?: string | null;
  deliveryName?: string | null;
  deliveryStatus?: string | null;

  // Admin/operator projection only.
  guardianLegalNameSnapshot?: string;
  familyImage?: string | null;
  deliveryPhoneSnapshot?: string | null;
  deliveryAddressSnapshot?: string;
  assistanceNote?: string | null;
  currentDelivery?: ManagementDeliverySummary | null;

  // Sponsor projection only; never the private family name.
  supportReference?: string;

  // Family projection only. Admin must not use this as family ownership.
  canCancelOwn?: boolean;
}
```

Common order number, totals, status, dates, dominant category, article count,
and approved delivery summary render once. Sensitive family identity, address,
phone, staff details, internal notes, and protected evidence must be absent
from sponsor projections.

### One `NTable`, card, actions, and details sheet

Replace the three table-prop objects with one role-safe table:

```tsx
export function OrdersPage({ highlightOrderId }: OrdersPageProps) {
  const orders = useOrders({ ...pagination });

  return (
    <NPageLayout>
      <NPageHeader title={t("orders.title")} />

      <NTable
        data={orders.data ?? []}
        columns={columns}
        renderCard={({ data }) => (
          <OrderCard
            data={data}
            highlighted={data.id === highlightOrderId}
            actions={<OrderActions order={data} />}
          />
        )}
        onView={openView}
        onRowClick={openView}
      />

      <OrderDetailsSheet order={viewingOrder} />
    </NPageLayout>
  );
}
```

Keep `OrderCard` direct and remove its `audience` prop. Common values render
once; guarded or optional lines handle the differences:

```tsx
<NCard title={data.orderNumber} description={formatMad(orderTotal(data))}>
  <NCardSection>
    <NCardInfo label={t("orders.status")} value={data.status} />
    <NCardInfo label={t("orders.articles")} value={data.articleCount} />
    <NCardInfo label={t("orders.placed")} value={formatKafilDate(data.placedAt)} />
    <NCardInfo label={t("orders.delivery")} value={deliveryLabel(data)} />

    <Operator>
      {data.guardianLegalNameSnapshot ? (
        <NCardInfo
          label={t("orders.family")}
          value={data.guardianLegalNameSnapshot}
        />
      ) : null}

      {data.deliveryAddressSnapshot ? (
        <NCardInfo
          label={t("orders.address")}
          value={data.deliveryAddressSnapshot}
        />
      ) : null}
    </Operator>

    <Sponsor>
      {data.supportReference ? (
        <NCardInfo
          label={t("orders.support")}
          value={data.supportReference}
        />
      ) : null}
    </Sponsor>
  </NCardSection>
</NCard>
```

Use one actions component. Operator workflow actions are inherited by admin;
delete remains admin-only. Family cancellation depends on the owner-scoped
projection flag, preventing admin from being treated as a family owner merely
because `<Family>` presentation includes admin:

```tsx
function OrderActions({ order }: Readonly<{ order: SharedOrderRecord }>) {
  return (
    <>
      <ViewOrderButton order={order} />

      <Operator>
        <OrderWorkflowActions order={order} />
      </Operator>

      <Family>
        {order.canCancelOwn ? <CancelOwnOrderButton order={order} /> : null}
      </Family>

      <Admin>
        <DeleteOrderButton order={order} />
      </Admin>
    </>
  );
}
```

Sponsor has no order-action section beyond View.

Reuse one details sheet with the same rule:

```tsx
<OrderDetailsSheet>
  <OrderCommonDetails order={order} />

  <Operator>
    <OrderManagementDetails order={order} />
  </Operator>

  <Sponsor>
    {order.supportReference ? (
      <NDetailItem label={t("orders.support")} value={order.supportReference} />
    ) : null}
  </Sponsor>

  <Admin>
    <DeleteOrderButton order={order} />
  </Admin>
</OrderDetailsSheet>
```

The names above describe authorization boundaries. Keep direct Najm Kit markup
when extracting a component would only move one or two lines.

### Order deletion boundary

- Operator must never receive the delete menu item or call the delete command.
- Admin may request permanent deletion only for the existing server-approved
  correction case: a pre-purchase order with no purchase history, protected
  evidence, or started fulfillment history.
- The server remains responsible for releasing/removing order-owned ledger
  effects, rebuilding budget snapshots, deleting the order graph, and recording
  the audit event transactionally.
- Hiding the button from operator, family, and sponsor is presentation only;
  direct API denial tests remain required.

### Keep Orders simple

- Keep one route, page, table, card, details sheet, query hook, and principal-
  scoped React Query key.
- Remove the `OrdersScope` page branching, the three separate `NTable` prop
  objects, the `OrderCard` audience prop, and duplicate family details sheet
  after the canonical projections support the shared shape.
- Do not move order records into Zustand. Keep server data in React Query.
- Preserve Zustand only for the existing transient assisted-order draft; never
  mix it with the family-owned cart or order history.
- Preserve all existing lifecycle command dialogs and transaction rules.

### Orders acceptance

- Admin and operator see all orders.
- Operator sees all normal workflow actions but no permanent-delete action.
- Admin sees the operator workflow plus the eligible permanent-delete action.
- Family sees only its own orders and can cancel only its own pending order.
- Sponsor sees only orders belonging to actively supported families.
- Sponsor responses and UI omit family identity, phone, exact address, internal
  notes, staff contact, protected receipt/proof paths, and operational history.
- All four roles use the same `OrdersPage`, `NTable`, `OrderCard`, and
  `OrderDetailsSheet` implementation.
- Cross-family and cross-sponsor order IDs return not found or forbidden.
- Ending a support assignment removes that family's orders from the sponsor
  read scope without modifying order history.
- Operator deletion requests are rejected even when crafted directly.
- Admin deletion still refuses purchased orders, orders with purchase history,
  protected evidence, or started delivery history.
- Card/table/details visibility, pagination, mobile layout, localization, and
  Arabic RTL remain consistent.

## Canonical Children Follow-up

### Current state and target

Children currently have two page implementations even though both render the
same child information:

- `/operator/children` renders the full `ChildrenPage` with Najm Kit `NTable`.
- `/family/children` renders `FamilyChildrenPage` with a custom grid.
- `FamilyChildCard` only adapts family data and delegates back to the shared
  `ChildCard`.
- the server duplicates the read contract between `/children` and
  `/children/me`, and between `/children/:id` and `/children/me/:id`.

Replace that duplication with:

```text
/children
  -> one ChildrenPage
  -> one useChildren query
  -> one NTable
  -> one ChildCard
  -> one ChildDetails
```

Do not create `AdminChildrenPage`, `OperatorChildrenPage`, or
`FamilyChildrenPage`. The record shape and HTML remain shared. Role guards
hide the small operational sections, while the server decides which records
and fields the authenticated principal may receive.

### Role and ownership rules

| Account | Read scope | Commands | Sensitive operational fields |
| --- | --- | --- | --- |
| `admin` | every child | all operator commands plus eligible permanent delete | visible |
| `operator` | every child | create, edit, deactivate, reactivate | visible |
| `family` | only children owned by its family profile | none | hidden |
| `sponsor` | no children page and no child read endpoint | none | absent |

Important boundaries:

- family ownership is enforced in the backend, never by a client-side
  `familyProfileId` filter;
- a family requesting another family's child ID receives not found;
- sponsor remains denied from child records and child images;
- family child responses omit internal notes and operational family data;
- admin inherits `<Operator>` presentation, so normal management HTML is
  written once; `<Admin>` is needed only for permanent delete;
- progress bars that belong to shared family/order/contribution views remain
  visible to their authorized audiences; they are not duplicated in Children.

### One canonical route

Create the role-aware route once:

```tsx
// src/app/(dashboard)/children/page.tsx
import { ChildrenPage } from "@/features/Children";

export default function ChildrenRoutePage() {
  return <ChildrenPage />;
}
```

Allow only `admin`, `operator`, and `family` at the authenticated route/layout
boundary. Update navigation as follows:

```ts
admin.children    -> "/children"
operator.children -> "/children"
family.children   -> "/children"
sponsor           -> no children navigation item
```

Keep temporary redirects from `/operator/children` and `/family/children` to
`/children` while saved links may still exist. Remove the old route pages once
the navigation and focused route tests use the canonical path.

### One principal-scoped backend read path

Add one composite reader guard for `admin`, `operator`, and `family`. Keep
write methods on their current strict command guards.

The intended controller shape is:

```ts
@Get()
@isChildReader()
@CanList(Child)
@Validate({ query: childListQuery })
list(
  @Query() query: ChildListQuery,
  @User("id") userId: string,
  @User("role") role: string,
) {
  return this.children.listForPrincipal({ userId, role, query });
}

@Get("/:id")
@isChildReader()
@CanRead(Child)
@Validate({ params: childIdParams })
get(
  @Params("id") id: string,
  @User("id") userId: string,
  @User("role") role: string,
) {
  return this.children.getForPrincipal({ id, userId, role });
}
```

The service branches only at the authorization/projection boundary:

```ts
async listForPrincipal(input: ChildListPrincipalInput) {
  if (input.role === "family") {
    const family = await this.requireFamilyByUserId(input.userId);
    const rows = await this.children.listByFamilyId(family.id);
    return rows.map(toFamilyChildProjection);
  }

  return this.list(input.query); // admin and operator
}

async getForPrincipal(input: ChildReadPrincipalInput) {
  if (input.role === "family") {
    return this.getOwn(input.id, input.userId); // keeps not-found ownership rule
  }

  return this.get(input.id); // admin and operator
}
```

Use the installed Najm role/guard APIs when implementing the composite guard;
the names above describe the intended contract, not a reason to build a second
authorization system. Remove `/children/me` and `/children/me/:id` only after
the canonical client and tests no longer call them.

The write contract stays explicit and unchanged:

```text
POST   /children                  admin, operator
PUT    /children/:id              admin, operator
POST   /children/:id/deactivate   admin, operator
POST   /children/:id/reactivate   admin, operator
DELETE /children/:id              admin only
POST   /children/bulk-delete      admin only
```

UI hiding is presentation only. Direct API calls must still be rejected by
the backend guards.

### One query and no Zustand server cache

Use React Query for child records and make the authenticated principal part of
the cache boundary:

```ts
export function useChildren(query: OffsetPagination) {
  const user = useUser();
  const { exact } = useKafilRole();

  return useEntityQuery({
    queryKey: ["children", "principal", user?.id, exact, query],
    queryFn: () => listChildren(query),
  });
}
```

Do not put the child list, selected child, or family profile in Zustand to
avoid prop drilling. Those are server records and belong in React Query or in
the current component tree. Pass the selected `Child` once from the table/card
to `ChildDetails`; use local state only for the open dialog/sheet ID.

### One shared table, card, and details view

Keep `ChildrenPage` based on the existing Najm Kit `NTable`. Family accounts
receive only their own rows and use it read-only. The page does not need
separate role-based render branches:

```tsx
export function ChildrenPage() {
  const children = useChildren();

  return (
    <>
      <Operator>
        <NButton onClick={openCreate}>{t("operator.children.create")}</NButton>
      </Operator>

      <NTable
        data={children.data ?? []}
        columns={columns}
        renderCard={ChildCard}
        onView={openView}
        onRowClick={openView}
        renderEmpty={() => <ChildrenEmptyState />}
        loading={children.isPending}
        error={children.error}
      />
    </>
  );
}
```

Keep the existing `openView`, `openCreate`, `openEdit`, and lifecycle dialog
handlers. Connect create/edit/status/delete capabilities to `NTable` only when
the corresponding authorization hook allows them; do not use an `audience`
prop or render a second table. For example, any explicit page-header action is
plain guarded HTML:

```tsx
const createAction = (
  <Operator>
    <NButton onClick={openCreate}>{t("operator.children.create")}</NButton>
  </Operator>
);
```

Guard only the operational HTML that actually differs. This can stay inline;
it does not require one new component per action:

```tsx
<Operator>
  <NButton onClick={() => openEdit(child)}>{t("operator.children.edit")}</NButton>
  <NButton onClick={() => openStatus(child)}>
    {t("operator.children.changeStatus")}
  </NButton>
</Operator>

<Admin>
  <NButton onClick={() => openDelete(child)}>{t("operator.children.delete")}</NButton>
</Admin>
```

Keep common child information once:

```tsx
export function ChildDetails({ child }: { child: ChildRecord }) {
  return (
    <div className="space-y-5">
      <NSection title={t("operator.families.child")}>
        <NDetailList
          items={[
            { label: t("operator.families.dateOfBirth"), value: child.dateOfBirth },
            { label: t("operator.families.gender"), value: child.gender },
            { label: t("operator.families.schoolLevel"), value: child.schoolLevel },
            { label: t("operator.families.clothingSize"), value: child.clothingSize },
            { label: t("operator.families.shoeSize"), value: child.shoeSize },
          ]}
        />
      </NSection>

      <Operator>
        <NSection title={t("operator.families.profile")}>
          <NDetailList items={[{ label: "Household ID", value: child.familyProfileId }]} />
        </NSection>
        <NSection title={t("operator.families.notes")}>
          <NDetailList items={[{ label: t("operator.families.notes"), value: child.notes }]} />
        </NSection>
      </Operator>
    </div>
  );
}
```

The canonical view type should make the projection-specific `notes` field
optional. The family projection must not include it;
the `<Operator>` wrapper prevents unused HTML from rendering but is not the
privacy boundary. `ChildCard` should use the common projection fields directly
and must not accept an `audience`, `scope`, or role prop.

### Children cleanup

After the canonical page is working:

- delete `FamilyChildrenPage`;
- delete `FamilyChildCard`;
- remove the family-specific child mapper used only to satisfy `ChildCard`;
- remove the old family child hook that calls `/children/me`;
- remove separate operator/family page props and role switches;
- retain the existing shared `ChildCard`, `ChildDetails`, forms, dialogs,
  schemas, localization, and command hooks;
- keep child image authorization in the backend and verify sponsors still
  cannot fetch those files by URL.

### Children acceptance

- Admin sees every child, all operator actions, and permanent delete.
- Operator sees every child and normal management actions, but no permanent
  delete UI or API permission.
- Family sees only its own children through the same `ChildrenPage`, `NTable`,
  `ChildCard`, and `ChildDetails`, with no management actions.
- Sponsor has no children sidebar item, cannot open `/children`, cannot list or
  read child records, and cannot fetch child images.
- A family cannot expose another family's child by changing query parameters,
  pagination, cached IDs, or the details URL.
- Family responses do not contain internal notes or unrelated family fields.
- All allowed roles use `/children`; legacy role-prefixed URLs redirect during
  migration and are then removed.
- React Query cache keys cannot reuse one signed-in account's child result for
  another account.
- Table/card/details behavior, loading/error/empty states, mobile layout,
  localization, and Arabic RTL remain consistent.

## Sponsor Feature-Folder Consolidation

### Goal

Remove the unnecessary top-level `SponsorOverview`, `SponsorProfile`, and
`SponsorWorkspace` feature folders after their responsibilities are moved to
the canonical owning features. Preserve all required sponsor behavior without
duplicating pages, cards, hooks, types, or API clients.

Use one sponsor domain feature:

```text
features/Sponsors/
  components/
    SponsorsPage/
    overview/
      SponsorKpiGrid.tsx
      SupportBudgetCard.tsx
      ContributionOverviewCard.tsx
      RecentContributionsCard.tsx
      RecentSupportedOrdersCard.tsx
    profile/
      SponsorProfilePage.tsx
      SponsorProfileDetails.tsx
      SponsorProfileForms.tsx
  config/
    sponsorProfileSchemas.ts
    sponsorSchemas.ts
  hooks/
    sponsorProfileKeys.ts
    useSponsorOverview.ts
    useSponsorProfile.ts
  lib/
    isSponsorProfileMissing.ts
    buildOperatorSponsorOverviewViewModel.ts
  types.ts
```

The exact folder depth may remain shallow when a folder would contain only one
file. Do not add wrapper components merely to reproduce the old folder names.

### Remove `SponsorWorkspace`

- Move the sponsor family-directory presentation from `SponsorSupportPage`
  into the canonical `FamiliesPage` and `FamilyCard` guarded sponsor sections.
- Move support-assignment reads and commands to the existing
  `SupportAssignments` feature when they operate on assignments.
- Keep privacy-safe family directory records and view hooks in `Families` when
  they directly feed `/family`.
- Move sponsor contribution history, submission, and plan controls from
  `SponsorContributionsPage` into guarded sections of the canonical
  `ContributionsPage`.
- Move contribution hooks, types, commands, and query keys into
  `Contributions`.
- Split `sponsorWorkspaceApi.ts` by domain:
  - family/support reads -> family or support-assignment service
  - contribution reads/commands -> contribution service
- Redirect the old `/sponsor/support` and `/sponsor/contributions` routes to
  `/family` and `/contribution` respectively.
- Delete `features/SponsorWorkspace` only after no route, component, service,
  test, or barrel export imports it.

### Merge `SponsorProfile` into `Sponsors`

- Preserve sponsor self-profile completion, details, create/update forms,
  validation schemas, React Query keys, and the missing-profile check.
- Move them under `features/Sponsors/components/profile`,
  `features/Sponsors/config`, `features/Sponsors/hooks`, and
  `features/Sponsors/lib`.
- Keep `/sponsor/profile` as the sponsor self-profile route unless a later
  canonical account-profile plan deliberately replaces it.
- Update `SponsorDashboardGate` to import the profile hook and missing-profile
  helper from `Sponsors`.
- Merge `sponsorProfileApi.ts` into the sponsor-owned API service only when the
  resulting service remains cohesive; do not create a generic workspace API.
- Delete `features/SponsorProfile` after all imports and tests use `Sponsors`.

### Merge `SponsorOverview` into `Sponsors`

- Preserve the five reusable overview cards because they are genuinely shared
  between `SponsorDashboardPage` and the admin/operator sponsor overview
  dialog.
- Move the cards and their shared types to
  `features/Sponsors/components/overview` and `features/Sponsors/types.ts`.
- Keep one implementation of each card; do not copy cards into both Dashboard
  and Sponsors.
- Update `SponsorDashboardPage` and `SponsorOverviewDialogContent` to import
  the same components from `Sponsors`.
- Delete `features/SponsorOverview` only after both consumers and their tests
  use the new feature-owned paths.

### Resulting ownership

```text
Families
  owns /family, family directory/view cards, and sponsor-safe family display

Contributions
  owns /contribution, contribution history, submission, and sponsor plans

Orders
  owns /orders and supported-family order projections

SupportAssignments
  owns sponsor-to-family assignment reads and commands

Sponsors
  owns sponsor directory management, sponsor self-profile, and reusable
  sponsor overview cards

Dashboard
  composes sponsor overview cards but does not own duplicate copies
```

### Import and cleanup example

Before:

```tsx
import { SponsorProfilePage } from "@/features/SponsorProfile";
import { SponsorSupportPage } from "@/features/SponsorWorkspace";
import { SponsorKpiGrid } from "@/features/SponsorOverview/components/SponsorKpiGrid";
```

After:

```tsx
import { SponsorProfilePage } from "@/features/Sponsors/components/profile/SponsorProfilePage";
import { SponsorKpiGrid } from "@/features/Sponsors/components/overview/SponsorKpiGrid";

// SponsorSupportPage is removed; /family renders FamiliesPage.
```

Prefer direct component imports for large browser-facing barrels when that
avoids loading unrelated sponsor forms or overview code.

### Consolidation acceptance

- No top-level `features/SponsorWorkspace`, `features/SponsorProfile`, or
  `features/SponsorOverview` folder remains.
- No source or test import references any removed folder.
- `/family`, `/contribution`, and `/orders` preserve their planned canonical
  role-scoped behavior.
- `/sponsor/profile` still supports profile completion and update.
- A missing sponsor profile still redirects the sponsor dashboard to profile
  completion without treating admin as a sponsor profile owner.
- Sponsor dashboard and admin/operator sponsor overview dialog render the same
  overview card implementations.
- Sponsor support selection, contribution submission, contribution-plan
  commands, and profile commands retain exact authenticated ownership.
- Query keys and invalidation move with their owning feature and do not collide
  or leak data across authenticated users.
- Existing en, fr, ar, and es localization, Arabic RTL, responsive layouts,
  loading/error/empty states, and keyboard behavior remain intact.
- Focused source-contract tests are updated to assert the new paths and absence
  of removed folders rather than preserving the old architecture.

## Completion Gate

After implementation, run the focused web tests, role/privacy backend tests,
production browser workflows for the family, contribution, order, children,
sponsor profile, and sponsor overview rules of all four accounts, and the
complete root gate required by `AGENTS.md`. Record the exact results before
changing this plan to **COMPLETE**.
