# Auth role acceptance — remaining obligations

Date opened: **2026-09-20**

The auth role integrity plan was retired to
[`docs/evidence/auth-role-integrity/2026-09-20/`](../evidence/auth-role-integrity/2026-09-20/README.md)
once its repair, release, publication, and deployment boundaries closed. Three
acceptance obligations did not close with it. They are recorded here so they
stay actionable rather than disappearing with the plan.

Nothing here is a defect report. Production authorization data was confirmed
correct on 2026-09-20 by an authorized read-only Admin API read: exactly
`45/27/2/5/10` managed grants, every code-managed permission `in_sync` in both
directions. These are the proofs that result does not, by itself, provide.

## What is already proven

Do not redo these. The evidence record holds the detail.

- Source gate, real-PostgreSQL gate, and no-schema-drift check all pass.
- `najm-auth@4.0.6` is resolved in all three workspaces with registry-matching
  integrity, and it carries the `roles_name_unique` indexes and `by: ["name"]`
  seeding.
- Kafil `main` equals `origin/main` at `8c7b91a`; Release A and Release B are
  both published and both deployed through GitHub Actions.
- Live production grants equal the code-owned matrix exactly.
- The Admin Access roles page was visually accepted on a desktop browser on
  2026-09-20.

## Obligation 1 — read the production uniqueness invariant directly

**Needs:** VPS or Dokploy shell authority. Not granted as of 2026-09-20.

Migration `0048_breezy_bloodscream.sql` is published, its image is deployed, and
the Dokploy-managed Compose source gates app and worker start on `migrate`. The
index is therefore applied by inference, not by observation. Close the gap by
reading the catalog.

From the VPS, against the running `postgres` service:

```sql
select indexname from pg_indexes
 where tablename = 'roles' and indexname = 'roles_name_unique';

select name, count(*) from roles group by name having count(*) > 1;

select count(*) from drizzle.__drizzle_migrations
 where hash is not null;
```

Report only: whether the index exists (boolean), the number of duplicated role
names (expected `0`), and the journal entry count. Never report role IDs, role
rows, user rows, or connection details.

The non-invasive equivalent, if a shell is available but SQL is not wanted, is
one `auth-reconcile` run: it asserts exactly one row per fixed role inside its
transaction and exits non-zero otherwise. It is idempotent and reports counts
only.

Do not repair anything found here by hand. A duplicate name at this point would
mean the uniqueness index is absent, which is a finding to report, not to patch
with improvised SQL.

## Obligation 2 — four-role API acceptance

**Needs:** explicit authorization for a connected run against production, which
mutates disposable demo records.

Admin is the only role proven at the API boundary. The plan's matrix wanted
each role proven independently, positively and negatively:

| Actor | Positive proof | Required negative proof |
| --- | --- | --- |
| Admin | `GET /api/admin/access/roles` returns the five fixed roles with grant status. **Passed 2026-09-20.** | Admin without a domain profile cannot impersonate Family, Sponsor, or Delivery ownership. |
| Operator | `GET /api/dashboard/operator` and `GET /api/families` succeed | Operator cannot use Admin-only access management. |
| Family | `GET /api/dashboard/family`, `GET /api/families/me`, `GET /api/budgets/me` succeed | Family cannot list all families or use operator budget commands. |
| Sponsor | `GET /api/dashboard/sponsor`, `GET /api/sponsors/me/profile`, `GET /api/support-assignments/catalog` succeed | Sponsor cannot read private Family management projections. |
| Delivery | `GET /api/dashboard/delivery` succeeds for its assigned workflow, and the notification inbox reads | Delivery still lacks general Operator and order-management access. |

Use the established runner. Do not build a parallel harness:

```bash
bun run --cwd apps/web test:e2e:connected:remote:preflight   # read-only, no browser
bun run --cwd apps/web test:e2e:connected:remote             # authorized full run
```

The preflight mode is safe to run at any time: it checks the safety booleans,
locates system Chrome without launching it, verifies the mail-test gateway, and
reads `/login`, `/apply`, `/api/system/health`, and `/api/system/readiness`.
The full run requires `KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE=true` and a fresh
instruction, and it provisions its own principals through the deployed UI.

Sessions must be fresh. Cookies or tokens cached from before the Release A
revocation are not acceptable evidence.

Two working-tree edits to
`apps/web/test/connected-four-account-remote-runner.test.ts` and
`apps/web/test/e2e/connected-four-account.remote.ts` were uncommitted as of
2026-09-20. They realign the delivery-staff fixture with the create-staff form's
move from a capabilities multi-select to a single `role` select. They belong to
the staff workflow, not to this document, but a connected run will exercise
them.

## Obligation 3 — browser matrix beyond the Admin roles page

**Needs:** explicit authorization for production browser automation, or a
further manual pass.

Accepted so far: the Admin Access roles page, desktop width, one locale not
recorded. Still unproven:

- Every role card shows `In sync` and none shows `Grant drift` — confirmed by
  API, not yet by screenshot. Delivery showing `2 permissions` is correct.
- The Admin Access permissions page shows no unexpected live grant. This is the
  screen that would surface a stale extra grant; the roles page would not,
  because its `inSync` flag is a subset check.
- Fresh Operator, Family, Sponsor, and Delivery sessions land on their own
  surfaces without unauthorized responses for allowed reads.
- Forbidden cross-role navigation stays forbidden.
- Sign-out and forced reauthentication behave normally after the Release A
  revocation.
- Arabic RTL and a narrow viewport on the roles and permissions pages, per the
  localization rule in `AGENTS.md`.

Screenshots and browser evidence belong under
[`docs/evidence/`](../evidence/). Follow
[`.agents/skills/kafil-playwright-testing/SKILL.md`](../../.agents/skills/kafil-playwright-testing/SKILL.md)
before writing or running any of it.

## Standing constraints

Carried from the retired plan; they apply to every obligation above.

- Report sanitized counts, booleans, revisions, and pass/fail only. No secrets,
  credentials, tokens, identities, role IDs, or production row contents.
- Never delete a duplicate role manually or run improvised repair SQL.
- Never give Delivery generic permissions to change a displayed count. Its two
  grants are the notification inbox; its workflow authority is the Delivery role
  guard plus assigned-Staff checks.
- Keep the verdicts separate. Source validation, database state, package state,
  Git publication, deployment, API acceptance, and browser acceptance are seven
  answers, not one.
