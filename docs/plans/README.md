# Kafil Plans and Archive

Earlier root-level task plans were retired on 2026-09-17. Their content remains
available in Git history. There is no generic root `PLAN.md`; newly requested
task-specific plans are indexed below.

The former connected four-account acceptance plan was preserved and split into
purpose-specific test documents under
[`docs/tests/connected-four-account/`](../tests/connected-four-account/README.md).

## Active root plans

- [`AUTH-ROLE-INTEGRITY-PLAN.md`](../../AUTH-ROLE-INTEGRITY-PLAN.md)
  - repairs duplicate fixed-role rows and missing production grants without
    losing users or custom permissions, makes Kafil seeding failure-safe, then
    prevents recurrence through a separately released Najm Auth uniqueness
    contract and a second Kafil migration/deployment boundary.
- [`DELIVERY-PURCHASE-WORKFLOW-PLAN.md`](../../DELIVERY-PURCHASE-WORKFLOW-PLAN.md)
  - implemented Delivery-owned purchase workflow for Family-created, Operator-approved
    assigned orders; reuses the existing Delivery dashboard, order summary,
    purchase form, evidence storage, financial transaction, and delivery commands.
    Source, package, database, build, and no-schema-drift checks are recorded;
    browser acceptance, publication, and deployment remain separate.
- [`NAJM-OPTIONAL-PROVIDER-DX-PLAN.md`](../../NAJM-OPTIONAL-PROVIDER-DX-PLAN.md)
  - implemented optional integration composition through the existing Najm app
    provider, default `location: true` in Kafil, automatic snapshot/CSP wiring,
    shared location labels, package validation and independent consumer adoption.
    Initial packages and source migrations are released. The phase 6 follow-up
    moves app name/currency into config and makes Query mandatory by default in
    the full provider; it is implemented, published, and source-validated.
    Phase 7 implements common Najm Kit badge colors/translations/style defaults
    and removes Kafil's badge-defaults wiring. Its package and source-level
    consumer checks are recorded; browser/manual acceptance remains open.

## Supporting documents

- [`Najm Query DX completion evidence`](../evidence/najm-query-dx/2026-09-19/README.md)
  - records the retired Query plan's shared package contract, Kafil and School
    adoption, source validation, registry release, and still-separate Git,
    browser, and deployment boundaries.

- [`Auth security evidence`](../evidence/auth-security/2026-09-05-local/README.md)
  - completed Auth 4 remediation, publication, deployment, connected lifecycle,
    CSP matrix, and manual Google OAuth acceptance record.
- [`NAJM-STACK.md`](NAJM-STACK.md) - installed framework contracts to reuse.
  Treat its version list as indicative only; the workspace `package.json` files
  and installed declarations under `node_modules/` are authoritative.

Earlier planning documents remain available in Git history.

## Documentation rules

- Keep implementation, package publication, Git publication, deployment, and
  browser acceptance as separate completion boundaries.
- Completed work must cite real test, browser, and migration evidence.
- Screenshots and browser evidence live in [`../evidence/`](../evidence/).
- New plans, when explicitly requested, must be task-specific and indexed here.
