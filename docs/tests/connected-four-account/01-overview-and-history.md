# Connected four-account overview and acceptance history

Status: **THE 20-TEST FOUR-ACCOUNT BASELINE AND 10-TEST AUTH LIFECYCLE ARE
ACCEPTED. THE NOTIFICATION EXTENSION REMAINS IN PROGRESS: UNIT 01 IS ACCEPTED;
UNIT 02 HAS A LOCALLY VERIFIED CORRECTION THAT STILL REQUIRES PUBLICATION,
EXACT DEPLOYMENT PROOF, AND A FRESHLY AUTHORIZED FOCUSED ATTEMPT. DATABASE-ONLY
GUARANTEES REMAIN `NOT VERIFIED`.**

Target: exactly `https://kafala360.ma`

This documentation set is the authoritative contract for the guarded
four-account VPS journeys. Use the [suite index](README.md) to navigate the
split contracts. There is no root `PLAN.md`; do not create one or infer a
broader roadmap from these acceptance documents.

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
- effective Family order-count, per-order, and monthly-budget policy projections;
- exact order-count and per-order denials, absence of denied-command side
  effects, and order-slot recovery after cancellation/rejection;
- order, purchase, and delivery lifecycle behavior;
- real logout, cookie removal, diagnostics, and mailbox-transport isolation.

Not verified without database access:

- physical row counts or uniqueness constraints;
- password hashes or seed idempotency;
- transaction locks and append-only storage;
- audit/outbox payloads;
- migration state on the VPS.

## 2. Current checkpoint

The authoritative checkpoint is section 11.19, the authorized complete 20-test
attempt that passed on 2026-09-06 with native exit `0` on the value-free
confirmed container revision `adee9c9d` (`adee9c9d5c0276e3871ace6c142f6f1a229e4aac`).
That checkpoint predates the notification system. It remains accepted for its
declared baseline, while the separate notification extension in section 12 is
open and requires its own implementation, deployment proof, fresh instruction,
and one-attempt evidence.

Section 11.16 records the earlier authoritative complete 18-test attempt on
confirmed revision `1a30370d`; it is superseded but remains historical
evidence. Section 11.17 records a later complete 18-test baseline attempt that
passed on 2026-09-04 with native exit `0`. It is supplemental, not
authoritative. It did not repeat the value-free container revision check, so
the running container's revision is `NOT CONFIRMED` for that attempt and its
deployment-revision acceptance is outstanding. Its command and work-unit
results stand on their own; its claim about which revision was exercised does
not. Section 11.18 records the Family order-limit extension implementation;
section 11.19 supplies its production-browser verdict.

Sections 11.1-11.15 and the rest of this section are historical evidence
leading to the current checkpoint and are not the current state.

The complete 18-test attempt that preceded the standalone-hub migration reached
and passed steps 01-04 before the runner-owned SSH transport reset a second
time. The browser result after step 04 is unclassified. SSH
forwarding is retired. The proposed Tailscale replacement in section 11.14 was
implemented locally but was not activated; it is superseded by the standalone
VPS mail-test hub. The active runner uses an exact verified-HTTPS gateway, a
Kafil-only bearer token, and no SSH, Tailscale, local forward, or managed
network lifecycle. The hub and guarded HTTPS preflight are now ready as
recorded at the end of section 11.15. Kafil now uses SMTP at runtime through
the standalone hub's unique `najmstack-mailpit` alias on the existing Dokploy
network. The value-free cutover audit proved port `1025`, DNS, and TCP
reachability. This is the accepted deployed test topology; the later private-
network detour is superseded and is not a preflight blocker. The chronology
below remains historical evidence.

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
