# Kafil Plans and Archive

Earlier root-level task plans were retired on 2026-09-17. Their content remains
available in Git history. There is no generic root `PLAN.md`; newly requested
task-specific plans are indexed below.

The former connected four-account acceptance plan was preserved and split into
purpose-specific test documents under
[`docs/tests/connected-four-account/`](../tests/connected-four-account/README.md).

## Active root plans

- [`NAJM-OPTIONAL-PROVIDER-DX-PLAN.md`](../../NAJM-OPTIONAL-PROVIDER-DX-PLAN.md)
  - implemented optional integration composition through the existing Najm app
    provider, default `location: true` in Kafil, automatic snapshot/CSP wiring,
    shared location labels, package validation and independent consumer adoption.
    Packages and source migrations are released; browser/manual acceptance remains open.

## Supporting documents

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
