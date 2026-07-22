# Section 01 - Identity, Families, Children, and Audit

Status: complete (updated 2026-07-19)

## Goal

Add the authenticated Family role and safe account lifecycle while keeping one
family profile as the only private-family domain root.

## Reuse from the Current Repository

- `operatorProfiles` and its account service pattern
- `sponsorProfiles`
- protected `documentObjects`
- Najm `AuthService`, `UserService`, roles, permissions, and policies
- feature-owned module and schema composition conventions

## Data Model

### `familyProfiles`

- `id` UUID primary key
- `userId` unique FK to Najm users, cascade on user deletion
- `guardianLegalName`, required
- `guardianCin`, required and unique
- `exactAddress`, required
- `phone`, optional
- `createdByUserId`, required FK to Najm users
- `relationshipToChildren` optional short text
- `notes` optional operator-only text
- timestamps

The required, unique `userId` enforces exactly one login per family. The family
profile cannot exist independently from that login, and all private-family
records reference the family profile directly.

### Primary guardian identity

`familyProfiles.guardianCin` stores the primary guardian CIN next to
`guardianLegalName`. New intake requires an 8-20 character CIN and normalizes
it to uppercase. The column is required and unique, omitted from family
self-service and sponsor projections, and masked in operator UI displays.

### `children`

- `id` UUID primary key
- `familyProfileId` FK to `familyProfiles`
- `legalName`
- `dateOfBirth`
- `gender`
- `schoolLevel` optional
- `clothingSize` optional
- `shoeSize` optional
- `notes` optional and operator-only
- `status`: `active` or `inactive`
- timestamps

Index `familyProfileId` and family/status. Do not expose legal identity or
notes in sponsor projections.

### `auditEvents`

- `id` UUID primary key
- `actorUserId` nullable for trusted system tasks
- `action`
- `resource`
- `resourceId`
- `metadata` JSONB with filtered, non-secret context
- `requestId` optional
- `createdAt`

Audit events are append-only. Never record passwords, tokens, full identity
documents, or unfiltered request bodies.

## Authentication Changes

- Add `FAMILY: "family"` to `defineRoles`.
- Keep `ADMIN` as the only super-role.
- Add `isFamily` and include family in the account group.
- Change `authConfig.defaultRole` from `null` to `"sponsor"` so the built-in
  public registration route has one fixed business meaning.
- Add `family` to seed role types, role data, permissions, and verification.
- Keep operator creation admin-only.

## Account Workflows

### Operator creates a family

One transaction:

1. Validate family ID, user, guardian CIN, phone, and email uniqueness.
2. Call `AuthService.provisionUser({ role: "family" })` without accepting a
   caller-selected role.
3. Create `familyProfiles` with the returned `userId` and guardian identity.
4. Create the pooled budget and initial children against that family ID.
5. Create an audit event.
6. Commit.

If any database step fails, no partial family/account relationship
may remain. Email invitation delivery is best effort and must be retryable.

### Sponsor self-registration

1. Sponsor registers through Najm `/auth/register`.
2. Najm assigns the fixed `sponsor` role.
3. Sponsor authenticates and completes `/sponsors/me/profile`.
4. Contribution actions remain blocked until the required profile fields exist.

Keep a separate operator create/invite sponsor path if operational intake needs
it. Public onboarding and operator provisioning use different DTOs.

### Account lifecycle

- Operator may deactivate/reactivate family and sponsor users.
- Bootstrap admin manages operator accounts.
- Deactivation updates Najm user status and creates an audit event.
- Deactivation does not delete family, child, contribution, ledger, or order
  history.
- Bootstrap admins may permanently delete child records or family accounts;
  those endpoints use Najm `@CanDelete`, are audited, and are hidden from all
  other roles in the UI. Permanent family deletion removes the login and the
  complete linked family graph in one transaction, including child, financial,
  document, support, cart, and order records.

## Backend Modules

Add:

```text
modules/families/
modules/children/
modules/audit/
```

Required family operations:

- operator list/get/create/update
- operator deactivate/reactivate
- admin permanent delete
- family get own profile summary
- family read own children

Required child operations:

- operator list/get/create/update/deactivate
- admin permanent delete
- family list/get own

Required sponsor profile operations:

- sponsor create own profile once
- sponsor read/update own allowed fields
- operator list/get/update/deactivate

Use command-specific DTOs. Caller-controlled `role`, `roleId`,
`emailVerified`, balance fields, and status escalation fields must be stripped
or rejected.

## Authorization and Privacy

### Operator

- Full family and child management.
- Cannot create another operator.

### Family

- Reads only the profile linked through `familyProfiles.userId`.
- Reads only children belonging to that family.
- Cannot update operator-owned family identity or children in the MVP.

### Sponsor

- No family/child access until Section 02 assignment policies exist.

### Admin

- Super-role access for recovery, not ordinary workflow.

## Migration Strategy

1. Keep historical migrations unchanged.
2. Migration `0013_unify_family_profiles` copies guardian identity from each
   linked legacy household into its family profile.
3. Remap children, documents, budgets, support, contributions, carts, and
   orders from legacy household IDs to family profile IDs.
4. Abort if an unlinked legacy household still owns dependent records or if a
   linked family lacks guardian CIN; never discard protected data.
5. Remove empty legacy orphans and the `private_households` table only after
   the guarded remap.
6. Require every new family profile to have exactly one Najm login.

## Implementation Checklist

- [x] Add role and group guards
- [x] Add family permissions
- [x] Update auth default public role
- [x] Resolve and document the baseline Drizzle column prompt
- [x] Add schemas and global schema exports
- [x] Generate migration
- [x] Add family DTOs/repository/validator/service/controller
- [x] Add child DTOs/repository/validator/service/controller
- [x] Add audit repository/service
- [x] Split sponsor public onboarding from operator provisioning
- [x] Add deactivate/reactivate commands
- [x] Add family ownership policies
- [x] Update MCP tools and discovery test
- [x] Add migration/schema tests
- [x] Add multi-user ownership tests
- [x] Add account transaction rollback tests
- [x] Add required, unique, privacy-safe primary guardian CIN intake
- [x] Remove the standalone household module, routes, policies, and selectors
- [x] Remap all domain foreign keys to `familyProfileId`
- [x] Apply guarded migration `0013_unify_family_profiles`

## Progress Evidence

2026-07-19 single family-root refactor:

- `familyProfiles` now owns guardian identity and is the required parent for
  children, documents, budgets, support assignments, contributions, carts,
  and orders. The household module and `/households` API were removed.
- Migration `0013_unify_family_profiles` was applied successfully to the local
  PostgreSQL database. It remaps linked rows, drops only empty standalone
  household records, and aborts if a standalone record still owns data.
- The operator child, budget, and assignment selectors now load `/families`.
  Family creation is one flat transaction that creates the login and profile.
  Bootstrap-admin permanent deletion removes the complete linked family graph
  and login transactionally.
- Drizzle generation reports no schema changes. Server verification passes
  112 tests with the opt-in database concurrency test skipped.

2026-07-19 primary guardian CIN extension:

- New family intake requires an uppercase CIN; repository and
  database uniqueness protect against duplicate guardian identities.
- Migration `0012_harsh_professor_monster.sql` adds only the nullable legacy
  column and unique constraint and is applied to the configured local database.
- Family self-service omits CIN, audit metadata strips both `cin` and
  `guardianCin`, and operator family displays mask the stored value.
- `bun run check` passed with web 96, server 117, and seed 10 tests passing; the
  opt-in database concurrency test remained skipped. A second
  `bun run db:generate` reported no schema changes.

2026-07-16 identity configuration slice:

- `FAMILY: "family"`, `isFamily`, and account-group membership were added to
  the Najm role configuration; only `ADMIN` remains a super-role.
- Public `/auth/register` now has the fixed `sponsor` default role. Family
  accounts remain an operator-provisioned workflow.
- The idempotent auth seed includes `family`, operator permissions for family
  and child management, and family read-only permissions. Seed verification
  tests and server auth-definition tests passed. `bun run lint`, `bun run
  typecheck`, and `bun run test` passed (41 tests); `bun run build` passed with
  the documented in-memory email/auth environment.
- `bun run db:generate` reached Drizzle's existing profile-column conflict
  resolver, but could not continue because this execution environment has no
  TTY. The old `preferred_language`, country, currency, and communication
  fields are not known semantic renames of the current identity fields. Resolve
  that prompt deliberately against the target database before any migration is
  generated; no migration metadata or SQL was changed by the preflight.

2026-07-16 domain implementation slice:

- Added feature-owned `familyProfiles`, `children`, and append-only
  `auditEvents` schema modules and included them in the global schema export.
- The original transition included an orphan-household report and a separate
  household/profile link. The 2026-07-19 refactor above supersedes and removes
  both transitional surfaces.
- Operator family creation runs as one transaction: it provisions a fixed
  `family` Najm account without a password, creates the family profile and
  initial children, then records an audit event. Cross-family reads are
  rejected.
- Sponsor registration remains public-account creation only. A sponsor can
  create and update only its own profile, with a projection that excludes
  internal notes. Operator/admin lifecycle controls now deactivate/reactivate
  sponsors instead of deleting them; both lifecycle transitions are audited.
- Family, child, and sponsor tools are registered in MCP discovery. Focused
  ownership, transaction, DTO, audit-filtering, seed, and discovery coverage
  passed: 51 tests total (44 server, 7 seed), plus `bun run lint`, `bun run
  typecheck`, and a production `bun run build` using the documented in-memory
  email/auth environment.
- The original profile-column prompt was resolved without renaming or dropping
  data: legacy language/country/currency/communication columns remain private,
  while new identity columns are nullable only for existing profiles. DTOs keep
  those fields required for new profiles. Drizzle generated
  `0003_phase1_identity_families.sql` and `0003_snapshot.json`; a second
  generation run reported no schema changes.
- The migration test confirms that `0003` creates the Phase 1 tables and adds
  nullable backfill columns without `DROP`, `RENAME`, or `SET NOT NULL` SQL.
  Ownership coverage verifies a linked family can read its child while a second
  family receives a not-found result. The rollback test invokes Najm's
  registered transaction wrapper and confirms a failing child write rolls back
  the provisioning transaction before any audit event is persisted.
- Final closeout passed: `bun run check` (53 tests: 46 server, 7 seed), then a
  production-server smoke test with HTTP 200 from `/`, `/dashboard`, and
  `/api/system/health`. Current local verification supersedes the original
  database caveat: PostgreSQL is configured and all 11 migrations, including
  `0003`, are applied.

2026-07-18 admin deletion extension:

- Added audited `DELETE /children/:id` and `DELETE /families/:id` routes with
  Najm `@CanDelete` and `@isAdmin()` enforcement. The admin receives the two
  new delete permissions; operators do not. The operator UI reads the hydrated
  Najm session and only renders the destructive menu command for `admin`.
- Child deletion is permanent. Bootstrap-admin family deletion removes the
  login, profile, and all linked domain records in one audited transaction.

## Exit Gate

- [x] Seed verification returns `admin`, `operator`, `family`, and `sponsor`.
- [x] Public registration cannot create a family or operator.
- [x] An operator-created family receives a Najm invitation and linked profile.
- [x] Two families cannot read each other's profile or children.
- [x] Sponsors have no raw family identity access.
- [x] Deactivation updates Najm account status without deleting history.
- [x] `bun run check` and `bun run db:generate` pass with recorded results.

## Configurable Funding Lifecycle Extension — 2026-07-18

`familyProfiles` now owns a funding lifecycle independent from Najm user
status. New families start as `pending_funding`; account access remains
available, while the one-way `active` funding state records when household
ordering becomes eligible. Migration `0010_configurable_family_funding`
preserves previously ordering households and qualifying historical funding.
