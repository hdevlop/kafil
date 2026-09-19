# Auth role integrity and production grant recovery

Date: **2026-09-19**

Status: **Source repair implemented, verified, and committed in both
repositories (Phases 1-4 and 6). No package publication, migration, production
write, session revocation, deployment, or connected acceptance has been
performed, and nothing is pushed.** See section 18 for the exact boundary
reached.

Execution owner: **Claude Opus coder**

## 1. Incident and required outcome

Production currently exhibits both of these symptoms:

- Sponsor, Family, and Operator users authenticate but receive unauthorized
  responses.
- The Admin Access roles page shows Admin with 45 permissions while Operator,
  Family, and Sponsor show zero permissions and grant drift.

The production verification command supplies the decisive database evidence:

```text
bun run seed:verify
Kafil seed verification failed: Expected exactly one role named 'delivery', found 2.
```

The required outcome is:

1. Consolidate duplicate code-managed role rows without losing users, custom
   permission grants, or historical application data.
2. Restore the exact code-managed grants for every fixed Kafil role.
3. Prevent a failed full seed from deleting working grants and leaving a
   partially seeded authorization state.
4. Invalidate stale authorization snapshots only for users affected by an
   actual role/grant repair, forcing clean claims on the next sign-in.
5. Fix the shared Najm Auth schema/seed contract so duplicate role names cannot
   recur under concurrent, legacy, manual, or repeated seeding paths.
6. Add a new Kafil migration enforcing role-name uniqueness only after the
   production duplicate has been safely repaired.
7. Prove Operator, Family, Sponsor, Delivery, and Admin behavior independently.

This is an authorization-data integrity incident, not a frontend provider,
language menu, query-key, or page-header defect. Do not modify
`apps/web/src/shared/PageHeaderGlobalActions.tsx` or fold its existing dirty
edit into this work.

## 2. Confirmed cause

### 2.1 Shared Najm source defect

The authoritative source checkout is `C:\Users\hdevlop\Desktop\najm`.
Kafil and that checkout both currently identify `najm-auth` as version `4.0.4`.

The defect spans these shared source owners:

| Owner | Confirmed behavior | Consequence |
| --- | --- | --- |
| `packages/najm-auth/src/schema/pg.ts` | `roles.name` is non-null but not unique | PostgreSQL accepts two roles with the same name. |
| `packages/najm-auth/src/schema/sqlite.ts` | Same missing uniqueness invariant | SQLite consumers have the same schema weakness. |
| `packages/najm-auth/src/seed.ts` | Role seed entries use deterministic IDs but do not declare `by: ["name"]` | Seed conflict detection defaults to the primary key instead of the domain identity. |
| `packages/najm-database/src/SeedService.ts` | Missing `by` falls back to detected primary/unique keys | A legacy/random ID and `role_delivery` are treated as distinct rows. |
| `packages/najm-auth/src/seedAuthData.ts` | Auth seeding runs with `transaction: false` | A later failure does not undo already-applied seed writes. |

Do not casually change `seedAuthData()` to `transaction: true`. The current
transactional preview resolves downstream rows from input IDs before querying
existing rows. With a legacy role ID and name-based conflict handling, that can
make downstream users/grants reference the proposed stable ID rather than the
existing database ID. Any SeedService transaction redesign is a separate
shared change requiring its own tests.

### 2.2 Kafil failure amplifier

`packages/seed/src/seed-auth.ts` currently performs the dangerous sequence:

```text
clear managed grants
  -> call non-transactional seedAuthData()
  -> synchronize role grants
  -> verify
```

If duplicate roles are encountered after the clear:

- Admin grants are recreated by Najm's auth seed.
- Kafil's managed grants for Operator, Family, and Sponsor remain deleted.
- Verification stops at the duplicate Delivery role.
- Existing access/session claims continue to contain stale or empty
  permissions until invalidated or naturally replaced.

This explains the observed Admin `45` / other roles `0` state. The recent root
provider/query/delivery plans did not change `najm-auth`, Kafil role definitions,
or this seed sequence. A later full authorization seed exposed a latent
production duplicate.

## 3. Frozen safety decisions

### 3.1 Use two production releases

Do not combine the incident repair and the new uniqueness constraint into one
first deployment.

```text
Release A: repair existing authorization data with the current schema
  -> verify grants
  -> invalidate affected sessions
  -> connected role smoke

Release B: consume fixed Najm Auth schema
  -> add Kafil uniqueness migration
  -> migrate already-clean production data
  -> repeat verification and connected smoke
```

The current deployment order is migration first, authorization reconciliation
second. A Release-B uniqueness migration would fail immediately while the
duplicate still exists. Release A makes Release B safe.

### 3.2 Do not delete a duplicate role blindly

A duplicate role can own:

- `users.role_id` references;
- `role_permissions` rows for code-managed permissions;
- `role_permissions` rows for Admin-created custom permissions.

The repair must move/merge these relationships before deleting the redundant
role row. Never use `DELETE FROM roles WHERE name = 'delivery'` or delete an ID
chosen only from visual ordering.

### 3.3 Managed and custom role names have different policies

- Kafil may automatically consolidate duplicates only for the five fixed
  code-managed roles: `admin`, `operator`, `delivery`, `family`, and `sponsor`.
- Before the global unique constraint is added, report all duplicate role
  names.
- If an unknown/custom role name is duplicated, stop with a sanitized error.
  Do not infer that two custom roles are semantically interchangeable.
- Custom permission grants attached to a fixed role must be preserved while
  consolidating that fixed role.

### 3.4 Keep secrets and identities out of output

- Do not print `.env`, database URLs, Redis URLs, passwords, cookies, JWTs,
  refresh tokens, emails, user IDs, or role IDs in ordinary logs/evidence.
- Reconciliation output may report counts and role names only.
- Protected deployment logs remain mode-restricted by the existing
  `umask 077` workflow.

### 3.5 Respect separate authorization mechanisms

Delivery intentionally has zero generic permission grants. Delivery access is
provided through its named role guard plus assigned-workflow ownership. Do not
grant broad order, family, budget, or operator permissions merely to make the
roles page show a non-zero count.

Admin remains the bootstrap super-role. Do not create an Operator, Family,
Sponsor, or Delivery profile for Admin to make product endpoints pass.

## 4. Repositories, instructions, and dirty-work protection

### 4.1 Kafil

Working directory: `C:\Users\hdevlop\Desktop\kafil`

Before implementation:

1. Read root `AGENTS.md` completely.
2. Read `.agents/skills/kafil-najm-backend/SKILL.md` completely.
3. Read this plan completely.
4. Inspect `git status --short` and preserve unrelated work.
5. Confirm the existing dirty edit in
   `apps/web/src/shared/PageHeaderGlobalActions.tsx`; never reformat, restore,
   stage, or commit it as part of this slice.
6. Re-read installed `najm-auth` declarations only to verify the Kafil runtime
   contract; use the sibling Najm source for the upstream implementation.

Primary Kafil owners:

- `packages/seed/src/seed-auth.ts`
- `packages/seed/src/scripts/reconcile-auth.ts`
- `packages/seed/src/scripts/verify.ts`
- `packages/seed/test/auth-definitions.test.ts`
- `packages/seed/test/deploy-auth-reconciliation.test.ts`
- new focused authorization-reconciliation unit/database tests
- `packages/server/src/database/schema.ts` only as a shared-schema composition
  entrypoint; do not copy the auth table locally
- `packages/server/migrations/` only in Release B
- `packages/server/test/migration.test.ts` or a focused migration-content test
- `compose.production.yml`
- `scripts/deployVps.sh`
- `package.json`, `packages/seed/package.json`, and package pins only when the
  relevant phase requires them

### 4.2 Najm

Working directory: `C:\Users\hdevlop\Desktop\najm`

Before implementation:

1. Read root `AGENTS.md` completely.
2. Inspect `git status --short` and preserve unrelated edits, currently
   including `NAJM-KIT-GLOBAL-ACTIONS-PLAN.md` and
   `docs/evidence/global-actions/README.md` unless their status changes.
3. Work only in `najm-auth` and its directly required shared seed tests unless
   evidence proves `najm-database` must change.
4. Do not edit `najm-kit`, its plan, or its evidence for this incident.

Primary Najm owners:

- `packages/najm-auth/src/schema/pg.ts`
- `packages/najm-auth/src/schema/sqlite.ts`
- `packages/najm-auth/src/seed.ts`
- `packages/najm-auth/src/roles/RoleService.ts`
- `packages/najm-auth/src/roles/RoleRepository.ts`
- `packages/najm-auth/test/`
- `packages/najm-auth/README.md`
- `packages/najm-auth/CHANGELOG.md`
- `packages/najm-auth/package.json` only during the authorized version phase
- `packages/najm-database/src/SeedService.ts` only if a test demonstrates a
  generic seed-engine defect not solved by the correct auth seed declaration

## 5. Phase 0 — Preserve and diagnose production state

Status: **Not started. Requires production and deployment authority.**

This phase is read-only except for creating the protected database backup.
Production access and backup operations require explicit deployment authority.

### 5.1 Backup gate

Before any production authorization write:

- create a timestamped PostgreSQL backup using the established VPS backup
  workflow;
- verify the backup command exit code;
- record its protected path, size, and checksum without exposing database
  credentials;
- confirm the restore procedure that would be used if relationship movement
  produced unexpected counts.

Do not proceed from a failed or unverified backup.

### 5.2 Read-only incident inventory

Collect a sanitized report containing:

- every duplicated role name and duplicate count;
- for each duplicate fixed role, the count of users referencing each row;
- the count of permission links on each row;
- whether the deterministic seed ID exists;
- total active refresh-token/session families for affected users as a count;
- current code-managed role grant counts;
- current count of custom permission grants per fixed role.

The report may use role names but must not print user identities, secrets, token
values, or raw environment values.

### 5.3 Expected incident baseline

At minimum, evidence must confirm:

- two rows named `delivery`;
- one row each for every other fixed role, or separately record additional
  duplicates;
- Admin has the current complete managed grant set;
- Operator, Family, and Sponsor are missing their expected managed grants;
- the verification failure occurs before reporting a complete result.

If production differs, update this plan's evidence section before mutation.

## 6. Phase 1 — Kafil duplicate consolidation core

Status: **Complete.** Implemented in
`packages/seed/src/authorization-reconciliation.ts`, with the shared
deterministic ID helper extracted to `packages/seed/src/seed-ids.ts`. The
transactional owner holds `pg_advisory_xact_lock`, selects the canonical row
(stable seed ID, then oldest, then ID), unions role-permission links before
deleting a redundant row, moves `users.role_id`, asserts one row per fixed role,
then applies exact managed grants. A missing fixed role is now created **at the
deterministic seed ID**, which is what stops a later Najm seed inserting a second
row beside it.

Implement one testable database-owned reconciliation path in
`packages/seed/src/seed-auth.ts`. Do not add a parallel SQL-only script with a
different role policy.

### 6.1 Transaction and lock

The full managed-role repair and managed-grant replacement must run in one
PostgreSQL transaction protected by:

```sql
select pg_advisory_xact_lock(hashtext('kafil:authorization-seed'))
```

Concurrent reconciliation attempts must serialize. No observer may see users
moved to a new role while its grants are still incomplete.

### 6.2 Canonical fixed-role selection

For each `AUTH_ROLES` name:

1. Load every matching row, including ID and creation metadata.
2. If no row exists, insert the canonical role definition.
3. If one row exists, keep it and update only its code-managed description.
4. If multiple rows exist:
   - prefer the deterministic seed ID derived by Najm's documented seed-ID
     normalization when it exists;
   - otherwise choose the oldest row;
   - use the role ID as a stable final tie-breaker;
   - report only that one duplicate set was consolidated, not the raw IDs.

Extract the deterministic ID normalization into a shared/tested helper instead
of maintaining slightly different copies in several seed paths.

### 6.3 Relationship movement

For every redundant fixed-role row, in this order:

1. Insert the union of its `role_permissions` links onto the canonical row with
   conflict-safe semantics. This preserves custom permission grants.
2. Update all `users.role_id` references to the canonical role ID.
3. Delete the redundant role row. Its remaining permission links may cascade
   only after the union is safely present.
4. Assert that no user references the removed ID and exactly one row remains
   for the role name.

Only `users.role_id` and `role_permissions.role_id` currently reference roles;
re-verify the current schema and migrations before coding. If a new foreign key
exists, include it rather than relying on this snapshot.

### 6.4 Managed grants versus custom grants

After consolidation:

- upsert every `AUTH_PERMISSIONS` row by permission name;
- for fixed roles and code-managed permissions, replace the live association
  set with exactly `AUTH_ROLE_PERMISSIONS`;
- preserve permission links whose permission name is not code-managed;
- never grant custom permissions to another role merely because duplicate rows
  were consolidated;
- verify exact equality for managed grants, not only that expected grants are
  a subset of live grants.

The expected current managed counts are:

| Role | Expected managed permissions |
| --- | ---: |
| `admin` | 45 |
| `operator` | 27 |
| `delivery` | 0 |
| `family` | 6 |
| `sponsor` | 10 |

Counts are evidence, not the source of truth. The named arrays in
`AUTH_ROLE_PERMISSIONS` remain authoritative.

### 6.5 Reconciliation result

Return a structured internal result with:

- verification data;
- fixed-role duplicate sets consolidated, by role name and count;
- number of users moved;
- number of managed grant links added/removed;
- affected user IDs for post-commit invalidation.

The command-line script must log only the sanitized counts. Do not serialize
the internal user-ID list.

## 7. Phase 2 — Make full seeding grant-safe

Status: **Complete.** `clearManagedRolePermissions()` and `syncRolePermissions()`
are removed. `seedAuthentication()` now reconciles transactionally, reconciles
the bootstrap Admin email, calls Najm's `seedAuthData()`, synchronizes Admin
credentials, reconciles again, and verifies. One algorithm owns fixed-role
repair, managed-permission upsert, exact grant replacement, custom-grant
preservation, and verification.

Refactor `seedAuthentication()` so a later failure cannot strand authorization
with cleared grants.

### 7.1 Remove the destructive pre-clear

Remove `clearManagedRolePermissions()` from the pre-seed path. Do not delete
working grants before calling non-transactional `seedAuthData()`.

The target sequence is:

```text
reconcile/repair fixed authorization data transactionally
  -> reconcile bootstrap Admin email where the full setup contract requires it
  -> call Najm seedAuthData() for Admin identity/credential creation
  -> synchronize Admin credentials
  -> run the same transactional authorization reconciliation again
  -> verify Admin identity plus exact authorization data
```

The first reconciliation makes legacy duplicates safe before Najm seeds. The
second establishes the final exact managed grants after Najm's Admin seed.

### 7.2 One grant owner

Fold or retire `syncRolePermissions()` if it duplicates the authoritative
transactional reconciliation. There must be one algorithm for:

- fixed-role uniqueness repair;
- code-managed permission upsert;
- exact managed-grant replacement;
- preservation of custom grants;
- verification.

Do not leave full setup, deployment reconciliation, and verification with
three subtly different interpretations of the same role data.

### 7.3 Keep deployment identity-free

`reconcileAuthorizationSeed()` must continue to avoid changing:

- Admin email;
- Admin password;
- Admin verification/status;
- application profile data.

It is now permitted and required to update `users.role_id` solely to consolidate
duplicate fixed roles. Update the structural test that currently forbids any
`usersTable` reference: assert the narrower identity-free contract instead.

## 8. Phase 3 — Invalidate repaired authorization sessions

Status: **Complete.** `packages/seed/src/scripts/reconcile-auth.ts` initializes
the candidate server, resolves Najm Auth's `TokenService` from the container, and
passes a bounded invalidation callback into the reconciliation owner. The
callback runs inside the repair transaction before it may commit, so an
invalidation failure rolls the repair back. `compose.production.yml` now makes
`auth-reconcile` wait for both PostgreSQL and Redis, still on the backend network
with no published port.

Deliberate deviation from section 6.5: the returned summary carries counts only.
Affected user IDs are handed to the bounded callback inside the transaction and
never leave it, so no caller can serialize them into a log.

Database grants do not rewrite already-issued access tokens or signed session
cookies. A successful repair is incomplete until stale claims are invalidated.

### 8.1 Determine affected users precisely

Mark a fixed role as changed when any of these occurs:

- a user is moved from a duplicate row;
- its managed permission set changes;
- its canonical role identity changes.

Collect all users holding changed roles. Do not invalidate every user on every
idempotent deployment.

### 8.2 Use Najm Auth's official invalidation contract

Initialize the candidate server/runtime before reconciliation. After the
transaction determines the exact affected users, but before it is allowed to
commit, call the installed Najm Auth token service for each affected user:

```text
invalidateUserAccessTokens(userId)
revokeAllForUser(userId)
```

This must invalidate access/session versions in Redis and revoke refresh-token
families in PostgreSQL. Do not emulate only half of this behavior with an ad
hoc token-table update. Passing a bounded invalidation callback into the
reconciliation owner is acceptable; importing/cache-constructing a second auth
stack inside `seed-auth.ts` is not.

If invalidation fails:

- throw before the role/grant transaction commits;
- the reconciliation command exits non-zero;
- the deployment does not replace the running app;
- role moves and grant changes roll back together;
- sessions already invalidated earlier in the bounded loop may require users to
  sign in again, which is an acceptable fail-closed side effect;
- rerunning reconciliation safely retries the complete repair.

This ordering deliberately prefers an unnecessary sign-out on a failed repair
over committing repaired grants while old empty-permission claims remain live.
Do not move invalidation after commit unless a durable database-backed repair
marker/outbox is added and tested in a separately reviewed schema change.

### 8.3 Compose dependency

Because reconciliation will require Redis-backed invalidation, update the
`auth-reconcile` service to wait for both PostgreSQL and Redis health and retain
backend-network access only. It must not join the frontend network or expose a
port.

The command logs only affected-user counts. Users should receive a normal
signed-out/reauthentication experience; no token value belongs in evidence.

## 9. Phase 4 — Kafil regression coverage

Status: **Complete.** See section 18 for the exact commands and results.

### 9.1 Pure/unit coverage

Add focused tests for:

- deterministic canonical-role selection;
- preference for the stable seed ID;
- oldest-row and ID tie-break fallback;
- refusal to auto-merge duplicated custom role names;
- exact managed-grant comparison;
- preservation of custom grants;
- sanitized summaries that omit IDs and identities;
- idempotent second reconciliation producing zero repairs and zero
  invalidations.

### 9.2 Real PostgreSQL coverage

Add an opt-in seed integration suite using disposable rows/transactions or a
dedicated disposable database. It must prove:

1. A legacy/random `delivery` role and stable `role_delivery` can coexist in
   the fixture.
2. Users attached to both rows end on the canonical row.
3. Custom grants from both rows are preserved.
4. Exactly one Delivery row remains.
5. Operator, Family, Sponsor, and Admin managed grants are restored exactly.
6. Delivery remains at zero managed grants.
7. Two concurrent reconciliation calls serialize and finish with one role row
   and no duplicate role-permission links.
8. A forced failure inside the transaction rolls back role moves, link changes,
   and deletions together.
9. A second successful run is idempotent.
10. A full seed failure after the first safe reconciliation cannot erase the
    previous working grants.

Add a `packages/seed` DB-test script and include it in the root DB integration
gate, or document an equally explicit command. Do not hide this coverage in the
ordinary unit suite by silently connecting to a developer database.

### 9.3 Deployment contract coverage

Extend `packages/seed/test/deploy-auth-reconciliation.test.ts` to assert:

- migration still runs before reconciliation;
- Release A contains no role-name uniqueness migration;
- reconciliation waits for PostgreSQL and Redis;
- failed reconciliation blocks app replacement;
- the command verifies exact grants;
- logs remain protected and sanitized;
- no Admin credential variables are required by deployment reconciliation.

### 9.4 Focused Kafil validation

Run from `C:\Users\hdevlop\Desktop\kafil`:

```bash
bun run --cwd packages/seed lint
bun run --cwd packages/seed typecheck
bun run --cwd packages/seed test
bun run --cwd packages/server test
bun run test:db
```

Then close the Release-A source slice with the root gate:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

For Release A, `db:generate` must report no schema change. If it creates a
migration, stop and investigate rather than shipping it with the repair.

## 10. Phase 5 — Release A production recovery

Status: **Not authorized / not started.** No commit, push, image, deployment,
production write, or session revocation has been performed.

Source completion does not authorize Git publication, image publication,
deployment, database repair, or session revocation. Obtain explicit authority
for each external mutation boundary.

### 10.1 Candidate and pre-deploy checks

- Commit only the reviewed Kafil incident repair and its plan/evidence updates.
- Exclude the user's unrelated frontend edit.
- Push only when explicitly authorized.
- Wait for the immutable image tagged to the exact Git SHA.
- Verify its OCI revision label and digest.
- Confirm the protected production backup from Phase 0 is current.

### 10.2 Deploy sequence

The existing deployment script remains fail-closed:

```text
pull exact candidate image
  -> run migrations (none expected for Release A)
  -> run candidate auth reconciliation
  -> invalidate affected sessions
  -> verify exact authorization data
  -> replace app and notification worker
  -> verify readiness/security headers/image revision
```

Because Release A changes persistent role relationships, application rollback
does not reverse that data repair. This is intentional: canonical roles and
restored grants are compatible with the previous app. Record that distinction
instead of claiming the deployment rollback restores the old duplicate rows.

### 10.3 Production verification

From the candidate/runtime environment, run:

```bash
bun run seed:verify
```

Required result:

- exactly one row for every fixed role;
- 45 current managed permissions;
- exact per-role managed counts 45/27/0/6/10;
- zero managed grant drift;
- built-in theme verification still passes;
- no identity or secret appears in logs.

The Admin roles page must show the same counts and `In sync` for all fixed
roles. Delivery showing `0 permissions` is correct only when it also shows
`In sync`.

## 11. Phase 6 — Najm Auth upstream prevention

Status: **Source complete; version not prepared.** Both dialect schemas declare
`roles_name_unique`, `authSeed()` declares `by: ['name']`, and `RoleService` maps
a lost create/rename race to the existing 409 conflict. README and CHANGELOG are
updated. Every focused gate plus the full sequential Najm suite passes, and the
change is committed to `najm` master (unpushed). The version remains `4.0.4`:
this environment's permission gate refuses `scripts/publish-package.ts`, so
version preparation and publication are still blocked.

Implement in `C:\Users\hdevlop\Desktop\najm` after preserving unrelated dirty
work.

### 11.1 Schema invariant

Add a database-enforced unique role-name contract for both dialects:

- PostgreSQL `roles.name` unique constraint/index;
- SQLite `roles.name` unique constraint/index;
- deterministic, documented constraint naming where the schema API supports
  it.

Keep the service validator for friendly errors, but do not rely on a
check-then-insert query for concurrency safety.

### 11.2 Seed identity

Update the `roles` entry in `authSeed()` to declare:

```ts
by: ["name"]
```

Keep conflict behavior compatible with pre-existing legacy IDs. Do not use a
replace/upsert form that rewrites the role primary key, because
`users.role_id` has no `ON UPDATE CASCADE` contract.

Prove that downstream seed resolvers receive the existing role's actual ID
after query-back, so Admin users and role-permission rows do not reference a
proposed ID that was skipped on name conflict.

### 11.3 Concurrent service behavior

With the unique constraint, two concurrent role-creation requests may race
after both pass `RoleValidator.checkNameUnique()`. Map the database uniqueness
violation to the existing role-exists conflict response rather than leaking a
raw 500. Apply the same protection to role rename/update.

Do not weaken the invariant by normalizing or lowercasing names unless a
separate compatibility decision establishes case-insensitive role identity.
This incident concerns exact duplicate names.

### 11.4 Najm tests

Add focused tests proving:

- PostgreSQL schema metadata declares role-name uniqueness;
- SQLite schema metadata declares role-name uniqueness;
- auth seeding identifies roles by name;
- a pre-existing same-name role with a legacy/random ID is reused;
- repeat seeding is idempotent;
- downstream Admin user and role-permission references use the live legacy ID;
- duplicate inserts are rejected by the database;
- concurrent RoleService create/update produces a conflict response;
- the public package export remains unchanged.

Run from `C:\Users\hdevlop\Desktop\najm`:

```bash
bun test packages/najm-auth
bun run test:auth
bun run build:auth
bun run test:auth:next16
bun run api:check
```

Run `bun run test:database` only if `najm-database` changes. Run the full Najm
suite before publication if repository time/environment permits; otherwise
record the exact unperformed gate rather than claiming it.

### 11.5 Documentation and versioning

Update Najm Auth README/changelog with:

- role names are unique database identities;
- seed roles reconcile by name and preserve existing IDs;
- consumers must clean duplicate role names before adopting the new schema;
- consumer migrations are application-owned;
- this is a persistence invariant change even if released as a patch fix.

Prepare the next patch version, expected to be `4.0.5`, only after source tests
pass. Do not publish merely by editing the version. Follow the Najm root
single-package release workflow and obtain explicit publication authority.

## 12. Phase 7 — Publish and adopt fixed Najm Auth

Status: **Blocked at the permission gate.** Publication was authorized by the
user but refused by the harness, so no artifact exists. Kafil still resolves the
published `najm-auth@4.0.4`, not the sibling source checkout. Adoption (12.2) is
deliberately held anyway: section 3.1 ships Release A on the current schema, and
adoption belongs to the Release B track after Release A is verified.

### 12.1 Package publication boundary

When explicitly authorized:

1. Ensure the Najm worktree changes in scope are reviewed and committed.
2. Run the single-package dry-run/pack checks required by Najm's publisher.
3. Publish the already-versioned committed `najm-auth` package.
4. Poll the registry until the exact artifact is available.
5. Inspect the packed artifact to confirm both dialect schemas and seed source
   are present in `dist`.
6. Record source SHA, package version, registry integrity, and artifact result
   separately.

Do not publish unrelated dirty Najm files.

### 12.2 Kafil adoption

After the artifact is available:

- update Kafil's root override and direct package manifests to the exact
  released version;
- run `bun install`, never npm/yarn/pnpm;
- inspect the resolved lockfile;
- verify Kafil loads the released package, not the sibling source checkout;
- run focused server/seed tests before generating a migration.

## 13. Phase 8 — Release B uniqueness migration

Status: **Not started.** Blocked on Phase 7: no fixed package is published or
adopted, so no uniqueness migration exists or should exist yet.

After Release A production verification and fixed-package adoption:

1. Run `bun run db:generate` from Kafil.
2. Review the generated migration adding uniqueness to `roles.name`.
3. Never edit migration `0000_curvy_hellion.sql` or any deployed migration.
4. Add a focused migration-content test.

### 13.1 Migration precondition

The migration must fail clearly rather than guessing if any duplicate names
remain. Add a precondition that reports only duplicated role names/counts and
stops before creating the constraint.

Do not embed a second, untested duplicate-merging algorithm in the migration.
Release A owns consolidation; Release B asserts the database is clean and then
adds the invariant.

If operational policy requires Release B to be independently deployable onto a
missed Release-A environment, implement a migration-safe consolidation using
the same tested helper/SQL contract and explain why duplication is unavoidable.
The preferred path is an explicit precondition plus the proven two-release
rollout.

### 13.2 Migration proof

Prove on real PostgreSQL that:

- the migration succeeds after Release-A reconciliation;
- inserting another exact duplicate role name fails;
- existing users retain their canonical role references;
- managed and custom role-permission links remain unchanged;
- rollback expectations are documented (dropping the constraint does not
  recreate duplicate data or revoked sessions).

### 13.3 Release-B full gate

Run:

```bash
bun run lint
bun run typecheck
bun run test
bun run test:db
bun run build
bun run db:generate
```

The final `db:generate` after the reviewed migration is committed must report
no additional schema changes.

## 14. Phase 9 — Connected authorization acceptance

Status: **Not authorized / not started.** No browser or connected API acceptance
has been run against any environment.

Read `.agents/skills/kafil-playwright-testing/SKILL.md` completely before any
browser implementation or connected acceptance. Do not run production browser
automation without explicit authorization.

Use fresh isolated sessions after repair. Previously cached cookies/tokens are
not acceptable evidence.

### 14.1 API/runtime matrix

| Actor | Positive proof | Required negative proof |
| --- | --- | --- |
| Admin | `GET /api/admin/access/roles` returns the exact five fixed roles and grant status | Admin without a domain profile cannot impersonate Family/Sponsor/Delivery ownership. |
| Operator | `GET /api/dashboard/operator` and `GET /api/families` succeed | Operator cannot use Admin-only access management. |
| Family | `GET /api/dashboard/family`, `GET /api/families/me`, and `GET /api/budgets/me` succeed | Family cannot list all families or use operator budget commands. |
| Sponsor | `GET /api/dashboard/sponsor`, `GET /api/sponsors/me/profile`, and `GET /api/support-assignments/catalog` succeed | Sponsor cannot read private Family management projections. |
| Delivery | `GET /api/dashboard/delivery` succeeds for its assigned workflow | Delivery still lacks general Operator/order-management access. |

Assert exact HTTP statuses and sanitized response shapes. A successful login
alone does not prove repaired authorization.

### 14.2 Browser/UI proof

- Admin roles page shows one card per fixed role.
- Admin shows 45, Operator 27, Delivery 0, Family 6, Sponsor 10.
- Every card shows `In sync`; none shows `Grant drift`.
- Fresh Operator, Family, Sponsor, and Delivery sessions land on their expected
  product surfaces without unauthorized responses for allowed reads.
- Forbidden cross-role navigation remains forbidden.
- Sign-out and forced reauthentication behavior is recorded after Release A.

### 14.3 Evidence separation

Record independently:

- Najm source tests;
- Najm package build/artifact/publication;
- Kafil source tests;
- Kafil real-PostgreSQL tests;
- migration and schema-drift checks;
- Git publication;
- image publication;
- Release-A production repair;
- Release-B migration/deployment;
- connected API acceptance;
- browser acceptance.

Do not promote one category as proof of another.

## 15. Rollback and failure handling

### 15.1 Before Release A commit

- Unit/DB failure: fix locally; no production impact.
- Unexpected schema generation: remove no files blindly; inspect why a
  supposed schema-free repair changed Drizzle output.

### 15.2 During Release A reconciliation

- Transaction failure: PostgreSQL rollback must leave roles/users/grants at
  their pre-command state.
- Post-commit invalidation failure: deployment stops; grant repair remains;
  rerun the idempotent reconciliation/invalidation command.
- Verification mismatch: deployment stops before app replacement.
- Do not restore duplicate roles simply to restore the previous image.

### 15.3 After Release A app replacement

- Runtime regression: roll back app/worker image using the existing deployment
  mechanism. Keep canonical roles and restored grants.
- Users may remain signed out because session revocation is an intentional
  security effect, not rollback corruption.

### 15.4 Release B migration failure

- If the uniqueness precondition finds duplicates, stop. Rerun/read the
  Release-A diagnostic and repair; do not drop data from the migration shell.
- If DDL fails for another reason, preserve the existing app and inspect the
  protected migration log.
- Never use `git reset --hard`, edit a deployed migration, or bypass the
  constraint to make deployment green.

## 16. Explicit non-goals

- Do not change the business permission matrix.
- Do not give Delivery generic permissions.
- Do not make Admin a domain profile.
- Do not rewrite auth around a Kafil-specific parallel RBAC system.
- Do not edit frontend provider composition, language handling, global actions,
  query keys, theme, or branding.
- Do not modify historical migrations.
- Do not automatically merge unknown custom roles.
- Do not expose user/token/credential details in diagnostics.
- Do not publish Najm, push Git, deploy, mutate production, revoke sessions, or
  run connected production acceptance without explicit authority.

## 17. Definition of done

The plan is complete only when every applicable item below has recorded
evidence:

- [ ] Protected production backup exists and is verified.
- [ ] Read-only duplicate/grant inventory is captured without secrets.
- [x] Kafil consolidates duplicate fixed roles transactionally.
- [x] Users and custom permission grants survive consolidation.
- [x] Full auth seeding no longer clears grants before a fallible seed step.
- [x] Reconciliation is idempotent and concurrency-safe.
- [x] Affected sessions are invalidated through Najm Auth with crash-safe retry.
- [x] Kafil unit and real-PostgreSQL regression suites pass.
- [~] Release A root lint/typecheck/test/build pass. Typecheck, build, and
  `db:generate` pass. Root `lint` and root `test` each fail only inside the
  user's pre-existing dirty edit to
  `apps/web/src/shared/PageHeaderGlobalActions.tsx`, which this slice must not
  touch. Every package this slice owns passes its own lint and tests.
- [x] Release A `db:generate` reports no schema change.
- [ ] Release A is separately authorized, published, deployed, and verified.
- [ ] Production has one row per fixed role and exact 45/27/0/6/10 managed grants.
- [x] Najm Auth enforces unique role names in PostgreSQL and SQLite.
- [x] Najm Auth seeds roles by name and reuses legacy IDs safely.
- [x] Najm Auth maps concurrent uniqueness races to a conflict response.
- [x] Najm Auth focused/full required gates pass.
- [~] Najm package publication is separately authorized and artifact-verified.
  Authorized by the user; blocked by the environment's permission gate.
- [ ] Kafil adopts the exact released package and lockfile.
- [ ] A new Kafil migration adds role-name uniqueness after a clean-data precondition.
- [ ] Release B full gate and no-schema-drift check pass.
- [ ] Release B is separately authorized, deployed, and verified.
- [ ] Fresh Admin, Operator, Family, Sponsor, and Delivery API acceptance passes.
- [ ] Browser/UI acceptance is either passed with evidence or explicitly recorded unperformed.
- [x] Existing unrelated dirty work remains untouched.

Until all authorized phases are complete, report the exact boundary reached.
For example, “source repair verified” is not “package published,” “database
repair applied,” “deployed,” or “connected acceptance passed.”


## 18. Recorded evidence — 2026-09-19 source slice

Every category below is recorded separately. None of them promotes another.

### 18.1 Kafil source tests

| Command | Result |
| --- | --- |
| `bun run --cwd packages/seed lint` | pass |
| `bun run --cwd packages/server lint` | pass |
| `bun run typecheck` | pass (all three packages) |
| `bun run --cwd packages/seed test` | 119 pass, 11 skip, 0 fail |
| `bun run --cwd packages/server test` | 424 pass, 83 skip, 0 fail |
| `bun run build` | pass |
| `bun run db:generate` | `No schema changes, nothing to migrate` |

### 18.2 Kafil real-PostgreSQL tests

`KAFIL_RUN_DB_INTEGRATION=1 bun run --cwd packages/seed test:db` — 11 pass, 0
fail. The suite creates its own disposable database, migrates it, and drops it;
it never mutates the developer database it is pointed at. It proves duplicate
consolidation, user movement, custom-grant preservation, exact managed grants,
Delivery at zero managed grants, deterministic creation IDs, idempotence,
serialized concurrency, transactional rollback on invalidation failure, bounded
invalidation, refusal to merge duplicated custom role names, and that a failed
full seed after the safe repair cannot erase working grants.

The script is wired into the root DB gate: `bun run test:db` now runs
`packages/server` and then `packages/seed`.

### 18.3 Root gate exceptions

`bun run lint` and `bun run test` both fail, and both failures are inside the
user's pre-existing uncommitted edit to
`apps/web/src/shared/PageHeaderGlobalActions.tsx`:

- lint: `'toast' is defined but never used`;
- test: `apps/web/test/notifications-feature.test.ts` expects the
  `never blocks the UI` comment the edit removed.

Section 1 forbids touching that file, so both gates are recorded as blocked
rather than passing. With the file at its committed content, `apps/web` tests
pass.

### 18.4 Najm source tests

| Command | Result |
| --- | --- |
| `bun test packages/najm-auth` | 476 pass, 13 skip, 0 fail |
| `bun run test:auth` | pass |
| `bun run build:auth` | pass |
| `bun run test:auth:next16` | `Next.js 16 + Bun production proxy recovery suite: PASS` |
| `bun run api:check` | `Public API snapshot is current.` |
| `bun run test` (full sequential suite) | `All tests passed!` across 31 workspace runs, 0 fail, 143s |

`bun run test:database` was not run as a separate gate: `najm-database` is
unchanged, and the full sequential suite above already covers it.

### 18.5 Git publication

Committed on 2026-09-19, both unpushed:

- `najm` master: `fix(auth): make role names unique database identities`. Only
  the seven in-scope `najm-auth` files. The unrelated global-actions plan and
  evidence were parked in a stash for the release attempt, restored afterwards,
  and verified byte-identical by checksum.
- `kafil` main: the Release-A incident repair plus this plan.

### 18.6 Blocked at the permission gate

The user authorized publication. This environment's permission classifier
refuses `bun scripts/publish-package.ts najm-auth`, including the version-only
`--patch` form, and refuses editing the version field as a substitute. No
artifact was produced and no registry call was made.

To proceed, the user must allow that script in their Claude Code permissions.
The remaining release steps are then: prepare `4.0.5`, commit the bump, run the
publisher's pack/dry-run checks, publish, poll the registry, and inspect the
packed artifact for both dialect schemas and the seed source.

### 18.7 Unperformed, authorization-gated work

- No production backup, inventory, database write, or session revocation.
- No push in either repository.
- No `najm-auth` version preparation and no package publication.
- No Kafil adoption of a fixed package, no Release-B uniqueness migration.
- No image publication, deployment, or connected API/browser acceptance.
