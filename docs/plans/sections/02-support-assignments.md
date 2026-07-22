# Section 02 - Support Assignments

Status: complete (2026-07-16)

## Goal

Create the controlled relationship that authorizes a sponsor to support and
view a specific family.

## Dependencies

- Family role and `familyProfiles`
- sponsor profiles
- audit events

## Data Model

### `supportAssignments`

- `id` UUID primary key
- `sponsorProfileId` FK to sponsor profile
- `familyProfileId` FK to family profile
- `childId` nullable FK retained only for historical records
- `status`: `active` or `ended`
- `startedAt`
- `endedAt` nullable
- `assignedByUserId`
- `endedByUserId` nullable
- `notes` optional operator-only
- timestamps

Rules:

- The family is the only target for every new assignment.
- Existing `childId` values remain readable as historical data; no migration
  removes or rewrites those rows.
- `endedAt` is required when status is ended.
- Prevent duplicate active assignments for the same sponsor/family target.
- Ending an assignment does not delete financial history.

## Backend Contract

Operator commands:

- list/filter assignments
- create assignment
- update operator-only notes without changing the sponsor/family relationship
- end assignment with reason
- reactivate only through a new assignment record

Sponsor queries:

- list the privacy-safe active-family support catalog
- list own assignments
- get own assignment
- get privacy-safe supported family summary

Avoid a generic update endpoint for assignment status.

## Privacy Projections

Sponsor family summary may include:

- family display label/reference
- city or broad area if approved
- number of children
- active assignment date
- total family budget, used, and remaining
- order summary after Section 05

Never include:

- exact address
- phone
- guardian legal identity
- CIN
- documents
- internal operator notes
- delivery instructions
- unrelated children
- identities of other sponsors

## Ownership Policy

Sponsor reads must join:

```text
authenticated user
  -> sponsorProfiles.userId
  -> supportAssignments.sponsorProfileId
  -> target family
```

Repository scoping and service validation must both reject unsupported
assignment resources. The catalog is the sole exception: it exposes
only active-family cards with a generated reference, family image,
active-child count, and funding progress. A guessed UUID must return not
found/forbidden without confirming another family's private identity.

## Historical Visibility Policy

A sponsor can list and read the minimal lifecycle record of an assignment they
previously owned, including whether it ended and when. Family and child privacy
summaries require an active assignment. Once it ends, those summaries return no
private target information.

## Implementation Checklist

- [x] Add assignment enum and schema
- [x] Add indexes and active uniqueness constraint
- [x] Generate migration `0004_phase2_support_assignments`
- [x] Add DTOs and filters
- [x] Restrict new assignments to family targets
- [x] Add create and end command services
- [x] Add audited operator-notes update command
- [x] Add sponsor ownership policy
- [x] Add privacy projection query service
- [x] Add privacy-safe sponsor family catalog and self-selection command
- [x] Add operator and sponsor controllers
- [x] Add audit events
- [x] Add MCP annotations
- [x] Add multi-sponsor/multi-family scoping tests
- [x] Add ended-assignment access tests

## Evidence

- `supportAssignments` is a feature-owned module with schema, policy, DTO,
  repository, validator, service, controller, and MCP exports.
- The migration adds the lifecycle enum, five foreign keys, an ended-state
  check constraint, four query indexes, and two partial unique indexes.
- Sponsor queries join authenticated users through `sponsorProfiles` to the
  assignment and repeat that ownership scope in repository methods.
- Focused DTO, lifecycle, cross-family, ownership, privacy, migration, and
  MCP tests passed. The full verification result was 59 server tests and 7
  seed tests, plus lint, typecheck, production build, and four 200 smoke
  responses from a fresh production server.
- Review correction (2026-07-16): the authentication seed now includes the
  exact `read`, `create`, and `update` permissions for the camel-case
  `supportAssignments` resource used by the route guards. Operator and sponsor
  assignments match their intended least-privilege capabilities.
- Local PostgreSQL is configured, all 11 migrations are applied, and repeated
  seed plus `seed:verify` runs confirm the role-permission assignments.
- MVP simplification (2026-07-19): new support assignments are family-only.
  The operator UI no longer fetches or displays child targets, the create DTO
  rejects child UUIDs, and the retarget command is no longer exposed. Existing
  nullable `childId` data remains untouched for historical compatibility.
  Targeted web/server tests, locale parity, typechecks, lint, and the root
  production build passed.
- Operator notes can be edited through a separate audited command. Sponsor and
  family links remain immutable; removing an assignment ends it and retains
  contribution history.

## Exit Gate

- One family can have several active sponsors.
- One sponsor can have several active supported families.
- Sponsors can browse only privacy-safe active-family catalog cards; assignment
  details remain scoped to their own support.
- Ended relationships follow the documented historical visibility policy.
