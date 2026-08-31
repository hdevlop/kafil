# Kafil guarded VPS acceptance plan

Status: **IN PROGRESS - AUTH MATRIX ACCEPTED; FINANCIAL STEPS 01-04 ACCEPTED; MAIL-TEST HUB VPS ACTIVATION PENDING**

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
- real logout, cookie removal, diagnostics, and mailbox-transport isolation.

Not verified without database access:

- physical row counts or uniqueness constraints;
- password hashes or seed idempotency;
- transaction locks and append-only storage;
- audit/outbox payloads;
- migration state on the VPS.

## 2. Current checkpoint

The authoritative checkpoint is section 11.15. The latest complete 18-test
attempt reached and passed steps 01-04 before the runner-owned SSH transport
reset a second time. The browser result after step 04 is unclassified. SSH
forwarding is retired. The proposed Tailscale replacement in section 11.14 was
implemented locally but was not activated; it is now superseded by one
standalone VPS mail-test hub. The active runner uses an exact verified-HTTPS
gateway, a Kafil-only bearer token, and no SSH, Tailscale, local forward, or
managed network lifecycle. Mailpit and its existing dashboard remain behind
the VPS proxy and private Docker network. VPS activation is still pending. The
chronology below remains historical evidence.

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

Kafil now resolves the exact `najm-kit@2.11.8` package. The installed
compiled artifact contains the focus-transfer and keyboard-navigation logic.
The root lint and typecheck gates passed; tests passed with `305` web, `336`
server (`53` opt-in database integrations skipped), and `85` seed tests. The
production build passed with only the Dockerfile's command-scoped throwaway
build values, and `bun run db:generate` reported no schema changes. The
dependency and acceptance changes were committed as `1d77005` and `8334f4c`
and pushed. GitHub verification, the exact SHA/main image publication, and the
Dokploy trigger passed. A value-free read-only deployment check then confirmed
exactly one app-service container at full OCI revision
`8334f4c6478ec90565ca31f45eab7fdc29d101cb` with Docker health `healthy`.
Guarded preflight passed all 11 booleans plus SSH identity, Chrome, forwarding-
port availability, authenticated Mailpit, TLS `/login` and `/apply`, health,
and readiness, then closed the managed tunnel. A fresh instruction is now
required before the next remote browser attempt.

That freshly authorized complete attempt then ran once on deployed revision
`8334f4c`:

- guarded preflight passed every boolean plus SSH, Mailpit Basic auth, Chrome,
  TLS, application health, and readiness;
- Playwright reported exactly `18` tests, one worker, and zero retries;
- steps 01-15 and the responsive unit passed, including the corrected keyboard
  focus, phone/tablet, RTL, protected-image, and overflow assertions;
- step 16 timed out after 180 seconds on its first Family logout, before any
  supported record-deletion request ran: the responsive unit had left the
  shared Family page at the phone viewport, and the test helper selected a
  logout button that Playwright reported outside the viewport;
- the final diagnostics test did not run after the serial failure;
- terminal: `1 failed, 1 did not run, 16 passed (7.6m)`, native exit `1`;
- the managed SSH tunnel closed and the local forwarding port was free;
- the only retained artifact was the value-free failed `.last-run.json`
  marker, with one failed test ID and no screenshot, trace, video, or retained
  error context; configured-secret and runtime-sensitive-pattern scans found
  no match.

This failure is classified `TEST`, not a Kafil or Najm product failure. Its
value-free fingerprint is step 16, `/products`, logout icon button, no
`POST /api/auth/logout` response, outside-viewport actionability, 180-second
timeout. The disposable graph from this attempt may remain because cleanup did
not reach its first deletion.

The test-only correction now restores all four shared pages to a deterministic
desktop viewport before step 16 begins logout. The logout helper also performs
one five-second non-mutating trial click before registering the exact response
observer and issuing the real click, so a future actionability regression fails
quickly without duplicating the mutation.

Correction evidence:

- the new source contract failed against the old helper with `15 passed, 1
  failed, 319 assertions`, then passed after the correction with `16 passed, 0
  failed, 354 assertions`;
- targeted web lint and typecheck passed;
- the complete root lint and typecheck gates passed;
- root tests passed with `305` web, `336` server (`53` opt-in database tests
  skipped), and `85` seed tests;
- the first root build wrapper returned `255` after compilation without a
  Next.js error; no unrelated processes were stopped, the equivalent package
  build passed completely, and the exact root `bun run build` then passed with
  the Dockerfile's command-scoped build-only values;
- `bun run db:generate` reported `No schema changes, nothing to migrate`;
- discovery-only Playwright listing with non-secret placeholders reported
  exactly `18 tests in 1 file` without opening a browser or contacting the VPS.

This correction changes only the remote spec, its source-contract test, and
this plan. It does not require application deployment. A fresh instruction is
required before another remote attempt.

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

The next freshly authorized 18-test attempt ran once on the same healthy exact
revision `8334f4c6478ec90565ca31f45eab7fdc29d101cb`:

- guarded preflight passed, Playwright selected exactly `18` tests with one
  worker and zero retries, and step 01 passed;
- step 02 created its disposable Family and completed first-login setup, but
  its final real logout failed the immediate cookie-absence assertion after
  `POST /api/auth/logout` returned below `400` and navigation reached `/login`;
- the assertion proved only that one of `accessToken`, `refreshToken`, or
  `najm.session` remained. It discarded the cookie kind, so the evidence cannot
  distinguish a canonical deletion defect from a late session-recovery
  response;
- steps 03-16, responsive, and diagnostics did not run after the serial
  failure; terminal: `1 failed, 16 did not run, 1 passed (42.4s)`, native exit
  `1`;
- the managed tunnel closed, the forwarding port was free, and only the
  value-free failed `.last-run.json` marker remained. No exact configured
  secret or runtime-sensitive pattern was retained;
- because cleanup did not run, the disposable Family created by this attempt
  may remain.

This failure is `UNCLASSIFIED`, not yet a confirmed Najm package defect. The
same deployed package/revision previously passed the same logout boundary in
focused and complete runs, while the latest assertion retained insufficient
metadata to identify the remaining cookie.

The local diagnostic correction keeps values private and records only:

- the remaining recognized kind as `access`, `refresh`, or `session`;
- the pathname and status of logout, refresh, and session-recovery responses
  observed across the real logout action.

It does not add a retry, sleep, timeout, cookie clearing, forced click, or
application mutation. Its source contract passes with `16 passed, 0 failed,
361 assertions`; targeted lint and web typecheck pass; and the complete root
lint, typecheck, test, production build, and `db:generate` gate passes with
`305` web tests, `336` server tests (`53` database integrations skipped), `85`
seed tests, and no schema change. The next safe remote action is one freshly
authorized focused selection of steps 01-02 plus diagnostics. A product/package
correction must be based on that value-free fingerprint; a complete 18-test
proof remains required afterward. A discovery-only Playwright listing with
non-secret placeholders confirms that focused selection is exactly `3 tests in
1 file` without launching a browser or contacting the VPS.

The freshly authorized 3-test diagnostic range then ran once on deployed
revision `8334f4c`:

- guarded preflight passed every boolean plus SSH, authenticated Mailpit,
  Chrome, verified TLS, health, and readiness;
- Playwright reported exactly `3` tests, one worker, and zero retries;
- steps 01 and 02 passed. The step 02 final real logout removed every recognized
  auth cookie and the protected Family endpoint returned `401`, so the prior
  logout-cookie symptom did not reproduce in this focused attempt;
- final diagnostics failed immediately because it unconditionally required the
  cleanup summary produced only by step 16, which the focused grep correctly
  excluded;
- terminal: `1 failed, 2 passed (40.2s)`, native exit `1`;
- the managed tunnel closed, the forwarding port was free, and the sole
  retained artifact was the value-free failed `.last-run.json` marker with one
  failed test ID and zero configured-secret matches;
- step 16 did not run, so the disposable Family from this focused attempt may
  remain.

This is classified `TEST`: the final diagnostics test was not passive for a
focused prerequisite range. It is not evidence of a Kafil or Najm Auth product
failure. The step 02 pass clears the focused reproduction checkpoint but does
not prove that an intermittent logout race cannot recur.

The narrow local correction now runs cleanup-summary assertions only when step
16 actually produced a summary, while always asserting the diagnostics attached
to all four contexts. Complete-run cleanup remains strict because step 16 must
assign `cleanupSummary` before that test can pass. The new source regression was
red at `16 passed, 1 failed, 362 assertions` against the old diagnostic and is
green at `17 passed, 0 failed, 368 assertions` after the correction. No timeout,
retry, sleep, cookie clearing, application code, deployment, or VPS state was
changed. One fresh authorization is required before repeating the corrected
3-test focused range. The correction's complete local gate passes: lint,
typecheck, `305` web tests, `336` server tests (`53` database integrations
skipped), `85` seed tests, the production build, and `db:generate` with no
schema change. A discovery-only Playwright listing selects exactly the intended
three tests—steps 01-02 plus diagnostics—in one file without launching a
browser or contacting the VPS.

The first authorized attempt after that correction stopped in guarded preflight
before Playwright started because authenticated Mailpit readiness did not
converge through the managed SSH tunnel. It exited `1`, reported
`MANAGED SSH TUNNEL CLOSED`, left the forwarding port free, and created no new
browser artifact. This was classified `ENVIRONMENT`; all three selected tests
were `NOT RUN`.

The next instruction authorized diagnosis and one corrected focused attempt.
Read-only checks proved that the root-only VPS mailbox file remained mode
`0600`, local and VPS credential fingerprints matched, and Mailpit returned the
required unauthenticated `401` and authenticated `200` without exposing values
or mailbox content. A separately owned diagnostic tunnel then reached the same
401/200 readiness pair within the runner's existing window and closed cleanly.
No credential, VPS, runner, timeout, retry, or application change was needed;
the earlier preflight failure was transient.

The corrected focused browser attempt then passed on deployed revision
`8334f4c`:

- guarded preflight passed all 11 booleans plus SSH identity, Chrome, forwarding
  port availability, authenticated Mailpit, verified TLS, `/login`, `/apply`,
  health, and readiness;
- Playwright reported exactly `3` tests, one worker, and zero retries;
- step 01 passed in `13.7s`;
- step 02 passed in `26.7s`, including real logout, recognized auth-cookie
  absence, and the protected Family `401` assertion;
- passive diagnostics passed in `30ms` with no unexpected page errors, console
  errors, failed requests, or unexplained HTTP errors;
- terminal: `3 passed (44.4s)`, native exit `0`;
- the managed SSH tunnel closed and the forwarding port was free;
- the sole artifact was the passed `.last-run.json` marker with zero failed
  test IDs; configured-secret and runtime-sensitive-value scans found no match.

Steps 03-16 and the responsive unit were excluded by the focused grep. Because
step 16 was excluded, this attempt's disposable Family may remain. The passive-
diagnostics correction and step 02 focused boundary are accepted; promotion now
requires a fresh instruction for one complete 18-test attempt.

That freshly authorized complete attempt then ran once against deployed
revision `8334f4c` using the accepted test-only commit `b465bee`:

- guarded preflight passed all 11 booleans plus SSH identity, Chrome, forwarding
  port availability, authenticated Mailpit, verified TLS, `/login`, `/apply`,
  health, and readiness;
- Playwright reported exactly `18` tests, one worker, and zero retries;
- steps 01-03 passed in `10.0s`, `26.8s`, and `43.9s` respectively;
- step 04 failed after `7.9s` when the concurrently started Sponsor B OTP poll
  received a Node-side `fetch failed` with nested `ECONNRESET`. The promise had
  no rejection handler until the later application-response block caught up,
  so Playwright closed the page and the pending `/api/applicants` response
  observer then failed secondarily; no application response status was proved;
- steps 05-16, the responsive unit, and diagnostics did not run;
- terminal: `1 failed, 14 did not run, 3 passed (1.5m)`, native exit `1`;
- the managed tunnel closed and the forwarding port was free;
- the sole retained artifact was the failed `.last-run.json` marker with one
  failed test ID; configured-secret and runtime-sensitive-value scans found no
  match.

This is classified `TEST`, exposed by a transient Mailpit transport reset. It
is not evidence of a Kafil application or deployed Mailpit-auth defect: the
exact preflight contract had passed, the failure was a Node-side mailbox read,
and the browser response observer failed only after the unhandled concurrent
promise closed its page. Value-free fingerprint: step 04, `/apply`, Sponsor B
OTP polling, read-only Mailpit fetch, `ECONNRESET`, application response status
not observed, `7.9s`.

The narrow local correction marks each concurrently started OTP polling promise
handled immediately while returning the original promise so its later assertion
is not swallowed. Read-only Mailpit GETs retry exactly once only when an error
or nested cause has code `ECONNRESET`; refused connections, HTTP/auth failures,
mailbox mutations, browser actions, and every other error remain fail-fast. It
adds no Playwright retry, timeout, sleep, browser replay, application code, VPS
configuration, or deployment change. The new source/helper regression was red
because both contracts were absent and is green with `18 passed, 0 failed, 376
assertions`; targeted remote-file lint and web typecheck pass. The complete root
lint, typecheck, test, production build, and `db:generate` gate passes with
`305` web tests, `336` server tests (`53` database integrations skipped), `85`
seed tests, and no schema change. A discovery-only Playwright listing with
non-secret placeholders selects exactly `5 tests in 1 file` without launching a
browser or contacting the VPS. The next safe remote level is one freshly
authorized five-test prerequisite range: steps 01-04 plus passive diagnostics.

That freshly authorized five-test prerequisite range then passed once on the
same healthy deployed revision `8334f4c`:

- guarded preflight passed all 11 booleans plus SSH identity, Chrome, forwarding
  port availability, authenticated Mailpit, verified TLS, `/login`, `/apply`,
  health, and readiness;
- Playwright reported exactly `5` tests, one worker, and zero retries;
- steps 01-04 passed in `10.7s`, `26.7s`, `35.0s`, and `28.7s` respectively;
- step 04 completed Sponsor B's independent OTP, approval/replay, login, and
  logout contract without an unhandled mailbox-poll rejection;
- passive diagnostics passed in `30ms` with no unexpected page errors, console
  errors, failed requests, or unexplained HTTP errors;
- steps 05-16 and the responsive unit were excluded by the focused grep and did
  not run; because step 16 was excluded, this attempt's disposable graph may
  remain;
- terminal: `5 passed (1.7m)`, native exit `0`;
- the runner reported `MANAGED SSH TUNNEL CLOSED`, and the forwarding port was
  independently confirmed free;
- the sole retained artifact was the passed `.last-run.json` marker with zero
  failed test IDs; configured-secret and runtime-sensitive-value scans found no
  match.

The transient-reset harness correction and step 04 focused boundary are now
accepted. Promotion requires a fresh instruction for one complete 18-test
attempt; it must not run under the focused authorization.

That freshly authorized complete attempt then ran once on the same healthy
deployed revision `8334f4c` using accepted test-only commit `ac12d3c`:

- guarded preflight passed all 11 booleans plus SSH identity, Chrome, forwarding
  port availability, authenticated Mailpit, verified TLS, `/login`, `/apply`,
  health, and readiness;
- Playwright reported exactly `18` tests, one worker, and zero retries;
- steps 01 and 02 passed in `9.9s` and `28.3s` respectively;
- step 03 timed out after 180 seconds while the Admin applicants page waited for
  a successful paginated `GET /api/applicants`; the pending response waiter then
  rejected when Playwright closed the page and context;
- the waiter matched only a successful response, so it retained no response
  status and could not distinguish a repeated authorization response, another
  application error, a redirect, or a missing request;
- steps 04-16, the responsive unit, and diagnostics did not run after the serial
  failure;
- terminal: `1 failed, 15 did not run, 2 passed (3.7m)`, native exit `1`;
- the runner reported `MANAGED SSH TUNNEL CLOSED`, and the forwarding port was
  independently confirmed free;
- the sole retained artifact was the failed `.last-run.json` marker with one
  failed test ID; the referenced error context was not retained, and configured-
  secret and runtime-sensitive-value scans found no match.

This is classified `TEST`: the success-only collection waiter violated the
fail-fast diagnostic contract. The underlying product/environment outcome is
not classified because no response status was proved. Value-free fingerprint:
step 03, route `/applicants`, request `GET /api/applicants`, status `none`,
successful paginated response not observed, 180-second timeout.

The narrow test-only correction replaces both Sponsor A and Sponsor B
applicants-page waiters with one shared bounded helper. It registers before
navigation, keeps both response and navigation promises handled concurrently,
allows at most the one documented transient `401`, accepts the next successful
paginated response, and fails on the next non-success response. A missing
terminal response now fails after 30 seconds without increasing the shared
180-second test timeout. Its error contains only method, path, observed status
codes, and current pathname; it never reads a response body, query value,
identity, credential, cookie, or mailbox content.

Correction evidence:

- the new source contract was red against the old source with `18 passed, 1
  failed, 377 assertions`;
- after implementation it passed with `19 passed, 0 failed, 397 assertions`;
- targeted remote-file ESLint and web typecheck passed;
- the complete root lint and typecheck gates passed;
- root tests passed with `308` web, `336` server (`53` opt-in database
  integrations skipped), and `85` seed tests;
- the production build passed with Docker's command-scoped build-only values;
- `bun run db:generate` reported `No schema changes, nothing to migrate`;
- discovery-only Playwright listing with non-secret placeholders selected
  exactly `4 tests in 1 file`: steps 01-03 plus passive diagnostics, without
  launching a browser or contacting the VPS.

The correction changes only the remote spec, its source-contract test, and this
plan, so no application deployment is required. The user's current fresh
instruction authorizes exactly one corrected four-test prerequisite attempt.

That corrected four-test prerequisite attempt then passed once on the same
healthy deployed revision `8334f4c`:

- guarded preflight passed all 11 booleans plus SSH identity, Chrome, forwarding
  port availability, authenticated Mailpit, verified TLS, `/login`, `/apply`,
  health, and readiness;
- Playwright reported exactly `4` tests, one worker, and zero retries;
- steps 01, 02, and 03 passed in `13.2s`, `26.0s`, and `27.3s` respectively;
- passive diagnostics passed in `20ms` with no unexpected page errors, console
  errors, failed requests, or unexplained HTTP errors;
- steps 04-16 and the responsive unit were excluded by the focused grep and did
  not run; because step 16 was excluded, this attempt's disposable graph may
  remain;
- terminal: `4 passed (1.1m)`, native exit `0`;
- the runner reported `MANAGED SSH TUNNEL CLOSED`, and the forwarding port was
  independently confirmed free;
- the sole retained artifact was the passed `.last-run.json` marker with zero
  failed test IDs and no error context; configured-secret and runtime-sensitive-
  value scans found no match.

The bounded collection diagnostic and corrected step-03 boundary are accepted.
Promotion now requires a fresh instruction for one complete 18-test attempt; it
must not run under this focused authorization.

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
- all legacy SSH, forwarding, and Tailscale environment names are absent;
- the mailbox URL is exact verified HTTPS on the separately configured API
  hostname, with no credentials, query, fragment, path prefix, or custom port;
- the Kafil gateway bearer token is at least 32 characters and is never the
  Mailpit dashboard password;
- unauthenticated gateway access returns `401`, while authenticated
  `/api/v1/info` identifies exactly the `mail-test-gateway` and `kafil` scope;
- system Chrome exists;
- TLS verification remains enabled;
- `/login`, `/apply`, health, and readiness succeed on the exact origin;
- the runner owns no mailbox transport process or private-network state.

The runner may mutate only disposable demo application records through the
deployed UI or authenticated/public application APIs.

Forbidden:

- PostgreSQL, SQL, seeds, migrations, resets, Docker, Dokploy, or VPS cleanup;
- mocks, `page.route()`, `clearCookies()`, forced clicks, or direct state
  mutation;
- screenshots, traces, or video;
- printing environment values, credentials, OTPs, cookies, mailbox content,
  private household data, generated identities, IDs, or raw sensitive bodies;
- starting, stopping, or killing unrelated VPN, SSH, Docker, Bun, Node, or
  Chrome processes.

## 4. Runtime configuration

The ignored root `.env` provides these names:

```text
KAFIL_E2E_REMOTE_URL
KAFIL_E2E_ALLOW_REMOTE_DESTRUCTIVE
KAFIL_ADMIN_EMAIL
KAFIL_ADMIN_PASSWORD
KAFIL_E2E_MAILBOX_API_HOST
KAFIL_E2E_MAILBOX_API_URL
KAFIL_E2E_MAILBOX_TOKEN
```

Check presence and validated state only. Never echo resolved values.

The standalone deployment is `deploy/mail-test-hub/compose.yml`. Mailpit owns
the existing human dashboard and persistent test-message volume. The gateway
exposes only authenticated info, scoped search, scoped detail, and scoped
delete. Kafil and School use distinct tokens and exclusive recipient domains;
the dashboard password is never distributed to either test runner. SMTP,
Mailpit, and the gateway share the internal `mail-test-hub` Docker network.
Only the dashboard and gateway loopback ports are handed to the existing VPS
HTTPS proxy. The reusable VPS helper is
`scripts/configureMailTestHubVps.sh`.

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
| 02 | Family UI creation, first-login password setup, temporary-credential denial, role boundary | Passed on `4ef0d03`; corrected 3-test range on `8334f4c` passed real logout, cookie absence, and protected `401`; intermittent complete-run symptom remains unclassified |
| 03 | Sponsor A application, exact OTP/delete, pending denial, approval/replay, email/phone login | Bounded collection observer and complete step contract passed in the corrected four-test range on healthy revision `8334f4c` |
| 04 | Independent Sponsor B application, OTP/delete, approval/replay, login/logout | Corrected five-test prerequisite range passed remotely on healthy revision `8334f4c`, including passive diagnostics |
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
| Responsive | Tablet Admin Staff, phone Family Products, protected-image decode/authenticated bytes, keyboard-only View dialog, phone Sponsor RTL Orders, and no horizontal overflow | Passed remotely on healthy exact revision `8334f4c` |
| 16 | Supported deletion of the Family graph, two evidence files, two Staff profiles, two approved applicants, and exact-recipient mailbox messages; zero API-visible retained runtime rows/files/messages; real logout and page closure | Failed before its first deletion because the test reused the phone viewport for desktop-sidebar logout; source regression and deterministic viewport correction pass locally; fresh remote proof pending |
| Diagnostics | Counts-only cleanup summary, database boundary `NOT VERIFIED`, and no unexpected page errors, console errors, failed requests, or unexplained HTTP errors | Passive-range correction passed remotely in the corrected 3-test focused range on `8334f4c`; complete-range cleanup-summary proof remains pending |

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

Remote preflight is needed after gateway configuration, Mailpit, HTTPS proxy, or deployment
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

The latest complete attempt supplies a new plan reason for this same smallest
prerequisite range. Its success-only collection waiter has changed to the
bounded value-free observer described in section 2, and the user's current
instruction authorizes one attempt. Verify the header reports exactly 4 tests,
one worker, and zero retries. Whether it passes or fails, restore the grep and
stop; a complete 18-test attempt requires another fresh instruction.

That attempt passed with all four tests and the tunnel/artifact audit clean. Do
not repeat it without a new plan reason and fresh instruction.

Corrected diagnostic range that passed after a fresh user instruction:

```powershell
$env:KAFIL_E2E_REMOTE_GREP='remote step 0[1-2]|remote diagnostics'
bun run --cwd apps/web test:e2e:connected:remote
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
```

Its header reported exactly 3 tests, one worker, and zero retries, and all three
tests passed. Do not repeat this range without a new plan reason and fresh
instruction. Promotion to the complete range requires its own fresh
authorization.

Next safe Sponsor B prerequisite range, only after a fresh user instruction:

```powershell
$env:KAFIL_E2E_REMOTE_GREP='remote step 0[1-4]|remote diagnostics'
bun run --cwd apps/web test:e2e:connected:remote
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
```

Verify the header reports exactly 5 tests, one worker, and zero retries. Run it
once. It passed with all five tests and the artifact/tunnel audit clean. Do not
repeat it without a new plan reason and fresh instruction; do not promote
directly to the complete range under that focused authorization.

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
3. confirm the runner reported `NO MANAGED MAILBOX TRANSPORT`;
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
passes with `najm-kit@2.11.8` and no schema drift. The responsive unit now has a
remote pass on `8334f4c`, but the following cleanup test failed before its first
deletion. Its graph may remain in addition to residue from the earlier failed
responsive attempt; any residue assessment must use supported application
surfaces without database, Docker, or VPS cleanup shortcuts.

The corrected Kafil dependency revision is committed, pushed, published,
deployed, and confirmed healthy. The corrected 5-test Sponsor B range and the
later corrected 4-test Sponsor A diagnostic range have both passed. The plan
remains **IN PROGRESS** until:


- the dedicated auth lifecycle slice in section 11 proves every login/logout
  boundary, the last `najm.session` writer, cross-tab logout, and an in-flight
  protected-request overlap without retaining cookie values;
- a fresh user instruction authorizes one complete remote attempt after that
  auth slice passes on the exact healthy deployed revision;
- the runner header reports exactly `18` tests, one worker, and zero retries;
- all 16 numbered steps, the responsive unit, and diagnostics pass together;
- step 16 reports zero retained API-visible runtime rows, protected evidence
  files, and exact-recipient mailbox messages through counts-only assertions;
- the runner reports `NO MANAGED MAILBOX TRANSPORT`, and the retained
  marker/output pass the secret and runtime-sensitive-value audit;
- the accepted test/plan evidence is committed and pushed under section 8;
- database-only guarantees remain explicitly `NOT VERIFIED`.

## 11. Dedicated auth lifecycle isolation plan

### 11.1 Reason and latest complete-attempt evidence

The latest freshly authorized complete attempt ran once against the same
healthy deployed application revision
`8334f4c6478ec90565ca31f45eab7fdc29d101cb`:

- guarded preflight passed all 11 booleans plus SSH identity, system Chrome,
  forwarding-port availability, authenticated Mailpit, verified TLS,
  `/login`, `/apply`, health, and readiness;
- Playwright selected exactly `18` tests with one worker and zero retries;
- steps 01 and 02 passed in `9.1s` and `20.7s`;
- step 03 failed in `25.4s` at Sponsor A's first real logout after email login;
- the exact `POST /api/auth/logout` returned `200` and navigation reached
  `/login`, but the value-free cookie assertion found only the recognized
  `session` kind still present; the browser-visible auth-boundary response list
  contained only `/api/auth/logout:200`;
- steps 04-16, the responsive unit, and diagnostics did not run;
- terminal: `1 failed, 15 did not run, 2 passed (57.5s)`, native exit `1`;
- the runner reported `MANAGED SSH TUNNEL CLOSED`, the forwarding port was
  independently free, and the sole retained artifact was the value-free failed
  `.last-run.json` marker with one failed test ID;
- no error context was retained, and configured-secret plus
  runtime-sensitive-pattern scans found zero matches;
- step 16 did not run, so this attempt's disposable graph may remain.

This is classified `PRODUCT`, currently suspected at the Najm session-recovery
and logout ordering boundary. It is not yet a proved package root cause. The
signature is consistent with a protected response that began with the old
refresh cookie, recovered a signed `najm.session` server-side, and delivered
that cookie after the successful logout response deleted the refresh cookie.
Because middleware recovery is server-to-server, the browser may not expose a
separate `/api/auth/session/recover` request. The isolated logout-response test
proves deletion headers on that response only; it does not prove that no older
response can write the session cookie afterward.

Do not start another complete 18-test journey to investigate this hypothesis.
First implement and pass the smallest dedicated auth lifecycle slice below.

### 11.2 Value-free causal instrumentation

Extend the auth diagnostic before changing product behavior. From immediately
before the one logout click through the protected-denial assertion, retain only:

- monotonically increasing event order;
- browser-visible response method, pathname, and status;
- whether a response contains a `najm.session` `set` or `delete` directive;
- the remaining recognized cookie kind plus domain and path;
- the final pathname and protected endpoint status.

Parse cookie headers in memory and discard their values. Never retain or print
cookie values, credentials, identities, tokens, response bodies, or raw
`Set-Cookie` headers. Observe every browser-visible response in the interval,
not only `/api/auth/logout`, `/api/auth/refresh`, and
`/api/auth/session/recover`. Register observers before the action and remove
them in `finally`.

The diagnostic must distinguish these outcomes:

1. logout omitted or scoped the `najm.session` deletion incorrectly;
2. logout deleted it and a later browser-visible response reissued it;
3. the remaining cookie has a different domain/path and was never targeted;
4. no response-level writer is visible, which leaves server-side middleware
   recovery or browser cookie-application ordering as the narrowed boundary.

No retry, sleep, longer timeout, `clearCookies()`, forced click, mock,
`page.route()`, raw header logging, or direct state mutation may be added.

### 11.3 Source and package regression ladder

Before any remote browser attempt:

1. Add a red source contract for the value-free diagnostic and its exact event
   fields.
2. Add a package-boundary regression that overlaps a protected session
   recovery with logout and completes the recovery response after logout. The
   assertion must prove the final cookie contract, not only the contents of the
   logout response.
3. Keep the existing sequential `withAuthCookiePersistence()` regression; it
   remains useful but is insufficient by itself.
4. Exercise the real Next.js 16 proxy integration with `verifyAlways: true`, a
   protected request, real logout, and the public `/login` navigation.
5. Fix the narrowest owning layer only after the red regression identifies it.
   If ownership is Najm, validate and publish the Najm package before updating
   Kafil. If ownership is Kafil integration, keep the correction in the
   existing auth/proxy boundary without adding a parallel auth system.
6. Run the owning package gate, Kafil's focused auth tests, targeted lint and
   typecheck, the root gate in section 9, and `db:generate` with no schema
   change.

### 11.4 Dedicated browser matrix

Implement a separate serial remote auth spec rather than embedding these
diagnostics in the financial journey. Reuse the guarded runner's exact-origin,
one-worker, zero-retry, verified-TLS, no-artifact, and owned-tunnel contracts.
The runner must select this spec explicitly and fail closed if it would also
select the 18-test financial spec.

The planned exact titles are:

```text
remote auth 01 - guarded setup and Admin lifecycle
remote auth 02 - Family first-login and lifecycle
remote auth 03 - Sponsor email lifecycle
remote auth 04 - Sponsor phone lifecycle
remote auth 05 - Sponsor same-context email-phone sequence
remote auth 06 - cross-tab logout propagation
remote auth 07 - in-flight protected response logout overlap
remote auth 08 - stale session without refresh is denied and cleared
remote auth 09 - supported cleanup and closure
remote auth diagnostics - final context and cookie-writer assertions
```

Discovery-only listing must report exactly **10 tests in one file** before the
first remote instruction is requested.

Every principal lifecycle must use a fresh isolated context except the two
tests whose contract intentionally requires same-context or same-context
cross-tab behavior. Each applicable lifecycle must assert:

- no recognized auth cookie before login;
- one exact hydrated `POST /api/auth/login` with success;
- the correct role surface and one protected read succeed;
- one real UI logout produces one exact successful
  `POST /api/auth/logout`;
- navigation reaches `/login`;
- `refreshToken` and `najm.session` are both absent;
- the role's protected endpoint returns one exact `401`;
- a real re-login succeeds when the matrix title includes a repeated or
  alternate-identifier lifecycle.

Specific boundaries:

- Admin uses the configured existing account and proves logout/re-login without
  creating a second Admin.
- Family is provisioned through the deployed Admin UI, completes credential
  setup, proves the temporary credential is rejected, then proves normal
  login/logout/re-login.
- Sponsor is created through the public application, exact OTP, approval, and
  replay contracts, then proves email and normalized-phone login separately.
- The same-context sequence performs email login/logout followed by phone
  login/logout for the same Sponsor without replacing or clearing the context.
- The cross-tab unit uses two pages in one context, proves package tab-sync
  logout propagation, and proves the second page cannot refresh or restore the
  authenticated state.
- The overlap unit registers the protected request before triggering the one
  logout action, proves the observed ordering without arbitrary delay, and
  fails if any later response restores `najm.session`.
- The stale-session unit begins only through an authorized product flow. It
  must prove that `najm.session` without `refreshToken` cannot authenticate a
  protected request and that the normal middleware response clears it. It must
  not manufacture cookies or mutate browser state directly.

The setup creates only the minimum disposable Family, Sponsor, applicant, and
mailbox records required by these auth paths. The cleanup unit removes them
through supported authenticated application APIs and exact-recipient Mailpit
deletion, reports counts only, performs real logout, and closes every page and
context. Database-only guarantees remain `NOT VERIFIED`.

### 11.5 Promotion and one-attempt rule

After the source/package correction is committed, published, deployed when
required, and the exact new image is confirmed healthy:

1. Obtain one fresh user instruction for the dedicated 10-test auth matrix.
2. Run it once with one worker and zero retries; verify the header says exactly
   `10` tests before interpreting results.
3. On failure, preserve the native exit and sanitized last-writer fingerprint,
   classify ownership, confirm tunnel/port cleanup, audit artifacts, and stop
   without editing or rerunning.
4. On success, require all nine auth units plus diagnostics to pass, supported
   cleanup counts to be zero, the tunnel and artifact audit to be clean, and
   the accepted evidence to be committed and pushed.
5. Only then obtain a separate fresh instruction for one complete 18-test
   four-account attempt. The auth-matrix authorization must never be reused for
   the financial journey.

### 11.6 Local correction evidence (2026-08-28)

The deterministic package-boundary regression identifies Kafil's proxy
configuration as the narrow owning layer:

- installed `najm-auth@3.1.5` intentionally performs session recovery and
  reissues `najm.session` on every protected request when `verifyAlways: true`;
- the regression starts that recovery, applies the logout deletion first, then
  completes the older protected response and proves that the final simulated
  browser cookie state contains `najm.session`;
- the corrected `verifyAlways: false` branch accepts the same valid signed
  snapshot without recovery, emits no session-cookie directive, applies the
  logout deletion, and proves the final session-cookie state is absent;
- Kafil's API authorization remains authoritative, while missing, invalid, or
  expired proxy snapshots still use Najm recovery.

The removed Proxy prefetch detector was not a valid Next.js 16 boundary:
internal Flight headers such as `next-router-prefetch` and
`next-router-state-tree` are stripped before the Proxy function receives its
`Request`. The Proxy now delegates directly to `auth.middleware(request)`.

Value-free browser diagnostics now classify only recognized cookie kind,
domain, and path, and record only response order, method, pathname, status, and
the `najm.session` set/delete directive scope. Cookie values and raw
`Set-Cookie` headers are discarded in memory and cannot enter an assertion or
artifact.

Local verification:

- focused auth/proxy/runner/session tests: `34 passed`, `0 failed`;
- root lint: passed;
- root typecheck: passed;
- root tests: web `314 passed`; server `336 passed`, `53` database-opt-in tests
  skipped; seed `85 passed`; no failures;
- production build: passed with the Dockerfile's documented throwaway
  build-only environment after the ordinary local environment lacked
  `EMAIL_PROVIDER` during page-data collection;
- `db:generate`: passed with `No schema changes, nothing to migrate`.

No remote browser test was run under the implementation instruction. The
separate 10-test spec and fail-closed runner in section 11.4 are implemented as
recorded below; a fresh explicit instruction is still required for their one
remote execution.

### 11.7 Dedicated auth-matrix implementation evidence (2026-08-28)

The remote auth lifecycle is now a separate serial spec with the exact ten
titles in section 11.4. Its dedicated command can select only
`test/e2e/auth-lifecycle.remote.ts`; it accepts no grep and cannot co-select the
18-test financial spec. Both remote commands reuse one guarded preflight and
owned-tunnel implementation, preserving the exact origin, verified TLS, system
Chrome, one worker, zero retries, disabled browser artifacts, authenticated
loopback Mailpit, and tunnel cleanup contracts.

The matrix creates only one disposable Family and one Sponsor/applicant. It
proves Admin logout/re-login, Family credential setup and temporary-credential
denial, Sponsor email and normalized-phone lifecycles, the same-context
email/phone sequence, cross-tab logout propagation, an authenticated protected
request initiated before logout, post-logout protected denial, supported
Family/applicant cleanup, exact-recipient mailbox cleanup, and counts-only
closure diagnostics.

Each real logout starts the value-free response recorder before the click and
keeps it active until one exact protected `401` is consumed. The retained
in-memory evidence contains only alias, final pathname, protected status, event
order, method, pathname, response status, and `najm.session` set/delete scope.
Every unit fails if a session writer is observed after the logout deletion or
if any recognized auth cookie remains.

An exact “session cookie present while only the HttpOnly refresh cookie is
removed” state cannot be reached through a supported browser product action:
logout clears both, and manufacturing or filtering HttpOnly cookies would be
direct browser-state mutation forbidden by this plan. Therefore the exact
session-only construction remains covered by the deterministic package-boundary
regression, while remote auth unit 08 proves the reachable black-box boundary:
after real logout, protected API and route access are denied and no stale auth
cookie can survive or recover the session.

Local source evidence before the final root gate:

- the new source contract was red with `0 passed, 3 failed` before the auth spec
  and runner existed;
- focused auth/runner regressions pass with `27 passed, 0 failed`;
- targeted ESLint and the web typecheck pass;
- discovery-only Playwright listing with non-secret placeholders reports
  exactly `10 tests in 1 file` without launching Chrome, opening an SSH tunnel,
  or contacting the VPS.

The complete local gate also passes: root lint and typecheck; web `317 passed`;
server `336 passed` with `53` database-opt-in tests skipped; seed `85 passed`;
the production build with Dockerfile-equivalent command-scoped throwaway
values; and `db:generate` with `No schema changes, nothing to migrate`.

No remote preflight or browser attempt was executed. The next remote action is
exactly one dedicated auth-matrix command after the application correction is
committed, published, deployed, and the exact revision is confirmed healthy,
followed by a fresh explicit user instruction.

### 11.8 First dedicated auth attempt and test-harness correction (2026-08-28)

Application revision `ff6a84d750ed5654cdda151894dcf9f82775db79` was
committed, pushed, published, deployed, confirmed as the exact live OCI
revision, and healthy before the authorized attempt. All eleven guarded
preflight checks passed, including exact target/origin, SSH, system Chrome,
owned Mailpit forwarding, `/login`, `/apply`, health, and readiness. Playwright
then reported exactly `10 tests using 1 worker` with zero configured retries.

The attempt stopped natively after Admin passed and Family failed while looking
up the newly provisioned Family: `1 failed`, `8 did not run`, `1 passed` in
`19.0s`, exit `1`. The owned tunnel closed and the forwarding port was free.
The only retained artifact was Playwright's value-free failed-run marker; it
contained no configured secret, credential, identity, cookie, token, database
URL, screenshot, trace, video, or browser payload. Cleanup had not yet run, so
the disposable Family from this attempt may remain for later supported cleanup.

The failure was a deterministic test-harness defect, not evidence of a product
search failure. The helper first unwrapped Najm's normal `{ data: [...] }` list
envelope with `responseRecord()` and then tried to read `.data` from the
resulting array, always returning zero rows. It also discarded the Family-list
HTTP status before asserting the lookup. Server source confirms that Family
search includes name, guardian name, email, and phone.

The correction now parses exactly one direct Najm list envelope and retains
explicit `200` assertions for both Family and applicant lookups. A focused
auth-only grep variable was added so promotion can exercise the smallest
prerequisite title range without allowing the financial spec to be selected;
the complete auth command still selects all ten titles. Final diagnostics are
strict about cleanup for a complete run and validate only the logout evidence
actually produced by an intentionally focused range.

Correction evidence:

- the response-envelope regression and missing-status source contract were red
  with `2 passed`, `2 failed`, and `1 error` before the correction;
- focused response/runner regressions pass with `5 passed`, `0 failed`;
- the response, auth-runner, and shared-runner regressions pass with `24
  passed`, `0 failed` and `448` assertions;
- targeted ESLint and the web typecheck pass;
- discovery-only listing reports exactly `3 tests in 1 file` for the focused
  Admin/Family/diagnostics range and exactly `10 tests in 1 file` for the
  complete matrix without opening Chrome, SSH, or the VPS;
- the root lint, typecheck, and test stages pass; the production build passes
  with the Dockerfile's documented command-scoped build-only values; and
  `db:generate` reports `No schema changes, nothing to migrate`.

This correction changes only the Playwright spec, guarded runner, tests, and
this plan. It does not change the deployed application runtime, so section 8's
test-only promotion path may validate it against the already healthy exact
deployment before the accepted browser evidence is committed and pushed.

### 11.9 Focused promotion and cross-tab integration correction (2026-08-28)

The first focused promotion selected Admin, Family, and passive diagnostics:
exactly `3 tests using 1 worker`, zero retries. Admin and Family both passed,
proving the corrected list-envelope parser and the complete Family
first-login/logout/re-login lifecycle. Passive diagnostics then found one
unexpected Admin `console-error`; the attempt ended `2 passed`, `1 failed` in
`58.0s`, exit `1`. The tunnel closed, the forwarding port was free, and the
sole failed-run marker had zero configured-secret or auth-token matches.

Because the original diagnostic intentionally discarded all console content,
it could not distinguish an HTTP resource failure from another console class.
A red/green helper now converts unexpected console messages into a bounded,
value-free fingerprint containing only a known category, optional HTTP status,
and URL pathname. It discards arbitrary text, query values, origins, and all
console arguments. The narrower Admin-plus-diagnostics range then passed
exactly `2 tests using 1 worker` in `15.8s`; its closure and artifact audits
were clean.

The complete matrix was then invoked with no grep. Its header was exactly `10
tests using 1 worker`, zero retries. Auth units 01 through 05 passed: Admin,
Family, Sponsor email, Sponsor phone, and the same-context email/phone sequence.
Unit 06 failed because logout in the first Sponsor tab left the second tab on
`/dashboard` for the full 30-second assertion interval. Units 07 through 09
and diagnostics did not run. The native result was `5 passed`, `1 failed`, `4
did not run` in `2.1m`, exit `1`; the tunnel, port, marker, and secret audits
were clean. Supported cleanup had not run, so the attempt's disposable Family,
Sponsor, applicant, and exact-recipient mailbox records may remain for the next
supported cleanup.

Installed `najm-auth@3.1.5` owns BroadcastChannel synchronization: on remote
logout it clears the receiving tab's client auth state, blocks authenticated
requests, notifies subscribers, and emits the logout event. Navigation is an
application integration responsibility. Kafil's protected dashboard shell did
not subscribe with Najm's documented required-session redirect hook, so the
server-rendered shell remained visible after the receiving state became
unauthenticated.

The narrow correction mounts `useSession({ required: true, redirectTo:
"/login" })` inside `DashboardShellBody`, which exists only under the
server-protected dashboard layout. Public routes therefore remain unaffected,
while a local or cross-tab Najm logout moves every mounted protected dashboard
to `/login`. The integration source contract was red with `0 passed`, `1
failed`, then the combined auth response, diagnostic, runner, shared-runner,
and tab-sync regressions passed with `27 passed`, `0 failed`, and `454`
assertions. Targeted ESLint and web typecheck also pass. Because this correction
changes runtime frontend behavior, it must pass the root gate and be committed,
published, deployed, and confirmed healthy before remote auth unit 06 is
re-entered.

The complete correction gate passes: root lint and typecheck; web `322 passed`;
server `336 passed` with `53` database-opt-in tests skipped; seed `85 passed`;
production build with the Dockerfile-equivalent command-scoped build values;
and `db:generate` with `No schema changes, nothing to migrate`.

### 11.10 Published cross-tab proof and residue-safe cleanup (2026-08-29)

The runtime correction was committed and pushed as full revision
`cf87a29e30b4e302ba58327133333c0320916038`. GitHub verification, production
image publication, and the Dokploy trigger passed. A separate value-free,
read-only Docker check observed the old healthy revision during the asynchronous
handoff, then required exactly one Compose `service=app` container at the full
target OCI revision with Docker health `healthy` before browser promotion.

The smallest state-complete auth 06 prerequisite then ran once on that exact
healthy revision. Guarded preflight passed every boolean, SSH, system Chrome,
owned Mailpit forwarding, TLS page, health, and readiness boundary. Playwright
reported exactly `7 tests using 1 worker`, zero retries: auth units 01 through
06 plus passive diagnostics all passed in `2.0m`; cross-tab logout itself
passed in `7.6s`. The tunnel closed, the forwarding port was free, and the sole
passed-run marker had zero configured-secret or auth-token matches.

Interrupted earlier attempts left disposable auth-matrix records before unit 09
could run. The supported cleanup now selects residue only when both the exact
reserved `Auth Family auth-...` or `Auth Sponsor auth-...` name shape and its
matching `c4a-family.test` or `c4a-sponsor.test` email shape are present. It
deletes those records through authenticated Family and Applicant application
APIs, whose approved-Applicant deletion owns the linked Sponsor graph. Mailpit
cleanup searches the reserved Sponsor test domain, loads message details, and
deletes only exact auth-matrix recipient shapes. It retains and reports counts
only. Near-match identities and other `.test` records are excluded by a red/
green predicate regression. The focused cleanup, diagnostic, response, runner,
shared-runner, and tab-sync range passes with `29 passed`, `0 failed`, and `462`
assertions; targeted ESLint and web typecheck pass. This is test/spec/plan-only
and requires no new application deployment before the final complete matrix.

The complete ten-test command then ran once against the same exact healthy
revision. Auth units 01 through 09 all passed, including overlap, stale-session
denial, accumulated residue deletion, counts-only closure, and Admin logout.
Final diagnostics alone failed with the new bounded fingerprint
`resource-http;status=401;path=/api/presets`; the native result was `9 passed`,
`1 failed` in `1.9m`, exit `1`. The cleanup unit had already completed, the
tunnel closed, the port was free, and the sole failed-run marker had zero
configured-secret or auth-token matches.

The fingerprint identified a Kafil UI lifecycle defect rather than an auth
denial defect. `AdminThemeSettingsSheets` mounted Najm's query-owning
`NThemeSettingsProvider` whenever the role was Admin, even while both Theme and
Branding sheets were closed. Its unnecessary protected Presets read could
therefore overlap the final logout and correctly receive `401`. The narrow
correction keeps the one shared provider mounted while either Theme or Branding
is active—preserving drafts across sheet-to-sheet switching—but returns `null`
while both are closed. A red source contract identified the idle mount; the
focused tab-sync, cleanup, auth-runner, and theme-adoption range then passed
with `20 passed`, `0 failed`, followed by targeted ESLint and web typecheck.
Because this changes runtime query lifecycle, it requires a new complete root
gate, commit, image, deployment, and exact healthy-revision check before the
next complete auth proof.

### 11.11 Idle-query deployment and overlap-route correction (2026-08-29)

The idle theme-query correction was committed and pushed as full revision
`2f9c6da86d13fd0483e525aeafd7e01c7480d23e`. GitHub verification, production
image publication, and the Dokploy trigger passed. A separate read-only Docker
check then required exactly one Compose `service=app` container at that full
OCI revision with Docker health `healthy`.

The complete auth matrix ran against that exact healthy revision with the
guarded preflight fully green, exactly `10 tests using 1 worker`, and zero
retries. Auth units 01 through 09 all passed, including supported cleanup and
Admin logout. The prior `/api/presets` fingerprint did not recur. Diagnostics
alone failed with `resource-http;status=404;path=/sponsor`; the native result
was `9 passed`, `1 failed` in `1.6m`, exit `1`. The tunnel closed, the forwarding
port was free, and the sole failed-run marker had zero configured-secret or
auth-token matches.

This was a browser-contract defect in auth unit 07. `/sponsor` is protected by
the proxy but has no application page, while `/sponsor/support` is the deployed
Sponsor surface. The overlap unit now starts its observed request against that
real route and requires the completed response to be exactly `200`; its source
contract forbids returning to the nonexistent root route. The regression was
red before the change and passes afterward. The complete local gate passes:
root lint and typecheck; web `325 passed`; server `336 passed` with `53`
database-opt-in tests skipped; seed `85 passed`; the production build with
Dockerfile-equivalent command-scoped build values; and `db:generate` with `No
schema changes, nothing to migrate`.

The real route exposed one additional safe race outcome: when the protected
render completed after logout, the client attempted one `POST
/api/auth/refresh`, which the deployed server correctly denied with `401`.
Unit 07 now registers that exact denial before starting the overlap and treats
its occurrence as timing-dependent; it neither permits another method, path,
or status nor weakens the required logout, cookie absence, protected-read
denial, and no-late-writer assertions. The source contract was red before this
registration and passes afterward. The complete local gate was rerun with the
same green counts and no schema drift.

The smallest state-complete promotion range then passed exactly `5 tests using
1 worker` in `1.3m`: auth units 01 through 03, auth unit 07, and passive final
diagnostics. The guarded preflight was fully green; the managed tunnel closed;
the forwarding port was free; and the sole passed-run marker contained no
configured-secret or auth-token match.

The unfiltered dedicated auth command then passed exactly `10 tests using 1
worker`, zero retries, in `2.6m` against the same sole healthy deployed
revision `2f9c6da86d13fd0483e525aeafd7e01c7480d23e`. All nine auth units and final
diagnostics passed. Supported application and exact-recipient mailbox cleanup
retained zero matrix records, every context closed, every logout ended at
`/login` with both recognized auth cookies absent, every protected denial was
`401`, and no response set `najm.session` after its logout deletion. The runner
reported `MANAGED SSH TUNNEL CLOSED`; local port `8025` was free; the artifact
directory contained only the passed `.last-run.json` marker; and the final
secret/token scan found zero matches. The dedicated remote auth lifecycle is
accepted. The separate 18-test financial four-account journey was not run.

### 11.12 Najm Auth 3.2.0 DX rollout and renewed remote proof (2026-08-29)

Najm Auth `3.2.0` was published from attributable release commit
`ed095c8a15a95c8bcc5d795b529985dd1fc6c7a6` after its package tests, API
surface check, and a real Next.js 16 production fixture passed. The release
adds the composed `auth.proxy` and `auth.routeHandlers` integration, explicit
`proxySessionMode`, all supported route-handler verbs, cookie persistence, and
dynamic route-context forwarding. Kafil now pins that registry release and
uses the shared composition without app-owned auth cookie plumbing.

Kafil revision `94727ccc3c81847880583a11a029b61de0149f84` was committed and
pushed. GitHub Actions run `33254307709` passed exact-revision verification,
published the production image, and triggered Dokploy. A separate value-free,
read-only Docker check then observed exactly one running Kafil container whose
OCI revision was the full target SHA and whose Docker status was `healthy`.

The first post-deploy auth attempt exposed a cold login-hydration timeout in
Family setup. A stabilized rerun cleared that boundary, then proved a bounded
cross-tab race where the receiving tab may issue one correctly denied `POST
/api/auth/refresh` with status `401`. Unit 06 now permits only that exact
optional denial and includes the receiving tab in the no-late-cookie-writer
observation. Subsequent interrupted attempts made two further browser-contract
boundaries explicit: successful document login waits for destination
`DOMContentLoaded`, and unit 07 starts a `keepalive` read against the direct
Sponsor-accessible protected `/family` surface. The overlap accepts only an
authenticated `200` or a post-logout `307` whose exact destination is
`/login`; both remain subject to cookie-deletion, protected-denial, and
no-session-rewrite assertions. Focused runner/diagnostic tests, ESLint, and web
typecheck passed after each correction.

The final unfiltered command `bun run --cwd apps/web test:e2e:auth:remote`
passed exactly `10 tests using 1 worker`, zero retries, in `2.2m` against the
same healthy deployed revision. All nine auth units and passive diagnostics
passed, including Admin and Family lifecycle, Sponsor email and phone login,
same-context identity switching, cross-tab logout, response/logout overlap,
stale-session denial, supported application/mailbox cleanup, context closure,
cookie absence, protected `401` responses, and no late `najm.session` writer.

The managed SSH tunnel closed and local Mailpit port `8025` was free. The
artifact directory retained only the passed `.last-run.json` marker;
screenshots, traces, and videos were disabled, and a configured-secret scan
found zero matches. The final repository gate passed with web `325 passed`,
server `336 passed` plus `53` database-opt-in skips, seed `85 passed`, a
production build using the documented build-only values, and `db:generate`
reporting `No schema changes, nothing to migrate`. The dedicated remote auth
lifecycle remains accepted on Najm Auth `3.2.0`. The separate 18-test financial
four-account journey was not run.

### 11.13 Financial attempt transport failure and supervised-tunnel correction (2026-08-30)

The next freshly authorized financial attempt invoked the unfiltered dedicated
command once. Guarded preflight passed all eleven boolean contracts, SSH
identity, system Chrome, forwarding-port availability, authenticated Mailpit,
verified TLS, `/login`, `/apply`, health, and readiness. Playwright then
reported exactly `18 tests using 1 worker` with zero retries.

Remote steps 01 and 02 passed in `11.7s` and `29.9s`. Step 03 failed in `44.8s`
when its concurrently handled Sponsor A OTP read could no longer connect to the
runner-owned loopback Mailpit forward: `ECONNREFUSED`. Steps 04 through 16, the
responsive unit, and diagnostics did not run. The native result was `1 failed`,
`15 did not run`, and `2 passed` in `1.5m`, exit `1`. The runner reported
`MANAGED SSH TUNNEL CLOSED`; the forwarding port was free; no matching owned
SSH process remained; and the only retained artifact was the failed
`.last-run.json` marker with one failed test ID. The referenced error context
was not retained. No screenshot, trace, video, configured-secret match, or
runtime-sensitive-pattern match remained. Supported cleanup did not run, so
this attempt's disposable Family may remain.

This is classified `ENVIRONMENT`, at the managed SSH-forward lifecycle. The
application result beyond step 02 is not classified. Preflight proved the
forward was initially reachable, but the previous runner checked the SSH
process only while waiting for initial Mailpit readiness, discarded SSH
stderr, and then awaited Playwright alone. It could therefore surface a later
forward loss only as the mailbox fetch failure.

The narrow test/runner correction now supervises the SSH and Playwright exit
promises as one lifecycle. If the tunnel exits first, it stops only the owned
Playwright process and emits a bounded value-free `ENVIRONMENT` fingerprint
containing only an allowlisted reason and numeric SSH exit code. SSH stderr is
drained into an in-memory tail capped at 8192 characters, classified as one of
the fixed transport/authentication/forwarding categories, and otherwise
discarded; raw stderr is never printed or retained. A stderr-reader error maps
to `unknown` without producing an unhandled rejection. The SSH keepalive
interval remains 15 seconds while the missed-reply allowance increases from
two to four, tolerating a short network stall without adding a browser retry,
mailbox mutation retry, sleep, timeout increase, or journey replay.

Local correction evidence:

- the focused runner regression was red with `0 passed`, `1 failed`, and `1`
  load error because the supervision and classifier exports did not exist;
- the same focused regression is green with `21 passed`, `0 failed`, and `409`
  assertions;
- the combined financial/auth runner range passes with `24 passed`, `0 failed`,
  and `467` assertions;
- web typecheck and targeted ESLint pass;
- the complete root lint and typecheck gates pass; web tests pass with `327`,
  server tests with `336` plus `53` database-opt-in skips, and seed tests with
  `85`;
- the first ordinary production-build command reached successful compilation
  and TypeScript but stopped during page-data collection because the local
  `.env` lacks `EMAIL_PROVIDER`; the documented Dockerfile-equivalent,
  command-scoped build-only values then produced a successful build without
  modifying `.env`;
- `db:generate` reports `No schema changes, nothing to migrate`.

This runner-only correction does not change the deployed Kafil application and
cannot guarantee that an external SSH connection never fails. It makes a
tunnel loss immediate and attributable and reduces sensitivity to brief missed
keepalives while preserving fail-closed acceptance. No remote preflight or
browser attempt was run after the correction. A new remote invocation requires
a fresh user instruction under the one-attempt rule.

That fresh instruction then authorized the smallest state-complete promotion
range: remote steps 01 through 03 plus passive diagnostics. The corrected
runner's guarded preflight passed all eleven boolean contracts, SSH identity,
system Chrome, forwarding-port availability, authenticated Mailpit, verified
TLS, `/login`, `/apply`, health, and readiness. Playwright reported exactly `4
tests using 1 worker` with zero retries.

Step 01 passed in `8.6s`, step 02 in `23.4s`, and step 03 in `28.9s`. Step 03
completed Sponsor A's exact OTP lookup/deletion, pending-login denial,
approval/replay, email and normalized-phone login, real logout, recognized
cookie absence, and protected denial without another tunnel interruption.
Passive diagnostics passed in `42ms` with no unexpected page errors, console
errors, failed requests, or unexplained HTTP errors. Steps 04 through 16 and
the responsive unit were excluded by the focused grep; supported cleanup did
not run, so disposable records from this and interrupted earlier attempts may
remain.

The terminal result was `4 passed (1.1m)`, native exit `0`. The runner reported
`MANAGED SSH TUNNEL CLOSED`; the configured forwarding port was free; no owned
SSH-forward process remained; and the temporary grep was restored. The only
artifact was a passed `.last-run.json` marker with zero failed test IDs. No
error context, screenshot, trace, video, configured-secret match, or runtime-
sensitive-pattern match remained.

The supervised-tunnel correction and focused Sponsor A boundary are accepted.
Promotion now requires the accepted test/plan evidence to be committed and
pushed, followed by a separate fresh instruction for one complete unfiltered
18-test attempt. This focused authorization must not be reused for that run.

### 11.14 Second transport reset and private-mailbox migration (2026-08-30)

After revision `3e25610e86e11d012d3cdb1ac2d026a96940e676` was pushed and the
deployed Kafil application was confirmed at that exact healthy revision, one
freshly authorized unfiltered attempt started. Guarded preflight passed, and
remote steps 01 through 04 passed. During the remaining serial journey, the
managed SSH process exited with code `255` and the bounded classification
`connection-reset`. The runner stopped its owned Playwright process, so there
was no terminal Playwright summary and no application classification after
step 04. The tunnel closed, no runner-owned process or forwarding port
remained, and the value-free artifact audit was clean. Supported step-16
cleanup did not run, so disposable application/mailbox residue may remain.

This is the second independent loss of an SSH forward after initial Mailpit
preflight. Keeping more SSH supervision would improve attribution but would
not remove the transport dependency. The active runner therefore no longer
opens SSH at all. Its replacement contract is:

- the public browser target remains exactly `https://kafala360.ma` with normal
  TLS verification;
- the mailbox endpoint is exact private HTTPS on a MagicDNS `*.ts.net` host and
  a required explicit port;
- the separately configured private hostname must exactly match the endpoint;
- every legacy SSH/forwarding environment name must be absent;
- `tailscale status --json` must report backend `Running` before any mailbox or
  browser operation;
- unauthenticated Mailpit stays `401`, authenticated Mailpit stays `200`, and
  mailbox credentials remain app-specific;
- `KAFIL_E2E_TAILSCALE_DISCONNECT_AFTER=true` makes the runner execute
  `tailscale down` after success or failure and fail the run if disconnecting
  fails. It disconnects only the local test device; the VPS node and its
  tailnet-only Serve declaration remain available.

The reusable VPS helper accepts an app name, the app's loopback Mailpit port,
and its dedicated tailnet HTTPS port. It refuses a Mailpit API that does not
deny unauthenticated access, then configures persistent tailnet-only Tailscale
Serve to `http://127.0.0.1:<mailpit-port>`. The grants example permits only TCP
`18025` to the Kafil mailbox tag and TCP `28025` to the School mailbox tag. It
does not grant SSH, database, Redis, Docker, or public application access.
School must run a separate Mailpit process and volume; credentials alone are
not a data-isolation boundary.

A value-free audit found Tailscale absent on both the Windows test machine and
the VPS. Repository implementation can therefore be verified locally, but the
route cannot be activated without the tailnet owner's external enrollment.
Activation requires, in order:

1. install Tailscale on the Windows test machine and VPS and enroll both in the
   same tailnet;
2. apply the least-privilege identities/grants from
   `deploy/tailscale-grants.example.hujson` with real tailnet identities;
3. tag the VPS for Kafil and run
   `bash scripts/configurePrivateMailboxVps.sh kafil 18025 18025` on it;
4. remove all legacy SSH/forwarding names from the ignored root `.env`, set the
   exact private hostname and HTTPS URL, retain Kafil's Mailpit credentials,
   and choose the explicit disconnect value;
5. run the guarded remote preflight once and audit the disconnect postcondition.

No browser journey is authorized by this infrastructure migration. After the
private preflight passes and the same application revision remains healthy,
the next unfiltered 18-test attempt still needs its own fresh instruction under
the one-attempt rule.

Local migration verification is green: the combined financial/auth runner
range passes with `23 passed`, `0 failed`, and `475` assertions; targeted
ESLint, web typecheck, and Bash syntax validation pass; root lint, typecheck,
and every standard web/server/seed test pass; the production build passes with
the documented command-scoped build-only values; and `db:generate` reports `No
schema changes, nothing to migrate`. No remote preflight or browser test was
run.

### 11.15 Standalone Mailpit hub migration (2026-08-30)

The tailnet route in section 11.14 was not activated. The user selected a
reusable standalone mail-test service that can support Kafil, School, and later
VPS applications without installing a client VPN or opening an SSH session for
normal browser tests. This section supersedes only section 11.14's proposed
Tailscale activation; it does not rewrite the earlier SSH failure evidence.

The hub is independent from the Kafil application image:

- `deploy/mail-test-hub/compose.yml` runs pinned Mailpit `v1.30.0`, its
  persistent volume, and a small Bun gateway;
- Mailpit supplies its existing human dashboard with a strong Admin Basic-auth
  credential;
- the gateway accepts a distinct bearer token per application and permits only
  authenticated info, search, detail, and exact batch deletion;
- each token has exclusive recipient domains. A search outside the scope is
  denied, and a detail or delete is hidden unless every recipient on the
  message belongs to the authenticated app;
- Mailpit's send, relay, tag, global list, and administrative APIs are not
  exposed by the gateway;
- SMTP, Mailpit HTTP, and gateway HTTP remain on the internal
  `mail-test-hub` Docker network. Host bindings are loopback-only. The new
  default ports `59025`, `59026`, and `59027` intentionally avoid the existing
  Kafil Mailpit HTTP binding on `58025` during migration;
- the existing host HTTPS proxy publishes separate dashboard and gateway
  hostnames on normal port `443`. No raw Mailpit, SMTP, gateway, SSH, or VPN
  port becomes public;
- Mailpit prunes messages by both count and age. The service stays running;
  there is deliberately no public start/stop endpoint.

The remote runner now requires exact `https://<configured-api-host>` with no
custom port or path, a Kafil token of at least 32 characters, and absence of
all legacy SSH/forwarding/Tailscale names. Preflight proves unauthenticated
`401`, authenticated gateway identity `mail-test-gateway`, exact app scope
`kafil`, system Chrome, target TLS, pages, health, and readiness. It forwards
only the bearer token to Playwright and always reports
`NO MANAGED MAILBOX TRANSPORT`; it starts and stops no SSH, Tailscale, forward,
Docker, or Mailpit process.

VPS activation requires external infrastructure authority and remains pending:

1. create dashboard and API DNS names for the VPS;
2. create `/opt/mail-test-hub/hub.env` from the committed example, generate
   independent dashboard, Kafil, and School credentials, and set mode `0600`;
3. run `bash scripts/configureMailTestHubVps.sh` from the deployed repository
   release; this validates Compose, starts the isolated hub, and proves both
   loopback authentication boundaries without printing credentials;
4. merge `deploy/mail-test-hub/Caddyfile.host.example` into the existing host
   proxy with the real DNS names, validate, reload, and prove normal TLS;
5. join each acceptance application container to external network
   `mail-test-hub` and configure SMTP host `mailpit`, port `1025`; keep the old
   Kafil Mailpit running until the new delivery and dashboard are proved;
6. replace the ignored local remote-runner mailbox settings with the exact API
   hostname, HTTPS origin, and Kafil token; remove legacy SSH, forwarding,
   private-host, and Tailscale names;
7. run guarded preflight once. Do not run the browser journey under this
   infrastructure instruction.

The gateway source test was red before the service module existed, then passed
with `4 passed`, `0 failed`, covering strict configuration, unauthenticated
denial, Kafil/School search and detail isolation, and exact scoped deletion.
The remote runner contract was then observed red against its former Tailscale
implementation. The combined gateway, financial-runner, and auth-runner source
range passes with `27 passed`, `0 failed`, and `503` assertions. Targeted ESLint
and the web typecheck pass. The full root lint and typecheck gates pass; standard
tests pass with web `330`, server `336` plus `53` database-opt-in skips, and seed
`85`. The ordinary production build reached successful compilation and
TypeScript before the documented missing local `EMAIL_PROVIDER` condition; the
Dockerfile-equivalent command-scoped build-only values then produced a complete
production build without modifying `.env`. A final unchanged gate repeat hit
one transient Google Fonts fetch failure; its single unchanged retry completed
the production build. `db:generate` reports `No schema changes, nothing to
migrate`.

This Windows verification host has neither Bash nor Docker installed, so local
`bash -n` and `docker compose config` execution were unavailable. The source
contracts pin loopback bindings, the internal Docker network, both unauthenticated
`401` boundaries, and the no-SSH/no-Tailscale runner lifecycle, but the VPS must
still perform native Bash and Compose validation before activation. No VPS
command, remote preflight, or browser journey has been run for this migration.

An external edge probe on 2026-08-30 confirmed that the proposed dashboard
name `mail.kafala360.ma` resolves to the VPS, but verified HTTPS fails because
the presented certificate chain is not publicly trusted; an explicitly
insecure diagnostic request reaches the edge and returns `404`. The proposed
gateway name `mail-api.kafala360.ma` does not resolve. Activation is therefore
blocked before Compose or guarded preflight: create the API DNS record, install
both host routes in the existing proxy, and obtain publicly trusted certificates.
The insecure request is diagnostic evidence only and is forbidden in the
runner, which must retain normal TLS verification.

On 2026-08-31 the user adopted the neutral infrastructure domain
`najmstack.com`. Its root and wildcard `A` records resolve publicly to the same
VPS, including `mail.najmstack.com`, `mail-api.najmstack.com`, and
`deploy.najmstack.com`. The first two names replace the earlier proposed Kafala
mail hostnames; `deploy.najmstack.com` is also the intended replacement for the
existing Dokploy management hostname. Migration must be additive: configure
and verify the new Dokploy route, publicly trusted TLS, and authenticated login
before removing any old Dokploy DNS or proxy route. Likewise, retain the old
Mailpit instance and old application SMTP settings until the shared hub proves
authenticated dashboard/API access and application delivery. DNS removal is a
separate cleanup step after those proofs, not part of initial activation. No
guarded preflight or browser journey was run for the DNS change.

The first VPS activation handoff on 2026-08-31 made no changes because its
mandated checkout path `/opt/kafil/current` existed but was empty. It reported
the three new hostnames as failed, but independent queries through both
`1.1.1.1` and `8.8.8.8` resolved `deploy.najmstack.com`,
`mail.najmstack.com`, and `mail-api.najmstack.com` to the intended VPS. Those
DNS failures are therefore unaccepted probe output, not a public DNS blocker.
The next VPS action is read-only discovery of the real Dokploy installation,
edge owner, deployed Kafil artifact, and repository/release location. It must
not run guarded preflight or change infrastructure until the actual paths and
deployment owner are known.

Read-only VPS discovery then established the actual topology: Dokploy
`v0.29.13` runs in Swarm mode; `dokploy-traefik` owns ports `80` and `443`, and
the Dokploy service owns port `3000`. Its current management hostname is
`deploy.kafala360.ma`. Kafil is a Dokploy Compose deployment whose runtime code
is materialized at `/etc/dokploy/compose/kafil-demo-vdadlv/code`, without a Git
checkout. The existing Kafil Mailpit remains running with a loopback binding.
The deployed code does not contain the mail-hub files because the completed
hub/runner migration is still an uncommitted local change on `main` at
`3e25610`; `origin/main` is at the same pre-migration revision. Consequently,
no VPS prompt can safely activate the committed design yet. Publication of the
audited local change is the next boundary and may trigger Dokploy, so it
requires explicit authorization before commit/push. No VPS state, SMTP setting,
remote preflight, browser journey, or old DNS record changed during discovery.
