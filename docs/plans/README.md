# Kafil Plan Index

[`docs/PLAN.md`](../PLAN.md) is the active global roadmap. This directory holds
bounded implementation detail and decision records.

## Documents

- [`DECISIONS.md`](DECISIONS.md) - locked MVP product and architecture decisions
- [`NAJM-STACK.md`](NAJM-STACK.md) - installed framework contracts to reuse
- [`SECTION-TEMPLATE.md`](SECTION-TEMPLATE.md) - template for future sections
- [`VPS-DOCKER-DEPLOYMENT.md`](VPS-DOCKER-DEPLOYMENT.md) - implementation
  handoff for the production-like demo VPS, automated releases, and the later
  clean production-data transition

## Implementation Sections

1. [`01-identity-families-and-children.md`](sections/01-identity-families-and-children.md)
2. [`02-support-assignments.md`](sections/02-support-assignments.md)
3. [`03-budgets-and-contributions.md`](sections/03-budgets-and-contributions.md)
4. [`04-catalog-and-inventory.md`](sections/04-catalog-and-inventory.md)
5. [`05-cart-orders-and-fulfillment.md`](sections/05-cart-orders-and-fulfillment.md)
6. [`06-web-dashboards.md`](sections/06-web-dashboards.md)
7. [`07-reports-operations-and-release.md`](sections/07-reports-operations-and-release.md)

## Planning Rules

- The global plan controls phase order and status.
- A section plan controls detailed scope within its phase.
- A new requirement that changes money rules, role boundaries, privacy, or
  phase order must first update `DECISIONS.md` and `docs/PLAN.md`.
- Deferred work stays deferred unless the global plan explicitly moves it into
  the MVP.
- Completed sections must include actual test and migration evidence.
