# @kafil/contracts

Browser-safe code shared by `@kafil/web` and `@kafil/server`, exported as
TypeScript source.

| Export | Owns |
| --- | --- |
| `@kafil/contracts/locales` | The en/fr/ar/es catalog (`kafilI18n`, `kafilUiI18n`, locale tags and key types) |
| `@kafil/contracts/phone` | `normalizePhone` for profile contact numbers |
| `@kafil/contracts/money/constants` | `KAFIL_CURRENCY` |

There is no root export: each consumer imports the one subpath it needs.

Rules:

- Browser-safe only. No database, environment, filesystem, auth
  initialization or side effects. The only dependency is `najm-i18n/define`,
  and `bun run test:boundaries` fails on anything else.
- Backend validation stays in `@kafil/server`: `phoneDto` and the money DTOs
  wrap these helpers there.
- Every locale must define every English key.
  `test/locale-parity.test.ts` enforces this.
