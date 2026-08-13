# Connected Four-Account Acceptance — Work Unit E report

Report date: 2026-08-13

Scope: Work unit E — connect both sponsors and prove privacy

All generated identities, credentials, tokens, cookies, contact details, CINs,
addresses, and database values are intentionally omitted.

## Verdict

| Level | Verdict | Reason |
| --- | --- | --- |
| Latest A-C diagnostic | **FAIL** | `await adminPage.goto("/family")` received `GET /family 200 in 86 s`, but the default global `load` wait did not complete within the navigation budget. This proved a test-owned wait-state mismatch; it did not prove a Kafil, Najm, or Next.js product defect. |
| Latest focused Unit C | **FAIL** | After `GET /family 200 in 38.5 s` and the Families page rendered with four rows, `adminPage.locator("button:visible").filter({ hasText: /Create family|Créer une famille|إنشاء أسرة/i }).first()` (apps/web/test/e2e/connected-four-account.e2e.ts:928–931) never resolved: `expect.toBeVisible` timed out at 120_000 ms with "element(s) not found" even though the page snapshot shows `button "Create family" [ref=e176] [cursor=pointer]` with the matching accessibility name. Test-only interaction defect; no edits were applied in this run. |
| Latest focused Unit C | **PASS** | `1 passed (8.1m)`, native exit 0. The Families create action was pointer-clickable, the replacement-password recovery sequence completed, and both family UI logouts returned 200. |
| Latest Unit C plus diagnostics | **PASS** | `2 passed (8.0m)`, native exit 0. Unit C passed again and the final deny-all diagnostics test reported no unexplained page, console, request, or response failures. |
| Work unit E | **BLOCKED** | The corrected Unit E journey has not completed in a live run. |
| Connected acceptance plan | **IN PROGRESS** | Unit C passed focused and focused-plus-diagnostics runs in earlier checkpoints; Unit E is unproved, Units F-H are incomplete, and final gates have not run. |

No checkbox in plan section 11 is accepted by this report.

## Command under test

```powershell
$env:KAFIL_E2E_GREP='work unit C|diagnostics'
bun run --cwd apps/web test:e2e:connected
Remove-Item Env:KAFIL_E2E_GREP -ErrorAction SilentlyContinue
```

## Run history

| Attempt | Result | Classification |
| --- | --- | --- |
| First A–E run | `4 passed, 1 failed, 1 did not run (22.6m)` | Unit E test-state defect: the admin context was still authenticated when Unit E attempted a fresh login. |
| Second A–E run | `4 passed, 1 failed, 1 did not run (24.8m)` | Unit E selector defect: the test expected `New assignment`, while the rendered action is `Create assignment`. |
| Pre-release A–E run | `1 passed, 1 failed, 4 did not run (3.9m)` | Product/package blocker in prerequisite Unit B: an in-flight refresh completed after logout and restored the refresh cookie. Unit E was not reached. |
| Published `3.1.2` A–E run | `2 passed, 1 failed, 3 did not run (11.5m)` | The logout race was fixed, but anonymous hydration incorrectly blocked the Najm credential-setup status request. |
| Published `3.1.3` A–E runs | `2 passed, 1 failed, 3 did not run (11.1m)` | Credential setup GET/change both passed; Unit C then emitted a native `GET /login?` instead of the expected replay `POST /api/auth/login`, so Unit E was not reached. |
| Corrected focused Unit C | `1 passed (9.3m)` (native exit 0) | Replay `POST /api/auth/login` `401` occurred once with no native `GET /login`. |
| Corrected Unit C plus diagnostics | `2 passed (8.8m)` (native exit 0) | No unexplained diagnostics. |
| Latest A-E attempt (post-correction) | `1 failed, 3 did not run (24.2m)` | Failed before assignment creation because the sponsor source was still loading when the dropdown interaction began. |
| Latest A-C diagnostic attempt | `2 passed, 1 failed, 1 did not run (8.6m)` | `await adminPage.goto("/family")` reached `GET /family 200 in 86 s (next.js: 77 s, proxy.ts: 7.0 s, application-code: 2.6 s)` but the `load` lifecycle event did not arrive before the 120_000 ms navigation budget; no subresource fetches were logged between the response and the timeout. The final-re-login/signOut locator-attached click + separate request/response discriminator was therefore not exercised. Unit B's two strengthened signOuts completed with `POST /api/auth/logout 200 in 760 ms` and `1006 ms`. The admin's strengthened signOut after family creation (before `/products`) was not reached in this run because `/family` itself timed out. |
| Earlier focused Unit C selector attempt | `1 failed (3.9m)` (native exit 1) | After `GET /family 200 in 38.5 s (next.js: 26.1 s, proxy.ts: 6.3 s, application-code: 6.1 s)` and the Families page rendered with four rows, the then-current Create-family selector never resolved even though the accessibility snapshot contained the action. |
| Consolidated focused Unit C retest | `1 failed (10.2m)` (native exit 1) | The responsive controls and product journey completed. At the fresh-session proof, the spec called `login()` without an explicit preceding `signOut()` in the source. `/login` redirected to `/dashboard`, and the login-field assertion timed out. The reported logout traffic is not accepted as proof of the intended source boundary; the corrected candidate now performs and verifies that boundary explicitly. |
| Header stacking plus explicit recovery-session sequence | `1 failed (7.8m)` (native exit 1) | The Create-family pointer interaction and full first family session passed. Final logout was attempted while the recovered family dashboard still rendered its loading state, so the click produced no logout request. |
| Dashboard-readiness focused Unit C | `1 passed (8.1m)` (native exit 0) | The recovered family dashboard rendered its real welcome heading before the final UI logout. Both family logout POSTs returned 200. |
| Dashboard-readiness Unit C plus diagnostics | `2 passed (8.0m)` (native exit 0) | Unit C passed again; the diagnostics test completed in 3 ms with no unexplained failures. |

The known interaction defects have candidate corrections in
`apps/web/test/e2e/connected-four-account.e2e.ts`. The assignment workflow now
uses the rendered `Create assignment` / `Create support assignment` names and
searches the server-backed sponsor and family comboboxes by their runtime
labels after their source data is ready. The A-E harness uses the same
Playwright visibility resolver for Create-family, both Create-assignment
actions, role navigation links, and logout controls. It waits for exactly one
visible match, so hidden responsive copies, first-DOM order, and the brief
pre-CSS state after committed navigation are not part of the interaction
contract. The single `signOut` helper verifies a
callable React `onClick`, fails after 10 seconds when the exact logout POST
does not start, independently allows 30 seconds for its response, checks the
real `/login` transition, and proves both auth cookies are absent. The former
one-off final-logout discriminator was removed because its listener was bound
to one DOM instance while the later locator click could resolve a remounted
instance. Product-image response listeners are now detached in `finally`.
No `clearCookies`, direct logout POST, fallback logout, mocks, retries, forced
clicks, sleeps, or longer timeouts were added.

## Najm Auth race correction

The original blocker was reproduced at the shared Najm Auth boundary: logout
returned 200 while refresh/session traffic could complete afterward and
restore or recover authentication.

The shared Najm Auth source now fixes both sides of the race:

1. Server refresh rotation uses a compare-and-swap update, never an upsert, so
   a deleted or concurrently rotated family cannot be recreated.
2. Client logout invalidates and drains an in-flight refresh before the final
   logout request and ignores stale-generation refresh results.
3. Refresh and authenticated transport stay blocked after logout until a real
   login, OAuth completion, authenticated hydration, or authenticated tab sync
   explicitly reopens them.
4. Authenticated requests already in flight are aborted when logout begins.

Focused connected proof against the locally built candidate:

```text
ok 1 ... work unit B — Sponsor B managed-demo reuse across two seeds (5.0m)
ok 2 ... diagnostics — final context assertions contain no unexplained errors (4ms)
2 passed (5.1m)
```

Native exit code: 0. Both real logout cycles cleared the cookies and produced
no post-logout refresh, protected request, console-error, failed-request, or
unexplained-response diagnostics.

The release was published from exact committed tarballs. Kafil now pins and
installs `najm-auth@3.1.3` in the root override and the web, server, and seed
workspaces. The lockfile records the registry integrity for `3.1.3`; no local
candidate junction remains.

## Unit E assertions implemented but not yet accepted

The current test contains assertions for all section 11 requirements:

- two real UI-created active assignments, one per sponsor;
- one exact duplicate assignment request and `409` conflict;
- exactly two assignment rows, mapped independently to the sponsor profiles;
- independent sponsor sessions and exactly one supported-family result each;
- an exact sponsor-safe catalog and family-summary projection;
- absence of family private data, the other sponsor identity, and the other
  sponsor's contribution history;
- exact cross-sponsor assignment, contribution, and plan reads returning the
  privacy contract's `404` responses;
- exactly two assignment audit records;
- boolean-only scans proving the runtime sensitive values are absent from Unit
  E audit metadata and outbox payloads.

These assertions remain **unproved** until one uninterrupted live run reaches
`C4A STEP E PASS` and the final diagnostics test also passes.

## Checkpoint 1 validation

- Web typecheck: passed before and after the latest harness corrections.
- Web lint: passed before and after the latest harness corrections.
- Focused Unit C: `1 passed (9.3m)`, native exit code `0`.
- Focused Unit C plus diagnostics: `2 passed (8.8m)`, native exit code `0`.
- Latest A-C diagnostic attempt: `2 passed (Unit A, Unit B), 1 failed (Unit C at `await adminPage.goto("/family")`), 1 did not run (diagnostics)`; Unit B's two strengthened signOuts succeeded with `POST /api/auth/logout 200 in 760 ms` and `1006 ms`. `GET /family 200 in 86 s` was the only `load`-bearing subresource reached before the 120_000 ms navigation timeout; no subsequent subresource fetches were logged. The final-re-login/signOut locator-attached click + separate request/response discriminator was not exercised.
- Latest focused Unit C: `1 failed (3.9m)` (native exit 1). `GET /family 200 in 38.5 s` returned; the Families page rendered with four rows. `adminPage.locator("button:visible").filter({ hasText: /Create family|Créer une famille|إنشاء أسرة/i }).first()` (apps/web/test/e2e/connected-four-account.e2e.ts:928–931) never resolved: `expect.toBeVisible` timed out at 120_000 ms with "element(s) not found" even though the page snapshot shows `button "Create family" [ref=e176] [cursor=pointer]` with the matching accessibility name. No edits were applied in this run.
- Consolidated responsive-control retest: `1 failed (10.2m)`, native exit 1. All earlier Unit C surfaces completed; the source then attempted the fresh-password login without first executing its required UI logout.
- Header stacking plus explicit recovery-session sequence: `1 failed (7.8m)`, native exit 1. The final sign-out ran before the recovered family dashboard left its visible loading state.
- Focused Unit C against the dashboard-readiness correction: `1 passed (8.1m)`, native exit 0.
- Unit C plus diagnostics against the dashboard-readiness correction: `2 passed (8.0m)`, native exit 0.
- A-E plus diagnostics against the current corrected candidate: **NOT RUN**.

## Earlier supporting validation

- Focused Unit D plus diagnostics: `2 passed (5.5m)`, native exit code 0.
- Najm Auth focused race/setup tests: `27 pass, 0 fail`.
- Full Najm Auth suite: `308 pass, 6 skip, 0 fail`; React-server suite:
  `13 pass, 6 skip, 0 fail`.
- Najm Auth build: passed.
- Najm public API snapshot: current.
- Kafil focused Unit B plus diagnostics with published `najm-auth@3.1.2`:
  `2 passed (5.1m)`, native exit code 0.
- Kafil `najm-auth@3.1.3` root typecheck passed; web typecheck and lint passed
  after the credential-setup replay harness correction.
- Focused support-assignment and contribution server tests: `26 pass, 0 fail`.
- `bun run --cwd apps/web typecheck`: passed.
- `bun run --cwd apps/web lint`: passed.

These results support the harness changes but do not substitute for a live Unit
E pass.

## Evidence hygiene

- No Playwright `test-results` files remain from the latest diagnostic run.
- Port `127.0.0.1:3210` is free.
- This report contains no generated identity or authentication values.
- No intermediate failure artifact is cited as passing evidence.

## Completion condition

Checkpoint 1's Unit C blocker is recovered: focused Unit C and Unit C plus
diagnostics both pass against the same dashboard-readiness correction. The
journey executes verified UI logout after product proof, signs in with the
replacement password, waits for the recovered family dashboard to render its
real welcome state, then performs the final verified UI logout. A later A-E
plus diagnostics run remains required before Work Unit E can receive a live
verdict. Do not prewarm routes or use production mode,
`networkidle`, `page.dispatchEvent`, fallback logout, direct POST,
`clearCookies`, mocks, retries, or longer timeouts. Work unit E may be marked
`PASS` only if a later A-E run has a successful terminal summary and native
exit code, every section 11 assertion is traceable to the run, diagnostics
contain no unexplained errors, and the retained evidence passes the
sensitive-value scan.
