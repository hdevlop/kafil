# Kafil test documentation

Connected and browser acceptance contracts live here instead of in root-level
plan files.

- [`connected-four-account/`](connected-four-account/README.md) - guarded VPS
  acceptance for the four-account financial journey, auth lifecycle, and
  notification system.
- [`auth-role-acceptance.md`](auth-role-acceptance.md) - the acceptance
  obligations left open when the auth role integrity plan was retired: the
  direct production uniqueness read, the four-role API matrix, and the browser
  matrix beyond the Admin roles page.

Implementation tests remain beside their owning packages under `apps/web/test`,
`packages/server/test`, and `packages/seed/test`.
