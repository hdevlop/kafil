# Connected Four-Account Acceptance Plan

Status: **IN PROGRESS — LIVE HARNESS EXECUTION**

Owner: connected acceptance work; report into root `PLAN.md` Phase 4 when that
roadmap is present and its execution order permits completion

This is the executable plan for the connected acceptance journey. Root
`PLAN.md`, when present in the candidate, remains authoritative for phase order
and completion status. A missing or intentionally deferred roadmap does not
weaken this file's acceptance gates and must be reported rather than silently
recreated. This file gives a medium-capability coder one explicit sequence with
hard stop conditions, narrow edit boundaries, and exact evidence requirements.

Current contract baseline, verified on 2026-08-11:

- authentication is post-Move-6: `najm-auth@3.1.3` owns credential setup and
  includes the atomic logout/refresh race correction;
- `credential_setup_requirements` is authoritative;
- the temporary bidirectional bridge has been removed;
- `family_password_requirements` has been dropped;
- manifests and installed packages resolve `najm-kit@2.11.2` and
  `najm-theme@0.2.1`;
- the user explicitly authorized this run against the existing local `kafil`
  demo database instead of a dedicated disposable database;
- `.env.acceptance` preserves the normal Gmail configuration while overriding
  the acceptance runtime to local Mailpit SMTP `127.0.0.1:1025` and its local
  HTTP API. The runner must load this ignored overlay after `.env`.

Live checkpoint on 2026-08-12:

- Work unit A passed in the connected run.
- Work unit B passed in isolation: `1 passed (6.1m)`.
- Work unit C passed completely in the current focused browser test: `1 passed
  (8.1m)`, then passed again with diagnostics: `2 passed (8.0m)`. Family creation and active-row uniqueness, required-field
  validation, credential setup, setup-credential replay rejection, family-only
  navigation, exact admin-endpoint denial, product-image delivery/decoding,
  cart loading, and post-logout new-password login all passed.
- Work unit D passed in isolation on 2026-08-12: `2 passed (5.8m)` against
  `KAFIL_E2E_GREP='work unit D|diagnostics'`. Applicant form with run-labelled
  identity, client validation error, OTP polling by exact recipient + run
  start + subject keyword (exactly one match), OTP confirmation and message
  delete only after confirmation, pending-review state, pending-account login
  denial (403 with "inactive" message), exactly one applicant row, details
  sheet showing run-labelled name/email/E.164 phone, first approval 200,
  second replayed approval 409 with "Only pending review or rejected
  applications can be approved", exactly one user + one sponsor profile with
  the expected E.164 phone, sponsor sign-in via email + dashboard + visible
  "Find a family to support" empty state, real sign-out UI with cleared
  cookies and 401 from `/api/sponsors/me/profile`, and second identifier
  sign-in via the E.164 phone. Diagnostics test ran in the same focused run
  and passed with no unexplained console errors, failed requests, or bad
  responses.
- Work units E–H and the final diagnostics/gates have not passed yet.

The journey uses four authenticated accounts:

| Alias | How it is created | Responsibility |
| --- | --- | --- |
| Bootstrap Admin | Existing environment-backed account | Creates/approves/manages all operator-side records |
| Family | Created by Bootstrap Admin through the UI | Completes forced first-login setup and submits orders |
| Sponsor A | Self-applies through `/apply` | Verifies OTP, is approved, contributes, and reads only its own history |
| Sponsor B | Created from the managed demo fixture | Proves seed reuse, contributes, and reads only its own history |

Delivery Staff A and Staff B are staff profiles, not login accounts. They do
not create a fifth or sixth browser identity.

---

## 1. Outcome

At one recorded candidate commit, prove with real PostgreSQL, a disposable SMTP
capture service, and unmocked browser requests that:

- the four accounts form one connected data graph;
- the family completes Najm-owned first-login password setup;
- Sponsor A completes real application, email OTP, approval, and sign-in;
- Sponsor B survives a repeated managed-demo seed without identity duplication
  or password reset;
- both sponsors support the same family but see only their own financial data;
- integer-minor-unit contributions activate the family at the exact target;
- family, admin, sponsor, and staff projections remain authorized and private;
- the order lifecycle survives cancellation, rejection, purchase variance,
  delivery failure, reassignment, retry, confirmation, and command replay;
- desktop, tablet, phone, keyboard, error, loading, and Arabic RTL behavior is
  evidenced without exposing secrets or private household data.

This is not complete from source tests, mocked E2E tests, or screenshots alone.

---

## 2. Hard prerequisites

Check every item before adding code. If any item fails, report `BLOCKED` and do
not improvise around it. Phase sequencing may be explicitly authorized for an
independent acceptance run, but such a run cannot mark an earlier roadmap phase
complete.

- [x] The candidate uses `najm-auth@3.1.3` and its post-Move-6 credential-setup
  contract; no application code still reads the retired family requirement.
- [x] `credential_setup_requirements` is active and authoritative.
- [x] `family_password_requirements` is absent and both temporary bridge
  triggers are absent. Do not recreate them.
- [x] Manifests, lockfile, and installed declarations agree on the current
  registry-pinned Najm versions; do not patch `node_modules` or rely on stale
  version numbers from a deleted or older roadmap.
- [x] A dedicated disposable PostgreSQL database is selected, or the user has
  explicitly authorized a non-production local demo database and the report
  records that override.
- [x] A local or otherwise disposable SMTP capture service with an HTTP query
  API is selected. It must accept `.test` recipients without forwarding mail.
- [x] The Bootstrap Admin identity works, but its credentials exist only in the
  process environment.
- [ ] Catalog categories, products, and inventory needed by the order journey
  exist in the authorized acceptance target.

Never run this plan against production, the VPS, an unapproved shared database,
a personal inbox, Gmail, or another delivery provider that can send real mail.
When an existing local demo database is explicitly authorized, do not run
`seed:full`, `setup`, `seed:remove`, database drops, broad truncation, or ad hoc
cleanup. Apply migrations and the exact narrow demo command only after the host,
database mode, and authorization have been checked without printing the URL or
any credential.

---

## 3. Mandatory instructions and source map

Read completely before editing:

1. `AGENTS.md`
2. `.agents/skills/kafil-najm-frontend/SKILL.md`
3. `.agents/skills/kafil-najm-backend/SKILL.md`
4. Root `PLAN.md` when it exists in the candidate; otherwise record its absence
5. This file
6. `AUTH-COOKIE-PLAN.md` final outcome, Moves 4–6, and acceptance section
7. Root/web/server/seed manifests, `bun.lock`, and installed declarations for
   the exact dependency versions under test

Inspect these current implementations instead of guessing selectors or API
contracts:

- `apps/web/playwright.config.ts`
- `apps/web/scripts/run-phase6-e2e.ts`
- `apps/web/test/e2e/applicant-decision.e2e.ts`
- `apps/web/test/e2e/family-create-wizard.e2e.ts`
- `apps/web/test/e2e/staff-delivery-assignment.e2e.ts`
- `apps/web/src/features/Applicants/`
- `apps/web/src/features/Families/`
- `apps/web/src/features/SupportAssignments/`
- `apps/web/src/features/Contributions/`
- `apps/web/src/features/OrderCart/`
- `apps/web/src/features/Orders/`
- `apps/web/src/services/credentialSetupApi.ts`
- `apps/web/src/services/sponsorWorkspaceApi.ts`
- `packages/server/src/modules/applicants/`
- `packages/server/src/modules/families/`
- `packages/server/src/modules/supportAssignments/`
- `packages/server/src/modules/contributions/`
- `packages/server/src/modules/orders/`
- `packages/seed/src/scripts/demo/generator.ts`
- `packages/seed/src/demo-seed.ts`

The existing E2E files are reference material. Their route-mocked tests do not
satisfy this plan. Do not edit them to simulate a pass.

---

## 4. Scope and deliverables

### Required new acceptance files

- `apps/web/test/e2e/connected-four-account.e2e.ts`
- `apps/web/scripts/run-connected-four-account-e2e.ts`
- `apps/web/scripts/connected-four-account-fixtures.ts`
- `docs/evidence/connected-four-account/<masked-run-label>/README.md`

Add `test:e2e:connected` to `apps/web/package.json`. The command must load the
root `.env`, then the ignored `.env.acceptance` overlay, start or connect to one
local server, run only the connected spec, and shut down only a server process
that it started itself. The runner must fail closed if the overlay does not
resolve to local capture SMTP or if its database-mode authorization is absent.

The fixtures file may contain public aliases, deterministic demo IDs, expected
statuses, and amount-building helpers. It must not contain a password, OTP,
cookie, reset token, mailbox message, real email address, real phone number,
guardian CIN, database URL, or API credential.

### Allowed corrective changes

Start with acceptance code only. If the unmocked workflow exposes a Kafil
defect, record the failing assertion and observed response first, then make the
smallest feature-owned Kafil fix and focused regression test needed. Do not:

- patch installed Najm packages;
- change published dependency versions;
- reintroduce the retired auth bridge or legacy family requirement;
- change the accepted post-Move-6 auth migration state inside this plan;
- edit a deployed migration;
- weaken privacy, authorization, financial, or idempotency assertions;
- add retries, arbitrary sleeps, forced clicks, `test.skip`, or broad status
  exemptions to obtain green output.

If the defect belongs to Najm, SMTP infrastructure, PostgreSQL infrastructure,
or another repository, report `BLOCKED` with evidence. Do not create a local
Kafil workaround.

---

## 5. Secret-safe runtime model

Generate one run label in memory, for example:

```text
c4a-YYYYMMDD-HHMM-<random-suffix>
```

Use it to create non-real `.test` identities and to find this run's mailbox
messages. In committed evidence, mask the random suffix and all identity
fields; use only the four aliases.

Generate the Family, Sponsor A, and Sponsor B runtime passwords in the runner.
Pass them to the Playwright child process through environment variables that
are removed when the process exits. Never log their values. The spec must also
keep these values out of:

- test titles and assertion messages;
- screenshots, videos, traces, HTML reports, and error-context files;
- URLs, request logs, console logs, database diagnostics, and evidence files.

Do not commit Playwright traces or videos for this plan because they can contain
cookies, tokens, OTPs, credentials, and private responses. Take only named,
intentional screenshots after sensitive dialogs and fields have been closed.

The runner must validate the following as booleans without printing values:

- database configuration is present;
- database mode is dedicated-disposable or explicitly authorized local-demo;
- admin credentials are present;
- JWT and encryption secrets are present;
- SMTP points to the approved disposable capture service;
- the mailbox HTTP API is reachable.

Any live-delivery SMTP configuration is an immediate blocker.
For the authorized local-demo mode, the runner must require
`KAFIL_E2E_ALLOW_DEFAULT_DATABASE=true`, must load `.env.acceptance` after
`.env`, and must refuse every broad seed, reset, truncate, or database-drop
operation. Gmail credentials may remain in `.env`, but they must be overridden
with empty SMTP credentials and the local Mailpit host for every server and test
child process.

---

## 6. Acceptance harness

Implement one serial Playwright describe block. Use `browser.newContext()` to
create and retain four isolated contexts:

1. `adminContext`
2. `familyContext`
3. `sponsorAContext`
4. `sponsorBContext`

Never copy cookies or storage state between them. After logout, assert the
context no longer has a normal authenticated session before reusing it.

The runner should follow the lifecycle pattern in `run-phase6-e2e.ts`, but it
must not prepare the Phase 6 browser users and must not use their static
password. It must:

1. pass an explicit allowlist of required environment keys to the server and
   Playwright child;
2. use `127.0.0.1`, never a wildcard bind;
3. wait for `/login` readiness;
4. run only `connected-four-account.e2e.ts`;
5. close database connections and any server it created in `finally`;
6. leave an externally managed server running;
7. return the real Playwright exit code.

### Browser diagnostics

Attach listeners before the first navigation in every context and record:

- uncaught page errors;
- console errors;
- failed network requests except genuine navigation cancellation;
- every HTTP response with status `>= 400` as method, status, and pathname.

Each negative step must declare its one exact expected method, pathname, and
status before the action. Remove exactly that response from the failure list,
assert it occurred exactly once, then restore the default deny-all rule. Never
allow an entire status code or pathname prefix.

The final diagnostic assertion for each context must contain no unexplained
page error, console error, request failure, `4xx`, or `5xx` response.

Do not use `page.route()` or another network mock anywhere in this spec.

---

## 7. Work unit A — prepare the authorized target

- [ ] Record a masked database label, target mode, explicit authorization, and
  masked run label.
- [x] Apply pending migrations only to the authorized acceptance target.
- [x] Run `bun run seed:verify` against that target.
- [x] Verify `credential_setup_requirements` exists and is authoritative with
  a read-only query; do not print rows or hashes.
- [x] Verify `family_password_requirements` and both temporary bridge triggers
  are absent. Their presence is a stale or partially migrated candidate.
- [x] Verify the SMTP capture service accepts a synthetic probe message and
  its HTTP API can query by exact recipient.
- [x] Delete the synthetic probe message from the capture service.
- [x] Verify `/login`, `/apply`, and `/api/system/health` on the local server.
- [x] Verify no previous entity uses this run label.

Stop if the database contains production-looking identities, the target mode
is not explicitly authorized, or the mailbox can forward externally.

---

## 8. Work unit B — Sponsor B managed-demo reuse

Sponsor B is created first because the normal demo seed generates a random
initial password and does not expose it. The acceptance workflow must establish
a runtime-only password through the real recovery flow before proving the seed
does not reset it.

### First seed

Run the demo seed with exactly:

```powershell
bun run seed:demo -- --families=0 --sponsors=1 --operators=0 --deliveries=2 --contributions=0
```

- [x] Assert one stable demo Sponsor B exists.
- [x] Assert Staff A and Staff B exist as active delivery profiles.
- [x] Assert Sponsor B has one user row and one sponsor profile.
- [x] Store its user ID, profile ID, and password-hash value in process memory
  only. Never print or serialize the hash.

### Establish a usable runtime password

- [x] Open `/forgot-password` in `sponsorBContext`.
- [x] Submit Sponsor B's exact demo email.
- [x] Poll the disposable mailbox API by exact recipient and message time.
- [ ] Assert exactly one matching reset message exists.
- [x] Extract the reset link in memory without logging it.
- [x] Complete `/reset-password` using the runtime Sponsor B password.
- [x] Delete the captured reset message.
- [x] Sign in as Sponsor B, assert the sponsor dashboard, sign out, and confirm
  normal auth cookies are cleared.
- [x] Refresh the in-memory hash snapshot after the reset.

### Second seed

Run the exact same demo command a second time.

- [ ] Assert Sponsor B is reported as skipped/reused, not inserted or repaired.
- [x] Assert Staff A and Staff B are reused without duplicate profiles.
- [x] Assert Sponsor B still has exactly one user and one profile.
- [x] Assert user ID, profile ID, and password hash equal the post-reset
  in-memory values.
- [x] Sign in again with the runtime password.

This work unit fails if the seed duplicates, replaces, repairs, disables, or
resets Sponsor B.

---

## 9. Work unit C — create the Family and finish first login

Use `adminContext` for every operator-side action.

- [x] Sign in as Bootstrap Admin and assert the admin dashboard.
- [x] Open the real family creation UI.
- [x] Submit a unique run-labelled family with a non-real email, phone, CIN,
  address, funding target, and at least one child.
- [x] Exercise required-field validation before the successful submission.
- [x] Assert the created profile is active and appears exactly once.
- [x] Read the one-time initial credential only into process memory. Do not
  screenshot, log, or place it in evidence.
- [x] Close the credential handover surface before any screenshot.

In `familyContext`:

- [x] Sign in with the family identifier and temporary credential.
- [x] Assert the login returns the `credential_setup` branch and navigates to
  `/change-password`, not `/dashboard`.
- [x] Assert no normal authenticated session is usable before setup completes.
- [x] Submit mismatched-password validation once, then set the runtime Family
  password successfully.
- [x] Assert the setup credential cannot be replayed.
- [x] Sign in with the new password and assert family-only navigation.
- [x] Attempt one admin-only endpoint from the family context and assert the
  exact forbidden response.
- [x] Sign out and sign in again to prove the new password survives recovery.

Do not expose guardian CIN, exact address, child documents, or the temporary
credential in screenshots, console output, traces, or the final report.

---

## 10. Work unit D — Sponsor A application, OTP, and approval

In `sponsorAContext`:

- [x] Open `/apply` and complete the real applicant form with run-labelled,
  non-real identity data and the runtime Sponsor A password.
- [x] Exercise one client validation error before successful submission.
- [x] Start mailbox polling before the action that sends the OTP.
- [x] Match messages by exact recipient, run start time, and verification
  purpose. Never select the newest global message.
- [x] Assert exactly one matching OTP message exists.
- [x] Extract the OTP in memory, confirm it through the UI, then delete the
  captured message.
- [x] Assert the application is pending and has no normal sponsor session.
- [x] Attempt normal login and assert the exact pending-account denial
  (POST `/api/auth/login` → 403 with `message` matching `/inactive/i`, page
  remains on `/login`, no `accessToken`/`refreshToken` cookies in context).

In `adminContext`:

- [x] Find Sponsor A by the run label and assert exactly one applicant row.
- [x] Open its details and confirm run-labelled name, email, and E.164 phone.
- [x] Approve once and assert the first POST `/api/applicants/{id}/approve`
  returns 200.
- [x] Replay the same POST and assert 409 with the response body matching
  the regex `/pending review|already/i` (the second transaction aborts on
  the "Only pending review or rejected applications can be approved" branch).
- [x] Independent queries: exactly one row in `users` with `status = 'active'`
  and the expected E.164 phone, and exactly one row in `sponsor_profiles`
  linked to that user with the expected E.164 phone. (`sponsor_profiles`
  has no `status` column; sponsor liveness is carried on `users.status`.)

Back in `sponsorAContext`:

- [x] Sign in with the original runtime password.
- [x] Assert sponsor navigation (`/contribution` link) and the visible empty
  supported-family state ("Find a family to support").
- [x] Use the real sign-out UI button. Assert the POST `/api/auth/logout`
  response, assert `accessToken`/`refreshToken` cookies are gone without
  `clearCookies()`, and assert a follow-up GET `/api/sponsors/me/profile`
  returns 401. Session recovery on `/login` does not restore authentication
  after a successful logout.
- [x] Sign in again with the stored E.164 phone identifier. The contract
  resolves `+2126000XXXX` to the same Sponsor A account.

Do not capture the OTP, applicant password, or mailbox response in evidence.

---

## 11. Work unit E — connect both sponsors and prove privacy

In `adminContext`:

- [ ] Create an active support assignment from Sponsor A to the Family.
- [ ] Create an active support assignment from Sponsor B to the same Family.
- [ ] Attempt the Sponsor A/Family assignment again and assert one exact
  duplicate-conflict response.
- [ ] Assert exactly two active assignments exist for the Family and exactly
  one belongs to each sponsor.

In both sponsor contexts independently:

- [ ] Assert the supported-family list contains the Family exactly once.
- [ ] Assert the family summary contains only the sponsor-safe projection.
- [ ] Assert guardian CIN, exact address, documents, private notes, other
  sponsor identity, and other sponsor contribution history are absent.
- [ ] Attempt to read the other sponsor's contribution and plan by ID and
  assert the exact forbidden or not-found response required by the current
  privacy contract.

Use read-only database checks to prove sensitive values never appear in audit
metadata or outbox payloads created by these actions. Report only boolean
results, not the sensitive values searched for.

---

## 12. Work unit F — contribution and funding lifecycle

Read the Family's `fundingTargetMinor` from the authenticated admin response.
Keep every calculation as a safe integer. When the UI needs MAD text, build it
from integer quotient and two-digit remainder; do not use floating-point money.

### Plan lifecycle

In `sponsorAContext`:

- [ ] Create one monthly plan for the Sponsor A assignment.
- [ ] Pause it with a reason.
- [ ] Resume it with a reason.
- [ ] Stop it with a reason.
- [ ] Attempt to resume the stopped plan and assert one exact conflict.
- [ ] Assert lifecycle history and ownership remain Sponsor A-only.

### Contribution command coverage

- [ ] Sponsor A submits a small pending contribution; Admin rejects it with a
  reason; assert funding and ledger totals do not increase.
- [ ] Sponsor A submits a second pending contribution; Admin validates it;
  assert exactly one append-only funding ledger entry is added.
- [ ] Admin repeats validation of the same contribution; assert one exact
  conflict and no second ledger entry.
- [ ] Admin refunds that validated contribution; assert one reversal entry and
  the expected funding decrease, without deleting history.
- [ ] Repeat the refund command once; assert no second reversal.

### Exact target activation

- [ ] Split the target into two positive integer-minor-unit amounts, one for
  Sponsor A and the remainder for Sponsor B.
- [ ] Submit both contributions through their own sponsor contexts.
- [ ] Validate the first and assert the Family remains below target.
- [ ] Validate the second and assert validated funding equals the target
  exactly, never above it.
- [ ] Assert the Family activation behavior changes only on the exact final
  validation.
- [ ] Assert each sponsor sees only its own amount/history while Admin sees the
  combined total.

At each step compare contribution rows, budget snapshot, family funding
aggregate, and ledger count. A visual progress bar alone is insufficient.

---

## 13. Work unit G — order, reserve, purchase, and delivery lifecycle

Use real catalog and inventory. The Family performs family actions; Bootstrap
Admin performs operator actions. Staff A/B remain delivery profiles only.

### Order 1: family cancellation

- [ ] Family adds a product, submits Order 1, and observes the reserved amount.
- [ ] Family cancels the pending order through the supported UI.
- [ ] Assert status history records cancellation and the reserve is released
  exactly once.
- [ ] Replay cancellation and assert no second release or duplicate event.

### Order 2: admin rejection

- [ ] Family submits Order 2.
- [ ] Admin rejects it with a reason.
- [ ] Assert the reserve is released, inventory remains correct, and both role
  projections show the permitted rejection history.

### Order 3: purchase variance and delivery retry

- [ ] Family submits Order 3.
- [ ] Admin approves it.
- [ ] Admin uploads a generated non-sensitive receipt and records a purchase
  whose actual total differs from the reserved estimate.
- [ ] Assert the variance updates reserved/spent/available minor units exactly
  and preserves non-negative budget invariants.
- [ ] Replay the exact purchase command with the same idempotency key and
  assert one purchase, one ledger effect, and one receipt reference.
- [ ] Assign Staff A and start delivery.
- [ ] Record a failed attempt with a non-sensitive reason.
- [ ] Assert the order requires reassignment and the failed attempt is
  immutable in history.
- [ ] Reassign to Staff B, start the retry, and confirm delivery with generated
  non-sensitive evidence.
- [ ] Replay confirmation and assert one delivery effect and no duplicate
  lifecycle event.

### Role projections

- [ ] Family sees its own order, permitted totals, and lifecycle state.
- [ ] Sponsor A and Sponsor B see the supported-family order projection but no
  private address, receipt bytes, delivery notes, staff private fields, or
  other sponsor financial history.
- [ ] Admin sees the complete operational projection.
- [ ] Family and both sponsors receive exact forbidden responses from mutation
  endpoints they do not own.

After every mutation, assert the database status, status-event count, budget
ledger count, inventory quantity, and visible UI agree.

---

## 14. Work unit H — responsive, RTL, keyboard, and state evidence

Do not repeat the entire financial journey at every viewport. Preserve the
created connected graph and inspect the critical stable surfaces below.

Capture intentional screenshots at:

- desktop `1440x900`;
- tablet `768x1024`;
- phone `390x844`;
- Arabic RTL on phone and desktop.

Required surfaces:

- Family dashboard and order history;
- Sponsor A supported-family and contribution history;
- Sponsor B supported-family and contribution history;
- Admin support assignment, contribution, and order lifecycle details;
- delivery history after Staff B confirmation.

For each surface:

- [ ] no horizontal document overflow;
- [ ] no clipped dialog/sheet action;
- [ ] keyboard focus reaches the primary action and returns after close;
- [ ] loading, empty, validation, and server-error states remain readable;
- [ ] Arabic sets `dir="rtl"` without reversing money, identifiers, or status
  meaning;
- [ ] no uncaught errors, unexplained failed responses, or broken images.

Close sensitive dialogs and mask test identifiers before screenshots. Never
capture the credential card, OTP form with a value, password form with a value,
mailbox UI, cookies, tokens, exact address, guardian CIN, or document content.

---

## 15. Cleanup and residue rules

Cleanup is part of the test outcome, but financial and audit history must not be
deleted with ad hoc SQL.

- [ ] Sign out all four contexts and close them.
- [ ] Delete mailbox messages for all run-labelled recipients.
- [ ] Delete temporary upload candidates only through supported evidence APIs.
- [ ] End active support assignments through the application when the product
  permits it.
- [ ] Remove other test entities only through supported application commands.
- [ ] Do not use `seed:remove`; it targets the wider managed demo dataset and
  catalog, not just this acceptance run.
- [ ] Do not delete append-only ledger, audit, lifecycle, or validated financial
  records to manufacture a clean database.
- [ ] Record intentionally retained aliases and row counts under the masked run
  label. In authorized local-demo mode, retained rows are expected unless a
  supported application command can remove them without touching history.

For a dedicated disposable target, the safest final cleanup is dropping the
database after evidence is accepted. Database deletion remains an operator
action outside the test spec and requires explicit confirmation of the exact
target. Never drop the authorized existing local-demo database.

---

## 16. Verification sequence

Run focused checks while implementing. Final acceptance requires this order.

### Focused connected run

```powershell
bun run --cwd apps/web test:e2e:connected
```

The output must name only the connected spec and must show the actual count and
duration. Do not write a pass line manually.

### Package and database checks

```powershell
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run --cwd packages/server typecheck
bun run --cwd packages/server test
bun run --cwd packages/seed test
bun run test:db
```

### Production-style connected run

```powershell
bun run build
$env:KAFIL_E2E_USE_PRODUCTION="1"
bun run --cwd apps/web test:e2e:connected
Remove-Item Env:KAFIL_E2E_USE_PRODUCTION -ErrorAction SilentlyContinue
```

The runner must start `next start`, not reuse an unrelated dev process, for
this gate.

### Root gate and schema drift

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

`db:generate` must create no migration for acceptance-only work. If a legitimate
defect fix changes schema, stop this plan and create a separately reviewed
migration slice; do not hide it inside Phase 4 acceptance.

---

## 17. Completion gate

Every item must be true:

- [ ] Four isolated authenticated contexts completed their assigned journey.
- [ ] Sponsor B was reused once with stable IDs and unchanged post-reset hash.
- [ ] Sponsor A received exactly one matching OTP and was approved exactly once.
- [ ] The Family completed forced setup and the temporary credential was not
  replayable.
- [ ] Both sponsors support one Family and see it once.
- [ ] Cross-sponsor financial reads and private household fields are denied.
- [ ] Funding reaches the exact target using integer minor units.
- [ ] Duplicate validation, refund, purchase, cancellation, and confirmation do
  not duplicate ledger or lifecycle effects.
- [ ] Staff A failure and Staff B reassignment/retry are preserved in immutable
  delivery history.
- [ ] Browser diagnostics are clean after exact negative-response allowances.
- [ ] Desktop, tablet, phone, keyboard, and Arabic RTL evidence is complete.
- [ ] No password, OTP, token, cookie, mailbox content, private household field,
  raw database URL, hash, trace, or secret exists in the intended diff.
- [ ] The final database state still has the Najm credential-setup table and no
  legacy family requirement or temporary bridge triggers.
- [ ] Focused, package, database, production-style, and root gates pass at one
  recorded commit.
- [ ] Cleanup is complete or retained test rows are documented by masked alias.

Only then report the connected acceptance as complete. Mark root `PLAN.md`
Phase 4 complete only when that roadmap exists and its prior-phase sequencing
is also satisfied; otherwise report the connected result without recreating or
editing the roadmap.

---

## 18. Final report template

```text
Result: PASS | FAIL | BLOCKED
Candidate commit: <sha or NOT RECORDED>
Run label: <masked label>
Database mode: DEDICATED DISPOSABLE | AUTHORIZED LOCAL DEMO
Auth schema: POST-MOVE-6 PASS | FAIL
Roadmap status: UPDATED | ABSENT | DEFERRED BY PHASE ORDER

Accounts:
- Bootstrap Admin: PASS | FAIL
- Family: PASS | FAIL
- Sponsor A: PASS | FAIL
- Sponsor B seed reuse: PASS | FAIL

Connected graph:
- Two active sponsor assignments to one family: PASS | FAIL
- Cross-sponsor privacy: PASS | FAIL
- Exact funding target: PASS | FAIL
- Contribution lifecycle/idempotency: PASS | FAIL
- Order/reserve/purchase lifecycle: PASS | FAIL
- Staff A failure to Staff B completion: PASS | FAIL

Browser evidence:
- Desktop: PASS | FAIL
- Tablet: PASS | FAIL
- Phone: PASS | FAIL
- Arabic RTL: PASS | FAIL
- Keyboard and focus: PASS | FAIL
- Console/network diagnostics: PASS | FAIL

Verification:
- Focused connected E2E: <verbatim summary>
- Production-style connected E2E: <verbatim summary>
- Web/server/seed checks: <verbatim summaries>
- PostgreSQL integration: <verbatim summary>
- Root gate: <verbatim summaries>
- db:generate: NO CHANGES | FAIL

Cleanup:
- Supported cleanup completed: YES | NO
- Intentionally retained aliases/counts: <masked list or None>
- Existing local-demo database preserved: YES | NOT APPLICABLE

Changed files:
- <every file changed for this plan>

Failures or blockers:
- None
```

Do not claim `PASS` when a required command was skipped, a context shared auth
state, an expected negative response was not counted exactly once, evidence
contains secrets/private data, or the candidate commit is not recorded.
