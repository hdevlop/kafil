# Kafil Plan Index

Kafil uses task-specific root plans. There is no single root `PLAN.md`.

## Root plans

- [`DELIVERY-STAFF-DASHBOARD-PLAN.md`](../../DELIVERY-STAFF-DASHBOARD-PLAN.md)
  - planned real-data, assignment-scoped Delivery dashboard with scheduling,
    issue tracking, family-address mapping, staff-owned commands, responsive
    browser acceptance, and the existing Operator dashboard preserved.
- [`LANDING-PAGE-PLAN.md`](../../LANDING-PAGE-PLAN.md)
  - planned static public landing-page adaptation with truthful illustrative
    content, a five-second locale-specific `/hero` carousel, an existing
    `/mascots`-powered CTA, four-locale responsive/RTL acceptance, and live-data
    or newsletter behavior explicitly deferred.
- [`FAMILY-ORDER-LIMITS-PLAN.md`](../../FAMILY-ORDER-LIMITS-PLAN.md)
  - implemented nullable global defaults, per-family order policy overrides,
    monthly inheritance/reset, and enforcement; browser acceptance is deferred.
- [`FAMILY-EDIT-WIZARD-PLAN.md`](../../FAMILY-EDIT-WIZARD-PLAN.md)
  - implementation-ready parity of the family edit dialog with the create
    wizard (2-step guardian/household, bounded scrollable dialog, dead policy
    inputs removed from edit).
- [`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`](../../CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md)
  - completed guarded VPS four-account baseline and evidence record, plus the
    pending dedicated notification connected-acceptance extension.
- [`NOTIFICATION-SYSTEM-PLAN.md`](../../NOTIFICATION-SYSTEM-PLAN.md)
  - implemented in-app + email + push source/database contract; production
    rollout is pending and real-service acceptance is delegated to the
    connected four-account plan.

## Supporting documents

- [`Auth security evidence`](../evidence/auth-security/2026-09-05-local/README.md)
  - completed Auth 4 remediation, publication, deployment, connected lifecycle,
    CSP matrix, and manual Google OAuth acceptance record. The completed root
    implementation plan was removed after School adopted the same shared Auth
    and CSP contracts.
- [`NAJM-STACK.md`](NAJM-STACK.md) - installed framework contracts to reuse.
  Treat its version list as indicative only; the workspace `package.json` files
  and the installed declarations under `node_modules/` are authoritative.

Earlier planning documents (`DECISIONS.md`, `IMAGE-DELIVERY-OPTIMIZATION.md`,
`OPERATOR-SPONSOR-DETAIL-OVERVIEW.md`, `SECTION-TEMPLATE.md`,
`SPONSOR-DASHBOARD-REDESIGN.md`, `APPLICANT-CREATION.md`,
`VPS-DOCKER-DEPLOYMENT.md`, and `sections/01`-`07`) covered work that has since
shipped and were removed. Their content remains in git history.

## Planning rules

- Follow the task-specific plan that owns the current slice.
- Do not infer project-wide phase status from a task-specific plan.
- Keep implementation, package publication, Git publication, deployment, and
  browser acceptance as separate completion boundaries.
- Completed phases must cite real test, browser, and migration evidence.
  Screenshots and browser evidence live in [`../evidence/`](../evidence/).
