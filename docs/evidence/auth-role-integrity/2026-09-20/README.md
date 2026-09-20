# Auth role integrity completion evidence

Date: **2026-09-20**

The auth role integrity plan was retired from the repository root on this date.
This record preserves the completion boundary, corrects the plan's stale status
text, and states every verdict separately. The complete archived
[plan](PLAN.md) sits beside it; its original root copy also remains in Git
history at Kafil commit `8c7b91a`.

No verdict below promotes another. Source validation is not deployment,
deployment is not API acceptance, and a visual check is not database integrity.

## The incident, and what closed it

Production authenticated Sponsor, Family, and Operator users into unauthorized
responses while the Admin roles page showed Admin with 45 permissions and the
other roles with zero. `bun run seed:verify` named the cause: two role rows
called `delivery`. A duplicate row defeated seed conflict detection, and
Kafil's own seed sequence cleared managed grants before calling a fallible,
non-transactional seed, so the failure stranded authorization with the grants
already deleted.

The repair shipped as two deliberately separate releases:

- **Release A** (`667bbb19`) consolidated the duplicate rows transactionally
  under `pg_advisory_xact_lock`, moved users and unioned permission links onto
  the canonical row, restored exact managed grants, preserved custom grants,
  and invalidated affected sessions inside the repair transaction so a failed
  invalidation rolls the repair back.
- **Release B** (`6ee9eaf`) adopted the fixed Najm Auth schema and added
  migration `0048_breezy_bloodscream.sql`, which reports duplicate role names
  and aborts before creating `roles_name_unique` rather than guessing.

Upstream prevention shipped as `najm-auth@4.0.5`: `roles.name` is unique in
both dialects, `authSeed()` reconciles roles by name and reuses legacy IDs, and
a lost create/rename race returns the existing 409 instead of a raw 500.

## Verdicts

### Source validation — pass

Run on 2026-09-20 at working tree `8c7b91a` plus the working-tree fix below.

| Command | Result |
| --- | --- |
| `bun run lint` | pass (`apps/web`, `packages/server`, `packages/seed`) |
| `bun run typecheck` | pass (all three packages) |
| `bun run test` | 507 web + 433 server (83 skip) + 120 seed (13 skip), 0 fail |
| `bun run build` | pass |
| `bun run db:generate` | `No schema changes, nothing to migrate` |
| `bun run test:db` | 61 server + 13 seed, 0 fail |

The root gate now passes in full. The plan recorded root `lint` and root `test`
as blocked by the user's uncommitted edit to
`apps/web/src/shared/PageHeaderGlobalActions.tsx`; that edit is no longer in the
working tree.

**One real defect was found and fixed while closing this plan.**
`packages/seed/test/authorization-reconciliation-database.test.ts` copied the
expected grant counts as literals and still asserted `FAMILY_GRANTS = 6` after
commit `4fe0c74` withdrew Family's sixth grant. Two of its thirteen cases
failed on first run. Because the suite is opt-in behind
`KAFIL_RUN_DB_INTEGRATION=1`, neither CI nor `bun run test` exercises it, so the
drift survived a day and four commits. All four counts now derive from
`AUTH_ROLE_PERMISSIONS`, so the same copy cannot drift again; the exact named
arrays stay pinned by `packages/seed/test/auth-definitions.test.ts`, which CI
does run.

### Database and migration state — local pass, production confirmed indirectly

- `0048_breezy_bloodscream.sql` is present and journaled as entry 48.
- `packages/server/test/migration.test.ts` pins both the sanitized duplicate
  precondition and the `CREATE UNIQUE INDEX "roles_name_unique"` statement.
- `bun run db:generate` reports no drift, so the deployed schema and the
  Drizzle definition agree.
- The real-PostgreSQL suite proves the migration fails on dirty data with
  `delivery (2)`, succeeds after the Release-A repair, rejects an exact
  duplicate insert afterwards, and leaves user role references and managed and
  custom grants unchanged.

For production, the index was **not** read out of the catalog directly; that
needs VPS authority, which was not granted for this slice. What is proven is
the chain around it: the Dokploy-managed Compose source runs `migrate` and
`auth-reconcile` and gates app and worker start on them, Release B's image
carries migration 0048, and the live app is serving a revision at or after
`4fe0c74` (see below), which is a descendant of `6ee9eaf`. The app therefore
could not be serving unless 0048 had applied, and 0048 refuses to apply while
any duplicate role name remains. Reading `roles_name_unique` from the catalog
directly is carried forward as the one residual database check.

### Najm package state — pass

- Root `overrides` and all three workspace manifests pin `najm-auth` `4.0.6`.
- `bun.lock` resolves a single `najm-auth@4.0.6` entry whose integrity,
  `sha512-q/n7xS34GwdqBD7ybccaiyzaBcCQLmcWxPJDoJWdZBzj2dRv7b+5UKZuQ7drGvLHcOFmLFFLP4J/8jkxi7jgQA==`,
  matches the registry's published integrity exactly.
- The installed distribution in `packages/server`, `packages/seed`, and
  `apps/web` carries `roles_name_unique` in both the PostgreSQL and SQLite
  schemas and `by: ["name"]` in `authSeed()`.
- `4.0.6` is `4.0.5` plus an unrelated 7-character Moroccan CIN fix. The
  uniqueness contract is unchanged.
- The obsolete `patches/najm-auth@4.0.4.patch` was removed in `6ee9eaf`
  because its contracts are upstream.

One hygiene note, not a defect: a stale `node_modules/najm-auth@4.0.4`
directory remains at the workspace root. It is not referenced by `bun.lock`,
no workspace resolves through it, and every consumer has its own `4.0.6`. A
`bun install --force` or removing the directory clears it.

### Git publication state — historical snapshot and retirement update

The paragraphs below record the worktree when this evidence was first written.
The retirement patch was subsequently committed in Kafil `1287d66`: the plan
was moved into this directory, the grant-count test was corrected, the remaining
acceptance was moved to `docs/tests/`, and the existing remote-runner edits were
published without a browser run. The earlier "unpublished" verdict is historical.

**Release publication: pass.**

- At the original acceptance snapshot, Kafil `main` and `origin/main` were both `8c7b91a`, with no unpushed commits.
- Release A `667bbb19` and Release B `6ee9eaf` are both published.
- Najm's `najm-auth@4.0.5` source and release commits, `0183215` and
  `fa07581`, are ancestors of `origin/master`. This corrects the plan's
  section 18.8.
- Najm's later `9bb44dd chore: release najm-auth 4.0.6` is committed but not
  pushed, alongside four unrelated Kit commits. The published registry artifact
  is verified independently above, so Kafil's dependency is not affected. This
  is a Najm repository obligation, not a Kafil one.

**Retirement patch at the original snapshot: local and unpublished.** The work
that produced this record was a working-tree change at the time of writing. It
was not covered by the release-publication pass above:

- the rename of the root plan into this directory is staged;
- the archived plan's reconciliation edits and the
  `packages/seed/test/authorization-reconciliation-database.test.ts` fix are
  unstaged;
- this record and
  [`docs/tests/auth-role-acceptance.md`](../../../tests/auth-role-acceptance.md)
  are untracked;
- the two unrelated connected-acceptance edits below remain modified.

At that snapshot nothing in the retirement patch was committed or pushed, and
a clean checkout of `8c7b91a` still carried `AUTH-ROLE-INTEGRITY-PLAN.md` at the
root with its 2026-09-19 status text. Commit `1287d66` supersedes that state.

Preserved untouched during the retirement analysis: the user's uncommitted edits to
`apps/web/test/connected-four-account-remote-runner.test.ts` and
`apps/web/test/e2e/connected-four-account.remote.ts`, which belong to the staff
creation UI, not to that analysis. They were published together with the
retirement patch at the user's later request; browser acceptance was skipped.

### Deployment and live revision — deployed; exact revision bounded, not pinned

| Revision | Run | Verify | Publish | Deploy trigger |
| --- | --- | --- | --- | --- |
| `667bbb19` (Release A) | `35434337462` | success | success | success |
| `6ee9eaf` (Release B) | `35436500341` | success | success | success |
| `8c7b91a` (current `main`) | `35467526210` | success | success | success |

The authorized read-only preflight passed against the production origin on
2026-09-20: `/login`, `/apply`, `/api/system/health`, and
`/api/system/readiness` all responded, and readiness reports both database and
cache reachable.

The exact live Git revision is **not** pinned by this record. No HTTP endpoint
reports the OCI revision label; `scripts/verifyVpsDeployment.sh` reads it
through Docker, which needs VPS authority. What is proven is a lower bound: the
live application computes Family's expected grants without `read:contributions`
and Delivery's with both notification permissions, so it is serving `4fe0c74`
or later. `main` is two commits ahead of that, and both are a localized catalog
hint and a test.

### API acceptance — Admin pass; four roles not run

Authorized read-only probe against production on 2026-09-20, using the Admin
credential already present in the ignored root `.env`. Sign in, two reads, sign
out. No write, no session revocation, no browser.

| Call | Status |
| --- | --- |
| `POST /api/auth/login` | 200 |
| `GET /api/auth/me` | 200 |
| `GET /api/admin/access/roles` | 200 |
| `GET /api/admin/access/permissions` | 200 |
| `POST /api/auth/logout` | 200 |

Live role state, every value matching the current code-owned definition:

| Role | Managed grants | Expected | In sync |
| --- | ---: | ---: | --- |
| `admin` | 45 | 45 | yes |
| `operator` | 27 | 27 | yes |
| `delivery` | 2 | 2 | yes |
| `family` | 5 | 5 | yes |
| `sponsor` | 10 | 10 | yes |

All 45 code-managed permissions report `in_sync`: zero `missing_live_grant`,
zero `unexpected_live_grant`, zero `custom`. This is the stronger of the two
projections. The roles list checks only that every expected grant is present,
so it would call a role in sync while it held a stale extra grant; the
permissions projection compares both directions per permission and found no
difference. Production authorization data therefore equals the code-owned
matrix exactly.

That result also settles the reconciliation question the plan left open. The
grants match a definition that only exists from `4fe0c74` onward, so
`auth-reconcile` has run against the current code, and that job asserts exactly
one row per fixed role before it commits.

Not run: Operator, Family, Sponsor, and Delivery positive proofs, and every
negative proof in the plan's section 14.1 matrix. Carried forward.

### Browser and manual acceptance — Admin roles page accepted; matrix not run

The user checked the Admin Access roles page on the production deployment on
**2026-09-20**, in a **desktop browser**, and accepted what it showed. This
follows the `8c7b91a` deployment of 2026-09-19 20:33 UTC.

Recorded limitations, so this is not read as more than it is:

- One screen only. The Admin Access permissions page, which is what surfaces an
  unexpected live grant, was not part of it.
- One role's session. Operator, Family, Sponsor, and Delivery sign-ins were not
  part of it.
- Desktop width only. No mobile or narrow viewport.
- Locale not recorded, so no RTL claim is made for this screen.
- It is a visual check. It does not prove database integrity, the uniqueness
  constraint, authorization enforcement, or API behavior. The API verdict above
  is what carries those, independently.

No automated browser acceptance was run against production for this slice.

## Invariants worth keeping after retirement

These outlived the incident and should survive the plan:

- Never delete a duplicate role by name or by visual ordering. It can own
  `users.role_id` references, code-managed grants, and Admin-created custom
  grants. Union the links onto the canonical row, move the users, then delete.
- Kafil may auto-consolidate only the five fixed code-managed role names. A
  duplicated custom name stops with a sanitized error; two custom roles are
  never assumed interchangeable.
- Managed grant comparison is exact equality, not a subset check. Custom grants
  on a fixed role are preserved through consolidation.
- Delivery's two grants are notification inbox permissions. Its workflow
  authority comes from the Delivery role guard and assigned-Staff checks, and it
  must not be given generic order, family, budget, or operator permissions to
  make a count look better.
- Admin stays the bootstrap super-role with no domain profile.
- Grant counts are evidence; the named arrays in `AUTH_ROLE_PERMISSIONS` are the
  source of truth. Tests derive counts rather than copying them.
- Session invalidation runs inside the repair transaction, before commit. A
  failed invalidation must roll the repair back rather than leave repaired
  grants behind live empty-permission claims.
- Reconciliation output carries counts and role names only, never identities,
  role IDs, tokens, or environment values.
- Rolling the application image back does not reverse the data repair, and
  dropping `roles_name_unique` does not recreate the removed duplicate row,
  undo repaired grants, or restore revoked sessions.

## Still open

[`docs/tests/auth-role-acceptance.md`](../../../tests/auth-role-acceptance.md)
carries the three remaining obligations: the direct production uniqueness and
role-count read, the four-role API acceptance matrix, and the browser matrix.
