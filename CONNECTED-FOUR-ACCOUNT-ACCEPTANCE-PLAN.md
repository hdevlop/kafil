# Kafil VPS Four-Account Black-Box Acceptance Plan

Status: **IN PROGRESS - REMOTE A-B RANGE PASS; UNIT C BLOCKED BY VPS AUTH GRANT DRIFT**

Target: exactly `https://kafala360.ma`

Owner: the guarded remote Playwright journey. The root `PLAN.md` is currently
absent. Do not recreate it, infer its phase status, or claim root-roadmap
completion from this companion.

This plan replaces the old local PostgreSQL connected-acceptance flow. It tests
the deployed disposable Kafil demo from the tester's machine as a real user
would: through HTTPS, browser UI, authenticated application APIs, and the
deployment's loopback-only Mailpit reached through a runner-owned SSH tunnel.

The plan never starts Kafil locally, never opens PostgreSQL, and never runs a
seed, migration, reset, deploy, Docker, or volume command.

---

## 1. Outcome

Prove one connected journey involving four isolated authenticated identities:

| Alias | Creation path | Responsibility |
| --- | --- | --- |
| Bootstrap Admin | Existing environment-backed account | Creates and approves deployed demo records |
| Family | Admin creates it through the deployed UI | Completes first-login password setup and ordering |
| Sponsor A | Public `/apply` flow | Confirms OTP, is approved, supports the Family, and contributes |
| Sponsor B | Independent public `/apply` flow | Proves two-sponsor isolation and contributes separately |

Delivery Staff A and Delivery Staff B are profiles, not login accounts. Reuse
two active demo delivery profiles only when the admin UI/API proves they exist.
If two do not exist, create run-labelled delivery profiles through the deployed
admin UI. Do not use a seed or direct database command.

The final remote result must prove:

- real admin, Family, Sponsor A, and Sponsor B authentication;
- Family creation and forced first-login password setup;
- two independent sponsor applications, Mailpit OTP confirmations, and admin
  approvals;
- two support assignments to the same Family and exact duplicate rejection;
- sponsor-safe projections and exact cross-sponsor denials;
- contribution, funding, order, purchase, and delivery behavior visible through
  the deployed UI and public application APIs;
- logout, cookie removal, protected-request denial, responsive layout, RTL,
  keyboard access, and clean browser diagnostics;
- runner-owned SSH tunnel cleanup and secret-safe reporting.

### Remote evidence boundary

This is black-box deployment evidence. Without PostgreSQL access it cannot
independently prove database row uniqueness, password-hash stability, seed
idempotency, physical ledger-row counts, transaction locks, audit metadata,
outbox payloads, or migration state. Report each of those as `NOT VERIFIED`.
Never infer a database guarantee from a visible row, successful response, or
aggregate total.

---

## 2. Current checkpoint

The predecessor one-test smoke was verified on 2026-08-13 against the exact
deployed demo origin:

- [x] Guarded remote preflight passed.
- [x] Admin login returned a successful `POST /api/auth/login`.
- [x] `GET /api/dashboard/operator` completed successfully.
- [x] The admin dashboard loading state cleared and `Operator dashboard` was
  visible.
- [x] `GET /api/support-assignments` completed successfully.
- [x] The assignments loading state cleared.
- [x] The one visible `Create assignment` control accepted a trial click.
- [x] Real logout returned successfully, the pathname became `/login` while
  allowing its redirect-back query, auth cookies were absent, and a protected
  `GET /api/auth/me` returned `401`.
- [x] Browser diagnostics were clean.
- [x] The managed SSH tunnel closed.
- [x] Native result: `1 passed (13.7s)`, exit code `0`.

The first serial A-B browser attempt completed on 2026-08-13:

- [x] Remote Unit A passed its functional assertions in `7.1s`.
- [ ] Remote Unit B failed before any Family mutation while waiting for an
  exact `Guardian name` label. Najm Kit renders required labels with a visible
  `*`, so the test locator could not match the field.
- [ ] Passive final diagnostics did not run because the serial range stopped
  after Unit B failed.
- [x] No Family was created and no demo data was retained by the failed unit.
- [x] The managed SSH tunnel closed and no secret was printed.
- [x] The test now uses anchored required-label matchers that accept Najm Kit's
  rendered marker for every affected Family wizard field.

The first required-label correction was tested once. Remote Unit A passed again
in `7.1s`. Remote Unit B advanced beyond the corrected guardian text fields but
then timed out locating `Housing situation` as a label. Installed Najm Kit
proves this control is a composite select whose actual combobox is named by its
`Choose housing situation` placeholder. No `POST /api/families` occurred, no
Family was created, no demo data was retained, diagnostics did not run, the SSH
tunnel closed, and no secret was printed.

The first composite-select correction was tested once. The new five-second
`#step-household` assertion passed, proving the wizard had advanced. Unit B then
timed out on the exact combobox name because the test used
`Choose housing situation`, while the authoritative English translation and
rendered placeholder are `Choose a housing situation`. No
`POST /api/families` occurred, no Family was created, no demo data was retained,
diagnostics did not run, the SSH tunnel closed, and no secret was printed.

The exact translated combobox correction was tested once. Both household
selection and the five-second `#step-initial-children` transition assertion
passed. Unit B then timed out on an exact `Add initial child` button name.
Installed Najm Kit proves the empty `DynamicArray` button combines the add label
and empty-state explanation into one accessible name, so the shorter exact name
cannot match. No `POST /api/families` occurred, no credential flow ran,
diagnostics did not run, the SSH tunnel closed, and no secret was printed.

The test now matches the child action by an anchored `Add initial child` prefix
and verifies the resulting child-name field within five seconds. The corrected
source gate passes: `8 pass / 0 fail / 62 expect()`, web typecheck passes, and
targeted ESLint is clean. One focused Unit B plus diagnostics browser attempt
is authorized. Remote Units C-H remain `NOT IMPLEMENTED` and must not be
invented by a tester.

That child-action correction was tested once. Unit B completed Family creation,
created one child, received a successful `POST /api/families`, displayed the
credential card, retained the temporary credential in memory, found exactly
one API-visible Family, and submitted the Family's first login. It then failed
on a remote-test-only raw response-body extractor returning no `nextStep`.

Installed Najm Auth and Kafil's established connected journey define the real
branch proof as: successful login response, navigation to `/change-password`,
no normal auth cookies, and a visible credential-setup form. The application
client itself accepts the setup result at either the response root or its
`data` envelope. Therefore the raw-body assertion was a TEST defect, not
evidence of a PRODUCT defect. It has been removed; the route and setup-form
checks now use five-second budgets.

This failed attempt retained exactly one Family with one initial child. Report
them only as masked aliases; their generated identity values and temporary
credential are no longer available after the test process ended. Supported
cleanup remains deferred to the plan's cleanup unit. After the corrected source
gate passed (`8 pass / 0 fail / 66 expect()`, web typecheck, targeted ESLint,
and `git diff --check`), one focused Unit B plus diagnostics browser attempt is
authorized.

That focused command passed Unit B and its passive diagnostics with native exit
`0`: `2 passed (20.0s)`. The post-run acceptance audit found two assertions
that the report had inferred rather than directly proved: Unit B did not clear
the operator-dashboard loading state and assert its heading, and the
required-field validation did not count `POST /api/families` requests. The
remote spec now proves both dashboard UI readiness and zero create requests at
the validation error, then proves exactly one create request after the real
submission. Source regression coverage pins all four assertions. The corrected
source gate passes (`8 pass / 0 fail / 70 expect()`, web typecheck, targeted
ESLint, and scoped `git diff --check`). At that checkpoint, one new focused
Unit B plus diagnostics attempt was authorized and Unit B remained unchecked
pending its result.

The assertion-complete focused retry passed on 2026-08-14 with native exit `0`:
`2 passed (18.5s)`. Unit B passed in `16.5s` and passive diagnostics passed in
`16ms`. All 11 boolean guards and 6 preflight checks passed. The operator
dashboard loading state cleared and its heading rendered; invalid validation
issued zero `POST /api/families` requests; the real submission issued exactly
one. The complete Family creation, forced credential setup, temporary-
credential replay denial, runtime-password login, role boundary, logout, and
diagnostic assertions passed. The managed SSH tunnel closed and no sensitive
value was printed. The disposable demo now retains at least three masked
Families and three Children across the known attempts. Unit B is accepted.
The next promotion is one combined Remote A-B plus diagnostics command; Remote
Units C-H remain `NOT IMPLEMENTED`.

The combined A-B prerequisite range passed on 2026-08-14 with native exit `0`:
`3 passed (19.5s)`. Unit A passed in `4.7s`, Unit B passed in `13.0s`, and the
shared diagnostics test passed in `14ms`. All 11 boolean guards and 6 preflight
checks passed. Both identities completed their exact authentication,
readiness, authorization-denial, and logout assertions; the combined admin and
Family diagnostics remained clean. The managed SSH tunnel closed and no
sensitive value was printed. The disposable demo now retains at least four
masked Families and four Children across the known attempts. Units A and B are
accepted together. Remote Unit C is the next coder implementation boundary;
no Unit C browser command is authorized before its source and static gates are
delivered.

Remote Unit C is now implemented as a remote black-box Sponsor A journey. It
uses a third isolated context; proves hydrated public-form validation sends
zero application requests; submits exactly once; polls authenticated Mailpit by
exact recipient, run start, and verification subject; confirms the real OTP;
rechecks exactly one matching message and deletes it only after confirmation;
proves pending login returns exact `403` without auth cookies; finds exactly one
API-visible pending applicant; verifies the private admin details UI; approves
once and captures the returned user/profile identifiers only in memory; replays
approval for exact `409`; signs in by email and E.164 phone; proves sponsor
dashboard/navigation/empty state; and proves real logout plus protected profile
`401`. It uses no PostgreSQL, mocks, raw-response logging, screenshots, traces,
or serialized secrets. Source validation passes: `9 pass / 0 fail / 99
expect()`, web typecheck, targeted ESLint, and scoped `git diff --check`.

The first corrected focused attempt stopped safely before public submission:
`GET /api/auth/me` returned `200` with exact role `admin`, but the minimal
`GET /api/applicants?limit=1&offset=0` capability probe returned `401`. This
proves deployed role-permission data is behind Kafil's code-managed auth seed;
`AUTH_ROLE_PERMISSIONS.admin` includes every applicants permission. No new
Sponsor applicant was retained by this attempt. Unit C is blocked until the
VPS runs the narrow idempotent `seed:admin` reconciliation and `seed:verify`
passes. Only then is one new focused Unit C plus diagnostics attempt authorized.

Historical local connected-work-unit results are not remote passes and are not
part of this replacement plan's completion status.

---

## 3. Hard safety contract

Every remote command must fail closed unless all of these are true:

- [x] `KAFIL_E2E_REMOTE_URL` is exactly `https://kafala360.ma` with no path,
  query, credentials, alternate port, or alternate host.
- [x] `KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE=true` is explicitly present.
- [x] Bootstrap Admin credentials are present only in the ignored local `.env`.
- [x] SSH uses a key or existing non-password authentication. The runner rejects
  `KAFIL_E2E_SSH_PASSWORD`.
- [x] Mailpit HTTP is reached only through an SSH forward to VPS loopback.
- [x] The Mailpit URL is exactly local loopback and matches the configured local
  forwarding port.
- [x] Mailpit Basic-auth credentials are present without being printed.
- [x] Unauthenticated Mailpit API access returns `401` and authenticated access
  succeeds.
- [x] System Google Chrome exists.
- [x] TLS verification is enabled.
- [x] `/login`, `/apply`, `/api/system/health`, and
  `/api/system/readiness` remain on the exact authorized origin and succeed.
- [x] The selected local forwarding port is free before the runner starts.

The runner may create or change only demo application records through the
deployed UI or authenticated/public Kafil application APIs.

Forbidden actions:

- starting `next dev`, `next start`, or any local/remote Kafil process;
- connecting to PostgreSQL or using SQL, Drizzle Studio, database backups, or
  database plugins;
- running migrations, seeds, resets, truncation, database drops, Docker,
  Compose, Dokploy, deployment, volume, or filesystem cleanup commands;
- opening a public Mailpit port or bypassing the SSH tunnel;
- using `page.route()`, mocks, `clearCookies()`, forced clicks, or direct state
  mutation to make a workflow pass;
- printing `.env`, headers, cookies, passwords, temporary credentials, OTPs,
  reset links, mailbox bodies, private household data, generated identifiers,
  or raw response bodies containing those values;
- automatic screenshots, traces, and video.

The runner owns only the SSH process it starts. It must close that process in
`finally`. Never kill every SSH, Bun, Node, or Chrome process.

---

## 4. Runtime configuration

The tester runs commands from the repository on the local machine. The root
ignored `.env` supplies values for these names:

```text
KAFIL_E2E_REMOTE_URL
KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE
KAFIL_ADMIN_EMAIL
KAFIL_ADMIN_PASSWORD
KAFIL_E2E_SSH_HOST
KAFIL_E2E_SSH_USER
KAFIL_E2E_SSH_PORT
KAFIL_E2E_SSH_IDENTITY_FILE          # optional when normal SSH config owns it
KAFIL_E2E_MAILBOX_LOCAL_PORT
KAFIL_E2E_MAILBOX_REMOTE_PORT
KAFIL_E2E_MAILBOX_API_URL
KAFIL_E2E_MAILBOX_USER
KAFIL_E2E_MAILBOX_PASSWORD
```

Check names and boolean presence only. Never echo values.

Current commands:

```powershell
bun run --cwd apps/web test:e2e:connected:remote:preflight
bun run --cwd apps/web test:e2e:connected:remote
```

The full remote command performs its own preflight. Do not run a separate
preflight immediately before every focused browser command unless configuration
or infrastructure changed.

---

## 5. Tester-visible harness contract

Keep the remote path separate from the local connected harness:

```text
apps/web/playwright.remote.config.ts
apps/web/scripts/connected-four-account-remote-runtime.ts
apps/web/scripts/run-connected-four-account-remote-e2e.ts
apps/web/test/connected-four-account-remote-runner.test.ts
apps/web/test/e2e/connected-four-account.remote.ts
```

The remote spec is a `test.describe.serial` journey. Each delivered work unit is
a separately named test and keeps process-memory state in isolated
`BrowserContext` instances:

```text
remote unit A - guarded admin smoke
remote unit B - Family creation and first login
remote unit C - Sponsor A application and approval
remote unit D - Sponsor B application and approval
remote unit E - assignments and sponsor privacy
remote unit F - contributions and exact funding
remote unit G - ordering and delivery
remote unit H - responsive RTL keyboard and cleanup
remote diagnostics - final context assertions
```

`KAFIL_E2E_REMOTE_GREP` is implemented by the guarded runner and is passed to
Playwright as one `--grep` argument. It does not bypass exact-origin checks,
preflight, the child environment allowlist, TLS verification, tunnel ownership,
or argument rejection.

Because later units depend on earlier runtime state, testers normally select
the smallest implemented prerequisite range. The combined A-B range and
passive diagnostics pass. Unit C is independently runnable and now has an
implemented, statically validated correction boundary, so its first proof is:

```powershell
$env:KAFIL_E2E_REMOTE_GREP='remote unit C|remote diagnostics'
bun run --cwd apps/web test:e2e:connected:remote
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
```

The runner must restore or exclude temporary selection variables and close its
tunnel even after Playwright fails.

Testers are read-only. They must not add work units, refactor the spec, change a
selector or timeout, update plan checkboxes, or repair application code. A
missing unit is `NOT IMPLEMENTED`; a failure is reported to the coder.

### Shared state rules

- Generate one run label, Family password, Sponsor A password, Sponsor B
  password, OTP match metadata, order idempotency keys, and non-sensitive file
  candidates at runtime.
- Keep all raw values in process memory only.
- Never serialize storage state, credentials, OTPs, mailbox messages, private
  household fields, generated emails/phones/CINs, or raw run IDs.
- Use fresh isolated contexts for Admin, Family, Sponsor A, and Sponsor B.
- Attach diagnostics immediately when every page is created.
- Use the real sign-out UI for every role.
- Close all pages and contexts in `afterAll`, even after a failure.

### Readiness rules

For every route:

1. Register the exact expected response before navigation or action.
2. Navigate with `waitUntil: "commit"`.
3. Assert the response status.
4. Assert the route-specific loading state is no longer visible.
5. Assert the intended heading or control is visible.
6. Resolve exactly one visible desktop/mobile action.
7. Trial-click before each expensive mutation, then real-click the same locator.

Do not use `networkidle`, arbitrary sleeps, `.first()` to hide duplicate
controls, or `force: true`.

### Diagnostics rules

Capture page errors, console errors, failed requests, and all `4xx`/`5xx`
responses. Default to deny-all. Before an intentional negative action, register
one exact method + pathname + status allowance, consume it once, and restore
deny-all immediately. Response, console, and failed-request allowances remain
separate.

---

## 6. Remote Unit A - guarded admin smoke

Status: **PASS - COMBINED A-B RANGE AND DIAGNOSTICS**

- [x] Run every boolean safety check.
- [x] Open the managed Mailpit SSH tunnel and authenticate to its API.
- [x] Probe the exact deployed health/readiness routes with verified TLS.
- [x] Log in as Bootstrap Admin.
- [x] Await `GET /api/dashboard/operator` and dashboard readiness.
- [x] Open `/assignments`, await `GET /api/support-assignments`, clear the
  loading state, and trial-click the one visible creation control.
- [x] Log out through the UI.
- [x] Accept `/login` with its legitimate `from` query by asserting pathname,
  not an end-anchored full URL.
- [x] Assert auth cookies are absent and `GET /api/auth/me` returns `401`.
- [x] Assert passive final diagnostics are clean for the completed A-B range.
- [x] Assert the managed SSH tunnel closes.

---

## 7. Remote Unit B - Family creation and first login

Status: **PASS - COMBINED A-B RANGE AND DIAGNOSTICS**

In `adminContext`:

- [x] Log in and await the operator dashboard response and ready UI.
- [x] Open the Family list only after registering the exact successful
  `GET /api/families` list response.
- [x] Assert the Family loading state clears.
- [x] Resolve one visible `Create family` action and trial-click it.
- [x] Exercise one required-field validation without sending a create request.
- [x] Submit a unique run-labelled Family with `.test` email, Moroccan-format
  phone, generated non-real guardian CIN, non-real address, positive integer
  funding target, and at least one child.
- [x] Assert `POST /api/families` succeeds.
- [x] Assert the created Family appears exactly once in the admin API-visible
  list for the run label.
- [x] Capture the returned Family/profile ID and one-time credential in memory
  only, then close the credential surface.
In `familyContext`:

- [x] Submit the temporary credential and prove the client-owned credential
  setup branch by navigation to `/change-password`, no normal auth cookies, and
  the visible setup form; do not parse a redundant raw login-response envelope.
- [x] Prove a normal protected Family request is unavailable before setup.
- [x] Exercise mismatched-password validation once.
- [x] Set the runtime Family password through the real setup form.
- [x] Attempt the temporary credential again and assert the documented denial.
- [x] Sign in with the runtime password.
- [x] Await `GET /api/dashboard/family` and `GET /api/families/me`.
- [x] Assert Family-only navigation and the Family dashboard ready state.
- [x] Request one admin-only endpoint and assert the current exact `401`
  authorization contract once.
- [x] Log out through the UI, assert cookies are absent, and assert a protected
  Family request returns `401`.

Report the created Family only as `Family <masked-run>`. Never report its raw
email, phone, CIN, address, temporary credential, password, or IDs.

---

## 8. Remote Unit C - Sponsor A application and approval

Status: **BLOCKED - VPS ADMIN APPLICANTS GRANT RECONCILIATION REQUIRED**

Before the public submission, Unit C must prove that the configured Bootstrap
Admin resolves from `GET /api/auth/me` with role `admin` and can successfully
read a minimal applicants list. This fail-fast capability gate prevents a
misconfigured role or stale deployment grant from retaining another pending
Sponsor applicant. The applicants-page readiness waiter must select the
successful list response because Najm Auth may recover one initial `401` by
refreshing and retrying the request. Diagnostics may consume zero or one exact
transient `GET /api/applicants -> 401`; a second `401` or the absence of a
successful retry remains a failure.

In `sponsorAContext`:

- [ ] Open `/apply` and await its ready form.
- [ ] Use a unique `.test` email, Moroccan-format phone, non-real identity data,
  and a runtime password.
- [ ] Exercise one client validation error before submission.
- [ ] Start exact Mailpit polling before the action that sends OTP mail.
- [ ] Match by exact recipient, run start time, and verification purpose.
- [ ] Assert exactly one matching OTP message exists.
- [ ] Keep the OTP in memory, type it through the real OTP control, and assert
  confirmation succeeds.
- [ ] Delete the exact Mailpit message only after successful confirmation using
  Mailpit's authenticated v1 batch-delete contract.
- [ ] Assert the application is pending and no normal sponsor session exists.
- [ ] Attempt normal login once and assert exact `POST /api/auth/login -> 403`
  with the documented inactive/pending message and no auth cookies.

In `adminContext`:

- [ ] Open the applicants list after its exact list response.
- [ ] Find Sponsor A exactly once by the runtime label.
- [ ] Open details and compare the runtime name/email/E.164 phone in memory.
- [ ] Approve once and assert the exact approval request succeeds.
- [ ] Replay the same approval request once and assert exact `409`.

Back in `sponsorAContext`:

- [ ] Sign in with email and await `GET /api/dashboard/sponsor`.
- [ ] Assert sponsor navigation and the empty supported-family state.
- [ ] Log out through the UI, assert cookies are absent, and assert
  `GET /api/sponsors/me/profile -> 401`.
- [ ] Sign in again with the same E.164 phone identifier, then log out.

Do not report or preserve the OTP, applicant password, mailbox body, email,
phone, or applicant/user/profile IDs.

---

## 9. Remote Unit D - Sponsor B application and approval

Repeat Remote Unit C with a completely independent runtime identity,
`sponsorBContext`, mailbox match, password, and application.

- [ ] Sponsor B has exactly one matching OTP message.
- [ ] Sponsor B's OTP confirms and its exact message is deleted.
- [ ] Pending login is denied exactly once with no auth cookies.
- [ ] Admin sees exactly one Sponsor B applicant for the runtime label.
- [ ] First approval succeeds and replayed approval returns exact `409`.
- [ ] Sponsor B signs in by email and reaches the sponsor dashboard.
- [ ] Sponsor B logs out with cookies absent and protected profile `401`.

Sponsor B is created through the real public deployment flow. This remote plan
does not seed Sponsor B and does not claim seed reuse, stable database IDs, or
password-hash preservation.

---

## 10. Remote Unit E - assignments and sponsor privacy

In `adminContext`:

- [ ] Await exact assignment-page list readiness before each creation.
- [ ] Create Sponsor A -> Family through the real dialog and assert
  `POST /api/support-assignments` succeeds.
- [ ] Create Sponsor B -> Family the same way.
- [ ] Replay Sponsor A -> Family once and assert exact duplicate `409`.
- [ ] Query the authenticated admin list and assert the API-visible result has
  exactly two active assignments for the Family, one per runtime sponsor.

In each sponsor context independently:

- [ ] Sign in and open `/sponsor/support`.
- [ ] Assert the supported-family catalog contains the Family exactly once.
- [ ] Assert the catalog row uses only the documented sponsor-safe keys.
- [ ] Read the sponsor's own assignment-family summary and assert only the
  documented safe assignment/family keys are present.
- [ ] Search the returned JSON in memory and prove it contains none of the
  Family CIN, exact address, Family email/phone, documents, private notes, or
  the other sponsor's runtime identity values.
- [ ] Create one minimal one-time plan and one pending contribution as privacy
  canaries through that sponsor's own API.
- [ ] Read the other sponsor's assignment by ID and assert exact `404`.
- [ ] Read the other sponsor's contribution by ID and assert exact `404`.
- [ ] Read the other sponsor's plan by ID and assert exact `404`.
- [ ] Stop the canary plan through the owner context.

In `adminContext`, reject both pending canary contributions with a non-sensitive
reason so they cannot affect later funding totals.

API-visible counts and projection keys are verified here. Database constraints,
audit metadata, outbox payloads, and physical row counts remain `NOT VERIFIED`.

---

## 11. Remote Unit F - contributions and exact funding

Read the Family funding target from an authenticated deployed response. Keep
all calculations in safe integer minor units. Convert to MAD display text from
integer quotient and two-digit remainder; never use floating-point money.

### Sponsor A plan lifecycle

- [ ] Sponsor A creates one monthly plan for its own assignment.
- [ ] Sponsor A pauses it with a non-sensitive reason.
- [ ] Sponsor A resumes it with a non-sensitive reason.
- [ ] Sponsor A stops it with a non-sensitive reason.
- [ ] One resume-after-stop attempt returns exact `409`.
- [ ] Sponsor B cannot read or mutate Sponsor A's plan.

### Contribution command coverage

- [ ] Sponsor A submits a small pending contribution.
- [ ] Admin rejects it and the API-visible Family funding aggregate does not
  increase.
- [ ] Sponsor A submits a second pending contribution.
- [ ] Admin validates it and the API-visible funding aggregate increases once.
- [ ] Replayed validation returns the documented conflict and the aggregate
  does not increase again.
- [ ] Admin refunds it and the aggregate decreases once.
- [ ] Replayed refund returns the documented denial/conflict and the aggregate
  does not decrease again.

### Exact target

- [ ] Compute two positive minor-unit amounts whose integer sum equals the
  target, one for each sponsor.
- [ ] Submit each amount from its owning sponsor context.
- [ ] Validate Sponsor A's amount and assert the Family remains below target.
- [ ] Validate Sponsor B's amount and assert the visible/API funding total
  equals the target exactly and never exceeds it.
- [ ] Assert activation changes only after the final validation.
- [ ] Assert each sponsor sees only its own contribution history while Admin
  sees both contributions and the combined aggregate.

This proves deployed command behavior and visible/API aggregates. It does not
prove physical ledger rows, append-only storage, locks, or audit/outbox writes;
report those as `NOT VERIFIED`.

---

## 12. Remote Unit G - ordering and delivery

Precondition: the deployed Family catalog exposes at least one active product
with usable inventory, and two active delivery profiles are available. If not,
stop as `ENVIRONMENT BLOCKED`; do not seed or modify deployment infrastructure.

### Order 1 - Family cancellation

- [ ] Family adds a real catalog product to its cart.
- [ ] Family submits Order 1 with a runtime idempotency key.
- [ ] The Family order detail shows the reserved amount.
- [ ] Family cancels through the supported UI with a non-sensitive reason.
- [ ] API/UI state shows cancelled and the visible budget reserve is restored.
- [ ] Replay cancellation once and assert the documented denial without a
  second visible aggregate change.

### Order 2 - Admin rejection

- [ ] Family submits Order 2.
- [ ] Admin rejects it with a non-sensitive reason.
- [ ] Family and Admin projections show the permitted rejection state.
- [ ] Visible/API budget state shows the reserve released once.

### Order 3 - purchase variance and delivery retry

- [ ] Family submits Order 3.
- [ ] Admin approves it.
- [ ] Admin uploads a generated non-sensitive receipt and records a purchase
  whose actual integer-minor total differs from the reserved estimate.
- [ ] Visible/API available, reserved, and spent totals match the expected
  integer calculation and remain non-negative.
- [ ] Replay the purchase with the same idempotency key and assert the deployed
  idempotent/conflict contract plus no second visible aggregate change.
- [ ] Assign Delivery Staff A and start delivery.
- [ ] Record one failed attempt with a non-sensitive reason.
- [ ] Assert the order requires reassignment and the history still shows the
  failed attempt.
- [ ] Reassign to Delivery Staff B, start the retry, and confirm delivery with
  generated non-sensitive evidence.
- [ ] Replay confirmation once and assert the documented denial/idempotent
  result plus no duplicate visible lifecycle entry.

### Role projections

- [ ] Family sees its own order and permitted lifecycle state.
- [ ] Sponsor A and Sponsor B see only the supported-family order projection.
- [ ] Sponsor projections exclude exact address, receipt bytes, delivery notes,
  staff private fields, and other-sponsor financial history.
- [ ] Family and both sponsors receive exact denials from mutation endpoints
  they do not own.
- [ ] Admin sees the complete operational projection.

Database inventory rows, ledger rows, transaction locks, and immutable event
storage remain `NOT VERIFIED` even when UI/API state is correct.

---

## 13. Remote Unit H - responsive, RTL, keyboard, and cleanup

Reuse the graph created earlier in the same command. Do not repeat financial
mutations at each viewport and do not create screenshots.

Viewports:

```text
desktop 1440x900
tablet  768x1024
phone   390x844
```

Required surfaces:

- Family dashboard, cart, and order history;
- Sponsor A and Sponsor B supported-family and contribution history;
- Admin assignments, contribution detail, order detail, and delivery history;
- Arabic RTL on phone and desktop.

For each applicable surface:

- [ ] document width does not exceed viewport width;
- [ ] primary controls and dialog/sheet actions are visible and not clipped;
- [ ] keyboard focus reaches the primary action and returns after close;
- [ ] loading, empty, validation, and exact server-error states are readable;
- [ ] Arabic sets `dir="rtl"` without reversing money, identifiers, or status
  meaning;
- [ ] protected images load, complete, and decode with `naturalWidth > 0`;
- [ ] there are no uncaught page errors, unexplained console errors, failed
  requests, or unregistered `4xx`/`5xx` responses.

### Supported cleanup

- [ ] Log out Admin, Family, Sponsor A, and Sponsor B through the real UI.
- [ ] Assert auth cookies are absent in every context.
- [ ] Delete every remaining exact run-recipient Mailpit message through the
  authenticated batch-delete API.
- [ ] End active test support assignments through the application when the
  deployed UI/API permits it.
- [ ] Remove temporary uploads through supported application commands.
- [ ] Delete only removable test entities through supported application
  commands.
- [ ] Preserve validated financial/audit history when the product does not
  provide a supported removal command.
- [ ] Close all pages and contexts.
- [ ] Confirm the managed SSH tunnel closes and the local forwarding port is
  free.
- [ ] Report retained entities only by masked aliases and counts.

No broad cleanup, seed removal, database deletion, VPS shell command, Docker
operation, or volume deletion belongs in this test.

---

## 14. Test execution and one-attempt rule

For each coder-delivered range, test and promote in this order:

1. source tests for runner/config/spec contracts;
2. affected web typecheck;
3. Remote Units A-B plus diagnostics once;
4. Remote Units A-C plus diagnostics once;
5. continue through the smallest implemented prerequisite range ending at the
   newly delivered unit;
6. complete A-H plus diagnostics once;
7. final local package gates without starting a local Kafil server.

Before each browser command, report its level as focused prerequisite range or
complete remote spec. Do not promise exact duration.

After a failure:

1. stop the command;
2. read the final assertion and sanitized method/path/status evidence;
3. classify `TEST`, `PRODUCT`, `RUNNER`, or `ENVIRONMENT`;
4. record a value-free fingerprint;
5. report the smallest likely owning-layer correction without editing;
6. stop and return control to the coder.

Never rerun an unchanged hypothesis. The coder must change the test,
instrumentation, implementation, or diagnosis before authorizing one new
focused attempt. A pre-browser SSH/Mailpit failure is `ENVIRONMENT`; confirm
cleanup and report it without printing values.

---

## 15. Verification sequence

### Source verification before a browser run

Run from `apps/web`:

```powershell
bun test test/connected-four-account-remote-runner.test.ts
bun run typecheck
bun x eslint playwright.remote.config.ts `
  scripts/connected-four-account-remote-runtime.ts `
  scripts/run-connected-four-account-remote-e2e.ts `
  test/connected-four-account-remote-runner.test.ts `
  test/e2e/connected-four-account.remote.ts
```

### Remote preflight after configuration or infrastructure changes

```powershell
bun run --cwd apps/web test:e2e:connected:remote:preflight
```

### Focused prerequisite range

Use the exact implemented range authorized by the coder. Run once, then remove
the temporary environment variable in `finally`.

### Complete remote journey

```powershell
bun run --cwd apps/web test:e2e:connected:remote
```

The terminal must show the real Playwright summary, native exit code `0`, clean
diagnostics, and `MANAGED SSH TUNNEL CLOSED`.

### Final local repository checks

The test targets the VPS, but its source still belongs to the repository:

```powershell
bun run --cwd apps/web lint
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run build
bun run db:generate
```

`db:generate` must create no migration for browser-test-only changes. Do not run
`test:e2e:connected`, `test:db`, a local production discriminator, or a local
Kafil server as part of this VPS plan unless a separately authorized non-remote
task requires them.

---

## 16. Completion gate

Report this VPS black-box plan complete only when every item is true:

- [ ] Four isolated authenticated contexts complete their assigned journey.
- [ ] The Family completes forced password setup and the temporary credential
  is denied afterward.
- [ ] Sponsor A and Sponsor B each receive exactly one matching OTP, are
  approved once, and have replayed approval rejected.
- [ ] Both sponsors support the same Family exactly once in API-visible state.
- [ ] Duplicate assignment and cross-sponsor reads return exact documented
  conflicts/denials.
- [ ] Sponsor projections contain none of the runtime private household or
  other-sponsor values.
- [ ] Contribution and funding aggregates reach the exact integer-minor target
  without a visible duplicate effect.
- [ ] Cancellation, rejection, purchase replay, delivery failure, reassignment,
  confirmation, and confirmation replay show the documented deployed behavior.
- [ ] Desktop, tablet, phone, keyboard, and Arabic RTL assertions pass.
- [ ] Browser diagnostics are clean after exact one-shot negative allowances.
- [ ] Every context logs out, auth cookies are absent, mailbox messages are
  deleted, and the SSH tunnel closes.
- [ ] No secret or runtime-sensitive value appears in terminal output, intended
  diff, or retained artifacts.
- [ ] Source tests, web checks, build, and schema-drift check pass.
- [ ] Retained demo data is documented only by masked alias and count.
- [ ] Database-only guarantees are explicitly reported `NOT VERIFIED`.

This completion result means **VPS BLACK-BOX ACCEPTANCE COMPLETE**. It does not
mean database/internal acceptance complete, and it does not complete or recreate
the absent root `PLAN.md`.

---

## 17. Final report template

```text
Target: https://kafala360.ma
Mode: guarded VPS black-box acceptance
Masked run: <masked alias only>

Preflight:
- Boolean contracts: PASS | FAIL
- Mailpit SSH tunnel/auth: PASS | FAIL
- TLS/health/readiness: PASS | FAIL

Commands:
- Source tests: <exact summary and native exit>
- Typecheck/lint: <exact result>
- Focused ranges: <exact Playwright summaries and native exits>
- Complete remote journey: <exact Playwright summary and native exit>
- Final local repository checks: <exact results>

Remote units:
- A guarded admin smoke: PASS | FAIL | NOT RUN
- B Family creation/first login: PASS | FAIL | NOT RUN
- C Sponsor A application/approval: PASS | FAIL | NOT RUN
- D Sponsor B application/approval: PASS | FAIL | NOT RUN
- E assignments/privacy: PASS | FAIL | NOT RUN
- F contributions/funding: PASS | FAIL | NOT RUN
- G ordering/delivery: PASS | FAIL | NOT RUN
- H responsive/RTL/keyboard/cleanup: PASS | FAIL | NOT RUN
- Diagnostics: PASS | FAIL | NOT RUN

Evidence boundary:
- UI/public API behavior: VERIFIED | NOT VERIFIED
- Database uniqueness/rows/locks: NOT VERIFIED
- Password hashes/seed idempotency: NOT VERIFIED
- Ledger physical rows: NOT VERIFIED
- Audit/outbox payloads: NOT VERIFIED
- Migration state: NOT VERIFIED

Hygiene:
- Secrets printed: NO | YES
- Mailbox messages deleted: YES | NO | PARTIAL
- All contexts logged out/closed: YES | NO
- Managed SSH tunnel closed: YES | NO
- Retained demo aliases/counts documented: YES | NO

Verdicts:
- Command: PASS | FAIL | INTERRUPTED
- VPS black-box plan: COMPLETE | IN PROGRESS | BLOCKED
- Root roadmap: NOT PRESENT | IN PROGRESS | COMPLETE
```
