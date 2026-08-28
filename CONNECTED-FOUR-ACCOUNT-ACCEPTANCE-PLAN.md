# Kafil guarded VPS acceptance plan

Status: **IN PROGRESS — 17-TEST CORE PASSED; RESPONSIVE PRODUCT DEFECT FIXED IN NAJM KIT; CORRECTED KAFIL DEPLOYMENT PENDING**

Target: exactly `https://kafala360.ma`

This is the only root planning document. It is the authoritative contract for
the guarded four-account VPS journey. There is no root `PLAN.md`; do not create
one or infer a broader roadmap from this acceptance plan.

## 1. Goal and evidence boundary

Prove one black-box journey with four isolated authenticated browser contexts:

| Principal | Creation path | Purpose |
| --- | --- | --- |
| Bootstrap Admin | Existing environment-backed account | Creates and approves demo records |
| Family | Provisioned by Admin | Completes first-login setup, funding, and ordering |
| Sponsor A | Public application and OTP | Supports and funds the Family |
| Sponsor B | Independent public application and OTP | Proves sponsor isolation |

Delivery Staff A and B are profiles, not login accounts. The journey creates
them through the deployed Admin UI.

Verified by this plan:

- deployed browser UI and application API behavior;
- role and ownership boundaries;
- sponsor-safe projections;
- visible/API integer-minor financial aggregates;
- order, purchase, and delivery lifecycle behavior;
- real logout, cookie removal, diagnostics, and SSH tunnel cleanup.

Not verified without database access:

- physical row counts or uniqueness constraints;
- password hashes or seed idempotency;
- transaction locks and append-only storage;
- audit/outbox payloads;
- migration state on the VPS.

## 2. Current checkpoint

The latest failed complete-range attempt ran against application revision
`2de79a62c4b516674328a06df75e54693cf9adb6`. Its image was published,
deployed, and confirmed healthy, but that attempt exposed a logout-cookie
failure.

The latest command selected all 16 ordered steps plus diagnostics:

- preflight passed and Playwright reported exactly `17` tests, one worker, and
  zero retries;
- steps 01-02 passed;
- step 03 failed after the second Sponsor A logout: the exact
  `POST /api/auth/logout` succeeded and navigation reached `/login`, but one
  recognized auth cookie remained in the isolated context;
- steps 04-16 and diagnostics did not run because the serial journey stopped;
- terminal: `1 failed, 14 did not run, 2 passed (1.1m)`, native exit `1`;
- the managed SSH tunnel closed and the local forwarding port was free;
- only the value-free runner marker remained, and its sensitive-data audit
  passed.

The failure is now classified as a confirmed `najm-auth` package-boundary gap,
with complete remote resolution still unproved. The installed
`withAuthCookiePersistence()` recognized logout but guaranteed only the
remember-choice deletion; it trusted the wrapped handler to emit every auth
cookie deletion. Kafil therefore carried an application-level response helper
that the package boundary should own.

The red/green correction is released as `najm-auth@3.1.5` from Najm commit
`c9e37c3fcfcabb07cff139fb3a3608e23525f644`. On successful logout or
credential-setup completion, the wrapper drops stale auth-cookie issuances,
preserves one valid upstream deletion (including a custom path), and
synthesizes a canonical value-free deletion for each configured auth cookie
that the wrapped handler omitted. Unrelated cookies remain intact. The complete
`najm-auth` gate passes with `315` standard tests and `13` React-server tests,
the Next.js 16 production proxy fixture passes with a real logout route, the
exact commit-linked tarball was published, and registry integrity verification
passed.

Kafil now resolves `najm-auth@3.1.5`, exports the package-owned POST wrapper
directly, and no longer carries the temporary logout response helper. The
focused installed-package and route-wiring tests pass with `4 passed, 0 failed`,
the guarded runner contract passes with `16 passed, 0 failed`, targeted lint and
web typecheck pass, and the full root lint, typecheck, test, production build,
and `db:generate` gate passes with no schema changes.

Kafil commit `4ef0d033b26f7dcacb6d8c741a81f000d48e29ef` is now pushed,
verified, published as the SHA/main image, deployed, and confirmed as the sole
healthy `kafil-demo-vdadlv` app container. The first Dokploy trigger left the
old healthy revision running after a value-free Docker-command failure; one
authorized deploy-job retry pulled the exact target image and replaced the
container. Post-replacement guarded preflight passed every boolean, SSH,
Mailpit, Chrome, TLS, health, and readiness check, then reported
`MANAGED SSH TUNNEL CLOSED`.

The next authorized focused browser attempt selected the smallest prerequisite
range after the package correction: steps 01-03 plus diagnostics.

- preflight passed every boolean, SSH, Mailpit, Chrome, TLS, health, and
  readiness check;
- Playwright reported exactly `4` tests, one worker, and zero retries;
- steps 01, 02, and 03 passed, including Sponsor A's email login/logout,
  protected-profile `401`, phone login/logout, and auth-cookie absence after
  each real logout;
- diagnostics passed with no unexpected page errors, console errors, failed
  requests, or unexplained HTTP errors;
- steps 04-16 were excluded by the focused grep and were not run;
- terminal: `4 passed (1.3m)`, native exit `0`;
- the runner reported `MANAGED SSH TUNNEL CLOSED`, and a separate audit found
  the local forwarding port free;
- the only retained browser artifact was the value-free `.last-run.json`
  marker; exact configured-secret and sensitive-pattern scans found no match.

Focused traceability:

| Checked plan item | Exact acceptance assertion | Retained artifact |
| --- | --- | --- |
| Step 01 | Admin dashboard and assignment requests succeeded; real logout removed recognized auth cookies; `/api/auth/me` returned `401` | `apps/web/test/e2e/connected-four-account.remote.ts:1149`; passed runner marker |
| Step 02 | Family was created exactly once, completed first-login setup, temporary credentials were denied, role navigation stayed restricted, and real logout left `/api/families/me` at `401` | `apps/web/test/e2e/connected-four-account.remote.ts:1191`; passed runner marker |
| Step 03 | Sponsor A OTP was uniquely matched and deleted, pending login was denied, approval replay returned `409`, email and phone logins reached the Sponsor dashboard, and both real logouts removed recognized auth cookies | `apps/web/test/e2e/connected-four-account.remote.ts:1402`; passed runner marker |
| Diagnostics | All attached contexts had empty unexpected page-error, console-error, failed-request, and unexplained-response collections; required exact negative responses were consumed once | Historical diagnostics on `4ef0d03`; current expanded diagnostics start at `apps/web/test/e2e/connected-four-account.remote.ts:3692`; passed runner marker |

This accepted the corrected step 03 boundary on deployed revision `4ef0d03`
and authorized promotion to the complete selection.

The next fresh instruction authorized one complete-range attempt on the same
deployed revision:

- preflight passed every boolean, SSH, Mailpit, Chrome, TLS, health, and
  readiness check;
- Playwright reported exactly `17` tests, one worker, and zero retries;
- steps 01-16 passed in serial order;
- diagnostics passed with no unexpected page errors, console errors, failed
  requests, or unexplained HTTP errors;
- terminal: `17 passed (3.9m)`, native exit `0`;
- the runner reported `MANAGED SSH TUNNEL CLOSED`, and a separate audit found
  the local forwarding port free;
- the only retained browser artifact was the value-free `.last-run.json`
  marker with `status: passed` and no failed test IDs;
- exact configured-secret and sensitive-pattern scans found no artifact match.

Complete-run traceability:

| Checked plan item | Exact acceptance assertion | Retained artifact |
| --- | --- | --- |
| Step 01 | Admin dashboard and assignments loaded successfully; real logout removed recognized auth cookies; `/api/auth/me` returned `401` | `apps/web/test/e2e/connected-four-account.remote.ts:1149`; passed runner marker |
| Step 02 | One Family was created, first-login setup succeeded, the temporary credential was denied afterward, Family navigation stayed restricted, and logout left `/api/families/me` at `401` | `apps/web/test/e2e/connected-four-account.remote.ts:1191`; passed runner marker |
| Step 03 | Sponsor A OTP was uniquely matched and deleted, pending login was denied, approval replay returned `409`, email/phone logins succeeded, and both real logouts removed recognized auth cookies | `apps/web/test/e2e/connected-four-account.remote.ts:1402`; passed runner marker |
| Step 04 | Sponsor B followed the independent OTP, approval/replay, login, and logout contract without reusing Sponsor A state | `apps/web/test/e2e/connected-four-account.remote.ts:1714`; passed runner marker |
| Step 05 | Two assignments existed, duplicate creation returned `409`, sponsor projections exposed the allowed Family only, and cross-sponsor detail requests returned `404` | `apps/web/test/e2e/connected-four-account.remote.ts:2010`; passed runner marker |
| Step 06 | Contribution validation and refund replay contracts held and the Family reached the exact funded integer-minor target | `apps/web/test/e2e/connected-four-account.remote.ts:2326`; passed runner marker |
| Step 07 | Two Delivery Staff profiles were created; Order 1 cancellation and Order 2 rejection restored the asserted reserve state | `apps/web/test/e2e/connected-four-account.remote.ts:2761`; passed runner marker |
| Step 08 | Order 3 traversed approval, purchase variance/replay, failed delivery, reassignment, and confirmation/replay with the asserted lifecycle and financial values | `apps/web/test/e2e/connected-four-account.remote.ts:3026`; passed runner marker |
| Step 09 | Family order list/detail exposed the delivered order and excluded private operational keys | `apps/web/test/e2e/connected-four-account.remote.ts:3250`; passed runner marker |
| Step 10 | Sponsor A order list/detail matched the exact sponsor-safe allowlist and excluded sensitive values | `apps/web/test/e2e/connected-four-account.remote.ts:3294`; passed runner marker |
| Step 11 | Sponsor B order list/detail matched the exact sponsor-safe allowlist and excluded sensitive values | `apps/web/test/e2e/connected-four-account.remote.ts:3310`; passed runner marker |
| Step 12 | Admin order projection contained the complete asserted operational fields | `apps/web/test/e2e/connected-four-account.remote.ts:3326`; passed runner marker |
| Step 13 | The authenticated Family assignment request produced and consumed one exact `401` | `apps/web/test/e2e/connected-four-account.remote.ts:3364`; passed runner marker |
| Step 14 | The authenticated Sponsor A approval request produced and consumed one exact `401` | `apps/web/test/e2e/connected-four-account.remote.ts:3398`; passed runner marker |
| Step 15 | The authenticated Sponsor B delivery-confirmation request produced and consumed one exact `401` | `apps/web/test/e2e/connected-four-account.remote.ts:3428`; passed runner marker |
| Step 16 | All four roles completed real logout, recognized auth cookies were absent, and their pages closed | Historical logout-only step on `4ef0d03`; current expanded step starts at `apps/web/test/e2e/connected-four-account.remote.ts:3554`; passed runner marker for logout-only boundary |
| Diagnostics | Every attached context had empty unexpected page-error, console-error, failed-request, and unexplained-response collections; every required exact negative response was consumed once | Historical diagnostics on `4ef0d03`; current expanded diagnostics start at `apps/web/test/e2e/connected-four-account.remote.ts:3692`; passed runner marker |

This accepts the original 16 ordered browser steps and diagnostics together on
deployed revision `4ef0d03`.

The next test-only slice is now implemented locally. It adds one state-neutral
responsive unit before step 16 and expands step 16 to remove the disposable
runtime graph through supported application APIs. The new complete selection is
exactly **18 tests**: 16 numbered steps, one responsive unit, and diagnostics.

The first authorized 18-test attempt ran on deployed Kafil revision `4ef0d03`:

- guarded preflight passed every boolean plus SSH, Mailpit Basic auth, Chrome,
  TLS, application health, and readiness;
- Playwright reported exactly `18` tests, one worker, and zero retries;
- steps 01-15 passed in serial order;
- the responsive unit failed after keyboard activation of the exact Staff-row
  `Row actions` button: the exact `View` menu item rendered but never received
  focus during the 30-second assertion window;
- step 16 and diagnostics did not run after the serial failure, so supported
  cleanup was not proved and that attempt may have left its disposable graph;
- terminal: `1 failed, 2 did not run, 15 passed (4.8m)`, native exit `1`;
- the managed SSH tunnel closed and the forwarding port was confirmed free;
- the only retained artifact was the value-free failed `.last-run.json`
  marker, with one failed test ID and no screenshot, trace, or video; exact
  configured-secret and runtime-sensitive-pattern scans found no match.

The failure is classified `PRODUCT`, at the shared `najm-kit` boundary rather
than in the acceptance selector. `NContextMenu` rendered `role="menu"` and
`role="menuitem"` but never transferred focus from the trigger and supplied no
Arrow/Home/End navigation.

The correction is released as `najm-kit@2.11.8` from Najm commit
`443800b9932fa8187ee5c7d3083c11eda7f6441a` (implementation commit `23baaf0`).
The first enabled action now receives focus; disabled actions are skipped;
Arrow Up/Down wrap; Home/End move to the bounds; Tab dismisses; and Escape
restores the opener. Focused actions receive visible menu feedback. The package
regression failed before implementation, then the focused primitive and
`NTable` integration range passed with `27 passed, 0 failed`. The complete Najm
Kit gate passed with `1137` standard tests (`14` intentionally skipped), `7`
React-server tests, lint/type checks, build, and a current public API snapshot.
The commit-linked tarball was published and registry integrity verification
passed.

Kafil now resolves the exact `najm-kit@2.11.8` package locally. The installed
compiled artifact contains the focus-transfer and keyboard-navigation logic.
The root lint and typecheck gates passed; tests passed with `305` web, `336`
server (`53` opt-in database integrations skipped), and `85` seed tests. The
production build passed with only the Dockerfile's command-scoped throwaway
build values, and `bun run db:generate` reported no schema changes. The
dependency change still requires commit, image publication, deployment, and a
healthy exact-revision check before another remote browser instruction.

Local implementation evidence:

- the source contract was observed red before implementation, then passed with
  `16 passed, 0 failed, 350 assertions`;
- web lint and typecheck passed, followed by the complete root lint and
  typecheck gates;
- root tests passed: `305` web, `336` server with `53` database integrations
  skipped by the standard non-DB gate, and `85` seed tests;
- the production build passed with the Dockerfile's command-scoped throwaway
  build values after the unmodified local `.env` omitted `EMAIL_PROVIDER`;
- `bun run db:generate` reported `No schema changes, nothing to migrate`;
- discovery-only Playwright listing with non-secret placeholders reported
  exactly `18 tests in 1 file` without launching a browser or contacting the VPS;
- the final local diff audit found zero secret patterns, zero literal runtime
  identity patterns, and no unexpected modified file or second root plan;
- the responsive unit performs no contribution, order, purchase, or delivery
  mutation; it reuses the authenticated contexts for tablet, phone, RTL,
  keyboard-focus/dialog, horizontal-overflow, and protected-image decode checks;
- cleanup uses authenticated `DELETE`/`GET` application endpoints plus exact-
  recipient Mailpit deletion. Its retained-data summary contains counts only
  and states database-only guarantees as `NOT VERIFIED`.

The plan remains in progress until one freshly authorized 18-test remote attempt
passes and its sanitized output/artifact audit is recorded. Database-only
guarantees remain explicitly not verified.

The previous successful command selected the focused prerequisite range through the
corrected denial plus diagnostics:

- preflight: all boolean, SSH, Mailpit, Chrome, TLS, health, and readiness
  checks passed;
- selected tests: expected `14`, actual `14`, one worker, zero retries;
- steps 01-13: passed;
- step 13 observed and consumed one exact Family assignment denial with status
  `401`;
- diagnostics passed with no unexpected page errors, console errors, failed
  requests, or unexplained HTTP errors through step 13;
- steps 14-16 were excluded by the focused grep and were not run;
- terminal: `14 passed (4.0m)`, native exit `0`;
- managed SSH tunnel closed and the local forwarding port was free;
- no failure context exists; the retained runner marker passed the sensitive
  data audit;
- no sensitive runtime value was retained in this plan.

The previous role-denial `TEST` assertion mismatch is resolved. The focused remote proof
matches the installed guard contract and is accepted for step 13. It does not
accept steps 14-16 or the complete 17-test range.

The installed `najm-guard@2.0.2` middleware maps a false role guard to
`Err.unauthorized()`, and Kafil's local connected browser suite already pins
an authenticated wrong-role denial to `401`. The three remote operator-guard
denials now expect one exact `401`. The correction is test-only and does not
change the deployed app, dependencies, environment, APIs, migrations, retry
count, or timeout. No deployment was required for that historical denial-only
attempt. The later auth-package correction followed the application/package
publication boundary in section 8 before the passing focused browser attempt.

Local correction evidence:

- the role-denial source contract failed against the previous `403`
  expectations with
  `15 passed, 1 failed`;
- after correcting all three exact statuses it passed with
  `16 passed, 0 failed, 322 assertions`;
- targeted ESLint and the web typecheck passed;
- the full root lint, typecheck, and test gates passed;
- the production build passed with the Docker build stage's command-scoped
  throwaway values after the root `.env` lacked `EMAIL_PROVIDER`;
- `bun run db:generate` reported `No schema changes, nothing to migrate`.

## 3. Safety contract

The runner must fail closed unless all of these are true:

- `KAFIL_E2E_REMOTE_URL` is exactly the target origin;
- `KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE=true` is explicit;
- Admin credentials are present only in ignored local environment data;
- SSH uses key or existing non-password authentication;
- Mailpit is reached only through a runner-owned loopback SSH forward;
- Mailpit Basic auth succeeds and unauthenticated access is denied;
- system Chrome exists;
- TLS verification remains enabled;
- `/login`, `/apply`, health, and readiness succeed on the exact origin;
- the configured local forwarding port is free before startup.

The runner may mutate only disposable demo application records through the
deployed UI or authenticated/public application APIs.

Forbidden:

- PostgreSQL, SQL, seeds, migrations, resets, Docker, Dokploy, or VPS cleanup;
- mocks, `page.route()`, `clearCookies()`, forced clicks, or direct state
  mutation;
- screenshots, traces, or video;
- printing environment values, credentials, OTPs, cookies, mailbox content,
  private household data, generated identities, IDs, or raw sensitive bodies;
- killing unrelated SSH, Bun, Node, or Chrome processes.

## 4. Runtime configuration

The ignored root `.env` provides these names:

```text
KAFIL_E2E_REMOTE_URL
KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE
KAFIL_ADMIN_EMAIL
KAFIL_ADMIN_PASSWORD
KAFIL_E2E_SSH_HOST
KAFIL_E2E_SSH_USER
KAFIL_E2E_SSH_PORT
KAFIL_E2E_SSH_IDENTITY_FILE
KAFIL_E2E_MAILBOX_LOCAL_PORT
KAFIL_E2E_MAILBOX_REMOTE_PORT
KAFIL_E2E_MAILBOX_API_URL
KAFIL_E2E_MAILBOX_USER
KAFIL_E2E_MAILBOX_PASSWORD
```

Check presence and validated state only. Never echo resolved values.

## 5. Numbered browser journey

The spec is one `test.describe.serial` journey with one worker, zero retries,
the shared 180-second default timeout, and passive diagnostics last. No step
adds a local timeout.

Exact titles:

```text
remote step 01 - guarded admin smoke
remote step 02 - Family provisioning and first login
remote step 03 - Sponsor A application and approval
remote step 04 - Sponsor B application and approval
remote step 05 - assignments and sponsor privacy
remote step 06 - contributions and exact funding
remote step 07 - delivery staff and reversible orders
remote step 08 - purchase and delivery lifecycle
remote step 09 - Family order projection
remote step 10 - Sponsor A order privacy
remote step 11 - Sponsor B order privacy
remote step 12 - Admin order projection
remote step 13 - Family delivery assignment denial
remote step 14 - Sponsor A approval denial
remote step 15 - Sponsor B delivery confirmation denial
remote responsive - phone, tablet, RTL, keyboard, and protected images
remote step 16 - supported cleanup, role logout, and closure
remote diagnostics - final context assertions
```

The focused role-denial proof reported exactly **14 tests** and passed. An
earlier complete-range attempt selected exactly **17 tests** but failed in step
03. After the Najm package correction was released, consumed, deployed, and
confirmed healthy, the smallest prerequisite range—steps 01-03 plus
diagnostics, exactly **4 tests**—passed. The promoted 17-test range then passed
once on the same healthy revision after a fresh user instruction. The locally
implemented complete range now selects exactly **18 tests** and awaits its own
freshly authorized remote attempt.

### Step contracts

| Step | Contract | Current organized code |
| --- | --- | --- |
| 01 | Admin login, dashboard/assignment readiness, real logout, cookie absence, protected `401` | Complete-range remote pass on `4ef0d03` |
| 02 | Family UI creation, first-login password setup, temporary-credential denial, role boundary | Complete-range remote pass on `4ef0d03` |
| 03 | Sponsor A application, exact OTP/delete, pending denial, approval/replay, email/phone login | Complete-range remote pass on `4ef0d03` with Najm Auth 3.1.5; both real logout cookie-absence assertions passed |
| 04 | Independent Sponsor B application, OTP/delete, approval/replay, login/logout | Complete-range remote pass on `4ef0d03` |
| 05 | Two assignments, duplicate `409`, safe sponsor projections, cross-sponsor `404` boundaries | Complete-range remote pass on `4ef0d03` |
| 06 | Plan lifecycle, contribution validation/refund replays, exact target funding | Complete-range remote pass on `4ef0d03` |
| 07 | Two Delivery Staff profiles, Order 1 cancellation, Order 2 rejection, reserve restoration | Complete-range remote pass on `4ef0d03` |
| 08 | Order 3 approval, purchase variance/replay, failed delivery, reassignment, confirmation/replay | Complete-range remote pass on `4ef0d03` |
| 09 | Family delivered-order projection and private operational-key exclusion | Complete-range remote pass on `4ef0d03` |
| 10 | Sponsor A order list/detail exact allowlist and sensitive-value exclusion | Complete-range remote pass on `4ef0d03` |
| 11 | Sponsor B order list/detail exact allowlist and sensitive-value exclusion | Complete-range remote pass on `4ef0d03` |
| 12 | Complete Admin operational projection | Complete-range remote pass on `4ef0d03` |
| 13 | Family assignment request returns one exact `401` | Complete-range remote pass on `4ef0d03` |
| 14 | Sponsor A approval request returns one exact `401` | Complete-range remote pass on `4ef0d03` |
| 15 | Sponsor B delivery-confirmation request returns one exact `401` | Complete-range remote pass on `4ef0d03` |
| Responsive | Tablet Admin Staff, phone Family Products, protected-image decode/authenticated bytes, keyboard-only View dialog, phone Sponsor RTL Orders, and no horizontal overflow | Failed remotely on `4ef0d03` at shared menu focus; fixed and verified in published `najm-kit@2.11.8`; corrected Kafil deployment and remote proof pending |
| 16 | Supported deletion of the Family graph, two evidence files, two Staff profiles, two approved applicants, and exact-recipient mailbox messages; zero API-visible retained runtime rows/files/messages; real logout and page closure | Did not run after the responsive serial failure; cleanup contract is implemented locally, but combined remote proof and assessment of possible failed-attempt residue remain pending |
| Diagnostics | Counts-only cleanup summary, database boundary `NOT VERIFIED`, and no unexpected page errors, console errors, failed requests, or unexplained HTTP errors | Implemented locally; remote proof pending for the 18-test range |

Steps 07-16 reuse the same four authenticated pages. Typed in-memory phases
fail closed at every boundary:

```text
reversible-orders-complete
delivery-complete
family-projection-complete
sponsor-a-projection-complete
sponsor-b-projection-complete
admin-projection-complete
family-denial-complete
sponsor-a-denial-complete
denials-complete
```

No login, Staff creation, contribution, order submission, purchase, delivery
command, or denial is duplicated by the responsive unit.

## 6. Diagnostics and assertion rules

- Attach diagnostics when each page is created.
- Capture page errors, console errors, failed requests, and every `4xx`/`5xx`.
- Register each intentional negative response by exact method, pathname, and
  status before the one action; consume it once.
- Register the exact request and exact-path response observers before awaiting
  the action; observe any returned status before asserting the expected one.
- Keep response and console allowances separately counted.
- Register response/navigation promises before actions.
- Use exact role, label, placeholder, or stable row/card boundaries.
- Never use arbitrary sleeps, `networkidle`, `.first()` to hide duplicates, or
  `force: true`.
- Keep money as safe integer minor units.
- Keep all generated identities and sensitive values in memory only.

## 7. Execution and one-attempt rule

Local source gate, run from `apps/web`:

```powershell
bun test test/connected-four-account-remote-runner.test.ts
bun run typecheck
bun x eslint playwright.remote.config.ts `
  scripts/connected-four-account-remote-runtime.ts `
  scripts/run-connected-four-account-remote-e2e.ts `
  test/connected-four-account-remote-runner.test.ts `
  test/e2e/connected-four-account.remote.ts
```

Remote preflight is needed after configuration, SSH, mailbox, or deployment
state changes. The full remote command performs its own preflight.

Focused prerequisite range that passed once on healthy `4ef0d03`:

```powershell
$env:KAFIL_E2E_REMOTE_GREP='remote step 0[1-3]|remote diagnostics'
bun run --cwd apps/web test:e2e:connected:remote
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
```

Run it once only after a fresh user instruction. Verify the header reports 4
tests before interpreting results. It passed, and the later complete 17-test
selection also passed once after its own fresh user instruction. Do not repeat
either remote level without a new plan reason and fresh instruction.

Next complete range, only after the corrected Kafil revision is deployed,
confirmed healthy, and a fresh instruction is received:

```powershell
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
bun run --cwd apps/web test:e2e:connected:remote
```

Verify the header reports exactly 18 tests before interpreting results. This is
one attempt only; a failure must follow the stop-and-classify rule below without
an edit or rerun in the same authorization.

After any failure:

1. preserve the native exit and final sanitized assertion;
2. classify `TEST`, `PRODUCT`, `RUNNER`, or `ENVIRONMENT`;
3. confirm tunnel closure and forwarding-port release;
4. record a value-free fingerprint;
5. stop without editing or rerunning under the tester instruction.

## 8. Publication boundary

Test/spec/runner/plan-only correction:

- run red/green source coverage, static checks, full local gate, diff audit;
- test against the already-healthy deployment after fresh authorization;
- commit and push the accepted test correction and browser evidence together;
- no deployment is required before that browser attempt.

Application, package, runtime configuration, migration, or seed/grant change:

- commit and push;
- pass verification and image publication;
- deploy and confirm the exact live revision healthy;
- obtain a fresh instruction before the next remote attempt.

## 9. Final local gate

```powershell
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:generate
```

For an offline build, use only the Docker build stage's command-scoped
throwaway values; never write them to `.env`. `db:generate` must create no
migration for this browser-test-only change.

## 10. Remaining acceptance work

Responsive tablet/phone, RTL, keyboard focus, protected-image decode, supported
application cleanup, and counts-only retained-data reporting are implemented.
The financial journey is not repeated at each viewport. The required local gate
passes with `najm-kit@2.11.8` and no schema drift. Because the failed responsive
attempt stopped before step 16, its disposable application graph may remain;
the next authorized activity must assess that residue through supported
application surfaces without database, Docker, or VPS cleanup shortcuts.

The plan remains **IN PROGRESS** until:

- the corrected Kafil dependency revision is committed, pushed, published,
  deployed, and confirmed healthy;
- a fresh user instruction authorizes one complete remote attempt;
- the runner header reports exactly `18` tests, one worker, and zero retries;
- all 16 numbered steps, the responsive unit, and diagnostics pass together;
- step 16 reports zero retained API-visible runtime rows, protected evidence
  files, and exact-recipient mailbox messages through counts-only assertions;
- the managed tunnel closes, its forwarding port is free, and the retained
  marker/output pass the secret and runtime-sensitive-value audit;
- the accepted test/plan evidence is committed and pushed under section 8;
- database-only guarantees remain explicitly `NOT VERIFIED`.
