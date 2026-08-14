# Guarded Remote VPS Acceptance

Use this reference only for the black-box VPS runner. Keep it separate from the
local connected harness and its managed Next.js process.

## Contents

- [Prepare one attempt](#prepare-one-attempt)
- [Select the exact range](#select-the-exact-range)
- [Honor the single-shot boundary](#honor-the-single-shot-boundary)
- [Promote a correction](#promote-a-correction)
- [Classify failures](#classify-failures)
- [Handle rate limits and identity collisions](#handle-rate-limits-and-identity-collisions)
- [Diagnose black-box 500 responses](#diagnose-black-box-500-responses)
- [Select localized collections](#select-localized-collections)
- [Report the attempt](#report-the-attempt)

## Prepare one attempt

1. Read the active remote acceptance plan, remote spec, guarded runner, runtime
   config, remote Playwright config, package scripts, and source-contract test.
2. Confirm the exact deployed target and safety booleans through the runner.
   Check presence only; never print `.env` or resolved values.
3. Confirm the intended commit was built and that the VPS reports the new image
   healthy. Treat a GitHub success and Dokploy trigger as publication evidence,
   not proof that container replacement finished.
4. Run preflight-only after SSH, mailbox, environment, image, or deployment
   state changes. Do not spend a browser attempt when transport is unknown.
5. Keep `retries: 0`, one worker, isolated contexts, verified TLS, and automatic
   artifacts disabled when the plan requires secret-safe black-box output.

Preflight proves only configuration, SSH/Mailpit transport, Chrome, TLS, health,
and readiness. It does not prove login, browser behavior, or any work unit.

## Select the exact range

Inspect declared titles before writing the grep:

```powershell
rg -n 'test\("remote (unit|diagnostics)' `
  apps/web/test/e2e/connected-four-account.remote.ts
```

Use `KAFIL_E2E_REMOTE_GREP`, never local `KAFIL_E2E_GREP` and never a trailing
`--grep`. Include the exact diagnostics title. For A-F:

```powershell
$env:KAFIL_E2E_REMOTE_GREP='remote unit [A-F]|remote diagnostics'
bun run --cwd apps/web test:e2e:connected:remote
Remove-Item Env:KAFIL_E2E_REMOTE_GREP -ErrorAction SilentlyContinue
```

Restore a previous variable value in `finally` when one existed. At startup,
compare Playwright's selected-test count with the intended units plus
diagnostics. If the count is smaller, stop: a grep exclusion is a runner/test
selection defect, not a skipped or failed diagnostic assertion.

Later serial units consume process-memory identifiers from earlier units.
Select the smallest complete prerequisite range ending at the target unit; do
not run a dependent unit alone.

## Honor the single-shot boundary

Treat every invocation as one attempt. On any preflight or browser failure:

1. Preserve the native exit code and final assertion.
2. Record only sanitized method, path, status, selector/accessibility contract,
   failure class, and elapsed time.
3. Confirm `MANAGED SSH TUNNEL CLOSED`.
4. Classify `TEST`, `PRODUCT`, `RUNNER`, or `ENVIRONMENT`.
5. Stop without editing or rerunning under the tester instruction.

Require a fresh user instruction for another remote invocation. Waiting for a
rate window, passing a later preflight, or deploying a fix does not convert the
previous failure into permission to rerun.

## Promote a correction

Return control to the coder after failure. Have the coder:

1. Reproduce the contract in the smallest source/helper test.
2. Demonstrate the new regression fails against the old source when practical.
3. Fix the narrowest owning layer.
4. Run the source test, affected typecheck, targeted lint, root gate, and schema
   drift check required by repository policy.
5. Audit the exact diff and publish the intended commit only.
6. Wait for verification, image publication, deployment trigger, and the VPS
   container's healthy running state as separate checkpoints.
7. Request one fresh remote attempt at the smallest prerequisite range.

Do not use the remote browser as the first test of a selector, fixture
generator, retry, timeout, or pagination hypothesis.

## Classify failures

| Signal | Default classification | Next evidence |
| --- | --- | --- |
| SSH tunnel exits before authenticated Mailpit readiness | `ENVIRONMENT` | Fresh preflight after infrastructure is stable |
| `429` after repeating login for an already-authenticated serial identity | `TEST` | Remove the redundant login and retain the context |
| `429` on the first intended request | `ENVIRONMENT` or configuration | Verify deployed limiter configuration and prior counter state |
| DOM count is greater than one with no HTTP error | `TEST` | Scope to the semantic row/action and inspect responsive duplicates |
| DOM count is zero for package fallback text | `TEST` first | Inspect Kafil locale/provider accessible text and current DOM contract |
| Correct request returns `500` with a matching server exception | `PRODUCT` or fixture defect from the exception | Add the owning server/helper regression |
| `500` without server logs | Indeterminate `PRODUCT`/`ENVIRONMENT` | Obtain an authorized redacted, request-correlated log slice |
| Managed command loses output or is killed | `RUNNER`/interrupted | Preserve process ownership and do not claim a work-unit result |

A later successful preflight does not rewrite an earlier environment failure.
Earlier unit passes do not pass the failed unit, diagnostics, or plan.

## Handle rate limits and identity collisions

Do not add Playwright retries or repeated login attempts for `429`. First ask
whether the test unnecessarily reauthenticated the same context. Preserve the
authenticated Admin context across serial units when the plan permits it.

For a deliberate demo override, verify the deployed process consumed the
validated `NAJM_AUTH_LOGIN_RATE_LIMIT_ENABLED`,
`NAJM_AUTH_LOGIN_RATE_LIMIT`, and `NAJM_AUTH_LOGIN_RATE_WINDOW` names. Keep safe
code defaults, change deployment environment explicitly, and restart/redeploy.
Do not print values. Never confuse in-memory request counters with persisted
failed-password lockouts.

Generate every Family and Sponsor phone/email from a broad run namespace. If a
generated second identity reaches a unique constraint such as `23505`, prove
whether the fixture reused a value. Fix and regression-test the generator; do
not add random retries. Separately decide whether an uncaught constraint should
map to a safe conflict rather than `500`.

## Diagnose black-box 500 responses

Do not infer a controller, table, constraint, transport, or exception class
from status `500` alone. Correlate an authorized server log by request ID and
failure timeframe. Sanitize identities and parameters before retaining or
reporting it.

Differentiate nearby expected transaction errors from the failing call. An
expected approval replay `409` is not evidence for a later applicant submission
`500` unless request correlation proves they are the same operation.

When no log path is authorized, report the limit honestly and stop. Do not add
SSH application-log access to a mailbox-only runner without a separate security
and runner-design change.

## Select localized collections

Resolve accessible labels from Kafil's active locale and `NajmUIProvider`
configuration. Najm fallback text is not authoritative after Kafil supplies
pagination labels. Inspect the locale and rendered accessibility tree before
using `exact: true`.

Use [Localized NTable collection traversal](patterns.md#localized-ntable-collection-traversal)
for stable row scoping, localized paged controls, infinite continuation, and
the boundary between legitimate responsive duplication and collection rows.

## Report the attempt

Report:

- expected and actual selected-test counts;
- every unit as `PASS`, `FAIL`, `NOT RUN`, or `EXCLUDED BY GREP`;
- diagnostics separately;
- final assertion and sanitized method/path/status evidence;
- native exit code;
- `MANAGED SSH TUNNEL CLOSED`;
- command, work-unit/range, and whole-plan verdicts separately.

Say `no unexpected HTTP errors` when diagnostics pass. Do not say `no >=400`
if the journey intentionally asserted exact negative-path `401`, `403`, `404`,
`409`, or `429` responses. Report only evidence the runner actually captured;
never invent server logs, screenshots, traces, database state, or exception
details.
