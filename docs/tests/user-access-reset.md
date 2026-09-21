# User access reset — connected acceptance

Status: **not run**. This is the browser acceptance contract for Kafil's implemented Admin Users-table reset action. Source, package, and Git evidence are recorded in the [implementation evidence](../evidence/user-access-reset/README.md); the archived [implementation plan](../plans/user-access-reset-implementation.md) retains the command and rollback contract. A passed source test or GitHub workflow is not a connected browser result.

## Safe setup and proof boundary

Use isolated seeded accounts, a non-live local PostgreSQL database, and a local Mailpit mailbox. Before starting Next.js or Playwright, run a read-only fail-fast preflight for database reachability, Mailpit HTTP and SMTP, loopback mail settings after the root `.env` loads, an authorized disposable target, and the runner-owned `127.0.0.1:3210` port. Do not use production accounts or send real email. Inspect the current `apps/web/test/e2e/` spec, managed runner, `playwright.config.ts`, package scripts, and `.agents/skills/kafil-playwright-testing/SKILL.md` before adding or invoking tests. The runner must own its server and cleanup; do not attach to an unrelated process or append unsupported grep arguments.

Use real browser requests, Kafil API, PostgreSQL, and Mailpit. Network mocks or direct SQL shortcuts cannot accept this journey. Generate credentials and links at runtime, keep them in memory, and sanitize all output. Record the exact selected-test count, native exit code, assertions, and artifact paths for every attempt. Browser proof does not replace the open reset-specific real-PostgreSQL transaction test.

## Work units

### A. Active family credential setup

- From the Admin Users table, open the one **Reset access** action. Confirm the dialog explains CIN-based setup without showing the CIN. Submit a reason and the displayed `expectedMode`.
- Assert the server-selected `family_credential_setup` response and value-free audit. Verify the old password and pre-reset sessions are denied.
- Sign in using the account email and normalized guardian CIN. Assert `credential_setup` with **no normal authenticated session**. Complete `/change-password`, then sign in with the new password. Assert CIN login and setup replay fail.
- Verify the durable setup requirement and audit metadata through an authorized test-side read without exposing CIN, password, tokens, or private family fields in evidence.

### B. Active staff and sponsor email reset

- Run separate operator/delivery-staff and sponsor cases. Confirm the dialog explains email reset, then assert exactly one message reaches the selected account's local mailbox and the response reports actual delivery rather than console simulation.
- Assert the link is bound to that user, single-use, and cannot reset a different account. A reset request alone leaves the old session valid; saving the new password revokes previous sessions. The new password signs in and the account and profile statuses remain intact.
- Exercise a send failure and confirm `delivery: not_sent` is shown without a success message. Record only the value-free `undeliveredLinkLive` audit flag if token cleanup itself failed; do not put link or mailbox content in evidence.

### C. Pending staff and sponsor invitation

- Confirm the dialog explains **resend invitation** and the command produces one local invitation email for the same pending user ID. Earlier invite links are superseded; the accepted link is single-use.
- Complete password setup and verify activation without a duplicate user or profile. Prove a pending sponsor applicant without a sponsor profile cannot use this command or become an approved sponsor through an invite.

### D. Refusals, stale confirmation, and presentation

- Assert exact responses for a non-admin caller, self and bootstrap-admin targets, inactive account, missing/mismatched profile, missing or invalid family CIN, absent email, and repeated or parallel commands.
- Change the account state after the dialog opens. Submit its old `expectedMode`; assert `409`, **no mail and no success audit**, refreshed account rows, and a new dialog whose consequence matches the new state. A family account carrying an email-reset-shaped claim must be refused, not mailed.
- Verify the single action in desktop table and mobile card modes, keyboard operation, focus restoration, narrow viewport, and Arabic RTL. Assert no sensitive value is rendered.

## Diagnostics and promotion

Attach passive diagnostics when each page is created: page errors, console errors, failed requests, and every `4xx`/`5xx`. Register each intentional negative response by exact method, pathname, and status before the action, consume it once, and return to deny-all. Unexpected errors fail the work unit. Report `no unexpected HTTP errors`, rather than claiming no `4xx`/`5xx` occurred.

Promote from focused source/unit tests to the smallest connected work unit with passive diagnostics in the same invocation, then the dependent range, affected spec, and production-style acceptance. Use the runner's supported environment filter and exact test titles; check selected count before interpreting the result. A repeated same-symptom failure needs an owning-layer fix or new diagnostic, not another broad run. Keep a sanitized evidence record under `docs/evidence/user-access-reset/`.

At final acceptance, run the affected browser spec and the repository gates separately: `bun run test:db`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and `bun run db:generate`. Review any generated migration; expect none without schema changes. The repository DB gate has passed previously, but it has no reset-specific transaction assertion. Mark that item complete only after a focused real-DB test proves rollback and concurrency. Deployment needs the exact healthy running revision; a successful image build or webhook is insufficient.
