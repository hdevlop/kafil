---
name: kafil-playwright-testing
description: Design, run, diagnose, optimize, and report reliable Kafil Playwright tests. Use when creating or reviewing files under apps/web/test/e2e, changing an E2E runner or Playwright configuration, validating an authenticated browser workflow, running local connected or guarded remote VPS acceptance, optimizing managed-server lifecycle or route prewarming, collecting responsive/RTL/keyboard evidence, or investigating slow, flaky, rate-limited, timed-out, selector-ambiguous, or network-failing Kafil browser tests.
---

# Kafil Playwright Testing

Build the smallest real browser proof first, preserve diagnostic integrity, and expand only after it passes. Treat a Playwright pass as browser evidence, not as a substitute for package, database, production, or root gates.

## Load required context

1. Read the repository `AGENTS.md`.
2. Read `.agents/skills/kafil-najm-frontend/SKILL.md` completely.
3. Also read `.agents/skills/kafil-najm-backend/SKILL.md` when the journey touches server, storage, seed, migrations, permissions, money, or database assertions.
4. Read the relevant Next.js 16 guide under `node_modules/next/dist/docs/` before changing application code.
5. Inspect the current spec, runner, `playwright.config.ts`, package scripts, and installed contracts. Do not reconstruct them from memory.
6. For guarded VPS work, read the active remote acceptance plan and inspect the
   exact test titles, remote runner, remote Playwright config, app locale, and
   deployed revision before constructing a command or diagnosing a selector.

Use Bun only. Never start `next dev` directly inside `apps/web`; use the repository runner so `.env` loading, host, port, database, and cleanup behavior stay consistent.

## Select the smallest honest proof

Use this promotion ladder. Do not skip a level whose result could invalidate a
more expensive run:

1. Run a source/unit test for pure helpers, request predicates, selectors
   encoded in source tests, or view-model behavior.
2. Run the failing browser work unit with its passive diagnostics test when the
   diagnostics reads the same run state and adds negligible cost. This single
   command satisfies the focused work-unit and focused-diagnostics levels; do
   not run the work unit alone first and then replay it with diagnostics.
3. Run diagnostics separately only when it mutates state, has independent
   setup, or can change the work-unit outcome.
4. Run the smallest dependent range, such as work units A-E.
5. Run the complete affected spec.
6. Run production-style E2E and repository gates only at the plan's final
   gate.

Promote only after the current level passes with a successful native exit code.
After a dependent-range or full-suite failure, another run at that same level
is forbidden until the failing work unit passes independently. Do not use an
expensive run to test a new selector, wait condition, hydration hypothesis, or
diagnostic probe.

Before starting, state the level being run and use recent evidence to give a
rough cost class: focused, dependent range, complete spec, or final gate. Do
not promise an exact duration; cold compilation and external services vary.

For the connected four-account harness, focus by environment variable because its runner reads `KAFIL_E2E_GREP`; do not append `--grep` to the package script:

```powershell
$env:KAFIL_E2E_GREP='work unit C|diagnostics'
bun run --cwd apps/web test:e2e:connected
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
```

Prefer the deterministic wrapper for this harness:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  .agents/skills/kafil-playwright-testing/scripts/run-connected.ps1 `
  -Grep 'work unit C'
```

It adds passive diagnostics by default, runs the fail-fast environment probe,
preserves the native exit code, and restores temporary environment variables.
Use `-PreflightOnly` before handing a long run to another coder and
`-SkipDiagnostics` only when diagnostics is not passive.

Set any outer command timeout longer than the Playwright test timeout. A 120-second shell timeout can kill the parent while leaving Next.js, Playwright, and Chromium children alive.

## Run guarded remote VPS acceptance as a single shot

Keep local connected and remote VPS selection separate:

- local connected uses `KAFIL_E2E_GREP`;
- guarded remote uses `KAFIL_E2E_REMOTE_GREP`;
- copy exact test titles from the current spec; never guess a grep fragment;
- include the exact passive diagnostics title and verify the Playwright header
  reports the expected selected-test count before interpreting results.

The remote command performs its own preflight. Run remote preflight-only after
configuration or infrastructure changes, not automatically before every
browser attempt. Treat preflight success as transport/readiness evidence only;
it is not browser acceptance.

When the journey reads application-sent mail, validate the emitting
application's SMTP boundary separately before remote preflight. Gateway
readiness does not prove that the application uses the hub. Require the
plan-designated provider, unique hostname, and port, then prove DNS and TCP
reachability from the application container without printing values. Accept a
shared Docker network only when the plan explicitly names that topology and the
hostname uniquely selects the intended non-live mailbox service.

Treat source publication, image publication, deployment-trigger success,
managed deployment-source state, and the running container as distinct
checkpoints. When an orchestrator owns a raw or dashboard-managed Compose
definition, a repository Compose edit does not change that definition. Verify
the deployed source type and a value-free structural invariant such as the
required network reference, then require the exact intended healthy container
revision. A successful webhook response alone is not deployment evidence, and
never patch only an orchestrator's rendered file when its managed source will
overwrite that change.

Honor the active plan's one-attempt contract. After a remote preflight or
browser failure, report sanitized evidence, classify ownership, confirm the
runner's declared mailbox-transport postcondition, and stop. For the current
standalone HTTPS gateway this is `NO MANAGED MAILBOX TRANSPORT`; do not report
or probe for an SSH tunnel that the runner no longer owns. Do not edit or rerun
inside a read-only tester instruction.
Have the coder add a narrow red/green source regression, deploy the owning fix,
wait until the exact new image is healthy, and obtain a fresh user instruction
before the next attempt. A successful GitHub build, image publication, or
Dokploy trigger does not alone prove that the VPS is running that image.

Keep remote Playwright retries at zero. Do not hide `429`, mailbox-gateway,
selector, or product failures with Playwright retries, extra login attempts,
sleeps, or a larger timeout. Reuse an already authenticated serial context when
later units need the same identity. When a deliberate demo rate-limit override
changes, verify only the variable names and validated configuration state,
restart or redeploy as required, then preflight the new runtime without
printing values. Distinguish request-rate counters from database-backed
failed-login lockouts.

Read [references/remote-vps.md](references/remote-vps.md) before constructing,
running, diagnosing, or reporting a guarded remote VPS attempt.

## Account for the managed server lifecycle

Inspect the runner before planning several browser commands. Record whether it
starts and stops Next.js per invocation, reuses a verified managed server, or
uses a production build. Do not assume that a previous command warmed the next
one.

For the current connected runner, one invocation starts one Next.js process,
keeps it for every selected work unit, and kills it in `finally`. Routes compile
once per live process, so A-E share compilation inside one command; a later
focused or dependent command starts a new process and loses the previous
process's in-memory compiler cache. `waitForResponse()` only observes traffic;
it does not compile the page or call the API itself.

Before repeating expensive development commands:

1. Combine the work unit and passive diagnostics in one grep.
2. Reuse a server only when the repository runner explicitly owns, validates,
   and later stops that process. Never attach acceptance to an unrelated dev
   server merely because its port is open.
3. If managed reuse is unsupported, do not claim reuse or prewarming across
   commands. Either accept one fresh cold start, add explicit runner-owned
   session support as a separate implementation task, or use the controlled
   production discriminator after cold compilation is proven.
4. Reuse a production build only while source, dependencies, build-time
   configuration, and the configured dist directory are unchanged.

Prewarm only the protected routes required by the selected work units, using a
separate authenticated context for the correct role. Restrict prewarming to
read-only navigation and expected GET requests; do not create fixtures, send
mail, consume one-time credentials, mutate lifecycle state, or reuse the
prewarm context as acceptance evidence. Anonymous fetches that redirect at
middleware do not prove that a protected page compiled. Report prewarming as a
runner optimization, never as a passed assertion.

Read [references/patterns.md](references/patterns.md) before adding server reuse
or route prewarming. Do not prewarm merely to cover a real product loading or
hydration defect.

## Prepare the environment

Run a read-only fail-fast preflight before starting Next.js or Playwright:

1. Confirm the configured PostgreSQL target accepts a connection.
2. Confirm Mailpit's HTTP and SMTP endpoints accept loopback connections when
   the journey sends or reads mail.
3. Confirm the intended ignored environment overlays are loaded after `.env`.
4. Confirm the database mode and target are explicitly authorized.
5. Confirm live email delivery is disabled and SMTP/mailbox hosts are loopback.
6. Confirm the runner's fixed port is free. For connected acceptance this is
   `127.0.0.1:3210`.
7. Run migrations and seed verification only when the plan requires them.

Check presence and reachability without printing environment values,
credentials, connection strings, or mailbox contents. Abort at preflight when
a prerequisite is false; do not pay the server startup and browser cost for a
known environment failure.

Before an expensive dependent-range, complete-spec, or final-gate run, also:

1. Confirm the focused prerequisite level has a recorded pass against the
   current code.
2. Confirm the diagnostic hypothesis or owning-layer fix changed since any
   previous same-symptom failure.

Fail closed when a prerequisite is false. Never work around it with network mocks, a different database, direct SQL mutations, or an unrelated already-running server.

Reuse a recorded lint or typecheck pass while the affected source and generated
types are unchanged. Do not rerun static checks before a browser retry that made
no edits. After an edit, run the narrow source contract first, then the affected
package typecheck; run lint after the correction stabilizes instead of before
every diagnostic attempt.

## Author deterministic browser tests

- Register `waitForResponse`, dialog, download, or navigation promises before triggering the action.
- When one action can produce either the expected request or a known wrong
  request/navigation, race explicit observers and fail on the wrong branch
  immediately. Do not wait for the expected-response timeout after the browser
  has already proved the wrong behavior.
- Wait on user-visible state or a specific response. Avoid arbitrary sleeps.
- In the Next.js development runner, navigate with `waitUntil: "commit"`, then
  wait for route-specific readiness: the exact response, the intended heading
  or control, and the disappearance of any loading placeholder. Do not use the
  global `load` event as page readiness when images or development compilation
  can delay it. Do not use `networkidle` for React Query pages.
- Use role, label, test ID, and exact route selectors. When Najm renders desktop
  and mobile copies, resolve all exact role/name matches, poll until exactly one
  is visible, and click that same locator. Before an expensive mutation, use a
  short trial click to detect an overlay or pointer interception without
  changing state. Never repair actionability with arbitrary `.first()` or
  `force: true`.
- Resolve accessible names from Kafil's active locale and provider configuration,
  not from Najm's untranslated fallback text. Scope collection assertions to a
  stable row/card boundary before applying `onlyVisible`; multiple visible rows
  are normal and must not be collapsed into one global match.
- Inspect `NTable` card pagination at the tested viewport. Paged mode exposes a
  localized pagination landmark and controls; infinite mode exposes its
  continuation sentinel/status instead. Traverse the verified mode and prove
  page/content advancement before asserting a target row.
- Wait for React hydration before clicking controls whose server-rendered markup can appear before handlers attach.
- For lazy images, scroll each image into view and assert both `complete` and `naturalWidth > 0`.
- Use isolated `BrowserContext` instances for different identities. Do not share cookies or storage state between roles.
- Generate passwords, OTPs, reset links, idempotency keys, and run labels at runtime. Keep secrets in memory and redact sensitive query values from logs.
- Use real PostgreSQL, Mailpit, APIs, and browser requests. Do not use `page.route()` or mock the workflow under acceptance.
- Keep money in integer minor units. Format UI text from quotient and remainder, never floating point.
- Assert persisted effects after mutations: row count/status, lifecycle events, ledger entries, budget totals, inventory, and visible UI as applicable.
- Match assertion strength to the contract. A hidden action does not prove a
  replay was rejected, a joined query does not independently prove uniqueness
  in two tables, remaining on the same URL does not prove a denied request, and
  reaching a dashboard does not prove its navigation or empty state.
- Inspect composite controls in the accessibility tree before selecting them.
  Phone, OTP, date, and combobox inputs may be groups; use real keystrokes when
  behavior depends on per-key events, then assert the rendered normalized value
  and the persisted value separately.

Read [references/patterns.md](references/patterns.md) before adding or changing diagnostic, image, selector, authentication, or process-recovery helpers.

## Preserve diagnostic integrity

Attach diagnostics to every page as soon as it is created. Capture:

- uncaught page errors;
- console errors;
- failed requests;
- every `4xx` and `5xx` response.

Default to deny-all. For an intentional negative action:

1. Register the exact method, pathname, and status before the action.
2. Perform the action once.
3. Assert that exact response occurs once.
4. Consume only that registered response.
5. Restore deny-all behavior immediately.

Never allow broad `status >= 400`, a path prefix, or every response matching an expected status. A known expected response must not hide a second unexpected response.

Keep response, console, and failed-request allowances separately counted.
Never suppress a console error because its status alone matches an earlier
expected response. Match the exact resource pathname and status, consume the
allowance once, and remove it. Ignore `ERR_ABORTED` only when the request is a
confirmed navigation or static-chunk cancellation caused by closing or
replacing the page.

Treat browser warnings separately from errors. Record actionable warnings such as above-the-fold image loading, but do not fail an acceptance run unless the plan or product contract requires it.

## Diagnose without repeating expensive runs blindly

When a run fails:

1. Read the final assertion and `test-results/.../error-context.md` first.
2. Inspect the relevant server request lines around the failure, not the entire log.
3. Classify the failure as product defect, test defect, runner defect, environment failure, or timeout/orphan process.
4. Reproduce with the smallest source test or focused browser unit.
5. Fix the narrowest owning layer and add a regression assertion.
6. Typecheck the affected package before another long run.
7. Rerun the same focused unit once. Expand only after it passes.

If a failure occurs late in a long work unit, first add or reuse a diagnostic
micro-test that begins as close as possible to the failing surface through an
authorized seed, public setup API, or real UI. Keep real browser requests and
services; do not mock or mutate the database directly. The micro-test may prove
the correction but cannot accept the work unit. After it passes, rerun the full
focused work unit with passive diagnostics once.

Use a one-rerun budget for an unchanged hypothesis. If the focused run produces
the same symptom twice, do not run it a third time without first changing the
instrumentation, implementation, or diagnosis. Record the repeated signature
using only non-sensitive facts such as event type, `defaultPrevented`, React
handler presence, request method/path, response status, and current pathname.
Never record field values, submitted bodies, credentials, tokens, cookies, or
generated identity values.

Record a value-free failure fingerprint containing only the work-unit stage,
pathname, selector or accessible name, request method/path, response status,
failure class, and elapsed time. If the fingerprint repeats twice and neither
the owning implementation nor the diagnostic probe changed, stop before
starting another browser run.

For timeouts, add the narrowest observer that can distinguish the competing
outcomes before rerunning. Prefer an immediate assertion on the observed wrong
request, navigation, console error, or page error over increasing a timeout.
Increasing a timeout requires evidence that the expected operation is merely
slow rather than absent.

After one navigation failure that is proven to be development compilation or a
missing lifecycle event after a successful response, use one controlled
production-runner or state-neutral route-prewarm discriminator. Build the
runner's configured production dist directory once and reuse it. Treat that run
as ownership evidence, not as a substitute for the plan's production gate.

Examples:

- A `500` plus invalid SQL is a product defect; fix the repository and add a server regression test.
- A black-box `500` without server logs is indeterminate between product and
  environment; request an authorized redacted log slice instead of inventing
  an exception class. Treat nearby expected `409` logs as unrelated unless the
  request ID and failing operation match.
- A `23505` unique-phone failure for a generated second identity is a fixture
  namespace defect when the product correctly enforces uniqueness; broaden the
  deterministic generator and add a collision regression instead of retrying.
- A login `429` caused by re-authenticating the same serial Admin is a test
  lifecycle defect; retain the authenticated context instead of weakening the
  production limiter or adding attempts.
- Two matching desktop/mobile links are a selector defect; target the visible copy.
- Zero matches for raw package fallback text can be a localization-aware
  selector defect; inspect the rendered accessible name and Kafil locale before
  classifying the product.
- An image `200` with `naturalWidth === 0` may be a lazy-loading test defect; scroll and poll decode state.
- `EADDRINUSE` after a wrapper timeout is usually an orphaned runner tree; verify ownership before stopping it.
- A standalone mailbox gateway that fails exact TLS, unauthenticated-denial,
  authenticated identity, or application-scope readiness is an environment
  failure for that attempt. A later preflight pass can support a separately
  authorized new attempt but does not rewrite the earlier verdict.

Assign ownership from the corrected request and documented contract:

- wrong selector, wait, fixture interaction, or assertion: test defect;
- correct browser request with incorrect Kafil response or persisted data:
  Kafil defect;
- verified Kafil integration using the installed package contract with broken
  shared behavior: suspected Najm defect, to reproduce at the package boundary;
- unavailable database, mailbox, port, or authorized configuration:
  environment blocker.

Do not use `clearCookies()`, direct SQL mutation, mocks, or broad diagnostic
filters to make the owning layer disappear. For logout, use the real UI, await
the exact response, assert auth cookies are absent, then prove a protected
request is denied.

Do not mark a test as passed because earlier steps completed. A killed, interrupted, timed-out, or output-lost run has no final pass evidence.

## Recover from orphaned runs safely

Resolve the listener on port `3210`, inspect its PID and full command line, and trace the parent process. Stop only the verified connected-acceptance process tree. Never kill all Bun, Node, or Chrome processes, because unrelated development sessions may be running.

After cleanup, confirm the port is free before restarting. Use a wrapper timeout long enough for cold Next.js route compilation and Playwright's configured timeout.

## Close and report

After a focused pass:

- quote the exact Playwright summary and duration;
- report the selected-test count and confirm diagnostics actually matched the
  grep; distinguish `NOT RUN` from exclusion by the selection pattern;
- record the real process exit code and distinguish a PowerShell
  `NativeCommandError` wrapper from a nonzero native exit;
- update only checklist items explicitly asserted by that run and map each
  checked item to its exact UI, response, database, or diagnostic assertion;
- list remaining unchecked work;
- preserve the masked run label and never report passwords, OTPs, tokens,
  cookies, mailbox bodies, generated emails or phones, CINs, addresses, raw
  database values, or other run identity fields;
- remove temporary value-bearing `console.log` calls and scan every intended
  evidence artifact for sensitive/runtime identifiers before accepting it;
- cite `error-context.md`, screenshots, logs, or other artifacts only when they
  exist after the final run; use the plan's masked per-run evidence directory;
- describe only fields actually asserted by the test and present in the schema.
- say `no unexpected HTTP errors`; do not claim there were no `4xx`/`5xx`
  responses when exact negative-path assertions intentionally exercised them.

Report three verdicts separately:

1. **Command result** — terminal summary and exit code.
2. **Work-unit result** — every checked requirement has a traceable assertion.
3. **Plan result** — remaining work units, production run, gates, cleanup, and
   commit requirements are complete.

Before changing a work unit from partial to pass, read
[references/patterns.md](references/patterns.md) and perform its report
acceptance audit. A passing command is not enough when the checklist,
diagnostics, or evidence audit fails.

For final acceptance, run the sequence named by the active plan, including the full connected spec, package checks, database integration, production-style connected run, root gate, and schema-drift check. Do not call the plan complete until every required gate and cleanup item has evidence.
