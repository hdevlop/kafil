# Kafil Plan Index

The root [`PLAN.md`](../../PLAN.md) is the single active roadmap. This directory
holds supporting reference material only.

## Documents

- [`NAJM-STACK.md`](NAJM-STACK.md) - installed framework contracts to reuse.
  Treat its version list as indicative only; the workspace `package.json` files
  and the installed declarations under `node_modules/` are authoritative.

Earlier planning documents (`DECISIONS.md`, `IMAGE-DELIVERY-OPTIMIZATION.md`,
`OPERATOR-SPONSOR-DETAIL-OVERVIEW.md`, `SECTION-TEMPLATE.md`,
`SPONSOR-DASHBOARD-REDESIGN.md`, `APPLICANT-CREATION.md`,
`VPS-DOCKER-DEPLOYMENT.md`, and `sections/01`-`07`) covered work that has since
shipped and were removed. Their content remains in git history.

## Planning Rules

- The root `PLAN.md` controls phase order and status.
- A requirement that changes money rules, role boundaries, privacy, or phase
  order must update the root `PLAN.md` before implementation starts.
- Deferred work stays deferred unless the root `PLAN.md` explicitly moves it
  into the MVP.
- Completed phases must cite real test, browser, and migration evidence.
  Screenshots and browser evidence live in [`../evidence/`](../evidence/).
