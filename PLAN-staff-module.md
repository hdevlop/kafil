# Staff Module Full-Stack Implementation Plan

Status: **COMPLETE (2026-07-30)**

Delivery integration addendum (2026-07-30): the Staff prerequisite and the
dependent order-delivery slice are complete. The MVP form exposes one visible
operational Role (`Operator` or `Delivery`) while retaining normalized function
storage. Operator creation always provisions and links its Najm account;
Delivery has no login. Immutable `order_delivery_attempts` history now blocks
permanent deletion, and operators consume only the safe active-delivery options
projection from the canonical Orders workflow.

## Implementation Evidence (this revision)

- `staffService.provisionOperatorAccessInternal` now updates both
  `contactEmail` and `userId` on the staff profile so `hasOperatorAccess` and
  rediscovery remain consistent (`staffService.ts`).
- `seedDemoData` forwards the admin `actorUserId` to
  `StaffService.createWithUserId` instead of an empty audit actor (`demo-seed.ts`).
- `StaffPage` ships with `manualPagination`, server-driven filters via
  `useStaffTableFilters(filters, setFilters)`, `pageCount`/`rowCount`, and
  `availableModes={["cards", "table"]}`.
- `StaffRepository.isPristine` and `listPristineIds` only reject records that
  carry a linked `userId`. Function membership is job metadata and does not
  by itself make a record non-pristine.
- `AdminAccessService.deactivate/reactivate` calls
  `AdminAccessRepository.syncStaffStatus` to keep the linked Staff profile
  status in lock-step with the Najm user.
- `CreateStaffDialogContent` shows the company-name field only when the
  affiliation is `external`, shows the access section only when the operator
  function is selected, and reveals `createOperatorAccessEmail` only when
  `createOperatorAccess` is on. Delivery-only creation closes the dialog
  immediately. Operator-access creation routes through the backend
  `createOperatorAccessEmail` field so the submitted login email is no longer
  discarded.
- `ProvisionStaffAccessDialogContent` now reads the
  `StaffProvisionAccessResult.initialPassword` from the API and renders the
  shared `InitialCredentialsCard` before closing.
- `getDashboardNavigation("operator", ...)` no longer exposes
  `/operator/staff`. `getDashboardNavigation("admin", ...)` lists
  `/operator/staff` inside the Access Management group.
- `apps/web/src/app/(dashboard)/operator/staff/page.tsx` calls
  `requireRole(["admin"])` server-side. The `layout.tsx` for that route is now
  a thin pass-through.
- `apps/web/test/staff-feature.test.ts` covers admin-only navigation, the new
  conditional form fields, the dedicated login email validation, lifecycle
  reasons, and the staff query-key shape.
- `packages/server/test/admin-access-modules.test.ts` asserts the new
  `syncStaffStatus` repository call on both deactivate and reactivate.

## Verification

```text
bun run --cwd packages/server typecheck        # OK
bun run --cwd packages/server test            # 300 pass / 31 skip / 0 fail
bun run --cwd packages/seed typecheck         # OK
bun run --cwd packages/seed test              # 71 pass / 0 fail
bun run --cwd apps/web lint                   # OK
bun run --cwd apps/web typecheck              # OK
bun run --cwd apps/web test                   # 224 pass / 0 fail
bun run lint                                  # OK
bun run typecheck                             # OK
```

Scope: create one Kafil Staff domain and admin workspace for current operators,
internal delivery people, external delivery contacts, and future staff
functions. The Staff page follows the existing Sponsors workspace pattern:
Najm Kit `NTable`, a built-in Add button, filters, row/card actions, responsive
cards, and **cards as the default view mode**.

This plan was the prerequisite for the now-complete delivery-assignment slice.
Delivery-person login/self-service and external courier expense accounting
remain out of scope.

## 1. Locked Product Decisions

1. Staff is one personnel directory. Do not create separate Operator,
   Deliverer, Driver, or Courier directories.
2. The MVP form accepts exactly one operational Role, `operator` or `delivery`.
   Normalized function storage remains extensible, but multi-role selection is
   not exposed in this release.
3. Staff functions are domain metadata used for filtering and assignment. They
   are **not** authorization roles and must not duplicate Najm RBAC/PBAC.
4. Existing Najm roles remain unchanged in this slice: `admin`, `operator`,
   `family`, and `sponsor`.
5. An existing or newly created operator is a Staff record with the `operator`
   function and a linked Najm user whose role is `operator`.
6. A delivery-only Staff record has no application account in this slice.
   Admin/operator confirmation through phone, WhatsApp, SMS, in-person, photo,
   or signature remains the delivery MVP. A restricted delivery login is a
   later authorization slice.
7. Staff may be `internal` or `external`. An external courier/contact may live
   in Staff so the same person can be selected repeatedly later.
8. Internal delivery is free. A future external delivery fee is paid by Kafil,
   is calculated separately, and never changes the family budget or order
   product total.
9. Deactivation is the normal removal workflow. Permanent deletion is
   admin-only and allowed only for a pristine Staff record with no account or
   business/audit/delivery history.
10. Staff management is admin-only. Operators receive only a narrow, safe list
    of active delivery-capable Staff when the delivery-assignment feature is
    implemented.
11. `/operator/staff` is the canonical management route. The existing Users
    area remains the technical Najm account/session view; it must no longer be
    a second place to create operators.

## 2. Current Repository Baseline

- `packages/server/src/modules/operators` currently owns operator profile data
  and provisions Najm users with the `operator` role.
- `operator_profiles` stores the existing staff-like identity fields: user,
  phone, CIN, gender, address, date of birth, job title, notes, and timestamps.
- Operator creation currently lives in the admin Users dialog and calls
  `POST /operators`.
- There is no dedicated Operators frontend workspace, no Staff domain, no
  delivery-person profile, and no delivery-person role.
- `apps/web/src/features/Sponsors/components/SponsorsPage.tsx` is the accepted
  workspace pattern. It already uses `NTable`, filters, the built-in Add
  action, responsive cards, row menus, empty/error states, and
  `defaultMode: "cards"`.
- Installed `najm-kit@2.1.43` declares `defaultMode`, `availableModes`,
  `responsiveCards`, `renderCard`, filters, menus, selection, and pagination on
  `NTable`. Use those contracts directly.
- Installed `najm-auth@2.0.11` owns user provisioning, roles, permissions,
  sessions, and token revocation. Continue using `AuthService.provisionUser`
  for operator access.

## 3. Target Domain Model

### 3.1 `staffProfiles`

Create `packages/server/src/modules/staff/staffSchema.ts` with a
`staff_profiles` table:

- `id` UUID primary key
- `userId` nullable unique FK to Najm users
- `name` required
- `contactEmail` nullable
- `phone` required and unique
- `image` nullable managed path/URL
- `affiliation`: `internal | external`
- `companyName` nullable; required for an external Staff record
- `cin` nullable unique
- `gender` nullable
- `address` nullable
- `dateOfBirth` nullable
- `jobTitle` nullable
- `status`: `active | inactive`
- `notes` nullable and private
- timestamps

The Staff profile owns display/contact information even when no Najm user is
linked. When a linked operator account exists, StaffService updates the Staff
profile and Najm user identity in the same transaction.

Validation rules:

- Internal operator Staff requires name, email, phone, CIN, gender, address,
  and date of birth, matching the current operator intake contract.
- Internal delivery-only Staff requires name and phone; HR/private fields may
  be completed later.
- External Staff requires name, phone, and company name.
- `contactEmail` is required when operator application access is requested.
- Phone remains globally unique at both Staff and Najm-user boundaries.
- CIN remains unique when supplied.
- App access and Staff status must not drift: deactivating linked Staff also
  deactivates the Najm user and revokes sessions.

### 3.2 `staffFunctions`

Create a normalized join table rather than a comma-separated or JSON field:

- `id` UUID primary key
- `staffProfileId` FK to `staff_profiles` with cascade on Staff deletion
- `functionKey` bounded string validated against the code-managed function
  registry
- timestamps
- unique constraint on `(staffProfileId, functionKey)`

Initial registry:

- `operator`
- `delivery`

The join is only job metadata. Controllers and services must still enforce
Najm roles and permissions.

### 3.3 Operator compatibility and migration

Generate one append-only migration; never edit an existing migration.

The migration must:

1. Create the Staff affiliation/status enums, `staff_profiles`, and
   `staff_functions`.
2. Backfill every `operator_profiles` row into `staff_profiles`.
3. Preserve the existing operator profile UUID as the Staff UUID where
   possible, retain the same `userId`, copy the Najm user name/email/image, and
   copy every operator profile field.
4. Add one `operator` function for every backfilled Staff record.
5. Derive Staff status from the linked Najm user.
6. Prove backfilled operator count, IDs, user links, phones, CINs, and images
   are unchanged.

Keep `operator_profiles` and the legacy operator-image serving path temporarily
for deployed-data compatibility, but make Staff the only runtime write owner.
Do not dual-write new Staff into both tables. Remove all runtime reads that
still require an `operator_profiles` row before closing the slice. Schedule
physical removal of the legacy table/path as a separate, evidence-backed
cleanup after rollback compatibility is no longer required.

## 4. Backend Module

Create the standard feature boundary:

```text
packages/server/src/modules/staff/
  staffController.ts
  staffDto.ts
  staffGuards.ts
  staffRepository.ts
  staffSchema.ts
  staffService.ts
  staffValidator.ts
  staffImageController.ts
  staffFunctions.ts
  index.ts
```

Add `staffSchema` to the composition-only database schema and export the module
through the server module barrel.

### 4.1 DTOs

Add Zod DTOs for:

- create Staff
- update Staff
- list/filter Staff
- Staff ID params
- deactivate/reactivate with required reason
- permanent delete confirmation
- bulk delete of pristine Staff, if the existing Sponsor bulk-delete UX is
  retained
- provision operator access for an existing Staff record
- active delivery-option query/projection

The list query must support server-owned:

- offset pagination
- search across name, email, phone, job title, and company
- status
- affiliation
- function
- application-access state

Parse DTOs both at controller and service boundaries.

### 4.2 Repository

Repository responsibilities:

- paginated Staff list plus a separate total count using identical filters
- fetch by Staff ID, linked user ID, phone, email, and CIN
- load functions without N+1 queries
- create/update Staff and replace function membership transactionally
- find active Staff by function for future assignment selectors
- detect linked history before deletion
- deterministic ordering by name then ID

The full admin projection may include private Staff fields. The future
delivery-option projection is limited to:

- Staff ID
- name
- image
- phone
- affiliation
- company name
- function keys

It must never include CIN, address, date of birth, notes, account permissions,
or session data.

### 4.3 Service commands

Implement explicit service commands:

- `list`
- `get`
- `create`
- `update`
- `deactivate`
- `reactivate`
- `deletePristine`
- `deletePristineMany`, only if bulk delete is kept
- `provisionOperatorAccess`
- `listDeliveryOptions`

Creation behavior:

- Delivery-only Staff is created without a Najm user.
- Staff containing `operator` may optionally create operator access in the
  same transaction.
- Operator access uses Najm `provisionUser({ role: "operator" })`, synchronizes
  normalized phone, and returns the one-time initial credential using the
  existing Kafil credential-handoff pattern.
- Adding the `operator` function later does not silently create an account;
  `provisionOperatorAccess` is an explicit audited command.
- Removing the `operator` function from linked Staff is refused until access is
  explicitly deactivated; never orphan a live privileged account silently.

Lifecycle behavior:

- Deactivation records the reason, deactivates any linked Najm user, revokes
  access/refresh sessions, and prevents future delivery assignment.
- Reactivation restores Staff status and linked-user status but does not
  recreate deleted credentials.
- Permanent deletion refuses any Staff member with a linked user, actor/audit
  history, or delivery history. Historical Staff is deactivated, never erased.

### 4.4 Controllers, permissions, and MCP

Canonical routes:

```text
GET    /staff
POST   /staff
GET    /staff/:id
PUT    /staff/:id
POST   /staff/:id/deactivate
POST   /staff/:id/reactivate
POST   /staff/:id/access/operator
DELETE /staff/:id
POST   /staff/bulk-delete              # only if implemented
GET    /staff/options/delivery         # safe projection for later order use
```

Authorization:

- Full list/detail/create/update/lifecycle/delete/access commands: admin only.
- Delivery options: admin/operator only, with a dedicated safe projection.
- Family and sponsor principals: always denied.
- Admin remains an explicit super-role, not an operator profile owner.

Add `staff` permissions to the code-managed auth definitions and seed them
idempotently. Keep permissions and role grants synchronized with controller
guards and seed verification. Do not expose generic status, function, or role
mutation endpoints.

Every eligible route receives Najm validation, translated `@ResMsg`, MCP
metadata, and audit events. Audit metadata may contain changed function keys,
affiliation, status, and access state, but never CIN, address, phone, notes,
credentials, or image paths.

### 4.5 Compatibility cleanup

- Move operator creation out of `AdminAccessCreateDialogs` to Staff.
- Change the admin-access repository to resolve `staffProfileId` and Staff
  summary data instead of depending on `operatorProfiles`.
- Keep `/operators` only as a temporary compatibility facade if any remaining
  client or seed caller requires it. It must delegate to StaffService and must
  not write `operator_profiles`.
- Update seed generation, demo removal, application reset, image backfill, and
  verification to use Staff.
- Continue serving existing `/api/operator-images/...` references while new
  uploads use the Staff image controller.

## 5. Frontend Staff Workspace

Create:

```text
apps/web/src/features/Staff/
  components/StaffPage.tsx
  components/StaffCard.tsx
  components/StaffDetails.tsx
  components/StaffForms.tsx
  hooks/useStaff.ts
  hooks/useStaffTableColumns.tsx
  hooks/useStaffTableFilters.ts
  hooks/staffKeys.ts
  config/staffSchemas.ts
  types.ts
  index.ts

apps/web/src/services/staffApi.ts
apps/web/src/app/(dashboard)/operator/staff/page.tsx
```

The route stays thin and performs an explicit server-side admin-role check,
because the parent operator layout also permits normal operators. Before route
implementation, read the installed Next.js 16 App Router guides for project
structure, layouts/pages, authentication, and route groups.

### 5.1 Page and table behavior

Build the page from existing Kafil wrappers and installed Najm Kit primitives:

- `NPageLayout`
- shared `DashboardPageHeader`
- `NTable`
- `NCard`, `NCardMedia`, `NCardSection`, and `NCardInfo`
- Najm dialogs, forms, buttons, badges, and feedback states

Required `NTable` behavior:

- `defaultMode="cards"`
- `availableModes={["cards", "table"]}`
- `responsiveCards`
- server pagination
- built-in Add button labeled `Add staff`
- filter controls
- row/card context menu and visible menu button
- loading, empty, filtered-empty, error, and retry states
- responsive card grid matching the Sponsors workspace density
- table/card view toggle remains available; cards are the first render

Do not store the selected view mode as server data. Use the Najm Kit table
contract; do not create a second custom view-mode control.

### 5.2 Filters

Provide server-driven filters:

- search name/email/phone/job title/company
- status: active/inactive
- affiliation: internal/external
- function: operator/delivery
- access: application account/no application account

Changing a filter resets offset to zero and updates the React Query key. Do not
fetch the first 100 records and filter them locally.

### 5.3 Staff card

Each card shows:

- managed avatar
- name
- job title or external company
- function badges
- internal/external badge
- active/inactive status
- phone
- email or `No application account`

Inactive Staff uses the existing muted/inactive visual treatment. Card content
must remain complete independently of hidden table columns.

### 5.4 Table columns

Include:

- Staff identity/avatar
- functions
- affiliation/company
- phone
- account access
- status
- created date

Use responsive column metadata from the installed Najm Kit contract rather
than CSS-only hiding.

### 5.5 Add and edit forms

The Add Staff dialog uses a compact responsive layout inspired by Sponsor
intake:

1. Identity: image, name, phone, optional email.
2. Work: affiliation, company, functions, job title.
3. Private profile: CIN, gender, address, date of birth, notes.
4. Access: optional `Create operator login`, available only when the operator
   function is selected.

Conditional behavior:

- External affiliation reveals and requires company name.
- Operator login reveals and requires email and the existing operator identity
  requirements.
- Delivery-only Staff defaults to no application access.
- Functions use Najm Kit multiselect and require at least one value.
- A successful operator-access creation shows the existing one-time
  credentials card before the dialog closes.
- Upload failures clean up newly uploaded orphan images.
- Editing awaits the mutation before closing and invalidates all Staff and
  admin-access query families affected by account changes.

Support the persisted F8 development form-fill workflow with safe Moroccan test
data. Put all visible copy in en/fr/ar/es translations and verify RTL.

### 5.6 Details and actions

View opens a Staff detail dialog showing:

- profile and contact information
- function list
- affiliation/company
- account/access status
- lifecycle timestamps
- later: delivery-assignment history slot

Menu actions:

- View
- Edit
- Provision operator access, when eligible
- Deactivate/reactivate with reason
- Delete permanently, only for a pristine record and with a danger dialog

The backend remains authoritative for every eligibility check.

### 5.7 Navigation and duplicate-control removal

- Add **Staff** to the admin-only Access Management navigation group.
- Keep normal operators from the full Staff management route.
- Remove the Operator tile/form from the generic Admin Users create dialog.
- Keep Users for account inspection, status, permissions, and session
  revocation; Staff owns personnel creation and profile editing.
- Do not add a second Operators page.

## 6. Delivery-Module Integration Boundary

This Staff slice must leave a clean contract for the next delivery plan:

- one active Staff selector sourced from `/staff/options/delivery`
- the same Staff ID can be assigned to many orders
- only active Staff with the `delivery` function are eligible
- assignments later keep immutable name/phone/affiliation/company snapshots
- a failed attempt does not delete or rewrite Staff history
- internal delivery cost defaults to zero
- external cost remains a Kafil operating expense outside the family budget

Do not add delivery assignment columns directly to Staff. Delivery assignments
belong to the future delivery feature and reference Staff.

## 7. Tests

### Backend

- DTO conditional validation for internal/external/operator/delivery variants
- function uniqueness and at-least-one-function validation
- globally unique phone and optional CIN behavior
- filtered list/count parity and deterministic pagination
- no N+1 function loading
- create delivery-only Staff without a Najm user
- create operator Staff with one transactional Najm account and one-time
  credential response
- explicit operator-access provisioning for an existing Staff record
- rollback when account or profile creation fails
- deactivation/reactivation and token/session behavior
- permanent-delete refusal for linked/history-bearing Staff
- admin allow and operator/family/sponsor denial for full Staff routes
- admin/operator allow plus privacy shape for delivery options
- MCP discovery and response-message coverage
- audit/outbox metadata contains no private Staff fields

### Migration and database

- generated migration-content assertions
- schema composition assertions
- backfill every existing operator exactly once
- preserve operator Staff IDs, user IDs, phones, CINs, images, and role
- unique constraints under real PostgreSQL
- transaction rollback for competing phone/CIN creation
- clean migration and previous-schema migration paths

### Frontend

- cards are the default mode
- table mode remains selectable
- Add Staff opens the create dialog
- search/status/affiliation/function/access filters update server queries
- pagination resets on filter change
- card and table contain the required information
- conditional external-company and operator-access form fields
- one-time credential handoff
- inactive visual state
- menu eligibility and pending/disabled states
- empty, filtered-empty, loading, error, and retry states
- en/fr/ar/es and RTL coverage
- no Operator creation control remains in Admin Users

### Browser workflows

1. Admin opens `/operator/staff` and sees cards by default.
2. Admin creates internal delivery-only Staff without an account.
3. Admin creates Staff with operator function/access and receives one-time
   credentials.
4. Filters find both records by function and affiliation.
5. Admin edits and deactivates Staff; deactivated Staff disappears from the
   delivery-options response.
6. Normal operator, family, and sponsor are denied the full Staff route/API.
7. Normal operator receives only the safe delivery-options projection.

## 8. Implementation Order

1. Reconfirm this root plan against `docs/PLAN.md`, `docs/plans/DECISIONS.md`,
   and the active Phase 7 plan.
2. Read installed Najm and Next.js contracts required by the slice.
3. Add Staff schema, function registry, and composition exports.
4. Generate and review the append-only migration and operator backfill.
5. Implement DTOs, repository, validator, service, guards, controller, images,
   response messages, MCP metadata, audit, and tests.
6. Move seed/admin-access/operator callers to Staff and establish the temporary
   `/operators` compatibility facade only where proven necessary.
7. Build the Staff frontend feature, service, thin route, translations, and
   admin navigation.
8. Remove duplicate Operator creation from Admin Users.
9. Run focused tests and real PostgreSQL migration/backfill checks.
10. Run the browser workflows.
11. Run the complete repository gate.
12. Update `docs/PLAN.md`, `docs/plans/DECISIONS.md`, the active section plan,
    and this plan with actual migration name, evidence, and final status.

## 9. Verification Gate

```text
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed typecheck
bun run --cwd packages/seed test
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run test:db
bun run build
bun run db:generate
bun run db:migrate
bun run check
```

Also verify production-like role behavior for `/operator/staff`, Staff APIs,
safe delivery options, MCP discovery, image serving, and direct-route denial.

## 10. Exit Gate

The Staff slice is complete only when:

- one Staff directory represents existing operators, internal delivery people,
  external delivery contacts, and future functions;
- all existing operators are backfilled without data or access loss;
- Staff is the sole runtime write owner and there is no duplicate Operator
  creation path;
- the admin Staff page opens in card mode and supports Add, filters, card/table
  views, details, edit, lifecycle actions, and safe pagination;
- Staff functions do not act as a parallel permission system;
- delivery-only Staff has no over-privileged operator account;
- the safe active-delivery selector is ready for the next delivery slice;
- all migration, authorization, privacy, browser, and global verification gates
  pass with recorded evidence.
