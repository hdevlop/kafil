# Four-account financial browser journey

Shared preconditions are defined in
[`02-safety-and-runtime.md`](02-safety-and-runtime.md). Historical references
to sections 11.x point to the preserved
[`04-auth-lifecycle.md`](04-auth-lifecycle.md) chronology.

## 5. Numbered browser journey

The spec is one `test.describe.serial` journey with one worker, zero retries,
the shared 180-second default timeout, and passive diagnostics last. No step
adds a local timeout.

Exact titles:

```text
remote upload - generated product image round trip and cleanup
remote CSP matrix - authenticated routes, locales, branding, PWA, and hydration
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
once on the same healthy revision after a fresh user instruction. The accepted
historical baseline then selected **18 tests**. The later independently
selectable upload and CSP units bring the current unfiltered selection to
exactly **20 tests**. The Family order-limit checks are embedded in steps 02,
07, and 08, so they add no further test title or authenticated context. This
current selection awaits its own freshly authorized remote attempt.

### Step contracts

| Step | Contract | Current organized code |
| --- | --- | --- |
| 01 | Admin login, dashboard/assignment readiness, real logout, cookie absence, protected `401` | Complete-range remote pass on `4ef0d03` |
| 02 | Family UI creation with an explicit `2`-orders/month cap and explicit monthly budget, inherited/unlimited per-order fallback, operator policy-source projection, Family effective-only projection, first-login password setup, temporary-credential denial, role boundary | Historical identity and role boundary passed remotely; policy extension implemented locally and awaits a fresh complete remote attempt |
| 03 | Sponsor A application, exact OTP/delete, pending denial, approval/replay, email/phone login | Bounded collection observer and complete step contract passed in the corrected four-test range on healthy revision `8334f4c` |
| 04 | Independent Sponsor B application, OTP/delete, approval/replay, login/logout | Corrected five-test prerequisite range passed remotely on healthy revision `8334f4c`, including passive diagnostics |
| 05 | Two assignments, duplicate `409`, safe sponsor projections, cross-sponsor `404` boundaries | Complete-range remote pass on `4ef0d03` |
| 06 | Plan lifecycle, contribution validation/refund replays, exact target funding | Complete-range remote pass on `4ef0d03` |
| 07 | Two Delivery Staff profiles; two simultaneous accepted orders consume the `2`-order cap; a third submit returns exact count-limit `409` with no extra order or budget effect; cancellation frees one count slot; tightening the monthly limit to current usage makes the next submit return exact monthly-limit `409` with no side effect; rejection releases the last count/usage and the monthly limit is restored | Historical lifecycle passed remotely; count/monthly-limit extension implemented locally and awaits a fresh complete remote attempt |
| 08 | Order 3 approval; a `+1` top-up above the resulting-total ceiling returns exact `409` with no purchase, status, or budget mutation; raising the ceiling to the exact resulting total permits the same purchase; effective Family quota/usage, replay, failed delivery, reassignment, and confirmation/replay remain asserted | Historical lifecycle passed remotely; per-order extension implemented locally and awaits a fresh complete remote attempt |
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

Verify the header reports exactly 20 tests before interpreting results. This is
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

The dedicated auth lifecycle is accepted on Najm Auth `3.2.0`, including the
last `najm.session` writer, cross-tab logout, and the protected-response/logout
overlap. The corrected Sponsor A and Sponsor B prerequisite ranges also passed.
The shared HTTPS mail-test hub, Kafil gateway scope, and Kafil SMTP route are
ready. Every browser condition below is now satisfied by the passing complete
attempt recorded in section 11.16:

- the guarded runner received only the exact HTTPS gateway host/origin and
  Kafil token and no retired transport name — `DONE`;
- the committed guarded preflight passed after the SMTP cutover — `DONE`;
- a separate fresh user instruction authorized one complete remote attempt on
  the exact healthy deployed revision — `DONE`;
- the runner header reported exactly `18` tests, one worker, and zero retries —
  `DONE`;
- all 16 numbered steps, the responsive unit, and diagnostics passed together —
  `DONE`;
- step 16 reported zero retained API-visible runtime rows, protected evidence
  files, and exact-recipient mailbox messages through counts-only assertions —
  `DONE`;
- the runner reported `NO MANAGED MAILBOX TRANSPORT`, and the retained
  marker/output passed the secret and runtime-sensitive-value audit — `DONE`;
- the accepted test/plan evidence is committed and pushed under section 8 —
  `DONE` by the commit containing section 11.16;
- database-only guarantees remain explicitly `NOT VERIFIED`.

The residue concern from the two earlier failed attempts is unchanged by this
pass. Step 16 deletes only the graph created by its own run, so any disposable
records left by the previous failed responsive and cleanup attempts are still
outside this plan's verified boundary and must be assessed through supported
application surfaces, never through database, Docker, or VPS shortcuts.
