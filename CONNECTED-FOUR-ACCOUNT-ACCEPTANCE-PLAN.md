# Kafil guarded VPS acceptance plan

Status: **IN PROGRESS — NAJM 3.1.5 RELEASED; KAFIL INTEGRATED, DEPLOYMENT NEXT**

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

The deployed application revision is
`2de79a62c4b516674328a06df75e54693cf9adb6`. Its image was published,
deployed, and confirmed healthy, but the latest complete-range attempt exposed
a logout-cookie failure on that revision.

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
and `db:generate` gate passes with no schema changes. Deployment and focused
remote proof are still pending, so step 03 remains unaccepted.

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
attempt. The new auth-package correction must follow the application/package
publication boundary in section 8 before another browser attempt.

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
remote step 16 - role logout and closure
remote diagnostics - final context assertions
```

The focused role-denial proof reported exactly **14 tests** and passed. The
later complete-range attempt selected exactly **17 tests** but failed in step
03. After the Najm package correction is released, consumed, deployed, and
confirmed healthy, the next browser selection must return to the smallest
prerequisite range: steps 01-03 plus diagnostics, exactly **4 tests**. Promote
back to all 17 only after that focused range passes.

### Step contracts

| Step | Contract | Current organized code |
| --- | --- | --- |
| 01 | Admin login, dashboard/assignment readiness, real logout, cookie absence, protected `401` | Remote pass |
| 02 | Family UI creation, first-login password setup, temporary-credential denial, role boundary | Remote pass |
| 03 | Sponsor A application, exact OTP/delete, pending denial, approval/replay, email/phone login | Latest remote fail at second logout cookie-absence assertion; Najm 3.1.5 integrated locally, deployment proof pending |
| 04 | Independent Sponsor B application, OTP/delete, approval/replay, login/logout | Remote pass |
| 05 | Two assignments, duplicate `409`, safe sponsor projections, cross-sponsor `404` boundaries | Remote pass |
| 06 | Plan lifecycle, contribution validation/refund replays, exact target funding | Remote pass |
| 07 | Two Delivery Staff profiles, Order 1 cancellation, Order 2 rejection, reserve restoration | Remote pass |
| 08 | Order 3 approval, purchase variance/replay, failed delivery, reassignment, confirmation/replay | Remote pass |
| 09 | Family delivered-order projection and private operational-key exclusion | Remote pass |
| 10 | Sponsor A order list/detail exact allowlist and sensitive-value exclusion | Remote pass |
| 11 | Sponsor B order list/detail exact allowlist and sensitive-value exclusion | Remote pass |
| 12 | Complete Admin operational projection | Remote pass |
| 13 | Family assignment request returns one exact `401` | Focused remote pass |
| 14 | Sponsor A approval request returns one exact `401` | Corrected locally; excluded by focused grep |
| 15 | Sponsor B delivery-confirmation request returns one exact `401` | Corrected locally; excluded by focused grep |
| 16 | Real logout for all four roles, auth-cookie absence, and page closure | Excluded by focused grep |
| Diagnostics | No unexpected page errors, console errors, failed requests, or unexplained HTTP errors | Focused remote pass through step 13 |

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

No login, Staff creation, order submission, purchase, delivery command, or
denial is duplicated by the split.

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

Next focused prerequisite range, only after the Najm fix is released, consumed,
deployed, and confirmed healthy:

```powershell
$env:KAFIL_E2E_REMOTE_GREP='remote step 0[1-3]|remote diagnostics'
bun run --cwd apps/web test:e2e:connected:remote
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
```

Run it once only after a fresh user instruction. Verify the header reports 4
tests before interpreting results. After it passes, promote to the complete
17-test selection recorded in section 5.

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

The current 16-step range does not implement responsive tablet/phone,
keyboard-focus, protected-image decode, or supported application cleanup beyond
logout/page/context/tunnel closure. Add those only after the 17-test range
passes. Do not repeat financial mutations at each viewport.

The plan remains **IN PROGRESS** until:

- all 16 steps and diagnostics pass together with native exit `0`;
- responsive and keyboard coverage is implemented and passes;
- supported cleanup and masked retained-data reporting complete;
- no secret or runtime-sensitive value appears in output, diff, or artifacts;
- final local gates pass with no schema drift;
- database-only guarantees remain explicitly `NOT VERIFIED`.
