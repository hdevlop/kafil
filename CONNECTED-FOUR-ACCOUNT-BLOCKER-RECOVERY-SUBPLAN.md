# Connected Four-Account Blocker Recovery Sub-plan

Status: **UNIT C RECOVERED — A-E NOT RUN**

Audience: a medium-capability coding model working in
`C:\Users\hdevlop\Desktop\kafil`.

Authority: `CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md` remains the acceptance
contract. This file only sequences recovery work so expensive connected runs
are not repeated blindly. Root `PLAN.md` is currently absent from this
worktree; do not recreate it.

## Current retest handoff

Codex corrected the responsive table-header overlap and the recovery-dashboard
readiness sequence. Current evidence is `1 passed (8.1m)` for focused Unit C
and `2 passed (8.0m)` for Unit C plus diagnostics, both with native exit 0.
The A-E dependent range has not run against this correction.

1. Run the fail-fast environment preflight from Section 6.
2. Run web typecheck and lint from Section 5.
3. Run focused `work unit C` exactly once using Section 7 Level 1.
4. If and only if it passes, run `work unit C|diagnostics` exactly once.
5. Stop and report both native exit codes and verbatim Playwright summaries.

Do not run A-C, A-E, the complete connected spec, production mode, or final
gates in this handoff. A failure is a report boundary, not permission to edit
or rerun.

## 1. Assignment and boundaries

Work in checkpoints. Complete **Checkpoint 1 only**, then stop and return the
report in Section 10. The user will review that report before authorizing later
checkpoints.

Checkpoint 1 outcome:

1. stabilize the Unit C post-setup temporary-credential replay interaction;
2. prove Unit C alone;
3. prove Unit C plus diagnostics;
4. run A-E plus diagnostics once;
5. give an evidence-backed Unit E verdict.

Do not during Checkpoint 1:

- implement Units F, G, or H;
- run the complete connected suite;
- run production-style E2E or the full root gate;
- change dependency versions or patch `node_modules`;
- edit or publish the Najm repository/package;
- recreate root `PLAN.md`;
- commit, push, publish, deploy, or contact an external service;
- print `.env`, connection strings, credentials, tokens, cookies, OTPs,
  generated emails/phones, CINs, addresses, hashes, or mailbox bodies;
- use network mocks, direct SQL mutation, `clearCookies()`, forced clicks,
  retries, arbitrary sleeps, broad diagnostic allowances, or `test.skip`.

Preserve the dirty worktree. Treat every existing unrelated modification as
user-owned. Only edit files required by the checkpoint, and list them all.

## 2. Mandatory reading

Read completely before editing:

1. `AGENTS.md`
2. `.agents/skills/kafil-najm-frontend/SKILL.md`
3. `.agents/skills/kafil-najm-backend/SKILL.md`
4. `.agents/skills/kafil-playwright-testing/SKILL.md`
5. `.agents/skills/kafil-playwright-testing/references/patterns.md`
6. `CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`
7. `docs/evidence/connected-four-account/work-unit-E-report.md`
8. `AUTH-COOKIE-PLAN.md`, especially the final outcome, Moves 4-6, and browser
   acceptance
9. `apps/web/test/e2e/connected-four-account.e2e.ts`
10. `apps/web/scripts/run-connected-four-account-e2e.ts`
11. `apps/web/scripts/connected-four-account-fixtures.ts`
12. `apps/web/playwright.config.ts`
13. `apps/web/src/features/Auth/components/LoginForm.tsx`
14. installed `najm-kit` `NForm` declarations/source and installed
    `najm-auth@3.1.3` client declarations needed to verify the login contract

Do not rely on older version text in a plan when manifests, lockfile, and
installed declarations disagree. Report the disagreement; do not change a
package version in this checkpoint.

## 3. Current ground truth

Use these facts as the starting point, then verify them from the current files:

- Kafil currently pins and installs `najm-auth@3.1.3`.
- The shared logout/refresh race and anonymous credential-setup transport were
  corrected in published Najm Auth releases.
- The latest A-E run reached Unit C setup status/change successfully, then the
  temporary-credential replay produced native `GET /login?` instead of the
  required `POST /api/auth/login`.
- The latest dependent result was `2 passed, 1 failed, 3 did not run (11.1m)`.
- Unit E has implemented assertions but has no accepted uninterrupted live
  pass.
- Units F-H are not complete acceptance implementations. Do not call the
  connected plan complete even if A-E passes.
- The older live checkpoint saying Unit C passed `1 passed (8.6m)` predates the
  latest dependent failure. Treat the latest report as the active blocker
  until current-code focused evidence passes again.
- The replay path near Unit C currently goes to `/login`, fills fields, and
  clicks directly. The normal `login()` helper and first temporary login use
  `waitForLoginHydration()`.

Initial ownership: **test interaction/hydration defect**. Change ownership only
if a focused run proves the browser emitted the correct request and Kafil or
Najm returned incorrect behavior.

## 4. Checkpoint 1A - static diagnosis and narrow correction

Inspect the current React login form and installed `NForm` contract. Confirm:

- `#login-form` is the form used by the visible login controls;
- its client `onSubmit` calls the Najm Auth login client;
- the replay path targets the same visible form and controls;
- no route/navigation or remount invalidates the locator after hydration.

Then make the smallest test-owned correction in
`apps/web/test/e2e/connected-four-account.e2e.ts`:

1. Reuse `waitForLoginHydration()` after the replay's `goto("/login")`.
2. Fill through the locators returned/validated after hydration.
3. Assert identifier and password inputs contain their in-memory expected
   values before clicking. Never log or include those values in assertion
   messages or evidence.
4. Register the exact expected negative response before clicking:
   `POST /api/auth/login -> 401`, exactly once.
5. Observe the competing wrong outcome `GET /login` before clicking and fail
   immediately with a value-free message if it occurs first.
6. Implement competing-request observation without leaving a losing waiter or
   unhandled promise that can time out later. Always detach temporary listeners
   in `finally`.
7. If needed, collect only in-memory booleans/routing facts:
   `submitFired`, `defaultPrevented`, whether current React props expose an
   `onSubmit` function, request method/path, and current pathname.
8. Do not collect input values, form data, request/response bodies, headers,
   cookies, tokens, or generated identities.
9. Preserve the exact diagnostic response and console allowance accounting.
   Do not add a broad 401 or pathname-prefix exemption.

Preferred result: a test-only correction. Do not change `LoginForm.tsx` unless
the focused browser proves the real form is incorrectly wired after stable
hydration. If application code appears responsible, record the exact request
and event evidence before making the smallest Kafil fix plus a focused source
regression test.

If the correct `POST /api/auth/login` occurs but shared Najm behavior is wrong,
stop and report a **suspected Najm defect**. Do not patch Kafil around it and do
not edit/publish Najm.

## 5. Checkpoint 1B - cheap validation

Before any browser run:

```powershell
bun run --cwd apps/web typecheck
$typecheckExit = $LASTEXITCODE
if ($typecheckExit -ne 0) { throw "Web typecheck exited with $typecheckExit" }

bun run --cwd apps/web lint
$lintExit = $LASTEXITCODE
if ($lintExit -ne 0) { throw "Web lint exited with $lintExit" }
```

If either fails in a changed file, fix it. If it fails only in unrelated
user-owned work, record the exact file/error and stop rather than editing that
work.

Run `git diff --check` only for files changed in this checkpoint. Do not use a
whole-worktree formatting command.

## 6. Checkpoint 1C - fail-fast environment preflight

Do not print environment values. Confirm the existing ignored acceptance
overlay is present and let the connected runner validate its boolean security
contracts.

Check Mailpit and the runner port with a short timeout:

```powershell
$connectTimeoutMs = 1500
$requiredPorts = @(
  @{ Name = "Mailpit SMTP"; Host = "127.0.0.1"; Port = 1025 },
  @{ Name = "Mailpit HTTP"; Host = "127.0.0.1"; Port = 8025 }
)

foreach ($service in $requiredPorts) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connected = $client.ConnectAsync($service.Host, $service.Port).Wait($connectTimeoutMs)
    if (-not $connected -or -not $client.Connected) {
      throw "$($service.Name) preflight failed"
    }
  } finally {
    $client.Dispose()
  }
}

if (Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue) {
  throw "Connected acceptance port 3210 is already in use"
}
```

If Mailpit is down, stop and report the environment blocker. Do not silently
start an executable from a personal Downloads path. If port 3210 is occupied,
inspect PID, command line, and parentage; stop only a verified orphaned
connected-acceptance tree. Never kill all Bun, Node, or Chrome processes.

Do not run broad seeds, resets, truncation, database drops, `seed:full`,
`setup`, `seed:remove`, or ad hoc cleanup. The connected runner may perform only
the narrow operations already authorized by the acceptance plan.

## 7. Checkpoint 1D - promotion ladder

### Level 1: focused Unit C

Cost class: focused. Run once after the correction:

```powershell
$env:KAFIL_E2E_GREP='work unit C'
bun run --cwd apps/web test:e2e:connected
$connectedExit = $LASTEXITCODE
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
if ($connectedExit -ne 0) { throw "Connected Unit C exited with $connectedExit" }
```

Required result:

- native exit code `0`;
- terminal Playwright summary for exactly one passed Unit C test;
- temporary replay emits `POST /api/auth/login -> 401` exactly once;
- no native `GET /login?` submit;
- the rest of Unit C completes, including runtime-password login and logout.

If the same native GET symptom occurs twice under an unchanged hypothesis,
stop. Do not run a third attempt until instrumentation, implementation, or
diagnosis changes. Do not increase timeouts without evidence that the expected
request is slow rather than absent.

### Level 2: Unit C plus diagnostics

Run only after Level 1 passes:

```powershell
$env:KAFIL_E2E_GREP='work unit C|diagnostics'
bun run --cwd apps/web test:e2e:connected
$connectedExit = $LASTEXITCODE
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
if ($connectedExit -ne 0) { throw "Connected Unit C diagnostics exited with $connectedExit" }
```

Required result: two passed tests, native exit `0`, and no unexplained page,
console, request, or response diagnostics.

### Level 3: A-E plus diagnostics

Cost class: dependent range. Run exactly once after Level 2 passes:

```powershell
$env:KAFIL_E2E_GREP='work unit A|work unit B|work unit C|work unit D|work unit E|diagnostics'
bun run --cwd apps/web test:e2e:connected
$connectedExit = $LASTEXITCODE
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
if ($connectedExit -ne 0) { throw "Connected A-E exited with $connectedExit" }
```

Do not rerun A-E immediately after failure. First classify the failure, inspect
the final assertion and relevant request lines, and change the focused owning
layer or instrumentation. Because Unit E depends on runtime state from A-D,
A-E is its smallest honest live dependent range; compensate by doing static
contract and source-test work before each expensive attempt.

Unit E is accepted only when:

- A-E and diagnostics finish with native exit `0`;
- both assignments were created through the UI;
- duplicate assignment is one exact `409`;
- independent database assertions prove exactly two active assignments, one
  per sponsor;
- both isolated sponsor contexts see the family exactly once;
- sponsor-safe projections have exact key contracts and contain no private or
  cross-sponsor runtime values;
- cross-sponsor assignment, contribution, and plan reads each produce the
  exact required `404` once;
- audit/outbox privacy scans are boolean-only and clean;
- no unexplained diagnostics or sensitive evidence remains.

After Level 3, update only evidence/checklist items proved by that run. Do not
mark Units F-H or the whole plan complete.

## 8. Later checkpoints - do not execute until authorized

### Checkpoint 2: implement and prove Unit F

Current Unit F is incomplete. It must add exact assertions for:

- monthly-plan create, pause, resume, stop, and rejected resume after stop;
- exact lifecycle rows/status/ownership, not only `>= 4` events;
- pending contribution rejection with no funding/ledger increase;
- validation with exactly one ledger append;
- validation replay conflict with no second append;
- refund with one reversal and exact funding decrease;
- refund replay with no second reversal;
- two sponsors' positive integer-minor-unit amounts summing exactly to target;
- first validation remains below target; second reaches target exactly;
- activation changes only on final validation;
- sponsor-private histories and combined admin totals;
- contribution rows, family funding, budget snapshot, and ledger counts after
  every mutation.

Remove weak optional branches such as “if Resume exists” for required actions.
Do not accept a raw request that only checks status `< 400`.

Promotion: focused source/server tests -> web typecheck/lint -> A-F plus
diagnostics once. Stop and report.

### Checkpoint 3: prepare catalog and implement/prove Unit G

The catalog/inventory prerequisite in Section 2 is still unchecked. Verify it
read-only before editing/running Unit G. If absent, use only the plan-authorized
catalog preparation path; never use broad seed/reset commands.

Current Unit G is only a skeleton. Implement all three orders and prove:

- Order 1 submission, reserve, UI cancellation, single release, replay safety;
- Order 2 submission, admin rejection reason, reserve release, inventory and
  role projections;
- Order 3 approval, generated non-sensitive receipt, purchase variance,
  non-negative budget invariants, purchase idempotency, Staff A failure,
  immutable attempt, Staff B reassignment/retry/confirmation, confirmation
  replay safety;
- family/sponsor/admin projections and exact forbidden mutations;
- database status, event counts, budget ledger, inventory, and visible UI
  after every mutation.

Required UI actions must not be conditional `if (count > 0)` branches.

Promotion: focused server/database tests -> web typecheck/lint -> A-G plus
diagnostics once. Stop and report.

### Checkpoint 4: implement/prove Unit H, cleanup, and final gates

Current Unit H checks only admin dashboard overflow. Add all required stable
surfaces and prove desktop, tablet, phone, Arabic RTL desktop/phone, keyboard
reachability/focus restoration, dialog/sheet clipping, loading/empty/
validation/server-error readability, image decode, and clean diagnostics.
Attach diagnostics to every new page. Capture only intentional redacted
screenshots after sensitive surfaces are closed.

Then implement supported cleanup and record retained masked aliases/counts.
Reconcile the still-unchecked Unit A/B evidence items only from exact assertions
and retained artifacts; never check them from inference.

Promotion after focused H proof:

1. complete development connected spec plus diagnostics;
2. web/server/seed checks and `bun run test:db`;
3. production build and production-style connected run;
4. root lint/typecheck/test/build;
5. `bun run db:generate`, requiring no acceptance-only migration;
6. evidence redaction/diff scan and final traceability audit.

Do not commit or push. Report candidate commit as `NOT RECORDED`; the final
candidate-commit completion gate remains for the user/Codex review.

## 9. Stop conditions

Stop immediately and report when any of these occurs:

- Mailpit/PostgreSQL/configuration is unavailable or points outside the
  explicitly authorized local acceptance target;
- port ownership cannot be safely established;
- an unrelated dirty-worktree change blocks validation;
- the correct request proves a Kafil or Najm product defect outside the current
  test-owned hypothesis;
- the same focused symptom repeats twice without a changed hypothesis;
- an assertion would require weakening privacy, authorization, idempotency,
  money, or diagnostic exactness;
- a command exposes a secret/private value or an evidence artifact contains
  one;
- schema generation proposes unexplained DDL;
- a required action/control does not exist in the live UI.

Never convert a stopped, failed, interrupted, or output-lost run into a pass.

## 10. Required Checkpoint 1 report

Return this exact structure to the user:

```text
Checkpoint: 1 - Unit C stabilization and Unit E verdict

Current blocker classification:
- TEST | KAFIL | SUSPECTED NAJM | ENVIRONMENT
- Evidence: <value-free event/request/status facts>

Changes:
- <file>: <concise change>

Validation:
- Web typecheck: PASS | FAIL — <exit code>
- Web lint: PASS | FAIL — <exit code>
- Unit C: <verbatim Playwright summary or NOT RUN>
- Unit C + diagnostics: <verbatim summary or NOT RUN>
- A-E + diagnostics: <verbatim summary or NOT RUN>

Verdicts:
- Command: PASS | FAIL | INTERRUPTED | NOT RUN
- Unit C: PASS | FAIL | BLOCKED
- Unit E: PASS | FAIL | BLOCKED | NOT REACHED
- Connected plan: IN PROGRESS | BLOCKED

Unit E traceability:
- <one row/bullet per Section 11 item with exact UI/network/database assertion>

Evidence hygiene:
- Sensitive scan: PASS | FAIL | NOT RUN
- Retained artifacts: <masked paths only>
- Removed unsafe artifacts: <paths only, no values>

Remaining work:
- Unit F: INCOMPLETE
- Unit G: INCOMPLETE
- Unit H: INCOMPLETE
- Final gates: NOT RUN

Stop reason or next recommended checkpoint:
- <one concise statement>
```

Never include generated identities, credentials, tokens, cookies, OTPs,
mailbox content, private household values, hashes, or raw database values in
the report.
