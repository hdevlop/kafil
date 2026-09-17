# Connected four-account acceptance tests

This directory replaces the former root
`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md` with smaller, purpose-specific test
documents. The split preserves the complete historical record while making the
active suites easier to find and maintain.

## Current status

- Four-account financial baseline: **accepted**. The authorized 20-test remote
  attempt passed on 2026-09-06 against confirmed revision `adee9c9d`.
- Dedicated auth lifecycle: **accepted** on Najm Auth `3.2.0`.
- Notification extension: **in progress**. Unit 01 is accepted; the latest
  Unit 02 failure has a locally verified navigation/read-race correction that
  still requires publication, exact deployment proof, and a freshly authorized
  focused attempt.
- Database-only guarantees remain **not verified** by these black-box journeys.

## Documents

1. [`01-overview-and-history.md`](01-overview-and-history.md) - goal, evidence
   boundary, checkpoint, and the preserved baseline chronology.
2. [`02-safety-and-runtime.md`](02-safety-and-runtime.md) - fail-closed safety
   contract and runtime configuration.
3. [`03-four-account-journey.md`](03-four-account-journey.md) - the 20-test
   financial/browser journey, diagnostics, execution, and final gates.
4. [`04-auth-lifecycle.md`](04-auth-lifecycle.md) - the dedicated 10-test auth
   matrix and its complete correction/acceptance history.
5. [`05-notification-system.md`](05-notification-system.md) - the dedicated
   9-test notification suite, work-unit contracts, and current open work.

The executable specifications and guarded runners remain under
`apps/web/test/e2e/` and `apps/web/scripts/`.
