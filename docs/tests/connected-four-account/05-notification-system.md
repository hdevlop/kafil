# Notification system connected acceptance

Shared safety and runtime rules live in
[`02-safety-and-runtime.md`](02-safety-and-runtime.md). The accepted historical
20-test baseline is preserved in
[`04-auth-lifecycle.md`](04-auth-lifecycle.md#1119-authorized-complete-20-test-remote-attempt-2026-09-06).

## 12. Notification system connected acceptance extension

Status: **SOURCE COMPLETE - THE DEDICATED SPEC/RUNNER, SOURCE CONTRACTS, AND
EXACT 9-TEST DISCOVERY ARE GREEN; ACCEPTANCE STILL REQUIRES THE EXACT
APP/WORKER REVISION TO BE DEPLOYED AND THE CONNECTED EXTENSION TO PASS.**

This document is the sole owner of the notification system's real connected
acceptance. Implementation, source tests, PostgreSQL integration, migration,
package publication, and deployment wiring remain owned by their repository
code, tests, and evidence records. The historical 20-test result remains valid
for its original scope and does not prove any item in this document.

### 12.1 Evidence boundary and suite isolation

Implement a separate serial notification spec and guarded runner rather than
changing the historical 20-test selection:

```text
spec    = apps/web/test/e2e/notification-system.remote.ts
runner  = apps/web/scripts/run-notification-system-remote-e2e.ts
command = bun run --cwd apps/web test:e2e:notifications:remote
grep    = KAFIL_E2E_REMOTE_NOTIFICATIONS_GREP
```

The runner must select only the notification spec, reject the financial/auth
grep variables, use exactly one worker and zero retries, retain normal TLS
verification, disable screenshots/traces/video, and own no SSH, Tailscale,
Docker, Mailpit, forwarding, or local-server lifecycle. It reuses the exact
target-origin and app-scoped HTTPS mailbox-gateway safety contract in
[`02-safety-and-runtime.md`](02-safety-and-runtime.md) and must report
`NO MANAGED MAILBOX TRANSPORT` after success or failure.

The suite uses real deployed UI and application APIs, four isolated
authenticated principals (Admin, Family, Sponsor A, Sponsor B), real
PostgreSQL through the deployed application, the deployed notification worker,
and the isolated Kafil Mailpit route. It must not use `page.route()`, mocks,
direct SQL, seeds, direct browser-state mutation, `clearCookies()`, forced
clicks, arbitrary sleeps, or live email recipients.

Black-box acceptance proves observable UI/API and delivery behavior. It does
not replace the completed PostgreSQL tests for transaction atomicity,
`SKIP LOCKED`, exact snapshot concurrency, uniqueness constraints, encryption
at rest, retry scheduling, or dead-letter thresholds.

### 12.2 Mandatory preconditions

Before requesting a browser attempt, record value-free evidence that:

- [ ] the notification implementation and dedicated runner/spec are committed
  and published, with their focused source contracts and the root local gate
  green;
- [ ] migration `0045_salty_hobgoblin` completed on the target;
- [ ] the web app and `notifications-worker` run the same exact confirmed OCI
  revision, and both are healthy;
- [ ] the worker heartbeat is present without exposing its key or value;
- [ ] staged rollout completed in order: in-app, email, then push, with the
  intended notification activation variables enabled for this final journey;
- [ ] code-managed `read:notifications` and `update:notifications` permissions
  exist and are granted exactly as defined to Admin, Operator, Family, and
  Sponsor after a quiet, fail-closed auth reconciliation from the deployed
  image;
- [ ] Kafil uses the isolated SMTP provider and the unique
  `najmstack-mailpit:1025` route, with live email delivery disabled;
- [ ] the scoped HTTPS mailbox gateway passes exact TLS, unauthenticated `401`,
  authenticated identity, and `kafil` scope checks;
- [ ] `/login`, `/apply`, `/notifications`, health, and readiness succeed on
  the exact authorized origin;
- [ ] the target revision has not already been exercised under an unresolved
  failed notification attempt.

Preflight is configuration/readiness evidence only. It does not check any
notification acceptance item and does not authorize a browser run.

### 12.3 Planned exact test titles

```text
remote notifications 01 - four-account setup and empty inbox ownership
remote notifications 02 - contribution fan-out, polling, and read persistence
remote notifications 03 - mark-all boundary and later unread event
remote notifications 04 - applicant inbox and single Mailpit decision email
remote notifications 05 - cross-user inbox isolation and exact 404
remote notifications 06 - push subscription persistence and account transfer
remote notifications 07 - Arabic phone RTL, keyboard, and focus restoration
remote notifications 08 - supported cleanup, logout, and closure
remote notifications diagnostics - final contexts and delivery assertions
```

Discovery-only listing must report exactly **9 tests in one file** before the
first connected attempt is requested. Discovery may use non-secret placeholder
configuration and must not launch a browser or contact the target.

Local implementation evidence (2026-09-07):

- `bun test test/notification-system-remote-runner.test.ts` passed all 3 focused
  source/runner contracts; the combined notification, financial, and auth
  guarded-runner regression selection passed all 28 tests;
- targeted ESLint and the web typecheck passed for the final spec, runner,
  configuration, shared runtime, and source-contract test;
- placeholder-only Playwright discovery listed exactly `9 tests in 1 file`;
- the root lint, typecheck, test, production build, and `db:generate` gates
  passed with no schema drift, and `bun run test:db` passed all 55 PostgreSQL
  tests, including the notification integration suite;
- no remote preflight, browser launch, target request, publication, deployment,
  or production acceptance attempt was made.

### 12.4 Work-unit contracts

#### Unit 01 - setup and empty ownership

- [x] Create only the minimum disposable Family and Sponsor A/B identities
  through supported UI/application flows and retain four isolated contexts.
- [x] Prove `/notifications` is available to every role and each inbox initially
  contains no row from another principal.
- [x] Prove exactly one shell notification bell is visible and its zero-count
  badge is hidden.

#### Unit 02 - contribution fan-out and read persistence

- [ ] Trigger one contribution validation through the real workflow.
- [ ] Within the bounded 30-second polling window, prove the Family and Sponsor A
  counts advance and the Admin/Sponsor B counts do not.
- [ ] Prove one safe contribution notification appears for each intended
  recipient without raw payload, household-private, or external-link content.
- [ ] Opening the popover alone leaves the row unread; opening its supported
  focus/detail action marks only that row read, returns focus correctly, and
  remains read after reload.

#### Unit 03 - mark-all observable boundary

- [ ] Create at least two unread rows, invoke the single mark-all command once,
  and assert its exact successful response and affected count.
- [ ] Trigger a later event from another context and prove the later row remains
  unread while the earlier rows remain read after reload.
- [ ] Report the exact concurrent PostgreSQL statement-snapshot guarantee only
  from `bun run test:db`; this black-box unit proves the observable before/after
  boundary and makes no database-locking claim.

#### Unit 04 - applicant decision and Mailpit delivery

- [ ] Start the exact-recipient Mailpit polling promise before the one approval
  action; match recipient, run start, and decision purpose/subject exactly.
- [ ] Prove applicant approval creates one inbox row and exactly one normal-path
  decision email, with no legacy duplicate.
- [ ] Prove the message contains both text and escaped HTML forms in the expected
  locale and an `X-Kafil-Delivery-Id` header, without retaining the header value
  or message body in evidence.
- [ ] Delete only the exact matched message after the assertions pass.

This proves single ownership on the normal path. It does not claim exactly-once
transport across the documented provider-send/`sent`-mark crash window.

#### Unit 05 - cross-user isolation

- [ ] Use a notification ID obtained in Sponsor A's context and prove Sponsor B
  receives exact `404` for both read and mark-read requests.
- [ ] Prove Admin has no cross-user override and receives the same exact `404`.
- [ ] Register every expected negative response by exact method, pathname, and
  status before its one action, and consume it once.

#### Unit 06 - push subscription lifecycle

- [ ] On secure Chromium, request permission only after a real user gesture and
  create a real `pushManager` subscription using the deployed public VAPID key.
- [ ] Prove subscribe persistence across reload and authenticated unsubscribe.
- [ ] In a dedicated same-browser transfer context, subscribe as Sponsor A,
  perform real logout/login as Sponsor B, upsert the same endpoint, prove the
  former owner can no longer remove it (`404`), and prove Sponsor B can.
- [ ] Retain no endpoint, key material, subscription JSON, hash, or fingerprint
  in output or artifacts.

Provider success/retry and controlled `410` pruning remain source/PostgreSQL
adapter evidence unless an explicitly approved non-live push harness exists.
Actual notification display on an external device is a separate manual gate
and must remain `NOT VERIFIED` when it is not performed.

#### Unit 07 - Arabic phone and keyboard behavior

- [ ] Switch to Arabic through the product UI and prove notification locale sync
  succeeds without blocking the UI-language change.
- [ ] At the supported phone viewport, prove the bell, popover, cards/page, badge,
  and long copy are RTL-correct with no horizontal overflow or clipping.
- [ ] Prove keyboard open, row activation, mark-read feedback, Escape dismissal,
  and focus restoration to the bell using exact accessible names.

#### Unit 08 - supported cleanup and closure

- [ ] Delete only this run's disposable application records through supported
  authenticated APIs and exact-recipient mailbox deletion.
- [ ] Unsubscribe the run-owned push subscription before deleting its owner.
- [ ] Report counts only for retained application rows and mailbox messages;
  database-only guarantees remain `NOT VERIFIED`.
- [ ] Perform real logout for every open principal, prove recognized auth cookies
  absent and one protected endpoint denied, then close every page/context.

#### Diagnostics

- [ ] Attach diagnostics when every page is created and finish with no unexpected
  page errors, console errors, failed requests, or unexplained HTTP responses.
- [ ] Keep intentional `401`/`404` responses as separately counted one-shot
  allowances; do not suppress unrelated console or response failures.
- [ ] Retain only a value-free passed/failed marker. Artifacts and output must
  contain no identities, emails, phones, OTPs, cookies, tokens, message bodies,
  endpoints, keys, household data, or raw provider errors.

### 12.5 Promotion and one-attempt rule

1. Implement the spec, runner, source-contract tests, cleanup predicates, and
   discovery count without contacting the production target.
2. Pass the focused source/helper tests, targeted lint/typecheck, full root
   gate, `bun run test:db`, and `bun run db:generate` with no schema drift.
3. Publish and deploy the exact notification revision; satisfy every section
   12.2 precondition and obtain a fresh explicit instruction.
4. Run the smallest state-complete notification unit plus passive diagnostics.
   Verify the selected-test count before interpreting the result.
5. On failure, preserve the native exit and value-free fingerprint, classify
   `TEST`, `PRODUCT`, `RUNNER`, or `ENVIRONMENT`, confirm
   `NO MANAGED MAILBOX TRANSPORT`, and stop without editing or rerunning under
   the same authorization.
6. After a focused pass and any required publication/deployment cycle, obtain a
   separate fresh instruction for one complete unfiltered 9-test attempt.
7. Accept this extension only when all eight units plus diagnostics pass in one
   serial run, supported cleanup reports zero retained API-visible run data,
   the exact app/worker revision remains confirmed, and the artifact audit is
   clean.

### 12.6 Final notification acceptance checklist

- [x] Dedicated notification spec/runner and exact 9-test discovery are green.
- [x] Exact app/worker revision, migration, heartbeat, activation, and isolated
  Mailpit route are verified value-free.
- [ ] Four-account inbox fan-out, polling, read persistence, and isolation pass.
- [ ] Applicant approval produces one inbox row and one normal-path Mailpit
  decision email with no legacy duplicate.
- [ ] Cross-user and Admin notification access return exact `404`.
- [ ] Push subscription persistence, account transfer, and unsubscribe pass
  without credential leakage.
- [ ] Arabic phone RTL, keyboard operation, focus restoration, and diagnostics
  pass.
- [ ] Supported application/mailbox/subscription cleanup and real logout pass.
- [ ] Complete command result, work-unit result, and extension result are
  reported separately with native exit and selected-test count.
- [ ] Real-device push display is proved separately or reported `NOT VERIFIED`.

### 12.7 First authorized focused attempt and auth-grant correction

The first freshly authorized production notification attempt ran once on
2026-09-07 and stopped at the first failure without an edit or retry:

- guarded preflight passed;
- Playwright selected exactly `9 tests using 1 worker`, with zero retries;
- Unit 01 failed after `16.1s` because authenticated
  `GET /api/notifications/unread-count` returned `401` instead of `200`;
- Units 02-08 and diagnostics were `NOT RUN` after the serial failure;
- native exit was `1`, and the runner reported
  `NO MANAGED MAILBOX TRANSPORT`;
- supported cleanup did not run, so this attempt's disposable records or
  mailbox messages may remain;
- only the value-free failed `.last-run.json` marker remained, and its
  sensitive-pattern scan was clean;
- real-device push display remained `NOT VERIFIED`.

The failing assertion did not retain the principal alias, so browser evidence
alone could not distinguish a stale session from authorization drift. A
value-free read-only deployment inspection resolved that ambiguity without
another browser attempt:

- the app and `notifications-worker` were both healthy on exact revision
  `8a453bfb45045266a88461d0fc1c216cbc7a31d9`;
- the active Dokploy deployment remained `sourceType=raw` and its managed
  Compose source had a migration service but no auth-reconciliation service;
- production contained zero rows for the new `read:notifications` and
  `update:notifications` permission names, and Admin, Operator, Family, and
  Sponsor each had zero matching grants;
- Unit 01 uses the Admin context first, immediately after the same context
  successfully reads `/api/auth/me` and creates protected records. The `401`
  is therefore a deployed code-managed grant defect, not a notification
  controller or browser-cookie defect.

The narrow correction now:

- adds a quiet `seed:reconcile-auth` image command that reconciles and verifies
  only code-managed roles, permissions, and grants, without reading or mutating
  any user, Admin email, password, or token;
- adds an isolated `auth-reconcile` Compose service and makes the release
  deploy script run it after migrations and before replacing app/worker;
- requires the managed Dokploy raw Compose source to run the same service and
  gate app/worker start on its successful completion;
- makes Unit 01 assert `/api/auth/me`, the expected role, and unread-count
  access immediately after each principal login, retaining only the alias and
  status contract if a future failure recurs.

Red/green and local correction evidence:

- notification runner source contract: red `4 passed, 1 failed`, then green
  `5 passed, 0 failed, 90 assertions`;
- deployment auth-reconciliation source contract: red `2 passed, 1 failed`,
then green `3 passed, 0 failed, 38 assertions` after the identity-free
deployment boundary was pinned;
- targeted ESLint and web/seed typechecks passed;
- the complete root lint, typecheck, standard test, and production build gate
  passed with web `396`, server `400` plus `77` opt-in skips, and seed `89`;
- `bun run db:generate` reported `No schema changes, nothing to migrate`;
- `bun run test:db` passed all `55` PostgreSQL tests.

The first publication of the deployment gate (`8664151`) exposed a second,
separate deployment defect without running Playwright: the original command
called the full bootstrap-Admin seed. Production intentionally had the
configured seed email assigned to a non-Admin acceptance identity, so the job
failed closed before app/worker replacement. The previous healthy Compose
definition restored app and worker service on the published image; migrations
had passed and no Admin identity was changed. The follow-up implementation
uses a PostgreSQL-advisory-lock-protected transaction over authorization tables
only. Its local command, full root gate, all `55` PostgreSQL tests, and schema
drift check passed.

The follow-up was published and deployed as exact revision
`9d71e999f6813e35e40e4e41ec8cd0fdb05a910f`. GitHub verification, image
publication, and the Dokploy trigger passed. VPS postconditions then proved:

- migration and identity-free auth reconciliation both exited `0` on the exact
  revision, while app and `notifications-worker` became healthy on that same
  revision;
- the managed raw Compose source and rendered Compose each contained one
  `auth-reconcile` service and exactly two app/worker completion dependencies;
- the service had one backend network and no published ports, and its bounded
  log had no sensitive-pattern matches;
- both notification permissions existed exactly once, and Admin, Operator,
  Family, and Sponsor each had exactly two matching grants;
- migration `0045` was journaled, the worker heartbeat existed, and dispatch,
  email, and push activation flags were all true;
- the dedicated preflight-only command passed Chrome, app-scoped HTTPS
  mail-test gateway, `/login`, `/apply`, `/notifications`, health, and readiness,
  ending with `NO MANAGED MAILBOX TRANSPORT`.

No production browser rerun occurred during diagnosis, correction, deployment,
or preflight preparation. A fresh user instruction is still required before
one corrected Unit 01 plus passive diagnostics attempt.

### 12.8 Second focused attempt and responsive-selector correction

A fresh instruction authorized exactly Unit 01 plus passive diagnostics on
deployed revision `ab03fe0ab1c5cc8d5528cc234681ac3dea6c60e7`. The runner
preflight passed and selected exactly `2 tests using 1 worker`, with zero
retries. All four principals passed the new `/api/auth/me` role and
`GET /api/notifications/unread-count` access assertions, confirming the
deployed grant correction. Unit 01 then failed after `48.5s` at the
notifications-page readiness assertion because
`getByText("Notifications", { exact: true }).first()` selected a hidden
responsive navigation copy. Diagnostics did not run, Units 02-08 were excluded
by the focused grep, native exit was `1`, and the runner reported
`NO MANAGED MAILBOX TRANSPORT`. Cleanup did not run, so disposable records or
mailbox messages may remain. The retained 96-byte value-free marker had zero
sensitive-pattern matches; no error-context artifact remained.

The test-owned correction selects the unique semantic level-2 page heading
rendered by `NPageHeader` and removes the arbitrary `.first()` selection. Its
source regression failed against the old selector (`4 passed, 1 failed`) and
passed after correction (`5 passed, 0 failed, 92 assertions`). Web lint and
typecheck, the full root lint/typecheck/test/build gate, and `db:generate` with
no schema drift all passed. Publication, exact deployment proof, and one fresh
focused attempt remain required.

### 12.9 Third focused attempt and visible-link correction

The semantic-heading correction was committed, published, and deployed as exact
healthy app and worker revision `c420e4fcefe539b3b6d5173f9673348a7fa741bd`.
CI verification, image publication, the Dokploy trigger, the identity-free auth
reconciliation job, and the eight notification grants all passed. A fresh
instruction then authorized exactly Unit 01 plus passive diagnostics. Preflight
passed and the runner selected exactly `2 tests using 1 worker`, with zero
retries. Unit 01 progressed through four-account notification authorization,
empty-inbox ownership, the semantic notifications-page heading, and dashboard
bell assertions before failing after `53.1s`: the global
`a[href="/notifications"]` locator correctly matched both responsive shell
copies, while the test incorrectly required a total DOM count of one.
Diagnostics did not run, Units 02-08 were excluded by the focused grep, native
exit was `1`, and the runner reported `NO MANAGED MAILBOX TRANSPORT`. Cleanup
did not run, so disposable records or mailbox messages may remain. The retained
96-byte value-free marker had zero sensitive-pattern matches; no error-context
artifact remained.

The test-owned correction now applies the spec's existing `onlyVisible` helper,
requiring exactly one visible notifications link while permitting the intended
hidden responsive copy. Its source regression failed against the old assertion
(`4 passed, 1 failed, 93 assertions`) and passed after correction
(`5 passed, 0 failed, 94 assertions`). Web lint and typecheck, the full root
lint/typecheck/test/build gate, and `db:generate` with no schema drift passed.
Publication, exact deployment proof, and one corrected focused attempt remain
required.

### 12.10 Corrected focused Unit 01 result

Revision `0b0173fda266a46c2f6cd9f082b7baf8d747c203` passed GitHub Actions
verification, image publication, and the Dokploy trigger. The live app and
notifications worker were independently confirmed healthy on that exact
revision, and its identity-free auth reconciliation job exited `0`. The
dedicated preflight passed immediately before execution.

The single authorized attempt selected exactly `2 tests using 1 worker`, with
zero retries. Unit 01 passed in `40.5s`, proving supported creation of the
disposable Family and Sponsor A/B principals, isolated authenticated access for
all four roles, empty owned inboxes, semantic notifications-page readiness, and
the unique visible zero-state shell bell/link contract. Passive diagnostics
passed in `59ms`; the complete command passed `2 tests` in `45.7s`, returned
native exit `0`, and reported `NO MANAGED MAILBOX TRANSPORT`.

The notification result directory retained only its 45-byte value-free passed
`.last-run.json` marker. Its sensitive-pattern scan was clean. Units 02-08 were
excluded by the focused grep, so event fan-out, read behavior, Mailpit decision
delivery, isolation, push lifecycle, Arabic interaction, supported cleanup, and
real-device display remain unverified. Per section 12.5, a separate fresh user
instruction is required before the one complete unfiltered nine-test attempt.

### 12.11 First complete attempt and popover-readiness correction

A fresh instruction authorized one complete unfiltered attempt on exact healthy
app and worker revision `84a6a6b69185a5512ba586707cc953195ffb1c06` after CI,
the isolated SMTP boundary, and dedicated preflight passed. Playwright selected
exactly `9 tests using 1 worker`, with zero retries. Unit 01 passed in `1.3m`.
Unit 02 then failed after `35.0s`: the deployed API and unread-count polling had
already returned Sponsor A's new notification, but the test immediately clicked
the newly navigated server-rendered bell and never observed the popover list
request; its notification-ID card was absent for the 30-second assertion.
Units 03-08 and diagnostics did not run, native exit was `1`, and the runner
reported `NO MANAGED MAILBOX TRANSPORT`. Cleanup did not run, so disposable
records or mailbox messages may remain. The retained 96-byte value-free failed
marker had no sensitive-pattern matches; the runner removed error context.

This is a test-readiness defect. The correction registers the exact
`GET /api/notifications?limit=5` response before every mouse or keyboard open,
performs the action once, and requires exact `200` before asserting cards. It
covers both Unit 02 opens and both Arabic keyboard opens in Unit 07, so an
unhydrated trigger or failed list fetch produces the owning request failure
instead of a misleading missing-card timeout. The source regression failed on
the old contract (`4 passed, 1 failed, 95 assertions`) and passes after the
correction (`5 passed, 0 failed, 102 assertions`). Web lint/typecheck, the full
root lint/typecheck/test/build gate, and `db:generate` with no schema drift also
pass. Publication, exact deployment proof, and a separately authorized focused
Unit 02 prerequisite range plus passive diagnostics remain required before
another complete attempt.

### 12.12 Focused popover-request attempt and hydration correction

The request-observation correction was published and deployed as exact healthy
app and worker revision `553024620b90acc479faf0e0cdfe4ac709500360`; CI, image
publication, Dokploy deployment, auth reconciliation, and dedicated preflight
passed. A fresh instruction authorized exactly Units 01-02 plus passive
diagnostics. Playwright selected `3 tests using 1 worker`, with zero retries.
Unit 01 passed in `21.3s`; Unit 02 reached its first popover open but no
`GET /api/notifications?limit=5` occurred, and the test timed out at `180s`.
Diagnostics did not run, native exit was `1`, and the runner reported
`NO MANAGED MAILBOX TRANSPORT`. Cleanup did not run, so disposable records or
mailbox messages may remain. The retained 96-byte value-free marker had no
sensitive-pattern matches; error context was removed by the runner.

The missing request confirms a test hydration race: the bell's server-rendered
markup was actionable before its client React handler was attached. The helper
now polls the exact visible trigger until its React `onClick` is callable, then
registers the exact list response before performing the single mouse or keyboard
action. The source regression failed against the old helper (`4 passed,
1 failed, 97 assertions`) and passes after correction (`5 passed, 0 failed,
105 assertions`); web typecheck/lint, the full root lint/typecheck/test/build
gate, and `db:generate` with no schema drift pass. Publication, exact
deployment, and a separately authorized Units 01-02 plus
diagnostics attempt remain required.

### 12.13 Hydrated focused attempt and explicit open-time refetch fix

The hydration correction was published and deployed as exact healthy app and
worker revision `944641e3c73055ff63509596183d03b5b6302e1b`; CI and dedicated
preflight passed. A fresh instruction authorized exactly Units 01-02 plus
passive diagnostics. Playwright selected `3 tests using 1 worker`, with zero
retries. Unit 01 passed in `28.5s`. Unit 02 then timed out at `180s` waiting for
the first `GET /api/notifications?limit=5` even though the bell's React click
handler was confirmed callable. Diagnostics did not run, native exit was `1`,
and the runner reported `NO MANAGED MAILBOX TRANSPORT`. Cleanup did not run, so
disposable records or mailbox messages may remain. The retained 96-byte
value-free marker had no sensitive-pattern matches; error context was removed.

This disproves the hydration hypothesis and confirms a frontend product defect:
the popover body can remain mounted while closed, so its list query becomes
cached before a later notification and `refetchOnMount: "always"` does not mean
refetch on each controlled open. `NotificationsMenu` now mounts the query body
only while `open` is true. Each open therefore mounts the list query and makes
the documented open-time refetch contract real without polling the list while
closed. The narrow feature regression failed before the fix (`19 passed,
1 failed, 436 assertions`) and the combined feature/remote-runner tests pass
after it (`25 passed, 0 failed, 546 assertions`); web typecheck/lint, all root
tests, and an isolated-dist production build pass. The initial default-dist
build collided with another active landing-page build and lost its generated
`pages-manifest.json`; waiting for that unrelated process and rebuilding with
`NAJM_NEXT_DIST_DIR=.next-notification-gate` passed. `db:generate` reports no
schema drift. Publication, exact deployment, and a separately
authorized Units 01-02 plus diagnostics attempt remain required.

### 12.14 Open-time product fix attempt and observable popover correction

The explicit open-time query-body fix was published and deployed as exact
healthy app and worker revision `0bbff6dad12f2254a94267ddd626fd608209809f`;
CI and dedicated preflight passed. A fresh instruction authorized exactly Units
01-02 plus passive diagnostics. Playwright selected `3 tests using 1 worker`,
with zero retries. Unit 01 passed in `31.3s`; Unit 02 then timed out at `180s`
because the test required a new `GET /api/notifications?limit=5` response after
opening. Diagnostics did not run, native exit was `1`, and the runner reported
`NO MANAGED MAILBOX TRANSPORT`. Cleanup did not run, so disposable records or
mailbox messages may remain. The retained 96-byte value-free marker had no
sensitive-pattern matches; error context was removed.

The product fix remains valid, but the response observer was an implementation
detail rather than the acceptance contract: React Query may satisfy an open from
its cache, while the API-proven notification-ID card is the required freshness
evidence. The helper now proves the exact visible bell is hydrated, performs one
mouse or keyboard activation, and requires its semantic `aria-expanded` state
to become `true`; Unit 02 then requires the newly created ID-specific card.
This distinguishes a failed open from stale content without demanding a network
request. The combined notification feature/runner source tests pass (`25 passed,
0 failed, 546 assertions`), and web typecheck/lint pass. Full root verification,
publication, exact deployment, and a separately authorized Units 01-02 plus
diagnostics attempt remain required.

### 12.15 Observable-popover attempt and navigation/read race correction

The observable-popover correction was published and deployed as exact healthy
app and worker revision `d0a5ee549ef09a3f810ba0b96d21be037830f3b5` after
GitHub verification, image publication, deployment, and dedicated preflight
passed. A fresh instruction authorized exactly Units 01-02 plus passive
diagnostics. Playwright selected `3 tests using 1 worker`, with zero retries.
Unit 01 passed in `27.1s`; Unit 02 failed, diagnostics did not run, and the
runner retained only its 96-byte value-free failed marker. The terminal
assertion was lost when the attached process session ended, so no narrower
browser assertion is claimed. The marker's sensitive-pattern scan was clean,
and no edit or retry occurred under that authorization.

A value-free read-only production database check over the bounded attempt
window showed both new `contribution.validated` rows still unread. It also
showed two unread `contribution.submitted` rows, confirming that Unit 02's
independent “only this row” boundary had a real comparison row. Source review
then identified the owning frontend race: the popover `View` link launched an
asynchronous mark-read mutation from `onNavigate` while allowing navigation to
start immediately, so route transition could abort or outrun the PATCH. The
link now prevents only an accepted unread-row navigation, awaits successful
mark-read persistence, closes the popover, and then routes. Already-read links
retain normal Next.js navigation, and a failed command keeps the popover open.

The isolated navigation and remote-runner source contracts pass (`6 passed`,
`0 failed`, `108 assertions`); web lint/typecheck pass; the full root
lint/typecheck/test/build gate passes with web `429`, server `400` plus `77`
opt-in skips, and seed `89`; `db:generate` reports no schema drift. Publication,
exact deployment proof, and one freshly authorized Units 01-02 plus diagnostics
attempt remain required.
