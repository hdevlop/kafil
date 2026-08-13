# Kafil Playwright Patterns

Use the existing helper in the current spec when one exists. Adapt these patterns only after checking the installed Playwright and application contracts.

## Contents

- [Exact negative response](#exact-negative-response)
- [Response before action](#response-before-action)
- [React hydration](#react-hydration)
- [Composite phone and OTP controls](#composite-phone-and-otp-controls)
- [Exact mailbox match](#exact-mailbox-match)
- [Logout proof](#logout-proof)
- [Exactly one visible actionable control](#exactly-one-visible-actionable-control)
- [Next.js development navigation readiness](#nextjs-development-navigation-readiness)
- [Lazy image delivery and decode](#lazy-image-delivery-and-decode)
- [Focused connected run](#focused-connected-run)
- [Managed server lifecycle](#managed-server-lifecycle)
- [Safe protected-route prewarming](#safe-protected-route-prewarming)
- [Promotion ladder and rerun budget](#promotion-ladder-and-rerun-budget)
- [Late-failure micro-test](#late-failure-micro-test)
- [Fail-fast service preflight](#fail-fast-service-preflight)
- [Fail fast on competing requests](#fail-fast-on-competing-requests)
- [Development versus production discriminator](#development-versus-production-discriminator)
- [Orphan diagnosis](#orphan-diagnosis)
- [Value-free failure fingerprint](#value-free-failure-fingerprint)
- [Evidence rule](#evidence-rule)
- [Report acceptance audit](#report-acceptance-audit)

## Exact negative response

Register the allowance before the action and consume it in the response listener.

```ts
const expected = { method: "GET", path: "/api/admin/access/users", status: 401, count: 1, consumed: 0 };
diagnostics.expectedResponses.push(expected);

const responsePromise = page.waitForResponse((response) => {
  const url = new URL(response.url());
  return response.request().method() === expected.method
    && url.pathname === expected.path
    && response.status() === expected.status;
});

const result = await action();
await responsePromise;
await expect.poll(() => expected.consumed).toBe(1);
```

The page-level response listener must increment only an outstanding exact match. Otherwise it records the response as unexplained.

Keep the allowance one-shot. Remove it after the assertion, or mark it closed
so later responses cannot reuse it. If Chromium also emits a console error for
the negative response, use a separate one-shot console allowance matched by
the console message's resource pathname and status. Never suppress console
errors with a status-only lookup across historical response allowances.

## Response before action

```ts
const createResponse = page.waitForResponse((response) =>
  new URL(response.url()).pathname === "/api/families"
  && response.request().method() === "POST"
  && response.ok(),
);
await dialog.getByRole("button", { name: "Create", exact: true }).click();
await createResponse;
```

Never click first and register the waiter afterward.

## React hydration

Use only when markup can be visible before the handler is attached:

```ts
await expect(control).toBeVisible();
await expect.poll(
  () => control.evaluate((element) =>
    Object.keys(element).some((key) => key.startsWith("__reactProps$")),
  ),
  { timeout: 120_000 },
).toBe(true);
```

Prefer a user-visible readiness condition when the component provides one.

## Composite phone and OTP controls

Inspect the accessibility snapshot before choosing a locator. A phone field may
render a country-selector combobox plus a textbox whose accessible name is its
placeholder. An OTP may render one named group containing multiple inputs.

For `react-international-phone`, preserve the existing dial-code prefix and
type the local part with keyboard events. Compare the rendered value after
removing formatting, then compare the database/API value to the same expected
E.164 value. Do not log the value into committed evidence.

For Najm Kit OTP input, click the first cell and use `keyboard.type(code)` so
auto-advance runs. Keep the code in memory and delete the mailbox message only
after the confirmation response succeeds.

## Exact mailbox match

Create the polling promise before the UI action that sends mail. Match exact
recipient, run start, and purpose/subject. Once confirmation succeeds, query
again and assert the final matching count is exactly one before deleting it.
Never choose the newest global message or serialize the message body.

## Logout proof

Use the real sign-out UI. Register the exact logout response first, click once,
assert its successful status, wait for the login route, and assert auth cookies
are absent without `clearCookies()`. Register one exact expected denial for a
protected endpoint and prove it occurs once. If session recovery restores a
usable session, stop and reproduce at the Kafil/Najm boundary.

## Exactly one visible actionable control

Najm can render desktop and mobile copies and CSS may settle after server markup
appears. Resolve the exact accessible contract first, then poll until exactly
one candidate is visible:

```ts
async function onlyVisible(locator: Locator): Promise<Locator> {
  await expect.poll(async () => {
    let visible = 0;
    for (let index = 0; index < await locator.count(); index += 1) {
      if (await locator.nth(index).isVisible()) visible += 1;
    }
    return visible;
  }).toBe(1);

  for (let index = 0; index < await locator.count(); index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  throw new Error("Expected exactly one visible control");
}

const createFamily = await onlyVisible(
  page.getByRole("button", { name: "Create family", exact: true }),
);
await createFamily.click({ trial: true, timeout: 5_000 });
await createFamily.click();
```

Use the same locator for the trial and real click. A hidden duplicate is a test
selector problem. A correctly selected visible control whose center is covered
by an application layer is a product layout defect. Do not use `force: true`.

## Next.js development navigation readiness

Development compilation, image loading, and React Query can delay or prevent a
global `load` or `networkidle` state after the useful route is already available.
Use commit plus route-owned readiness:

```ts
const familiesResponse = page.waitForResponse((response) =>
  response.request().method() === "GET"
  && new URL(response.url()).pathname === "/api/families"
  && response.ok(),
);
await page.goto("/family", { waitUntil: "commit" });
await familiesResponse;
await expect(page.getByRole("heading", { name: "Families", exact: true })).toBeVisible();
await expect(page.getByText("Loading families...", { exact: true })).toBeHidden();
```

Choose readiness owned by the route under test. For authentication, assert the
pathname immediately after navigation; if `/login` redirects elsewhere, fail
before waiting for a field that cannot render.

## Lazy image delivery and decode

```ts
const images = page.locator('img[src*="/api/product-images/files/serve/"]');
expect(await images.count()).toBeGreaterThan(0);

for (let index = 0; index < await images.count(); index += 1) {
  const image = images.nth(index);
  await image.scrollIntoViewIfNeeded();
  await expect.poll(
    () => image.evaluate((node) => {
      const value = node as HTMLImageElement;
      return value.complete && value.naturalWidth > 0;
    }),
    { timeout: 30_000 },
  ).toBe(true);
}
```

Also record the corresponding image response statuses. A `200` alone does not prove browser decode.

## Focused connected run

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  .agents/skills/kafil-playwright-testing/scripts/run-connected.ps1 `
  -Grep 'work unit C'
```

The wrapper adds passive diagnostics, checks the environment before server
startup, restores environment variables, and preserves the native exit code.
Use `-DryRun` to verify the effective grep and environment without starting
Next.js. The underlying runner reads `KAFIL_E2E_GREP`; a trailing `--grep` is
not forwarded unless the runner explicitly implements argument forwarding.

## Managed server lifecycle

Map the actual process boundary before estimating or optimizing a run:

```text
wrapper preflight
  -> runner starts Next.js
  -> runner warms its declared readiness routes
  -> Playwright runs every selected work unit on that process
  -> runner kills Next.js in finally
```

With that lifecycle, route compilation is shared by tests selected in the same
Playwright command, but not by a later command. A focused command followed by a
dependent-range command therefore pays for two server startups and can compile
the same routes twice. Persistent files under the configured Next.js dist
directory may help internally, but never report them as a warm in-memory server
cache.

Use this decision order:

1. Combine passive diagnostics with the focused grep.
2. Avoid an unchanged repeat at the same promotion level.
3. Use runner-owned persistent-session support only when it validates the PID,
   command line, environment/configuration identity, dist directory, source
   revision or content fingerprint, and port before reuse and guarantees final
   cleanup.
4. Otherwise use a fresh development process for the focused proof.
5. After a proven development compilation blocker, build once and use the
   controlled production discriminator while the build inputs remain
   unchanged.

Do not work around the runner by starting `next dev` directly or by setting a
reuse flag that the current runner does not implement. Treat implementation of
managed session reuse as runner code that needs its own source tests, cleanup
proof, and orphan-process handling.

## Safe protected-route prewarming

Prewarming moves compilation before the measured interaction; it does not
eliminate the compilation cost. Use it when several later tests need the same
expensive routes on one live managed server.

Requirements:

- Select only routes used by the active grep, not every application page.
- Authenticate a disposable context with the role required by each protected
  route. An anonymous redirect is not a successful protected-route warmup.
- Permit only route navigation and expected GET requests. Exclude routes whose
  mount sends mail, consumes a token, creates data, or changes lifecycle state.
- Wait for `commit`, the exact read response, and the route's loading state to
  clear. Use a timeout justified by recorded cold-compile timings.
- Close and discard the prewarm context before acceptance contexts are created.
- Attach value-free diagnostics and fail the prewarm phase on unexpected
  page/console/request/response errors.
- Record the warmed route names and elapsed timings without cookies, identities,
  headers, bodies, or database values.

Do not count prewarm requests or visible state toward the acceptance checklist.
Run the real journey afterward with fresh isolated contexts and its original
network, UI, persistence, and diagnostic assertions. If prewarming is the only
way a control ever becomes usable, diagnose the product readiness defect rather
than accepting the test.

## Promotion ladder and rerun budget

Promote in order: source/helper proof, focused failing work unit with passive
diagnostics, smallest dependent range, complete spec, final gates. When the
diagnostics test only reads state from the same run and adds negligible cost,
the combined grep is one focused level; do not execute the work unit alone
first. Keep a separate diagnostics level only when it mutates state, has its own
setup, or can affect the work unit.

After a dependent-range or complete-spec failure, return to the failing work
unit. Do not rerun the larger level until the focused unit passes against the
current code. Run an unchanged hypothesis at most twice. A third attempt needs
a changed diagnostic probe, implementation, or diagnosis.

Reuse a recorded static-check pass when no affected source or generated type
changed. Do not spend lint and typecheck time again before a test-only rerun
with an unchanged worktree.

## Late-failure micro-test

When an expensive work unit fails near its end, isolate the failing surface
before replaying the whole journey. A diagnostic micro-test may use an
authorized seed, public setup API, or real UI to reach that surface, but must
keep the real database, browser, auth, and network behavior. It must not use
`page.route()`, direct SQL mutations, `clearCookies()`, or a direct logout API.

The micro-test is a correction proof only. It cannot check the acceptance-plan
item. After it passes, run the full focused work unit with passive diagnostics
once.

## Fail-fast service preflight

Prefer the bundled wrapper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  .agents/skills/kafil-playwright-testing/scripts/run-connected.ps1 `
  -PreflightOnly
```

Pass `-MailpitExecutable <path>` to start a configured local Mailpit instance
when both capture ports are down. The wrapper leaves a process it started alive
for reuse and prints only its PID, never mailbox or environment values.

Check services before the runner starts. This example verifies reachability
without displaying environment values:

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
  } catch {
    throw "$($service.Name) preflight failed"
  } finally {
    $client.Dispose()
  }
}

if (Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue) {
  throw "Connected acceptance port 3210 is already in use"
}
```

Use the repository's existing database readiness command or a short connection
attempt for PostgreSQL. Do not print the database URL. Add service checks only
for dependencies used by the focused journey.

## Fail fast on competing requests

When an action should issue one request but a known defect can navigate or
submit natively instead, observe both outcomes before acting:

```ts
const loginAttempt = page.waitForRequest((request) => {
  const url = new URL(request.url());
  return (request.method() === "POST" && url.pathname === "/api/auth/login")
    || (request.method() === "GET" && url.pathname === "/login");
});

await submit.click();

const observed = await loginAttempt;
const observedUrl = new URL(observed.url());
const outcome = observed.method() === "POST"
  && observedUrl.pathname === "/api/auth/login"
  ? "expected"
  : "wrong-native-submit";

expect(outcome, "login form submitted natively instead of using Najm Auth")
  .toBe("expected");
```

Tailor the request predicates to the exact contract. Keep normal Playwright
timeouts as a backstop when neither outcome occurs. If extra instrumentation is
needed, retain only booleans and non-sensitive routing facts: whether `submit`
fired, whether it was `defaultPrevented`, whether the current React form props
contained an `onSubmit` function, the request method/path, status, and current
pathname. Never serialize input values, form data, headers, bodies, cookies,
tokens, or generated identities.

## Development versus production discriminator

Use this only after one development-runner failure is proven to be cold
compilation or a missing lifecycle event after a successful route response.
Build the exact dist directory expected by the connected runner once:

```powershell
$env:KAFIL_NEXT_DIST_DIR='.next-connected-acceptance-webpack'
bun run --cwd apps/web build
Remove-Item Env:KAFIL_NEXT_DIST_DIR -ErrorAction SilentlyContinue
powershell -NoProfile -ExecutionPolicy Bypass -File `
  .agents/skills/kafil-playwright-testing/scripts/run-connected.ps1 `
  -Grep 'work unit C' -UseProduction
```

Do not switch to production merely because an assertion failed. A production
discriminator classifies runner ownership; it does not replace the final
production acceptance gate.

## Orphan diagnosis

First inspect, without stopping anything:

```powershell
$listeners = Get-NetTCPConnection -LocalPort 3210 -State Listen -ErrorAction SilentlyContinue
$listeners | Select-Object LocalAddress, LocalPort, OwningProcess
Get-CimInstance Win32_Process | Where-Object {
  $listeners.OwningProcess -contains $_.ProcessId
} | Select-Object ProcessId, ParentProcessId, Name, CommandLine
```

Trace parents and descendants. Stop only the verified acceptance runner tree. Confirm the port is free afterward.

## Value-free failure fingerprint

Record one compact fingerprint after a failure:

```text
unit=C stage=family-dashboard-ready class=missing-request
path=/dashboard selector=Sign out request=POST /api/auth/logout status=none elapsedMs=10000
```

Keep only stage, pathname, selector or accessible name, method/path, status,
failure class, and elapsed time. Never include field values, bodies, headers,
cookies, tokens, generated identities, or mailbox content. Stop before a third
run when the fingerprint repeated twice without an owning-code or diagnostic
change.

## Evidence rule

Accept only a terminal Playwright summary such as:

```text
1 passed (8.6m)
```

Do not convert partial progress, a killed process, or missing output into a checked plan item.

## Report acceptance audit

Before marking a work unit passed:

1. Record the terminal summary and native exit code.
2. Build a traceability table with one row per checked plan item:

   | Plan item | Exact assertion | Artifact |
   | --- | --- | --- |
   | Approval replay | Second POST returns the required conflict and row counts stay one | spec line + run log |

3. Reject weak substitutions: UI absence for backend replay, a joined query for
   independent counts, URL persistence for a denied response, or route arrival
   for visible navigation/state.
4. Confirm report wording describes real schema fields and the exact assertion
   used; distinguish regex matching from exact equality.
5. Scan the intended diff and evidence directory for passwords, OTPs, tokens,
   cookies, generated emails/phones, CINs, addresses, mailbox content, raw
   database URLs, hashes, and unmasked run identifiers. Redact values in a copy
   of raw output; do not edit the test result into a false summary.
6. Confirm every cited artifact still exists after the final passing run. Do
   not cite an intermediate `error-context.md` as last-pass evidence.
7. Report separately:

   - `Command: PASS | FAIL | INTERRUPTED`
   - `Work unit: PASS | PARTIAL | FAIL | BLOCKED`
   - `Plan: COMPLETE | IN PROGRESS | BLOCKED`

For a connected focused run whose diagnostics are a separate test, include
both in the grep expression, for example:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  .agents/skills/kafil-playwright-testing/scripts/run-connected.ps1 `
  -Grep 'work unit D'
```

Treat PowerShell's formatted `NativeCommandError` text as output noise only
when `$LASTEXITCODE` is zero and the terminal Playwright summary is present.
