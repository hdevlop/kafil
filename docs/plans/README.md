# Kafil Plan Index

Kafil uses task-specific root plans. There is no single root `PLAN.md`.

## Root plans

- [`CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md`](../../CONNECTED-FOUR-ACCOUNT-ACCEPTANCE-PLAN.md)
  - completed guarded VPS browser-acceptance contract and evidence record.

## Supporting documents

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
